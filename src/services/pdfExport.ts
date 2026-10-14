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

