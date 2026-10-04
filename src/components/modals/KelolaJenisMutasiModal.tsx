import React, { useState, useEffect } from 'react';
import { CustomJenisMutasiItem } from '../../types';
import { GasService } from '../../services/gasService';
import { 
  X, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Layers, 
  RotateCcw, 
  FileSpreadsheet, 
  Info, 
  Check, 
  AlertCircle,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  Minus
} from 'lucide-react';

interface KelolaJenisMutasiModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalJenisList: string[];
  komoditasList: string[];
}

export const KelolaJenisMutasiModal: React.FC<KelolaJenisMutasiModalProps> = ({
  isOpen,
  onClose,
  originalJenisList,
  komoditasList
}) => {
  const [customList, setCustomList] = useState<CustomJenisMutasiItem[]>([]);
  const [activeTab, setActiveTab] = useState<'kustom' | 'asli'>('kustom');
  
  // Form state
  const [nama, setNama] = useState<string>('');
  const [komoditas, setKomoditas] = useState<string>('all');
  const [kategoriArus, setKategoriArus] = useState<'masuk' | 'keluar' | 'netral'>('keluar');
  const [keterangan, setKeterangan] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Load custom list
  const refreshList = () => {
    setCustomList(GasService.getCustomJenisMutasiList());
  };

  useEffect(() => {
    if (isOpen) {
      refreshList();
      setFeedbackMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) return;

    // Check if duplicate in custom or original
    const existsInCustom = customList.some(c => c.nama.toLowerCase().trim() === nama.toLowerCase().trim());
    const existsInOriginal = originalJenisList.some(o => o.toLowerCase().trim() === nama.toLowerCase().trim());

    if (existsInCustom || existsInOriginal) {
      setFeedbackMsg('Nama jenis mutasi tersebut sudah terdaftar.');
      return;
    }

    GasService.addCustomJenisMutasi({
      nama: nama.trim(),
      komoditas,
      kategoriArus,
      keterangan: keterangan.trim() || undefined
    });

    setNama('');
    setKeterangan('');
    setFeedbackMsg(`Jenis mutasi "${nama.trim()}" berhasil ditambahkan.`);
    refreshList();
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleDelete = (id: string, itemNama: string) => {
    GasService.deleteCustomJenisMutasi(id);
    refreshList();
    setFeedbackMsg(`Jenis mutasi "${itemNama}" berhasil dihapus.`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleReset = () => {
    if (confirm('Kembalikan jenis mutasi kustom ke daftar standar bawaan?')) {
      GasService.resetCustomJenisMutasi();
      refreshList();
      setFeedbackMsg('Daftar jenis mutasi kustom telah dikembalikan ke standar.');
      setTimeout(() => setFeedbackMsg(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white tracking-tight">
                Kelola Jenis Mutasi Tambahan
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-300">
                Kustomisasi opsi jenis mutasi di web app tanpa merusak data Google Sheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* 100% Safe Data Guarantee Banner */}
          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950 leading-relaxed">
              <p className="font-bold text-emerald-900 mb-0.5">
                Keamanan Data Spreadsheet Asli 100% Terjamin
              </p>
              <p className="text-[11.5px] text-emerald-800">
                Penambahan jenis mutasi di web app bekerja pada lapisan aplikasi (*application-layer*). Rumus, kolom, dan baris transaksi pada <strong>Google Spreadsheet asli tidak diubah atau dirusak sama sekali</strong>. Fitur ini aman digunakan untuk keperluan filter, pengelompokan analisis, dan pencatatan operasional.
              </p>
            </div>
          </div>

          {/* Feedback message */}
          {feedbackMsg && (
            <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
            <button
              onClick={() => setActiveTab('kustom')}
              className={`pb-2.5 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'kustom'
                  ? 'border-b-2 border-blue-600 text-blue-700'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>Jenis Mutasi Kustom Web</span>
              <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full text-[10.5px]">
                {customList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('asli')}
              className={`pb-2.5 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'asli'
                  ? 'border-b-2 border-blue-600 text-blue-700'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Bawaan Google Sheets Asli</span>
              <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded-full text-[10.5px]">
                {originalJenisList.length}
              </span>
            </button>
          </div>

          {/* TAB 1: JENIS MUTASI KUSTOM */}
          {activeTab === 'kustom' && (
            <div className="space-y-4">
              {/* Form Tambah */}
              <form onSubmit={handleAdd} className="bg-slate-50/80 p-3.5 sm:p-4 rounded-xl border border-slate-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-blue-600" />
                    <span>Tambah Jenis Mutasi Baru</span>
                  </h4>
                  <span className="text-[10.5px] text-slate-500">Tersimpan di browser &amp; web app</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-0.5">
                      Nama Jenis Mutasi *
                    </label>
                    <input
                      type="text"
                      value={nama}
                      onChange={e => setNama(e.target.value)}
                      placeholder="Contoh: Sample Laboratorium, Retur Produksi..."
                      required
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-0.5">
                      Arah Arus
                    </label>
                    <select
                      value={kategoriArus}
                      onChange={e => setKategoriArus(e.target.value as any)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="keluar">Pengeluaran (-)</option>
                      <option value="masuk">Pemasukan (+)</option>
                      <option value="netral">Netral / Penyesuaian</option>
                    </select>
                  </div>

                  <div className="sm:col-span-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-0.5">
                      Berlaku Untuk Bahan
                    </label>
                    <select
                      value={komoditas}
                      onChange={e => setKomoditas(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="all">Semua Bahan Baku</option>
                      {komoditasList.map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-0.5">
                      Keterangan / Fungsi Operasional
                    </label>
                    <input
                      type="text"
                      value={keterangan}
                      onChange={e => setKeterangan(e.target.value)}
                      placeholder="Catatan singkat peruntukan mutasi..."
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Simpan ke Web App</span>
                  </button>
                </div>
              </form>

              {/* List of Custom Types */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Daftar Jenis Mutasi Tambahan ({customList.length})</span>
                  <button
                    onClick={handleReset}
                    className="text-[10.5px] font-medium text-slate-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                    title="Kembalikan daftar ke standar"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset ke Standar</span>
                  </button>
                </div>

                {customList.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                    Belum ada jenis mutasi kustom yang ditambahkan.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {customList.map(item => (
                      <div key={item.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{item.nama}</span>
                            {item.kategoriArus === 'masuk' ? (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <ArrowDownLeft className="w-2.5 h-2.5" />
                                Masuk (+)
                              </span>
                            ) : item.kategoriArus === 'keluar' ? (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.2 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <ArrowUpRight className="w-2.5 h-2.5" />
                                Keluar (-)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                <Minus className="w-2.5 h-2.5" />
                                Netral
                              </span>
                            )}
                            <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.2 rounded-md font-semibold">
                              {item.komoditas === 'all' ? 'Semua Bahan' : item.komoditas}
                            </span>
                          </div>
                          {item.keterangan && (
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                              {item.keterangan}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => handleDelete(item.id, item.nama)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Hapus jenis mutasi ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: JENIS MUTASI DARI SHEET ASLI */}
          {activeTab === 'asli' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span>Daftar jenis mutasi asli yang saat ini terbaca dari Google Spreadsheet:</span>
                <span className="text-[10.5px] font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md">
                  Read-Only (Terkunci)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {originalJenisList.map((namaAsli, idx) => (
                  <div key={idx} className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-bold text-xs text-slate-800">{namaAsli}</span>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400">Sheet Asli</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500">
            Jenis mutasi tambahan akan otomatis muncul di filter panel Mutasi.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
