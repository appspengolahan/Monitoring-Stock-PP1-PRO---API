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
  Tag,
  Copy,
  Upload,
  Info,
  AlertTriangle
} from 'lucide-react';
import { 
  useSwitchBoards, 
  SwitchBoardItem, 
  isVercelUrl, 
  isCloudflareUrl, 
  SwitchBoardService 
} from '../../services/switchboardService';
import { StockAppsConfirmModal } from './StockAppsConfirmModal';

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
  const { boards, updateBoards, resetBoards, importBoards } = useSwitchBoards();
  
  // State manajemen/edit
  const [isManageMode, setIsManageMode] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<SwitchBoardItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  
  // State Impor / Ekspor JSON
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [importStatusMsg, setImportStatusMsg] = useState<{ isError: boolean; text: string } | null>(null);
  const [copyToast, setCopyToast] = useState<boolean>(false);

  // Form state
  const [formNama, setFormNama] = useState<string>('');
  const [formDesc, setFormDesc] = useState<string>('');
  const [formUrl, setFormUrl] = useState<string>('');
  const [formCommodity, setFormCommodity] = useState<string>('all');
  const [formError, setFormError] = useState<string>('');
  
  // Custom Centered Confirmation Dialog ('monitoring stock apps says')
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: 'monitoring stock apps says',
    message: '',
    onConfirm: () => {}
  });

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
    setConfirmModal({
      isOpen: true,
      title: 'monitoring stock apps says',
      message: `Yakin ingin menghapus tautan "${target.nama}"?`,
      confirmLabel: 'OK',
      cancelLabel: 'Cancel',
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        const updated = boards.filter(b => b.id !== id);
        updateBoards(updated);
        if (editingItem?.id === id) {
          handleCancelForm();
        }
      }
    });
  };

  const handlePromptReset = () => {
    setConfirmModal({
      isOpen: true,
      title: 'monitoring stock apps says',
      message: 'Kembalikan setelan modul ke daftar default Vercel? Semua tautan kustom tambahan akan diatur ulang.',
      confirmLabel: 'OK',
      cancelLabel: 'Cancel',
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        resetBoards();
        handleCancelForm();
      }
    });
  };

  return (
    <>
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
                <span>Switch Board Data Proses</span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-200/80">
                  {visibleBoards.length} Board
                </span>
              </h2>
              <p className="text-xs text-slate-500 truncate">
                {canManage 
                  ? 'Akses & kelola ekosistem monitoring data proses Divisi Produksi I' 
                  : 'Akses ekosistem monitoring data proses Divisi Produksi I'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {canManage && (
              <button
                onClick={() => {
                  setIsManageMode(!isManageMode);
                  handleCancelForm();
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

          {/* Banner Pemberitahuan Multi-Device saat Mode Kelola Aktif */}
          {canManage && isManageMode && (
            <div className="p-3.5 rounded-xl bg-blue-50/90 border border-blue-200 text-xs text-blue-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-blue-950">
                <Info className="w-4 h-4 text-blue-700 shrink-0" />
                <span>Catatan Penting Sinkronisasi Antar Perangkat &amp; Incognito:</span>
              </div>
              <p className="text-[11.5px] text-blue-800 leading-relaxed">
                Tautan yang Anda edit lewat menu ini awalnya disimpan di peramban (Local Storage) perangkat ini. Agar tautan Cloudflare baru aktif <strong>secara otomatis di seluruh perangkat (HP, laptop lain, PC rekan kerja) dan mode Incognito</strong> tanpa perlu disetel ulang satu per satu:
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const json = SwitchBoardService.exportConfigJson(boards);
                    navigator.clipboard.writeText(json);
                    setCopyToast(true);
                    setTimeout(() => setCopyToast(false), 3000);
                  }}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer text-[11px]"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copyToast ? 'Tersalin ke Clipboard!' : 'Salin Konfigurasi (JSON)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportJsonText('');
                    setImportStatusMsg(null);
                    setIsImportModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-blue-900 border border-blue-300 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-[11px]"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-700" />
                  <span>Impor / Tempel JSON</span>
                </button>
                <span className="text-[11px] text-blue-700 italic">
                  Atau kirim URL Cloudflare Anda ke chat AI Studio agar ditanam langsung ke kode sumber!
                </span>
              </div>
            </div>
          )}

          {/* Daftar Modul */}
          <div className="space-y-2.5">
            {visibleBoards.map((b) => {
              const isCurrent = !!b.isCurrent;
              const hasVercel = isVercelUrl(b.url);
              const hasCloudflare = isCloudflareUrl(b.url);

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
                          <>
                            <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[200px]" title={b.url}>
                              {b.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                            </span>
                            {hasVercel && (
                              <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/90 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-1" title="Aplikasi di Vercel kemungkinan sedang paused / halaman putih">
                                <AlertTriangle className="w-3 h-3 text-amber-700" />
                                <span>Vercel (Mungkin Paused)</span>
                              </span>
                            )}
                            {hasCloudflare && (
                              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Cloudflare</span>
                              </span>
                            )}
                          </>
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

            {canManage && isManageMode && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const json = SwitchBoardService.exportConfigJson(boards);
                    navigator.clipboard.writeText(json);
                    setCopyToast(true);
                    setTimeout(() => setCopyToast(false), 3000);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer border border-blue-200"
                  title="Salin semua tautan ke clipboard"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{copyToast ? 'Tersalin!' : 'Salin JSON'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setImportJsonText('');
                    setImportStatusMsg(null);
                    setIsImportModalOpen(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border border-slate-300"
                  title="Tempel konfigurasi JSON dari perangkat lain"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Impor JSON</span>
                </button>

                <button
                  type="button"
                  onClick={handlePromptReset}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer"
                  title="Reset kembali ke URL default sistem"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset Default</span>
                </button>
              </>
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

    {/* Modal Impor Konfigurasi JSON */}
    {isImportModalOpen && (
      <div className="fixed inset-0 z-[70] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden my-auto animate-in zoom-in-95 duration-150 flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Impor Konfigurasi Switchboard</h4>
                <p className="text-[11px] text-slate-500">Tempel JSON dari perangkat lain untuk sinkronisasi cepat</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsImportModalOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-3">
            {importStatusMsg && (
              <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                importStatusMsg.isError 
                  ? 'bg-rose-50 border-rose-200 text-rose-700' 
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
                {importStatusMsg.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
                <span>{importStatusMsg.text}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">JSON Konfigurasi Modul</label>
              <textarea
                value={importJsonText}
                onChange={e => setImportJsonText(e.target.value)}
                rows={7}
                placeholder='[{"id":"blend","nama":"Rekap Proses Blend","url":"https://...workers.dev",...}]'
                className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                if (!importJsonText.trim()) {
                  setImportStatusMsg({ isError: true, text: 'Harap masukkan teks JSON terlebih dahulu' });
                  return;
                }
                const res = importBoards(importJsonText);
                if (res.ok) {
                  setImportStatusMsg({ isError: false, text: res.message });
                  setTimeout(() => {
                    setIsImportModalOpen(false);
                  }, 1200);
                } else {
                  setImportStatusMsg({ isError: true, text: res.message });
                }
              }}
              className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
            >
              Terapkan JSON
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Centered Pop-up Modal: Edit & Tambah Modul */}
    {canManage && (isAddingNew || editingItem) && (
      <div className="fixed inset-0 z-[60] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden my-auto animate-in zoom-in-95 duration-150 flex flex-col">
          {/* Header Pop-up */}
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-teal-50/90 to-emerald-50/70 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#00696b] text-white flex items-center justify-center shadow-xs">
                {isAddingNew ? <Plus className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#00696b] uppercase tracking-wider">
                  monitoring stock apps says
                </div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900">
                  {isAddingNew ? 'Tambah Modul / Tautan Baru' : `Edit: ${editingItem?.nama}`}
                </h4>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancelForm}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSaveForm} className="p-5 sm:p-6 space-y-4">
            {formError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Nama Modul</label>
              <input
                type="text"
                value={formNama}
                onChange={e => setFormNama(e.target.value)}
                placeholder="Contoh: Rekap Proses Blend"
                className="w-full px-3.5 py-2.5 text-xs bg-white rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#00696b] text-slate-900"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#00696b]" />
                <span>URL Tautan (Domain Cloudflare / Web Apps)</span>
              </label>
              <input
                type="text"
                value={formUrl}
                onChange={e => setFormUrl(e.target.value)}
                placeholder="https://...workers.dev atau https://...pages.dev"
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-white rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#00696b] text-slate-900"
                required
              />
              {isVercelUrl(formUrl) && (
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    URL ini masih menggunakan domain <strong>.vercel.app</strong> yang saat ini mengalami status paused. Ganti dengan tautan hasil deploy Cloudflare (misalnya berakhiran <code>.workers.dev</code> atau <code>.pages.dev</code>) agar halaman tidak putih/kosong.
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span>Kategori Bahan</span>
                </label>
                <select
                  value={formCommodity}
                  onChange={e => setFormCommodity(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-white rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#00696b] text-slate-900 font-medium"
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
                <label className="text-xs font-bold text-slate-700">Keterangan Singkat</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Contoh: Monitoring susut pengolahan"
                  className="w-full px-3.5 py-2.5 text-xs bg-white rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#00696b] text-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <div>
                {editingItem && !editingItem.isCurrent && (
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(editingItem.id)}
                    className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1.5 font-bold p-1.5 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus Modul</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#00696b] hover:bg-[#005254] text-white rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Centered Modal: Konfirmasi Hapus & Reset */}
    <StockAppsConfirmModal
      isOpen={confirmModal.isOpen}
      title={confirmModal.title}
      message={confirmModal.message}
      confirmLabel={confirmModal.confirmLabel}
      cancelLabel={confirmModal.cancelLabel}
      onConfirm={confirmModal.onConfirm}
      onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
    />
  </>
);
};
