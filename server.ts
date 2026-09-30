import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

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

  // Server-Side Gemini Smart Insights endpoint
  app.post('/api/ai/insights', async (req, res) => {
    try {
      if (!ai) {
        return res.json({
          ok: true,
          isMock: true,
          insights: [
            {
              type: 'summary',
              badge: 'Status Operasional',
              title: 'Akumulasi Bahan Baku Terpantau Seimbang',
              text: 'Seluruh pergerakan masuk dan keluar bahan baku utama (Tembakau Blend, Cengkeh, dan Krosok) berjalan lancar sesuai rencana produksi.',
              action: 'Cek Ringkasan'
            },
            {
              type: 'warning',
              badge: 'Audit BSPP',
              title: 'Toleransi Susut Timbang Ulang Terjaga',
              text: 'Rata-rata persentase selisih timbangan pada penerimaan terkini masih di bawah ambang batas toleransi standar operasional (0,5%).',
              action: 'Lihat BSPP'
            },
            {
              type: 'tip',
              badge: 'Rekomendasi Re-order',
              title: 'Verifikasi Kode & Grade Prioritas',
              text: 'Pastikan pencatatan ceklist fisik kode batch harian pada panel mutasi telah disinkronkan sebelum penutupan shift.',
              action: 'Periksa Mutasi'
            }
          ]
        });
      }

      const { stockContext, userRole, allowedKomoditas } = req.body;

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

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3
        }
      });

      const responseText = response.text || '{}';
      try {
        const parsed = JSON.parse(responseText);
        return res.json({ ok: true, isMock: false, insights: parsed.insights || [] });
      } catch (parseErr) {
        return res.json({
          ok: true,
          isMock: false,
          raw: responseText,
          insights: []
        });
      }
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
5. Bila ditanya tentang BSPP, jelaskan konsep timbang ulang vs label netto serta status Lebih / Kurang.

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

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: chatContents,
        config: {
          systemInstruction,
          temperature: 0.4
        }
      });

      return res.json({
        ok: true,
        reply: response.text || 'Maaf, saya tidak dapat memproses jawaban saat ini.'
      });
    } catch (err: any) {
      console.error('Gemini Chat Error:', err.message);
      return res.status(500).json({
        ok: false,
        error: `Gagal memproses pesan AI: ${err.message}`
      });
    }
  });

  // Proxy API endpoint to bypass browser CORS and follow 302 redirect transparently
  app.get('/api/gas-proxy', async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) {
        return res.status(400).json({ ok: false, error: 'Target URL is required' });
      }

      // Fetch with redirect: 'follow'
      const response = await fetch(targetUrl, {
        headers: {
          'Accept': 'application/json, text/plain, */*'
        },
        redirect: 'follow'
      });

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const data = await response.json();
        return res.json(data);
      } else {
        const text = await response.text();
        try {
          const json = JSON.parse(text);
          return res.json(json);
        } catch {
          return res.send(text);
        }
      }
    } catch (err: any) {
      console.error('GAS Proxy Error:', err.message);
      return res.status(500).json({
        ok: false,
        error: `Proxy failed: ${err.message}`
      });
    }
  });

  // Attach Vite middleware in development mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });

  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
