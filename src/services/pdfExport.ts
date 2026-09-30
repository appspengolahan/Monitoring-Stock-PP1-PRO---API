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
