import React, { useState } from 'react';
import { 
  Download, 
  Smartphone, 
  Share, 
  PlusSquare, 
  Check, 
  X, 
  Sparkles, 
  ShieldCheck, 
  ExternalLink 
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({ isOpen, onClose }) => {
  const { isPromptReady, isInstalled, isIOS, triggerInstall } = usePWAInstall();
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const success = await triggerInstall();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
        setInstallSuccess(false);
      }, 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600 shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Install Aplikasi di HP
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Monitoring Stock PP1 (PWA Standalone)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Benefits Preview */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2.5 text-xs text-slate-600">
          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-slate-800">Layar Penuh Tanpa Browser Bar:</span> Aplikasi terbuka seperti aplikasi native (Play Store/App Store).
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-slate-800">Akses Cepat 1 Sentuhan:</span> Ikon aplikasi resmi langsung muncul di Home Screen smartphone Anda.
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-slate-800">Aman &amp; Super Cepat:</span> Data cache tersimpan instan untuk inspeksi lapangan di pabrik.
            </div>
          </div>
        </div>

        {/* Status / Instructions based on Device */}
        {isInstalled ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-emerald-900">
              Aplikasi Sudah Terpasang!
            </p>
            <p className="text-xs text-emerald-700">
              Anda sudah bisa membuka aplikasi ini langsung dari layar beranda smartphone.
            </p>
          </div>
        ) : isIOS ? (
          /* iOS Safari Guide */
          <div className="space-y-3 bg-blue-50/70 border border-blue-100 p-4 rounded-2xl">
            <p className="text-xs font-bold text-blue-900">
              Petunjuk Pasang di iPhone / iPad (Safari):
            </p>
            <ol className="text-xs text-blue-900/90 space-y-2 list-decimal list-inside font-medium">
              <li className="flex items-center gap-2">
                <span>1. Ketuk tombol </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-blue-200 rounded-md font-semibold text-blue-700 shadow-2xs">
                  <Share className="w-3.5 h-3.5" /> Bagikan (Share)
                </span>
                <span> di Safari</span>
              </li>
              <li className="flex items-center gap-2">
                <span>2. Gulir ke bawah &amp; pilih </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-blue-200 rounded-md font-semibold text-blue-700 shadow-2xs">
                  <PlusSquare className="w-3.5 h-3.5" /> Tambah ke Layar Utama
                </span>
              </li>
              <li>3. Ketuk <strong>Tambah (Add)</strong> di pojok kanan atas.</li>
            </ol>
          </div>
        ) : isPromptReady ? (
          /* Android / Chrome One-Click Install */
          <div className="space-y-3">
            <button
              onClick={handleInstallClick}
              className="w-full py-3.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-98"
            >
              <Download className="w-5 h-5" />
              <span>Pasang ke Layar Utama Sekarang</span>
            </button>
            <p className="text-[11px] text-center text-slate-500">
              Gratis, tanpa unduhan file berat APK, dan hemat memori ponsel.
            </p>
          </div>
        ) : (
          /* Fallback Android Chrome Manual Guide if prompt not yet fired */
          <div className="space-y-3 bg-amber-50/80 border border-amber-200 p-4 rounded-2xl text-xs text-amber-900">
            <p className="font-bold">
              Cara Pasang Manual di Google Chrome / Browser Android:
            </p>
            <ol className="space-y-1.5 list-decimal list-inside font-medium text-amber-800">
              <li>Ketuk ikon titik tiga (<strong>⋮</strong>) di pojok kanan atas browser.</li>
              <li>Pilih menu <strong>&quot;Tambahkan ke Layar Utama&quot;</strong> atau <strong>&quot;Install Aplikasi&quot;</strong>.</li>
              <li>Ketuk <strong>Install</strong> untuk konfirmasi.</li>
            </ol>
          </div>
        )}

        {/* Footer info */}
        <div className="pt-2 text-center">
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
