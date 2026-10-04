import React, { useState } from 'react';
import { X, HelpCircle, ShieldAlert, CheckCircle2, User } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'cara' | 'aman'>('cara');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Panduan Penggunaan &amp; Keamanan Data
              </h2>
              <p className="text-xs text-slate-500">
                Monitoring Stock Persediaan PP1 · Divisi Produksi I PT Batu Karang
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subtabs */}
        <div className="flex border-b border-slate-200 px-5 pt-2 bg-slate-50/50 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('cara')}
            className={`pb-2.5 border-b-2 transition-all ${
              activeTab === 'cara'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Cara Penggunaan Modul
          </button>
          <button
            onClick={() => setActiveTab('aman')}
            className={`pb-2.5 border-b-2 transition-all ${
              activeTab === 'aman'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Aman vs Berbahaya di Google Sheets
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs sm:text-sm">
          {activeTab === 'cara' ? (
            <ol className="list-decimal pl-5 space-y-2.5 text-slate-700 leading-relaxed">
              <li>
                <strong>Sumber Data Asli:</strong> Data diambil dari spreadsheet mutasi masing-masing bahan (Blend, Cengkeh, Rajang I, Rajang II). Aplikasi ini bersifat <strong>read-only</strong> dan tidak pernah menghapus data spreadsheet sumber.
              </li>
              <li>
                <strong>Respons Seketika (0.01 detik):</strong> Berkat sistem caching lokal, layar aplikasi langsung merespons seketika saat dibuka atau saat mengganti filter tanpa menunggu latensi Google Sheets.
              </li>
              <li>
                <strong>Pembaruan Data (Refresh):</strong> Klik tombol <strong>"Refresh"</strong> di pojok kanan atas untuk mengambil data transaksi terbaru dari spreadsheet.
              </li>
              <li>
                <strong>Tab Mutasi Terbaru &amp; Pemisahan SKT/SKM:</strong> Menampilkan pergerakan stok lintas bahan lengkap dengan pemisahan jalur produksi SKT (Tangan) dan SKM (Mesin). Dilengkapi filter hierarkis Bahan &rarr; Kode/Grade &rarr; Jenis Mutasi &rarr; Rentang Tanggal, serta opsi sembunyikan mutasi 0.
              </li>
              <li>
                <strong>Kelola Jenis Mutasi Tambahan (Aman &amp; Non-Destruktif):</strong> Anda dapat menambah opsi jenis mutasi kustom langsung di web app (seperti <em>Sample Laboratorium / QC</em>, <em>Retur Pemakaian Produksi</em>, <em>Koreksi Fisik Stock Opname</em>, dll) dan memberi label pada transaksi. Fitur ini bekerja pada lapisan aplikasi sehingga <strong>100% aman dan tidak merusak rumus ataupun data Google Spreadsheet asli</strong>.
              </li>
              <li>
                <strong>Tab Saldo Kode / Grade:</strong> Memiliki dua mode: mode <em>Saldo Terkini</em> dan mode <em>Saldo Snapshot per Tanggal Tertentu</em> untuk audit dan rekonsiliasi data historis.
              </li>
              <li>
                <strong>Tab BSPP:</strong> Rekap Bukti Selisih Persediaan (Cengkeh &amp; Rajang II), membandingkan berat menurut label vendor vs timbang ulang gudang dengan rumus berbobot standar.
              </li>
              <li>
                <strong>Export PDF Resmi:</strong> Setiap modul dilengkapi tombol cetak / unduh PDF dengan kop judul resmi dan footer wajib <em>"Divisi Produksi I - All Rights Reserved"</em>.
              </li>
            </ol>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>✅ Aman Dilakukan di Spreadsheet Sumber:</span>
                </div>
                <ul className="list-disc pl-5 text-xs text-emerald-950 space-y-1">
                  <li>Ganti nama tab kartu stok di spreadsheet sumber — sistem otomatis mendeteksi nama barunya.</li>
                  <li>Tambah tab/kode/grade baru — otomatis ikut terbaca selama header baris 7 tetap mengandung kata "Tanggal" &amp; "Mutasi".</li>
                  <li>Ubah nama file Google Sheets di Google Drive — tidak berpengaruh karena sistem mengenali via Spreadsheet ID unik.</li>
                  <li>Tambah baris transaksi harian baru seperti biasa di tab manapun.</li>
                </ul>
              </div>

              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-rose-900 font-bold">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>⚠️ JANGAN Dilakukan Tanpa Konfirmasi Developer:</span>
                </div>
                <ul className="list-disc pl-5 text-xs text-rose-950 space-y-1">
                  <li>Jangan mengubah nama tab <strong>"REKAP BSPP"</strong> di spreadsheet Cengkeh karena nama ini dikunci di script.</li>
                  <li>Jangan menggeser atau menghapus urutan kolom Tanggal, Jenis Mutasi, Masuk/Keluar/Saldo di sheet mutasi, atau kolom E–M di sheet BSPP.</li>
                  <li>Jangan menghapus teks header baris 7 sehingga kata "Tanggal" atau "Mutasi" hilang.</li>
                  <li>Jangan mencabut hak akses share link spreadsheet dari akun yang menjalankan script.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/80 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Developer: Lalu Mahendra · Divisi Produksi I</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition-colors"
          >
            Mengerti &amp; Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
