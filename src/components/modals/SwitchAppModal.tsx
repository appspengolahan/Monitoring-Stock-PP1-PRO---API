import React, { useState } from 'react';
import { 
  X, 
  ExternalLink, 
  Layers, 
  CheckCircle2, 
  Edit3, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Check, 
  AlertCircle,
  Globe,
  Tag
} from 'lucide-react';
import { useSwitchBoards, SwitchBoardItem } from '../../services/switchboardService';

interface SwitchAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  allowedKomoditas?: string[];
  canManage?: boolean;
}

export const SwitchAppModal: React.FC<SwitchAppModalProps> = ({ 
  isOpen, 
  onClose, 
  allowedKomoditas = ['*'],
  canManage = false
}) => {
  const { boards, updateBoards, resetBoards } = useSwitchBoards();
  
  // State manajemen/edit
  const [isManageMode, setIsManageMode] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<SwitchBoardItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  
  // Form state
  const [formNama, setFormNama] = useState<string>('');
  const [formDesc, setFormDesc] = useState<string>('');
  const [formUrl, setFormUrl] = useState<string>('');
  const [formCommodity, setFormCommodity] = useState<string>('all');
  const [formError, setFormError] = useState<string>('');
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  if (!isOpen) return null;

  // Filter boards berdasarkan hak akses komoditas user
  const visibleBoards = boards.filter(b => {
    if (b.isCurrent) return true; // Board saat ini selalu tampil
    if (!allowedKomoditas || allowedKomoditas.includes('*') || allowedKomoditas.includes('all')) {
      return true;
    }
    const cKey = (b.commodityKey || 'all').toLowerCase();
    if (cKey === 'all' || cKey === 'custom') return true;

    return allowedKomoditas.some(ak => {
      const lower = ak.toLowerCase();
      if (lower === '*' || lower === 'all') return true;
      if (cKey === 'blend' && lower.includes('blend')) return true;
      if (cKey === 'cengkeh' && lower.includes('cengkeh')) return true;
      if (cKey === 'tembakau' && lower.includes('tembakau') && !lower.includes('blend')) return true;
      if (cKey === 'krosok' && lower.includes('krosok')) return true;
      return false;
    });
  });

  const handleStartEdit = (item: SwitchBoardItem) => {
    setEditingItem(item);
    setIsAddingNew(false);
    setFormNama(item.nama);
    setFormDesc(item.desc);
    setFormUrl(item.url);
    setFormCommodity(item.commodityKey || 'all');
    setFormError('');
  };

  const handleStartAddNew = () => {
    setEditingItem(null);
    setIsAddingNew(true);
    setFormNama('');
    setFormDesc('');
    setFormUrl('https://');
    setFormCommodity('all');
    setFormError('');
  };

  const handleCancelForm = () => {
    setEditingItem(null);
    setIsAddingNew(false);
    setFormError('');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) {
      setFormError('Nama modul tidak boleh kosong');
      return;
    }
    let sanitizedUrl = formUrl.trim();
    if (!sanitizedUrl) {
      setFormError('URL tautan tidak boleh kosong');
      return;
    }
    if (!sanitizedUrl.startsWith('http://') && !sanitizedUrl.startsWith('https://') && sanitizedUrl !== '#') {
      sanitizedUrl = 'https://' + sanitizedUrl;
    }

    if (isAddingNew) {
      const newItem: SwitchBoardItem = {
        id: 'custom_' + Date.now(),
        nama: formNama.trim(),
        desc: formDesc.trim() || 'Monitoring proses susut Divisi Produksi I',
        url: sanitizedUrl,
        commodityKey: formCommodity,
        isCurrent: false,
        isCustom: true
      };
      updateBoards([...boards, newItem]);
    } else if (editingItem) {
      const updated = boards.map(b => {
        if (b.id === editingItem.id) {
          return {
            ...b,
            nama: formNama.trim(),
            desc: formDesc.trim(),
            url: sanitizedUrl,
            commodityKey: formCommodity
          };
        }
        return b;
      });
      updateBoards(updated);
    }

    handleCancelForm();
  };

  const handleDeleteItem = (id: string) => {
    const target = boards.find(b => b.id === id);
    if (!target) return;
    if (window.confirm(`Yakin ingin menghapus tautan "${target.nama}"?`)) {
      const updated = boards.filter(b => b.id !== id);
      updateBoards(updated);
      if (editingItem?.id === id) {
        handleCancelForm();
      }
    }
  };

  const handleResetToDefault = () => {
    resetBoards();
    setShowResetConfirm(false);
    handleCancelForm();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Layers className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Switch Board Susut</span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-200/80">
                  {visibleBoards.length} Board
                </span>
              </h2>
              <p className="text-xs text-slate-500 truncate">
                {canManage 
                  ? 'Akses & kelola ekosistem monitoring susut Divisi Produksi I' 
                  : 'Akses ekosistem monitoring susut Divisi Produksi I'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {canManage && (
              <button
                onClick={() => {
                  setIsManageMode(!isManageMode);
                  handleCancelForm();
                  setShowResetConfirm(false);
                }}
                className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                  isManageMode 
                    ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
                title={isManageMode ? "Kembali ke mode pilih board" : "Kelola nama modul & tautan URL"}
              >
                <Edit3 className="w-4 h-4" />
                <span className="hidden sm:inline">{isManageMode ? 'Selesai Kelola' : 'Kelola / Edit'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              title="Tutup dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {/* Konfirmasi Reset Default */}
          {showResetConfirm && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2 text-xs animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Kembalikan ke Setelan URL Default Vercel?</span>
              </div>
              <p className="text-amber-700">
                Semua tautan Rekap Proses Blend, Krosok, Tembakau, dan Cengkeh akan diatur ulang ke domain default Vercel yang telah ditentukan. Modul tambahan baru akan dihapus.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-2xs transition-colors"
                >
                  Ya, Reset ke Default
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 font-medium rounded-lg hover:bg-amber-100/50 transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* Form Tambah Baru atau Edit */}
          {canManage && (isAddingNew || editingItem) ? (
            <form onSubmit={handleSaveForm} className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3.5 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                <div className="font-bold text-sm text-blue-900 flex items-center gap-2">
                  {isAddingNew ? <Plus className="w-4 h-4 text-blue-600" /> : <Edit3 className="w-4 h-4 text-blue-600" />}
                  <span>{isAddingNew ? 'Tambah Modul / Tautan Baru' : `Edit: ${editingItem?.nama}`}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                >
                  Batal
                </button>
              </div>

              {formError && (
                <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Nama Modul</label>
                <input
                  type="text"
                  value={formNama}
                  onChange={e => setFormNama(e.target.value)}
                  placeholder="Contoh: Rekap Proses Blend"
                  className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-500" />
                  <span>URL Tautan (Domain Vercel / Web Apps)</span>
                </label>
                <input
                  type="text"
                  value={formUrl}
                  onChange={e => setFormUrl(e.target.value)}
                  placeholder="https://rekap-data-..."
                  className="w-full px-3 py-2 text-xs font-mono bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <span>Kategori Bahan</span>
                  </label>
                  <select
                    value={formCommodity}
                    onChange={e => setFormCommodity(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  >
                    <option value="all">Semua Bahan / Umum</option>
                    <option value="blend">Blend Tembakau</option>
                    <option value="cengkeh">Cengkeh</option>
                    <option value="tembakau">Tembakau</option>
                    <option value="krosok">Krosok Rajang</option>
                    <option value="custom">Lainnya / Khusus</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Keterangan Singkat</label>
                  <input
                    type="text"
                    value={formDesc}
                    onChange={e => setFormDesc(e.target.value)}
                    placeholder="Contoh: Monitoring susut pengolahan"
                    className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  {editingItem && !editingItem.isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(editingItem.id)}
                      className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 font-semibold p-1 hover:bg-rose-50 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Modul</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-lg transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Simpan</span>
                  </button>
                </div>
              </div>
            </form>
          ) : null}

          {/* Daftar Modul */}
          <div className="space-y-2.5">
            {visibleBoards.map((b) => {
              const isCurrent = !!b.isCurrent;
              return (
                <div
                  key={b.id}
                  className={`p-3.5 rounded-xl border transition-all relative group ${
                    isCurrent
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 text-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {b.nama}
                        </span>
                        {isCurrent ? (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Sedang Dibuka
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[220px]">
                            {b.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {b.desc}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      {canManage && isManageMode && !isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(b)}
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                          title="Edit nama modul atau URL"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}

                      {!isCurrent ? (
                        <a
                          href={b.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all shrink-0 cursor-pointer"
                          title={`Buka ${b.nama} di tab baru`}
                        >
                          <span>Buka</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <div className="p-2 text-emerald-600 shrink-0" title="Aplikasi aktif saat ini">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-2">
            {canManage && !isAddingNew && !editingItem && (
              <button
                type="button"
                onClick={handleStartAddNew}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span>Tambah Modul</span>
              </button>
            )}

            {canManage && isManageMode && !showResetConfirm && (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-colors"
                title="Reset kembali ke URL default Vercel"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset Default</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition-colors cursor-pointer shadow-2xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
