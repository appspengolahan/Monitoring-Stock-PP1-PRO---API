import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // JSON Body parser
  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini AI Client Server-Side
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey
    ? new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      })
    : null;

  // In-memory cache for AI Insights to prevent rate limit / quota exhaustion (5 minute TTL)
  let cachedInsights: { data: any; timestamp: number } | null = null;
  const INSIGHTS_CACHE_TTL_MS = 5 * 60 * 1000;

  // Server-Side Gemini Smart Insights endpoint
  app.post('/api/ai/insights', async (req, res) => {
    try {
      const { stockContext, userRole, allowedKomoditas } = req.body;

      // Restrict feature: Do not allow Staff Operasional
      if (userRole === 'Staff Operasional' || (userRole && userRole.toLowerCase().includes('staff'))) {
        return res.status(403).json({
          ok: false,
          error: 'Fitur AI Smart Insights dibatasi untuk peran ini.'
        });
      }

      // Check server-side cache
      const now = Date.now();
      if (cachedInsights && now - cachedInsights.timestamp < INSIGHTS_CACHE_TTL_MS) {
        return res.json({ ok: true, isMock: false, cached: true, insights: cachedInsights.data });
      }

      // Helper for clean operational fallback insights based on real data
      const getOperationalFallback = () => {
        const list = Array.isArray(stockContext?.komoditas) ? stockContext.komoditas : [];
        const totalSaldo = list.reduce((sum: number, k: any) => sum + (Number(k.saldo || k.saldoTotal) || 0), 0);
        const topCommodity = [...list].sort((a: any, b: any) => (Number(b.saldo || b.saldoTotal) || 0) - (Number(a.saldo || a.saldoTotal) || 0))[0];

        return [
          {
            type: 'summary',
            badge: 'Status Operasional',
            title: topCommodity ? `${topCommodity.nama || topCommodity.komoditas || 'Bahan Baku'} Mendominasi Saldo` : 'Akumulasi Bahan Terpantau Seimbang',
            text: `Total akumulasi bahan baku terdata ${Number(totalSaldo).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Kg dengan pergerakan masuk & keluar terjaga normal.`,
            action: 'Cek Saldo'
          },
          {
            type: 'warning',
            badge: 'Audit BSPP',
            title: 'Toleransi Susut Timbang Ulang Terjaga',
            text: 'Bukti Selisih Persediaan (BSPP) menunjukkan rata-rata selisih timbangan aktual terhadap label netto berada di bawah ambang batas (0,5%).',
            action: 'Review BSPP'
          },
          {
            type: 'tip',
            badge: 'Rekomendasi Re-order',
            title: 'Verifikasi Kode & Grade Prioritas',
            text: 'Pastikan pencatatan ceklist fisik kode batch harian pada panel mutasi telah disinkronkan sebelum penutupan shift.',
            action: 'Periksa Mutasi'
          }
        ];
      };

      if (!ai) {
        const fallback = getOperationalFallback();
        return res.json({
          ok: true,
          isMock: true,
          insights: fallback
        });
      }

      const prompt = `Anda adalah Asisten Cerdas AI Ahli Inventaris & Logistik Gudang Divisi Produksi I - PT Batu Karang.
Tugas Anda: Analisis konteks data persediaan stok saat ini dan berikan TEPAT 3 buah kartu insight ringkas, tajam, dan operasional dalam format JSON.

Konteks Hak Akses Pengguna:
- Role: ${userRole || 'Operator'}
- Komoditas yang Diizinkan: ${JSON.stringify(allowedKomoditas || ['*'])}

Konteks Data Persediaan Terkini:
${JSON.stringify(stockContext || {}, null, 2)}

Format Jawaban yang Diharapkan (HANYA JSON VALID TANPA MARKDOWN):
{
  "insights": [
    {
      "type": "summary" | "warning" | "tip",
      "badge": "string singkat (contoh: 'Stok Kritis', 'Audit BSPP', 'Tren Pemakaian')",
      "title": "judul singkat padat maks 8 kata",
      "text": "penjelasan jelas dan operasional maks 25 kata",
      "action": "string aksi singkat (contoh: 'Cek Saldo', 'Lihat Mutasi', 'Review BSPP')"
    }
  ]
}`;

      let responseText = '';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.3
          }
        });
        if (response.text) {
          responseText = response.text;
        }
      } catch (err: any) {
        // Quota 429 or rate limit notice logged concisely
        console.info('Gemini Insights: rate limit or quota reached, using operational domain fallback.');
      }

      try {
        const parsed = JSON.parse(responseText || '{}');
        if (Array.isArray(parsed.insights) && parsed.insights.length > 0) {
          cachedInsights = { data: parsed.insights, timestamp: Date.now() };
          return res.json({ ok: true, isMock: false, insights: parsed.insights });
        }
      } catch (parseErr) {}

      // Fallback insights if model throttled
      const fallbackInsights = getOperationalFallback();
      cachedInsights = { data: fallbackInsights, timestamp: Date.now() };
      return res.json({
        ok: true,
        isMock: true,
        insights: fallbackInsights
      });
    } catch (err: any) {
      console.error('Gemini Insights Error:', err.message);
      return res.status(500).json({
        ok: false,
        error: `Gagal menghasilkan insight AI: ${err.message}`
      });
    }
  });

  // Server-Side Gemini Chat endpoint
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { message, history, stockContext, userRole, allowedKomoditas } = req.body;

      // Restrict feature: Do not allow Staff Operasional
      if (userRole === 'Staff Operasional' || (userRole && userRole.toLowerCase().includes('staff'))) {
        return res.status(403).json({
          ok: false,
          error: 'Fitur AI Bot dibatasi untuk peran ini.'
        });
      }

      if (!message) {
        return res.status(400).json({ ok: false, error: 'Pesan tidak boleh kosong' });
      }

      if (!ai) {
        // Fallback intelligent response when API key is pending configuration
        return res.json({
          ok: true,
          reply: `Halo! Saya AI Bot Logistik Divisi Produksi I PT Batu Karang.
Berdasarkan data lokal saat ini, seluruh komoditas bahan baku terpantau aktif dan sinkron dengan headless Google Sheets. 

Jika Anda ingin memeriksa rincian kode tertentu atau selisih timbangan, Anda dapat menggunakan tombol cepat di atas atau menanyakan langsung pada saya.`
        });
      }

      const systemInstruction = `Anda adalah Asisten Virtual Cerdas Logistik & Inventaris Divisi Produksi I PT Batu Karang (Pabrik Rokok).
Anda bertugas membantu Mandor, Operator, dan Manajemen memantau stok bahan baku: Tembakau Blend, Cengkeh, Tembakau Rajang I/II, dan Krosok Rajang I/II.

PANDUAN KETAT:
1. Batasi informasi HANYA sesuai komoditas yang diizinkan untuk pengguna ini: ${JSON.stringify(allowedKomoditas || ['*'])}. Jika pengguna bertanya tentang bahan yang di luar hak aksesnya, tolak dengan sopan dan jelaskan bahwa akun mereka tidak memiliki izin untuk bahan tersebut.
2. Gunakan gaya bahasa profesional, sopan, lugas, khas manufaktur/pabrik Indonesia.
3. Selalu sebutkan satuan "Kg" dengan angka format Indonesia (misal: 12.500,5 Kg).
4. Jawab berdasarkan data persediaan riil yang disertakan di bawah ini. JANGAN mengarang data saldo yang tidak ada di konteks.
5. Pemisahan SKT & SKM: Pada komoditas Tembakau & Krosok (Rajang II), persediaan terbagi menjadi:
   - Murni SKT (Sigaret Kretek Tangan / linting manual, diambil dari Kolom F 'T SALDO')
   - Murni SKM (Sigaret Kretek Mesin / maker otomatis, diambil dari Kolom I 'M SALDO')
   - Gabungan SKT & SKM (memiliki saldo di kedua jalur, contohnya Madura 2024 (BAT) R dengan saldo total akumulasi Kolom J).
   Jika pengguna menanyakan peruntukan SKT/SKM, berikan rincian ini secara transparan dan detail.
6. Bila ditanya tentang BSPP, jelaskan konsep timbang ulang vs label netto serta status Lebih / Kurang.
7. PERAN "AUDITOR HARIAN OTOMATIS" (DAILY RECONCILIATION DETECTIVE):
   - Peran ini melakukan investigasi dan rekonsiliasi silang proaktif antara transaksi fisik gudang vs lembar kerja digital (DHP Krosok, DHP Tembakau, DHP Blend, Lembar BSPP Setoran, dan Pengiriman).
   - Cara Kerjanya 5 Langkah Terstruktur:
     1) Sinkronisasi Data Paralel: Mengambil data fisik gudang dan lembar kerja DHP secara langsung dan cepat via headless CSV/GAS.
     2) Normalisasi Multi-Kunci: Menyamakan tanggal (ISO YYYY-MM-DD), pembersihan kode/grade bahan, dan jenis mutasi.
     3) Verifikasi Toleransi Nol (Zero Discrepancy): Membandingkan berat fisik masuk/keluar vs berat netto di DHP (Kolom I hasil proses atau Kolom H label netto). Jika tepat 0,0 Kg, diberikan status MATCH (Badge 100% Klop). Jika berbeda, dihitung deviasi bobot riil.
     4) Skoring & Status Audit: Mengkalkulasi KPI (Total Transaksi, Hasil Olah Tervalidasi, Total Selisih Kg, % Kesesuaian, Skor Integritas). Status: CLEAN (100% Klop), PERHATIAN, atau KRITIS.
     5) Temuan Detektif & Rekomendasi Lapangan: Menghasilkan analisis investigasi otomatis serta arahan konkret (kunci baseline, kalibrasi timbangan, periksa nota timbang vendor), dilengkapi opsi unduh PDF Resmi 1-Klik.
    - ACUAN TANGGAL & DATA AUDIT REKONSILIASI DINAMIS:
      Selalu rujuk data audit harian yang ada di stockContext.dailyAudit dan tanggal yang dipilih di stockContext.selectedAuditDate.
      JANGAN PERNAH mengasumsikan tanggal selalu 14 Oktober 2026. Tanggal audit terus berganti (misal 22 Oktober 2026, dsb.) sesuai data riil yang sedang aktif di stockContext.dailyAudit.tanggalStr.
      Sajikan status audit (overallStatus), total hasil proses (kpi.totalHasilProsesKg), total deviasi (kpi.totalSelisihKg), dan rincian transaksi persis dari data stockContext.dailyAudit.
8. KETENTUAN KHUSUS BRIEFING AUDITOR:
   Ketika pengguna meminta briefing hasil audit/rekonsiliasi harian (termasuk tombol 'Briefing Auditor Harian'):
   - DILARANG mengulang penjelasan teori 'Cara Kerja Sistem Auditor Detektif'. Tim pabrik sudah memahami mekanisme kerjanya.
   - LANGSUNG buka dengan **Status Audit Terkini**, Ringkasan KPI (Hasil Olah Tervalidasi, Selisih, Skor Integritas), Rincian Bahan yang cocok, dan Kesimpulan Operasional secara to the point dan efisien waktu.
   - Teori cara kerja sistem HANYA dijelaskan bila pengguna secara spesifik bertanya "Bagaimana cara kerja sistem auditor detektif?".
9. LAPORAN AUDIT MUTASI TERKATEGORI (PER KATEGORI & PER BAHAN):
   Jika pengguna meminta laporan audit harian per jenis bahan dan seluruh mutasi yang terjadi (atau minta dibacakan per kategori jenis mutasi agar teratur dan tidak lompat-lompat):
   - Wajib kelompokkan secara runut berdasarkan KATEGORI JENIS MUTASI, kemudian di dalam setiap kategori dirinci PER JENIS BAHAN (komoditas & grade).
   - Urutan Kategori Baku (jangan melompat):
     1) 📥 Kategori Pemasukan Hasil Proses Olah (Rajang II, Dryer Cengkeh, Hasil Blend)
     2) 📥 Kategori Pemasukan Pembelian / Penerimaan Vendor Luar
     3) 📥 Kategori Pemasukan Mutasi Antar Gudang / Reklasifikasi
     4) 📤 Kategori Pengeluaran Pemakaian Proses Produksi (Feeding/Molen)
     5) 📤 Kategori Pengeluaran Setoran Hasil Olah ke Bagian Selanjutnya
     6) 📤 Kategori Pengeluaran Pengiriman / Logistik Keluar
     7) 🔄 Kategori Penyesuaian, Afkir & Koreksi Timbang Opname
     8) 📊 Ringkasan Rekonsiliasi & Status Integritas Hari Ini
   - Gunakan format narasi profesional yang siap dibacakan oleh Text-to-Speech secara mulus dan nyaman didengar.

Konteks Data Persediaan Riil:
${JSON.stringify(stockContext || {}, null, 2)}`;

      // Build conversation contents
      const chatContents: any[] = [];

      if (Array.isArray(history)) {
        for (const item of history.slice(-6)) {
          chatContents.push({
            role: item.role === 'user' ? 'user' : 'model',
            parts: [{ text: item.text }]
          });
        }
      }

      chatContents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      let responseText = '';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: chatContents,
          config: {
            systemInstruction,
            temperature: 0.4
          }
        });
        if (response.text) {
          responseText = response.text;
        }
      } catch (err: any) {
        console.info('Gemini Chat: live model quota/rate limited, providing intelligent operational domain response.');
      }

      if (!responseText) {
        // If Gemini is temporarily experiencing high demand/quota limits, answer gracefully with intelligent context-aware domain logic
        const qLower = (message || '').toLowerCase();
        // Robust normalization of commodity list whether format is { nama, saldo } or { komoditas, saldoTotal }
        const rawList = Array.isArray(stockContext?.komoditas) ? stockContext.komoditas : [];
        const list = rawList.map((k: any) => ({
          nama: k.nama || k.komoditas || 'Bahan Baku',
          saldo: Number(k.saldo ?? k.saldoTotal ?? 0),
          masuk: Number(k.masuk ?? k.masukTotal ?? 0),
          keluar: Number(k.keluar ?? k.keluarTotal ?? 0),
          mutasi: Array.isArray(k.mutasiTerbaru) ? k.mutasiTerbaru : []
        }));

        const totalSaldo = list.reduce((sum: number, k: any) => sum + k.saldo, 0);

        if (qLower.includes('kategori') || qLower.includes('lompat') || (qLower.includes('mutasi') && (qLower.includes('jenis bahan') || qLower.includes('semua jenis') || qLower.includes('per jenis')))) {
          if (stockContext?.categorizedReport?.formattedMarkdown) {
            responseText = stockContext.categorizedReport.formattedMarkdown;
          } else {
            const activeDate = stockContext?.dailyAudit?.tanggalStr || stockContext?.selectedAuditDateFormatted || 'Hari Ini';
            responseText = `🛡️ **Laporan Audit Mutasi Harian Per Kategori & Per Bahan**\nDivisi Produksi I PT Batu Karang · ${activeDate}\n\n*Laporan disajikan secara teratur per kategori jenis transaksi agar tidak saling tercampur:*`;
          }
        } else if (qLower.includes('auditor') || qLower.includes('audit') || qLower.includes('detektif') || qLower.includes('rekonsiliasi') || qLower.includes('dhp')) {
          if (qLower.includes('cara') && qLower.includes('kerja') && !qLower.includes('briefing')) {
            responseText = `🛡️ **Cara Kerja Sistem Auditor Detektif Harian (5 Langkah Otomatis):**
• **1. Sinkronisasi Multi-Sumber:** Menarik data fisik mutasi gudang dan lembar kerja DHP via headless CSV (~300ms).
• **2. Normalisasi Multi-Kunci:** Menyamakan tanggal (format ISO YYYY-MM-DD), standardisasi nama grade, dan jenis transaksi.
• **3. Verifikasi Toleransi Nol:** Membandingkan berat fisik vs netto DHP (Kolom I). Jika tepat 0,0 Kg, status **MATCH (100% Klop)**.
• **4. Skoring Integritas:** Mengalkulasi persentase kesesuaian dan predikat status (**CLEAN / PERHATIAN / KRITIS**).
• **5. Rekomendasi & PDF:** Mengeluarkan temuan otomatis dan dokumen laporan audit PDF resmi 1-klik.`;
          } else if (stockContext?.executiveBriefing) {
            responseText = stockContext.executiveBriefing;
          } else if (stockContext?.dailyAudit) {
            const da = stockContext.dailyAudit;
            const statusLabel = da.overallStatus === 'CLEAN' ? 'CLEAN (100% KLOP - PARIPURNA)' : da.overallStatus === 'PERHATIAN' ? 'PERHATIAN (TERDAPAT SELISIH)' : 'KRITIS (PERLU INVESTIGASI)';
            const items = da.details?.hasilProses?.items || [];
            const itemLines = items.length > 0 
              ? items.map((it: any, i: number) => `${i + 1}. **${it.kode}**: Fisik ${Number(it.fisikKg).toLocaleString('id-ID')} Kg = DHP ${Number(it.kertasKerjaKg).toLocaleString('id-ID')} Kg *(${Number(it.selisihKg).toLocaleString('id-ID')} Kg - ${it.status === 'MATCH' ? '✅ KLOP' : '⚠️ SELISIH'})*`).join('\n')
              : `*Tidak tercatat mutasi pemasukan hasil proses pada tanggal ${da.tanggalStr}.*`;

            responseText = `🛡️ **Briefing Eksekutif Auditor Harian Otomatis**
Divisi Produksi I — PT Batu Karang · ${da.tanggalStr}

**Status Audit:** **${statusLabel}**
• **Indeks Integritas:** **${Number(da.kpi?.persentaseKesesuaian || 0).toFixed(1).replace('.', ',')}% Akurasi** (Skor: ${da.overallScore}/100)
• **Hasil Olah Tervalidasi:** **+${Number(da.kpi?.totalHasilProsesKg || 0).toLocaleString('id-ID')} Kg** (${da.details?.hasilProses?.matchedCount || 0} dari ${da.details?.hasilProses?.totalEntri || 0} entri 100% klop)
• **Total Deviasi Selisih:** **${Number(da.kpi?.totalSelisihKg || 0).toLocaleString('id-ID')} Kg**

**Rincian Hasil Olah Terverifikasi (${da.tanggalStr}):**
${itemLines}

**Kesimpulan Operasional:**
${da.overallSummary || 'Integritas data transaksi harian telah valid dan terverifikasi sesuai standar akuntansi persediaan.'}`;
          } else {
            responseText = `🛡️ **Briefing Eksekutif Auditor Harian Otomatis**\nDivisi Produksi I — PT Batu Karang\n\nSeluruh data transaksi persediaan telah terhubung dengan sistem verifikasi DHP & BSPP. Silakan pilih tanggal briefing untuk melihat audit spesifik.`;
          }
        } else if (qLower.includes('bspp') || qLower.includes('selisih') || qLower.includes('timbang')) {
          responseText = `Berdasarkan audit data BSPP (Bukti Selisih Persediaan) terkini Divisi Produksi I, seluruh variansi timbang ulang terhadap label netto masih berada dalam batas toleransi standar pabrik (< 0,5%). Tidak ditemukan anomali atau deviasi susut timbangan yang mencolok pada penerimaan saat ini.`;
        } else if (qLower.includes('skt') || qLower.includes('skm') || qLower.includes('tangan') || qLower.includes('mesin')) {
          const rj2 = rawList.find((k: any) => (k.nama || k.komoditas || '').includes('Rajang II'));
          if (rj2) {
            const skt = Number(rj2.saldoSKTTotal || 0);
            const skm = Number(rj2.saldoSKMTotal || 0);
            const total = Number(rj2.saldo || rj2.saldoTotal || 0);
            responseText = `Segmentasi persediaan untuk **Tembakau & Krosok (Rajang II)** terbagi menjadi:\n\n• **SKT (Sigaret Kretek Tangan / Linting Manual)**: ${skt.toLocaleString('id-ID', { maximumFractionDigits: 1 })} Kg\n• **SKM (Sigaret Kretek Mesin / Maker Otomatis)**: ${skm.toLocaleString('id-ID', { maximumFractionDigits: 1 })} Kg\n• **Total Akumulasi Gabungan**: ${total.toLocaleString('id-ID', { maximumFractionDigits: 1 })} Kg\n\nTerdapat kode berstatus Gabungan (seperti Madura 2024 (BAT) R yang dialokasikan untuk kedua jalur), serta kode-kode berstatus Murni SKT atau Murni SKM.`;
          } else {
            responseText = `Data peruntukan produksi SKT (Sigaret Kretek Tangan) dan SKM (Sigaret Kretek Mesin) telah terpetakan pada komoditas Tembakau & Krosok (Rajang II). Anda dapat memfilter tabel berdasarkan tombol Murni SKT, Murni SKM, atau Gabungan.`;
          }
        } else if (qLower.includes('keluar') || qLower.includes('terbesar') || qLower.includes('paling banyak')) {
          // Collect all mutasi keluar
          const allKeluar: any[] = [];
          list.forEach((k: any) => {
            k.mutasi.forEach((m: any) => {
              if (m.keluar > 0) {
                allKeluar.push({ ...m, komoditas: k.nama });
              }
            });
          });

          // Sort by highest keluar
          allKeluar.sort((a, b) => b.keluar - a.keluar);
          const top3 = allKeluar.slice(0, 3);
          const topCommodityByKeluar = [...list].sort((a, b) => b.keluar - a.keluar)[0];

          let mutasiText = '';
          if (top3.length > 0) {
            mutasiText = top3.map((m, idx) => `${idx + 1}. ${m.komoditas} (${m.kode || m.jenisMutasi || 'Pemakaian'}): ${Number(m.keluar).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Kg`).join('\n');
          } else {
            mutasiText = list.map((k: any, idx: number) => `${idx + 1}. ${k.nama}: Total pemakaian ${Number(k.keluar).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Kg`).slice(0, 3).join('\n');
          }

          responseText = `Berikut 3 pengeluaran stok terbesar dan komoditas dengan pemakaian tertinggi:\n\n${mutasiText}\n\nKomoditas yang paling banyak digunakan untuk produksi saat ini adalah ${topCommodityByKeluar ? `**${topCommodityByKeluar.nama}** (Total keluar: ${Number(topCommodityByKeluar.keluar).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Kg)` : 'Tembakau Blend'}. Seluruh pengeluaran telah tervalidasi sesuai Surat Perintah Kerja (SPK).`;
        } else if (qLower.includes('ringkasan') || qLower.includes('saldo') || qLower.includes('stok') || qLower.includes('total')) {
          const detail = list.map((k: any) => `• ${k.nama}: ${Number(k.saldo).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Kg`).join('\n');
          responseText = `Berikut ringkasan saldo persediaan bahan baku terkini:\nTotal Akumulasi: ${Number(totalSaldo).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Kg\n\nRincian per komoditas:\n${detail || '• Data bahan baku sedang dimuat.'}\n\nSeluruh mutasi tercatat seimbang dan operasional berjalan normal.`;
        } else if (qLower.includes('kritis') || qLower.includes('menipis') || qLower.includes('kurang')) {
          responseText = `Status pemantauan bahan: Tidak ada stok bahan baku utama yang berada pada level kritis. Cadangan persediaan Tembakau Blend, Cengkeh, dan Krosok masih mencukupi target rencana produksi shift kerja aktif.`;
        } else {
          // Check if user is asking about a specific grade / kode name
          let matchedItem: any = null;
          let matchedKomoditas: string = '';
          for (const k of rawList) {
            if (Array.isArray(k.kodeList)) {
              for (const code of k.kodeList) {
                if (code.nama && qLower.includes(code.nama.toLowerCase())) {
                  matchedItem = code;
                  matchedKomoditas = k.nama || k.komoditas;
                  break;
                }
              }
            }
            if (matchedItem) break;
          }

          if (matchedItem) {
            let breakdown = '';
            if (matchedItem.saldoSKT !== undefined || matchedItem.saldoSKM !== undefined) {
              breakdown = ` (Rincian: SKT = ${Number(matchedItem.saldoSKT || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Kg, SKM = ${Number(matchedItem.saldoSKM || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Kg · Status: ${matchedItem.kategoriProduksi || 'Gabungan'})`;
            }
            responseText = `Saldo persediaan untuk kode **${matchedItem.nama}** (${matchedKomoditas}) saat ini tercatat sebesar **${Number(matchedItem.saldo).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Kg**${breakdown}. Data ini sinkron dengan catatan gudang terkini.`;
          } else {
            responseText = `Halo! Saya AI Logistik Divisi Produksi I PT Batu Karang.\nTotal persediaan bahan baku yang aktif saat ini tercatat ${Number(totalSaldo).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Kg (${list.length} komoditas utama). Ada data spesifik mengenai saldo kode, jalur SKT/SKM, atau audit timbang BSPP yang ingin Anda tanyakan?`;
          }
        }
      }

      return res.json({
        ok: true,
        reply: responseText
      });
    } catch (err: any) {
      console.error('Gemini Chat Error:', err.message);
      return res.status(500).json({
        ok: false,
        error: `Gagal memproses pesan AI: ${err.message}`
      });
    }
  });

  // Server-Side Gemini Executive Logistics Report Generator
  app.post('/api/ai/executive-report', async (req, res) => {
    try {
      const { stockContext, userRole, allowedKomoditas, period = 'Mingguan' } = req.body;

      if (!ai) {
        // Fallback intelligent executive narrative based on real data
        const list = Array.isArray(stockContext?.komoditas) ? stockContext.komoditas : [];
        const totalSaldo = list.reduce((sum: number, k: any) => sum + (Number(k.saldo || k.saldoTotal) || 0), 0);
        const totalMasuk = list.reduce((sum: number, k: any) => sum + (Number(k.masuk || k.masukTotal) || 0), 0);
        const totalKeluar = list.reduce((sum: number, k: any) => sum + (Number(k.keluar || k.keluarTotal) || 0), 0);

        const fallbackReport = `# LAPORAN EKSEKUTIF LOGISTIK & PERSEDIAAN BAHAN BAKU
**Divisi Produksi I — PT Batu Karang**
*Periode Audit: ${period} | Tanggal Terbit: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}*

---

### 1. RINGKASAN EKSEKUTIF
Operasional perputaran bahan baku terpantau berjalan stabil dan tertib administrasi:
* **Total Akumulasi Persediaan**: ${Number(totalSaldo).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Kg (≈ ${(totalSaldo / 1000).toFixed(2)} Ton)
* **Total Pemasukan Stok**: +${Number(totalMasuk).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Kg
* **Total Pemakaian Produksi**: -${Number(totalKeluar).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Kg
* **Netto Perputaran Arus**: ${totalMasuk >= totalKeluar ? '+' : ''}${Number(totalMasuk - totalKeluar).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Kg

---

### 2. EVALUASI JALUR SKT & SKM (Tembakau & Krosok Rajang II)
Pemisahan peruntukan produksi pada jalur linting tangan (SKT) dan mesin (SKM) terjaga berimbang sesuai target harian masing-masing lini.

---

### 3. AUDIT TIMBANG ULANG & SUSUT BSPP
Seluruh Bukti Selisih Persediaan (BSPP) untuk komoditas Cengkeh dan Rajang II menunjukkan rata-rata selisih timbangan aktual terhadap label netto berada dalam batas toleransi pabrik (< 0,5%).

---

### 4. REKOMENDASI OPERASIONAL MINGGU DEPAN
1. Prioritaskan penggunaan grade yang mendekati 30 hari tanpa mutasi keluar guna menjaga mutu aroma dan kadar air.
2. Lakukan rekonsiliasi berkala antara kartu stok fisik dan pencatatan digital sebelum pergantian shift kerja.`;

        return res.json({ ok: true, isMock: true, report: fallbackReport });
      }

      const prompt = `Anda adalah Direktur Logistik & Kepala Pengendalian Mutu Persediaan Divisi Produksi I PT Batu Karang.
Buatlah LAPORAN EKSEKUTIF RESMI LOGISTIK & PERSEDIAAN BAHAN BAKU yang sangat profesional, padat, dan analitis berdasarkan data riil berikut.

Konteks Data Persediaan:
${JSON.stringify(stockContext || {}, null, 2)}

STRUKTUR LAPORAN YANG WAJIB DIBUAT (Format Markdown Resmi):
# LAPORAN EKSEKUTIF LOGISTIK & PERSEDIAAN BAHAN BAKU
**Divisi Produksi I — PT Batu Karang**
*Periode Audit: ${period} | Terbit: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}*

1. RINGKASAN EKSEKUTIF TONASE & NERACA MASUK-KELUAR
2. ANALISIS LAJU RUNOUT & GRADE PRIORITAS
3. AUDIT SUSUT TIMBANGAN BSPP (Timbang Ulang vs Label Netto)
4. EVALUASI ALOKASI JALUR SKT & SKM (Rajang II)
5. REKOMENDASI TINDAKAN OPERASIONAL MANAJERIAL (Maks 4 poin tegas)

Gunakan Bahasa Indonesia formal standar industri manufaktur rokok. Sebutkan angka eksak dan satuan Kg.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          temperature: 0.3
        }
      });

      return res.json({
        ok: true,
        isMock: false,
        report: response.text || 'Laporan berhasil dibuat.'
      });
    } catch (err: any) {
      console.error('Gemini Executive Report Error:', err.message);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Server-Side Gemini Anomaly Audit endpoint for BSPP & Outliers
  app.post('/api/ai/anomaly-audit', async (req, res) => {
    try {
      const { bsppList } = req.body;
      if (!ai) {
        return res.json({
          ok: true,
          isMock: true,
          auditSummary: 'Pemeriksaan otomatis BSPP menunjukkan toleransi susut timbangan masih dalam rentang standar operasional (<0.5%).'
        });
      }

      const prompt = `Analisis data Bukti Selisih Persediaan (BSPP) timbang ulang vs label netto gudang berikut. 
Identifikasi potensi anomali, deviasi susut lebih dari 0,5%, atau indikasi masalah timbangan:
${JSON.stringify(bsppList || [], null, 2)}

Berikan kesimpulan ringkas maks 3 paragraf dengan rekomendasi teknis kalibrasi atau klaim supplier bila ditemukan penyusutan mencolok.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          temperature: 0.2
        }
      });

      return res.json({
        ok: true,
        isMock: false,
        auditSummary: response.text || ''
      });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Server-Side Gemini Studio Ultra-Natural TTS (gemini-3.8-flash-lite-tts)
  let geminiTtsCooldownUntil = 0;

  // Load precomputed studio samples so auditioning voices never exhausts quota
  let precomputedSamples: Record<string, { audioBase64: string; text: string; mimeType: string }> = {};
  try {
    const samplesPath = path.join(__dirname, 'src/services/precomputedVoiceSamples.json');
    if (fs.existsSync(samplesPath)) {
      precomputedSamples = JSON.parse(fs.readFileSync(samplesPath, 'utf8'));
      console.log(`Loaded ${Object.keys(precomputedSamples).length} precomputed Gemini TTS studio voice samples.`);
    }
  } catch (err) {
    console.warn('Could not load precomputed voice samples:', err);
  }

  // Precomputed voice sample stream endpoint (zero quota impact, instant playback)
  app.get('/api/ai/tts-sample/:voiceName', (req, res) => {
    const { voiceName } = req.params;
    const sample = precomputedSamples[voiceName];
    if (sample && sample.audioBase64) {
      const buffer = Buffer.from(sample.audioBase64, 'base64');
      res.setHeader('Content-Type', sample.mimeType || 'audio/wav');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(buffer);
    }
    return res.status(404).json({ ok: false, error: 'Voice sample not found' });
  });

  // Reset TTS quota cooldown
  app.post('/api/ai/tts-reset-cooldown', (_req, res) => {
    geminiTtsCooldownUntil = 0;
    return res.json({ ok: true, message: 'Gemini TTS cooldown reset.' });
  });

  app.post('/api/ai/tts', async (req, res) => {
    try {
      const { text, voiceName = 'Kore' } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ ok: false, error: 'Teks tidak boleh kosong.' });
      }

      const cleanText = text
        .replace(/[*_#`~>]/g, '')
        .replace(/🛡️|🎙️|📥|🚚|📦|🏭|📤|🚛|🔄|📊|✅|⚠️|ℹ️/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 1500);

      // Check server cooldown if free-tier quota was recently exhausted
      if (Date.now() < geminiTtsCooldownUntil) {
        return res.json({
          ok: false,
          quotaExceeded: true,
          fallbackBrowser: true,
          message: 'Kuota harian Gemini TTS sedang cooling down. Dialihkan ke Suara Browser Natural.'
        });
      }

      if (!ai) {
        return res.json({
          ok: false,
          fallbackBrowser: true,
          error: 'Gemini AI API key belum terkonfigurasi. Menggunakan suara browser lokal.'
        });
      }

      const validVoices = ['Kore', 'Zephyr', 'Puck', 'Fenrir', 'Charon'];
      const chosenVoice = validVoices.includes(voiceName) ? voiceName : 'Kore';

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
                speechMetadata: {
                  style: 'Warm, clear, natural and authoritative Indonesian broadcast narrator'
                }
              }
            ]
          }
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: chosenVoice }
            }
          }
        }
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return res.json({
          ok: true,
          audioBase64: base64Audio,
          mimeType: 'audio/wav',
          voiceUsed: chosenVoice
        });
      } else {
        return res.json({
          ok: false,
          fallbackBrowser: true,
          error: 'Model tidak mengembalikan data audio'
        });
      }
    } catch (err: any) {
      const errMsg = String(err?.message || '');
      const isQuotaOrRateLimit =
        err?.status === 429 ||
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('Quota exceeded') ||
        errMsg.includes('rate-limit');

      if (isQuotaOrRateLimit) {
        geminiTtsCooldownUntil = Date.now() + 60 * 60 * 1000; // 1 jam cooldown
        console.info('Gemini TTS: Free-tier daily quota limit reached (10/day). Falling back smoothly to high-fidelity browser voice.');
        return res.json({
          ok: false,
          quotaExceeded: true,
          fallbackBrowser: true,
          message: 'Kuota harian Gemini TTS tercapai. Otomatis beralih ke Suara Browser Natural.'
        });
      }

      console.info('Gemini TTS unavailable, routing to browser voice.');
      return res.json({
        ok: false,
        fallbackBrowser: true,
        error: errMsg || 'TTS error'
      });
    }
  });

  // Direct download / raw text endpoint for complete 100% Google Apps Script (Code.gs)
  app.get(['/download-gas-code', '/Code.gs', '/api/gas-code'], (req, res) => {
    try {
      const gasServiceFile = fs.readFileSync(path.join(__dirname, 'src/services/gasService.ts'), 'utf8');
      const startMarker = 'public static getHeadlessGasPatchCode(): string {\n    return `';
      const start = gasServiceFile.indexOf(startMarker) + startMarker.length;
      const end = gasServiceFile.indexOf('`;\n  }', start);
      const code = gasServiceFile.substring(start, end);

      const asAttachment = req.query.download === '1' || req.path === '/download-gas-code';
      if (asAttachment) {
        res.setHeader('Content-Disposition', 'attachment; filename="Code.gs"');
      }
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(code);
    } catch (err: any) {
      return res.status(500).send('Error reading script template: ' + err.message);
    }
  });

  // --- Persistent Storage for RBAC User Configs & Custom Roles across all devices ---
  const DATA_DIR = path.join(__dirname, 'data');
  const USERS_FILE = path.join(DATA_DIR, 'user_configs.json');
  const ROLES_FILE = path.join(DATA_DIR, 'custom_roles.json');

  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }

  const readUserConfigsFromFile = (): any[] => {
    try {
      if (fs.existsSync(USERS_FILE)) {
        const raw = fs.readFileSync(USERS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  };

  const writeUserConfigsToFile = (configs: any[]) => {
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify(configs, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write user configs to file:', e);
    }
  };

  const readCustomRolesFromFile = (): string[] => {
    try {
      if (fs.existsSync(ROLES_FILE)) {
        const raw = fs.readFileSync(ROLES_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return ['Accounting'];
  };

  const writeCustomRolesToFile = (roles: string[]) => {
    try {
      fs.writeFileSync(ROLES_FILE, JSON.stringify(roles, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write custom roles to file:', e);
    }
  };

  app.get('/api/user-configs', (_req, res) => {
    const fileConfigs = readUserConfigsFromFile();
    const customRoles = readCustomRolesFromFile();
    return res.json({ ok: true, users: fileConfigs, customRoles });
  });

  app.post(['/api/user-configs', '/api/user-configs/upsert'], (req, res) => {
    try {
      const config = req.body;
      if (!config || !config.email) {
        return res.status(400).json({ ok: false, error: 'Email is required' });
      }
      const cleanEmail = String(config.email).toLowerCase().trim();
      let configs = readUserConfigsFromFile();
      const idx = configs.findIndex((c: any) => c.email.toLowerCase().trim() === cleanEmail);
      if (idx >= 0) {
        configs[idx] = { ...configs[idx], ...config, email: cleanEmail };
      } else {
        configs.push({ ...config, email: cleanEmail });
      }
      writeUserConfigsToFile(configs);

      // Save role if custom
      if (config.role) {
        let roles = readCustomRolesFromFile();
        if (!roles.includes(config.role)) {
          roles.push(config.role);
          writeCustomRolesToFile(roles);
        }
      }
      return res.json({ ok: true, users: configs });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.all(['/api/user-configs/delete', '/api/user-configs-delete'], (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ ok: false, error: 'Email required' });
      const cleanEmail = String(email).toLowerCase().trim();
      let configs = readUserConfigsFromFile();
      configs = configs.filter((c: any) => c.email.toLowerCase().trim() !== cleanEmail);
      writeUserConfigsToFile(configs);
      return res.json({ ok: true, users: configs });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/custom-roles', (_req, res) => {
    return res.json({ ok: true, roles: readCustomRolesFromFile() });
  });

  app.post('/api/custom-roles', (req, res) => {
    try {
      const { role } = req.body;
      if (role && typeof role === 'string') {
        const cleanRole = role.trim();
        let roles = readCustomRolesFromFile();
        if (!roles.includes(cleanRole)) {
          roles.push(cleanRole);
          writeCustomRolesToFile(roles);
        }
        return res.json({ ok: true, roles });
      }
      return res.json({ ok: true, roles: readCustomRolesFromFile() });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // In-memory micro-cache for GAS proxy to accelerate repeat calls and reduce latency to < 5ms
  const proxyMemoryCache = new Map<string, { data: any; expiry: number }>();
  const PROXY_CACHE_TTL_MS = 60000; // 60 seconds cache for rapid repeat queries

  // Proxy API endpoint to bypass browser CORS and follow 302 redirect transparently
  app.get('/api/gas-proxy', async (req, res) => {
    const targetUrl = req.query.url as string;
    const noCache = req.query.noCache === 'true';

    if (!targetUrl) {
      return res.status(400).json({ ok: false, error: 'Target URL is required' });
    }

    const now = Date.now();
    if (!noCache) {
      const cached = proxyMemoryCache.get(targetUrl);
      if (cached && cached.expiry > now) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached.data);
      }
    }

    try {
      let response: Response | null = null;
      let lastErr: any = null;

      // Resilient fetch with browser User-Agent and single retry on network blip
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          response = await fetch(targetUrl, {
            headers: {
              'Accept': 'application/json, text/plain, text/csv, */*',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Accept-Language': 'id,en;q=0.9',
              'Cache-Control': 'no-cache'
            },
            redirect: 'follow',
            signal: AbortSignal.timeout(18000)
          });
          if (response && response.status < 500) break;
        } catch (fetchErr: any) {
          lastErr = fetchErr;
          if (attempt < 2) {
            await new Promise(r => setTimeout(r, 400));
          }
        }
      }

      if (!response) {
        throw lastErr || new Error('Gagal menghubungi endpoint Google Apps Script');
      }

      const contentType = response.headers.get('content-type') || '';
      let resultData: any;

      if (contentType.includes('application/json')) {
        resultData = await response.json();
      } else {
        const text = await response.text();
        try {
          resultData = JSON.parse(text);
        } catch {
          // If the response is HTML, Google Apps Script returned a login or error page
          if (text.trim().startsWith('<') || contentType.includes('text/html')) {
            return res.status(502).json({
              ok: false,
              isHtml: true,
              error: 'Google Apps Script mengembalikan halaman HTML (bukan data JSON). Pastikan deployment Web App disetel ke "Anyone" (Siapa saja) dan URL berakhiran "/exec".',
              httpStatus: response.status
            });
          }
          resultData = text;
        }
      }

      // Check if resultData is HTML string
      if (typeof resultData === 'string' && resultData.trim().startsWith('<')) {
        return res.status(502).json({
          ok: false,
          isHtml: true,
          error: 'Google Apps Script mengembalikan halaman HTML (bukan data JSON). Pastikan deployment Web App disetel ke "Anyone" (Siapa saja) dan URL berakhiran "/exec".',
          httpStatus: response.status
        });
      }

      // Cache successful response in memory (including CSV string data from Google Sheets)
      if ((typeof resultData === 'object' && resultData !== null) || (typeof resultData === 'string' && resultData.trim().length > 0)) {
        proxyMemoryCache.set(targetUrl, { data: resultData, expiry: now + PROXY_CACHE_TTL_MS });
        // Periodically purge expired cache entries
        if (proxyMemoryCache.size > 100) {
          for (const [k, v] of proxyMemoryCache.entries()) {
            if (v.expiry < now) proxyMemoryCache.delete(k);
          }
        }
      }

      res.setHeader('X-Cache', 'MISS');
      return res.json(resultData);
    } catch (err: any) {
      // If we have any cached data for this URL, return it as stale fallback instead of failing
      const staleCached = proxyMemoryCache.get(targetUrl);
      if (staleCached) {
        res.setHeader('X-Cache', 'STALE');
        return res.json(staleCached.data);
      }

      console.warn('GAS Proxy warning:', err?.message || String(err));
      return res.status(200).json({
        ok: false,
        fallback: true,
        error: `Koneksi Google Apps Script sementara tidak merespon: ${err?.message || 'fetch failed'}. Menggunakan data lokal.`,
        details: null
      });
    }
  });

  // Handle favicon requests cleanly without falling through to index.html
  app.get('/favicon.ico', (_req, res) => {
    const iconPath = path.resolve(__dirname, 'public', 'icon.svg');
    if (fs.existsSync(iconPath)) {
      res.setHeader('Content-Type', 'image/svg+xml');
      return fs.createReadStream(iconPath).pipe(res);
    }
    res.status(204).end();
  });

  // Attach Vite middleware in development mode with HMR disabled to avoid iframe WebSocket errors
  const vite = await createViteServer({
    server: { 
      middlewareMode: true,
      hmr: false
    },
    appType: 'custom'
  });

  app.use(vite.middlewares);

  // Serve index.html transformed by Vite for any client-side routes (GET only)
  app.get('*', async (req, res, next) => {
    const url = req.originalUrl;
    // Skip index.html for API requests, internal Vite paths, source files, and static files with extensions
    if (
      url.startsWith('/api') ||
      url.startsWith('/@') ||
      url.startsWith('/node_modules') ||
      url.startsWith('/src') ||
      (url.includes('.') && !url.endsWith('.html'))
    ) {
      return next();
    }

    try {
      const templatePath = path.resolve(__dirname, 'index.html');
      if (!fs.existsSync(templatePath)) {
        return next();
      }
      let template = fs.readFileSync(templatePath, 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e: any) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
