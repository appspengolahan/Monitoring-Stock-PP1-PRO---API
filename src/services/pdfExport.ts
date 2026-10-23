import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const APP_NAME = 'Monitoring Stock Persediaan - Divisi Produksi I PT Batu Karang';
const PDF_FOOTER_TEXT = 'Divisi Produksi I - All Rights Reserved';

export interface PdfExportOptions {
  title: string;
  infoLines?: string[];
  head: string[];
  body: (string | number)[][];
  fileName?: string;
  action?: 'download' | 'print';
}

export function exportToPdf(options: PdfExportOptions): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(APP_NAME, 40, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(options.title, 40, 54);

  let startY = 70;
  if (options.infoLines && options.infoLines.length > 0) {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    options.infoLines.forEach(line => {
      doc.text(line, 40, startY);
      startY += 13;
    });
    startY += 6;
  }

  // Render Table
  autoTable(doc, {
    head: [options.head],
    body: options.body,
    startY: startY,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 4.5,
      font: 'helvetica',
      textColor: [30, 41, 59]
    },
    headStyles: {
      fillColor: [24, 95, 165], // #185FA5
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 40, right: 40, bottom: 40 }
  });

  // Footer on Every Page (Standard Requirement)
  const dicetakText = 'Dicetak: ' + new Date().toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  const pageCount = (doc as any).internal.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(dicetakText, 40, pageHeight - 20, { align: 'left' });
    doc.text(PDF_FOOTER_TEXT, pageWidth / 2, pageHeight - 20, { align: 'center' });
    doc.text(`Hal. ${i} / ${pageCount}`, pageWidth - 40, pageHeight - 20, { align: 'right' });
  }

  const cleanFileName = (options.fileName || `${APP_NAME} - ${options.title}`)
    .replace(/[\\/:*?"<>|]/g, '-') + '.pdf';

  if (options.action === 'print') {
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  } else {
    doc.save(cleanFileName);
  }
}

export function exportExecutiveReportPdf(title: string, reportMarkdown: string, fileName?: string): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(APP_NAME, 40, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text('Laporan Eksekutif Logistik & Persediaan AI (Gemini 3.8 Flash)', 40, 56);
  doc.text(`Tanggal Terbit: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`, 40, 70);

  // Line separator
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(1);
  doc.line(40, 80, pageWidth - 40, 80);

  let y = 100;
  const lines = reportMarkdown.split('\n');

  lines.forEach(line => {
    if (y > pageHeight - 50) {
      doc.addPage();
      y = 45;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      y += 8;
      return;
    }

    if (trimmed.startsWith('# ')) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text(trimmed.replace(/^#\s*/, ''), 40, y);
      y += 18;
    } else if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138); // blue-900
      doc.text(trimmed.replace(/^#{2,3}\s*/, ''), 40, y);
      y += 16;
    } else if (trimmed.startsWith('* ') || trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      const bulletText = '• ' + trimmed.replace(/^[\*\•\-]\s*/, '').replace(/\*\*/g, '');
      const wrapped = doc.splitTextToSize(bulletText, pageWidth - 90);
      doc.text(wrapped, 50, y);
      y += wrapped.length * 12 + 2;
    } else if (/^\d+\.\s/.test(trimmed)) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      const cleaned = trimmed.replace(/\*\*/g, '');
      const wrapped = doc.splitTextToSize(cleaned, pageWidth - 90);
      doc.text(wrapped, 50, y);
      y += wrapped.length * 12 + 2;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      const cleaned = trimmed.replace(/\*\*/g, '');
      const wrapped = doc.splitTextToSize(cleaned, pageWidth - 80);
      doc.text(wrapped, 40, y);
      y += wrapped.length * 12 + 3;
    }
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Divisi Produksi I - PT Batu Karang | Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 40, pageHeight - 20);
    doc.text(`Hal. ${i} / ${pageCount}`, pageWidth - 40, pageHeight - 20, { align: 'right' });
  }

  const cleanName = (fileName || 'Laporan_Eksekutif_Logistik_PP1').replace(/[\\/:*?"<>|]/g, '-') + '.pdf';
  doc.save(cleanName);
}

/**
 * Ekspor Laporan Resmi Auditor Harian Otomatis (Daily Reconciliation Detective)
 */
export function exportDailyAuditPdf(audit: any): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Header Instansi
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('PT BATU KARANG - DIVISI PRODUKSI I', 40, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('Laporan Hasil Audit Rekonsiliasi Harian (Auditor Detektif AI)', 40, 56);

  // Status Badge box
  const statusColor = audit.overallStatus === 'CLEAN' ? [16, 185, 129] : audit.overallStatus === 'PERHATIAN' ? [245, 158, 11] : [239, 68, 68];
  doc.setDrawColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.setFillColor(audit.overallStatus === 'CLEAN' ? 240 : 254, audit.overallStatus === 'CLEAN' ? 253 : 243, audit.overallStatus === 'CLEAN' ? 244 : 242);
  doc.roundedRect(pageWidth - 210, 28, 170, 36, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(`STATUS: ${audit.overallStatus}`, pageWidth - 200, 44);
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Akurasi Rekonsiliasi: ${audit.kpi.persentaseKesesuaian}%`, pageWidth - 200, 56);

  doc.setDrawColor(226, 232, 240);
  doc.line(40, 72, pageWidth - 40, 72);

  // Meta Info
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Tanggal Pemeriksaan : ${audit.tanggalStr} (${audit.tanggalIso})`, 40, 88);
  doc.text(`Total Transaksi Fisik: ${audit.kpi.totalTransaksiHariIni} entri | Masuk: ${audit.kpi.totalMasukKg.toLocaleString('id-ID')} Kg | Keluar: ${audit.kpi.totalKeluarKg.toLocaleString('id-ID')} Kg`, 40, 102);
  doc.text(`Hasil Olah Tervalidasi: ${audit.kpi.totalHasilProsesKg.toLocaleString('id-ID')} Kg | Total Deviasi/Selisih: ${audit.kpi.totalSelisihKg} Kg`, 40, 116);

  // Executive Summary text
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const summaryLines = doc.splitTextToSize(`Kesimpulan Detektif AI: "${audit.overallSummary}"`, pageWidth - 80);
  doc.text(summaryLines, 40, 134);

  let currentY = 134 + summaryLines.length * 12 + 10;

  // Table 1: Pemasukan Hasil Proses (Rajang II)
  if (audit.categories.pemasukanHasilProses.items.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('1. Audit Pemasukan Hasil Proses vs Kertas Kerja DHP (Rajang II)', 40, currentY);
    currentY += 8;

    const hpBody = audit.categories.pemasukanHasilProses.items.map((it: any) => [
      it.kode,
      `${it.fisikKg.toLocaleString('id-ID')} Kg`,
      `${it.kertasKerjaKg.toLocaleString('id-ID')} Kg`,
      it.selisihKg === 0 ? '0,0 Kg (Identik)' : `${it.selisihKg > 0 ? '+' : ''}${it.selisihKg.toLocaleString('id-ID')} Kg`,
      it.sumberKertasKerja,
      it.status === 'MATCH' ? 'VALID 100%' : 'ADA SELISIH'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Kode Bahan', 'Timbangan Fisik', 'Kertas Kerja DHP', 'Selisih', 'Rujukan Dokumen', 'Status Audit']],
      body: hpBody,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3.5 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 40, right: 40 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 16;
  }

  // Table 2: Pengeluaran Setoran (Rajang II)
  if (audit.categories.pengeluaranSetoran.items.length > 0) {
    if (currentY > pageHeight - 120) {
      doc.addPage();
      currentY = 40;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('2. Audit Pengeluaran Setoran vs Kertas Kerja BSPP SETORAN (Kolom H)', 40, currentY);
    currentY += 8;

    const setBody = audit.categories.pengeluaranSetoran.items.map((it: any) => [
      it.kode,
      `${it.fisikKg.toLocaleString('id-ID')} Kg`,
      `${it.kertasKerjaKg.toLocaleString('id-ID')} Kg`,
      it.selisihKg === 0 ? '0,0 Kg (Sesuai)' : `${it.selisihKg} Kg`,
      it.sumberKertasKerja,
      it.status === 'MATCH' ? 'COCOK' : 'BELUM COCOK'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Kode Bahan', 'Fisik Keluar', 'Label Netto Setoran', 'Selisih', 'Rujukan', 'Status']],
      body: setBody,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3.5 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 40, right: 40 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 16;
  }

  // Temuan & Rekomendasi
  if (currentY > pageHeight - 120) {
    doc.addPage();
    currentY = 40;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Temuan Pemeriksaan & Rekomendasi Tindakan Lapangan', 40, currentY);
  currentY += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  audit.detectiveFindings.forEach((f: string) => {
    const text = '• ' + f.replace(/[\*\•\-]/g, '');
    const wrapped = doc.splitTextToSize(text, pageWidth - 80);
    doc.text(wrapped, 40, currentY);
    currentY += wrapped.length * 11 + 3;
  });

  currentY += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Rekomendasi Operasional:', 40, currentY);
  currentY += 11;

  doc.setFont('helvetica', 'normal');
  audit.actionRecommendations.forEach((r: string) => {
    const text = '→ ' + r;
    const wrapped = doc.splitTextToSize(text, pageWidth - 80);
    doc.text(wrapped, 40, currentY);
    currentY += wrapped.length * 11 + 3;
  });

  // Footer Hal
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Divisi Produksi I - PT Batu Karang | Auditor Detektif AI | Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 40, pageHeight - 20);
    doc.text(`Hal. ${i} / ${pageCount}`, pageWidth - 40, pageHeight - 20, { align: 'right' });
  }

  const fileName = `Laporan_Audit_Harian_PP1_${audit.tanggalIso}.pdf`;
  doc.save(fileName);
}

/**
 * Menghasilkan Dokumen PDF Formal Rencana Penerapan Fitur Stock Opname
 * Khusus untuk Peran Developer & Site Engineer PT Batu Karang PP1
 */
export function exportStockOpnamePlanPdf(): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 40;
  const contentWidth = pageWidth - (marginLeft * 2);

  // === HALAMAN 1: IDENTITAS, RINGKASAN EKSEKUTIF & ARSITEKTUR ===
  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 75, 'F');

  doc.setFillColor(13, 148, 136); // teal-600 accent bar
  doc.rect(0, 75, pageWidth, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('PT BATU KARANG — DIVISI PRODUKSI I (PP1)', marginLeft, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('BLUEPRINT ARSITEKTUR & RENCANA PENERAPAN FITUR STOCK OPNAME PERIODIK', marginLeft, 48);
  doc.text('Dokumen Panduan Teknis Pengembang (Developer / Site Engineer) · Versi 1.0', marginLeft, 62);

  let currentY = 100;

  // Metadata Card
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(marginLeft, currentY, contentWidth, 54, 6, 6, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('ID DOKUMEN:', marginLeft + 12, currentY + 18);
  doc.text('STATUS BASELINE:', marginLeft + 180, currentY + 18);
  doc.text('TARGET PERILISAN:', marginLeft + 350, currentY + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('DOC-PP1-SO-BLUEPRINT-2026', marginLeft + 12, currentY + 34);
  doc.text('Milestone v2.0 Terkunci (Zero Regression)', marginLeft + 180, currentY + 34);
  doc.text('Kuartal IV 2026 / Triwulanan', marginLeft + 350, currentY + 34);

  currentY += 72;

  // Bab 1: Ringkasan Eksekutif & Keputusan Arsitektur
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Ringkasan Eksekutif & Keputusan Arsitektur (Opsi 3 Terpilih)', marginLeft, currentY);
  currentY += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const bab1Text = 
    'Berdasarkan analisa operasional pergudangan bahan baku (Tembakau, Krosok, Cengkeh, Blend) ' +
    'dan pembuktian selisih timbangan (BSPP) di PT Batu Karang, diputuskan penerapan Opsi 3: ' +
    'Kombinasi Konsolidasi Datasheet Multi-Unit + Input Lapangan Realtime via Tablet/HP + Sinkronisasi Dua Arah (Two-Way Sync). ' +
    'Arsitektur ini memastikan efisiensi penimbangan di lapangan tanpa mengubah atau merusak struktur pembukuan live yang sedang berjalan.';
  const wrappedBab1 = doc.splitTextToSize(bab1Text, contentWidth);
  doc.text(wrappedBab1, marginLeft, currentY);
  currentY += wrappedBab1.length * 11 + 10;

  // Tabel Pembanding Opsi
  autoTable(doc, {
    startY: currentY,
    head: [['Opsi Arsitektur', 'Karakteristik Alur', 'Kelebihan Lapangan', 'Status Rekomendasi']],
    body: [
      [
        'Opsi 1: Hanya Tarik Sheet Unit',
        'Web apps hanya membaca pasif dari sheet terpisah masing-masing unit.',
        'Tidak merubah cara lama tim unit.',
        'Kurang Ideal (Pasif, rentan salah ketik)'
      ],
      [
        'Opsi 2: Hanya Form Web Apps',
        'Input baru langsung di web apps lalu push ke sheet baru.',
        'Input cepat di Tablet/HP, validasi otomatis.',
        'Kurang Fleksibel jika unit butuh sheet lama'
      ],
      [
        'Opsi 3: Kombinasi Terintegrasi\n(Rekomendasi Utama)',
        'Web Apps sebagai Central Aggregator (baca data historis) + Form Input Lapangan Terkoneksi Two-Way Sync ke Master Sheet baru.',
        '100% aman, data permanen di Google Drive, auto-calculate deviasi vs Saldo Kode, ramah Tablet.',
        'DISETUJUI & DIREKOMENDASIKAN'
      ]
    ],
    theme: 'grid',
    styles: { fontSize: 7.8, cellPadding: 4, textColor: [30, 41, 59] },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 120, fontStyle: 'bold' },
      1: { cellWidth: 155 },
      2: { cellWidth: 140 },
      3: { cellWidth: 100, fontStyle: 'bold', textColor: [13, 148, 136] }
    },
    margin: { left: marginLeft, right: marginLeft }
  });

  currentY = (doc as any).lastAutoTable.finalY + 16;

  // Bab 2: Prinsip Keamanan & Jaminan Zero-Impact
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Jaminan Keamanan Sistem & Integritas Data Live (Zero-Impact Guarantee)', marginLeft, currentY);
  currentY += 14;

  const securityPoints = [
    'Strictly Read-Only pada Sheet Aktif: Sistem hanya membaca saldo berjalan/snapshot dari datasheet yang sudah ada, tanpa pernah menimpa atau mengedit sel lama.',
    'Pemisahan Sandboxing Data: Hasil opname disimpan di Sheet/Tab terpisah [DB_STOCK_OPNAME] pada Google Drive, mencegah interferensi dengan mutasi harian.',
    'Isolasi Kode Modular: Fitur opname berjalan sebagai modul baru yang terisolasi dari modul Mutasi, BSPP, Saldo Kode, dan Auditor Harian.',
    'Offline First & Auto-Flush: Jika koneksi WiFi gudang terputus saat penimbangan fisik, hasil input tersimpan di antrean lokal dan otomatis terkirim saat online.'
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  securityPoints.forEach(pt => {
    const w = doc.splitTextToSize('• ' + pt, contentWidth - 10);
    doc.text(w, marginLeft + 10, currentY);
    currentY += w.length * 11 + 3;
  });

  // === HALAMAN 2: SKEMA DATABASE & TWO-WAY SYNC ===
  doc.addPage();
  currentY = 40;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Spesifikasi Skema Database Master Google Sheets [DB_STOCK_OPNAME]', marginLeft, currentY);
  currentY += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Struktur kolom baku yang akan dibentuk pada Google Spreadsheet Master sebagai Single Source of Truth:', marginLeft, currentY);
  currentY += 10;

  autoTable(doc, {
    startY: currentY,
    head: [['Kolom', 'Nama Field', 'Tipe Data', 'Contoh Nilai', 'Fungsi & Logika']],
    body: [
      ['A', 'ID_Opname', 'String (PK)', 'SO-2026-Q4-001', 'Pengenal unik transaksi opname per entri'],
      ['B', 'Periode', 'String', 'Triwulan IV 2026', 'Siklus opname (Q1, Q2, Q3, Q4, Semester)'],
      ['C', 'Tanggal_Cutoff', 'Date (ISO)', '2026-10-15', 'Tanggal patokan pembekuan saldo buku'],
      ['D', 'Tanggal_Input', 'Timestamp', '2026-10-16 14:30', 'Waktu aktual penimbangan fisik di gudang'],
      ['E', 'Unit_Gudang', 'Enum', 'Rajang II / Krosok', 'Unit/lokasi penyimpanan fisik barang'],
      ['F', 'Kode_Bahan', 'String', 'KASTURI 2024 (BE) - 1', 'Kode unik grade/komoditas yang terdaftar'],
      ['G', 'Nama_Komoditas', 'String', 'Tembakau & Krosok', 'Kategori komoditas utama'],
      ['H', 'Saldo_Buku_Kg', 'Number (1 des)', '1.480,2', 'Saldo tercatat di sistem pada cut-off'],
      ['I', 'Fisik_Aktual_Kg', 'Number (1 des)', '1.480,0', 'Hasil timbangan fisik riil di lapangan'],
      ['J', 'Selisih_Kg', 'Number (Formula)', '-0,2', 'Kalkulasi: Fisik_Aktual - Saldo_Buku'],
      ['K', 'Persentase_Deviasi', 'Percentage', '-0,01%', 'Rasio deviasi terhadap saldo buku'],
      ['L', 'Status_Kesesuaian', 'Enum Status', 'KLOP 100% / SUSUT', 'Status audit (Klop, Wajar, Investigasi)'],
      ['M', 'Petugas_Auditor', 'String', 'Ahmad (Gudang) / Budi', 'Nama operator timbang & auditor yang bertugas']
    ],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 3.5, textColor: [30, 41, 59] },
    headStyles: { fillColor: [24, 95, 165], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 40, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 90, fontStyle: 'bold' },
      2: { cellWidth: 70 },
      3: { cellWidth: 105 },
      4: { cellWidth: 210 }
    },
    margin: { left: marginLeft, right: marginLeft }
  });

  currentY = (doc as any).lastAutoTable.finalY + 16;

  // Bab 4: Arsitektur Two-Way Sync
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('4. Arsitektur Integrasi Sinkronisasi Dua Arah (Two-Way Sync)', marginLeft, currentY);
  currentY += 12;

  const syncSteps = [
    'A. Jalur Tarik (GET from Sheets): Sistem mengambil riwayat periode opname sebelumnya dan membaca saldo cut-off untuk mengisi formulir operator secara otomatis.',
    'B. Jalur Kirim (POST to Sheets): Operator menimbang sak/ball di gudang -> input ke Tablet -> sistem menghitung deviasi instan -> operator klik "Finalisasi Opname" -> data ter-push ke Google Sheet secara atomic.',
    'C. Mekanisme Verifikasi Integritas: Endpoint GAS mengembalikan checksum dan status HTTP 200 dengan baris yang berhasil di-append sebagai bukti tersimpan aman.',
    'D. Fallback Otomatis: Bila sinyal gudang melemah, data masuk antrean buffer IndexedDB berstatus "Pending Sync" dengan indikator visual di UI.'
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  syncSteps.forEach(s => {
    const w = doc.splitTextToSize(s, contentWidth - 10);
    doc.text(w, marginLeft + 10, currentY);
    currentY += w.length * 11 + 3;
  });

  // === HALAMAN 3: SINKRONISASI SALDO KODE & INDIKATOR ===
  doc.addPage();
  currentY = 40;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('5. Sinkronisasi Terhadap Modul "Saldo Kode" & Sistem Indikator Visual', marginLeft, currentY);
  currentY += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const bab5Text = 
    'Salah satu persyaratan utama adalah hasil opname lapangan harus langsung tersinkronisasi ' +
    'dengan data bahan yang saat ini live pada menu "Saldo Kode". ' +
    'Untuk mencegah kesalahan akibat perbedaan waktu mutasi, sistem menerapkan komparasi berbasis Snapshot Tanggal Cut-Off ' +
    'dan menyematkan indikator visual langsung pada baris kode bahan.';
  const wrappedBab5 = doc.splitTextToSize(bab5Text, contentWidth);
  doc.text(wrappedBab5, marginLeft, currentY);
  currentY += wrappedBab5.length * 11 + 10;

  // 4 Kartu KPI Eksekutif
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('A. Empat Kartu KPI Eksekutif Opname (Top Executive Cards):', marginLeft, currentY);
  currentY += 10;

  autoTable(doc, {
    startY: currentY,
    head: [['Nama Kartu KPI', 'Formula / Logika Perhitungan', 'Visual & Indikator']],
    body: [
      [
        '1. Akurasi Stok (Stock Accuracy Rate)',
        '(Jumlah Kode Klop & Wajar / Total Kode Di-opname) × 100%',
        'Persentase besar hijau (misal: 98,4% Akurat)'
      ],
      [
        '2. Rasio Kesesuaian (Match Ratio)',
        'Akumulasi status kode: Match vs Susut Wajar vs Investigasi',
        'Badge rasio (misal: 32/35 Kode Klop Sempurna)'
      ],
      [
        '3. Deviasi Bersih (Net Variance)',
        'Σ (Fisik Aktual - Saldo Buku) seluruh bahan',
        'Angka selisih netto Kg & % deviasi terhadap total tonase'
      ],
      [
        '4. Cakupan Audit (Audit Coverage)',
        '(Tonase Bahan yang Sudah Ditimbang / Total Tonase Aktif) × 100%',
        'Progress bar kelengkapan opname gudang (100% Selesai)'
      ]
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 4, textColor: [30, 41, 59] },
    headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: 'bold' },
    margin: { left: marginLeft, right: marginLeft }
  });

  currentY = (doc as any).lastAutoTable.finalY + 16;

  // Sistem Badge Traffic Light
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('B. Sistem Badge Traffic Light pada Tabel Saldo Kode:', marginLeft, currentY);
  currentY += 10;

  autoTable(doc, {
    startY: currentY,
    head: [['Badge Status', 'Warna Visual', 'Kriteria Ambang Batas', 'Tindakan Sistem']],
    body: [
      ['KLOP 100%', 'Badge Hijau (Emerald)', 'Selisih timbang = 0,0 Kg (Identik)', 'Terverifikasi otomatis, auto-approved'],
      ['SUSUT WAJAR', 'Badge Kuning (Amber)', 'Selisih ≤ 0,5% (Toleransi kadar air/dryer)', 'Dicatat sebagai susut pengeringan wajar'],
      ['SELISIH INVESTIGASI', 'Badge Merah (Rose)', 'Selisih > 0,5% atau selisih di luar batas', 'Wajib input Berita Acara & cek fisik ulang'],
      ['BELUM DI-OPNAME', 'Badge Abu-abu (Slate)', 'Belum ada data input pada periode cut-off', 'Pengingat antrean penimbangan operator']
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 4, textColor: [30, 41, 59] },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    margin: { left: marginLeft, right: marginLeft }
  });

  // === HALAMAN 4: ROADMAP SPRINT & LEMBAR PENGESAHAN ===
  doc.addPage();
  currentY = 40;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('6. Rencana Eksekusi Bertahap (Sprint Roadmap Execution)', marginLeft, currentY);
  currentY += 14;

  autoTable(doc, {
    startY: currentY,
    head: [['Fase / Sprint', 'Fokus Pengembangan', 'Deliverables / Output']],
    body: [
      [
        'Sprint 1: Schema & Backend',
        'Penyusunan Tab [DB_STOCK_OPNAME] & Endpoint API GAS',
        '• Pemetaan ID Sheet yang dibagikan pengguna\n• Endpoint doGet(action: getStockOpname)\n• Endpoint doPost(action: saveStockOpname)'
      ],
      [
        'Sprint 2: UI Panel Lapangan',
        'Antarmuka Input Opname Ramah Tablet (Auto-Rotate)',
        '• Formulir hitung cepat per grade/sak\n• Fitur auto-fill Saldo Buku saat tanggal cut-off dipilih\n• Kalkulasi selisih Kg dan % real-time'
      ],
      [
        'Sprint 3: Integrasi Saldo Kode',
        'Sinkronisasi Dua Arah & Penyematan Badge Status',
        '• 4 Kartu KPI Eksekutif di header modul\n• Badge status audit pada baris tabel Saldo Kode live\n• Filter kode: Klop, Selisih, Belum Di-opname'
      ],
      [
        'Sprint 4: Berita Acara & Rilis',
        'Fitur Cetak Berita Acara (PDF) & Verifikasi Akhir',
        '• Template PDF Berita Acara Stock Opname resmi\n• Validasi uji beban tanpa regresi pada Baseline v2.0\n• Perilisan live ke seluruh pengguna'
      ]
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 4.5, textColor: [30, 41, 59] },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 110, fontStyle: 'bold' },
      1: { cellWidth: 175, fontStyle: 'bold' },
      2: { cellWidth: 230 }
    },
    margin: { left: marginLeft, right: marginLeft }
  });

  currentY = (doc as any).lastAutoTable.finalY + 24;

  // Lembar Pengesahan / Sign-off Teknis
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('7. Lembar Kesiapan Teknis & Persetujuan Pengembangan', marginLeft, currentY);
  currentY += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Dokumen ini menjadi acuan spesifikasi resmi saat ID Sheet diserahkan dan pembaruan siap dieksekusi:', marginLeft, currentY);
  currentY += 20;

  // Signature Boxes
  const boxWidth = (contentWidth - 20) / 2;
  
  // Box 1: Developer
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginLeft, currentY, boxWidth, 80, 4, 4, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Disiapkan Oleh: Software Engineer / Dev', marginLeft + 10, currentY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Status: Arsitektur Siap & Terverifikasi', marginLeft + 10, currentY + 30);
  doc.text('Tgl Verifikasi: ' + new Date().toLocaleDateString('id-ID'), marginLeft + 10, currentY + 44);
  doc.text('( AI Studio Engine — Divisi Produksi I )', marginLeft + 10, currentY + 70);

  // Box 2: Pengelola Sistem
  doc.roundedRect(marginLeft + boxWidth + 20, currentY, boxWidth, 80, 4, 4, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Disetujui Oleh: Pengelola Sistem / Auditor PP1', marginLeft + boxWidth + 30, currentY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Divisi Produksi I — PT Batu Karang', marginLeft + boxWidth + 30, currentY + 30);
  doc.text('Tgl Eksekusi: Menunggu Input ID Sheet', marginLeft + boxWidth + 30, currentY + 44);
  doc.text('( Kepala Bagian / Auditor Persediaan )', marginLeft + boxWidth + 30, currentY + 70);

  // Global Page Footer
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('PT BATU KARANG — BLUEPRINT STOCK OPNAME PERIODIK v1.0', marginLeft, pageHeight - 18);
    doc.text(`Halaman ${p} dari ${totalPages}`, pageWidth - marginLeft, pageHeight - 18, { align: 'right' });
  }

  doc.save('Blueprint_Rencana_Penerapan_Stock_Opname_PP1.pdf');
}


