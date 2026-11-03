import React, { useState, useEffect } from 'react';
import { 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  Eye, 
  Lock, 
  ShieldCheck, 
  Sliders, 
  CheckCircle2, 
  AlertCircle,
  X,
  LayoutDashboard,
  ArrowLeftRight,
  Layers,
  Calculator,
  Scale,
  BarChart3,
  Sparkles
} from 'lucide-react';
import { PublicPortalConfig } from '../../types';
import { PublicPortalService } from '../../services/publicPortalService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PublicPortalSettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<PublicPortalConfig>(() => PublicPortalService.getConfig());
  const [copied, setCopied] = useState<boolean>(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfig(PublicPortalService.getConfig());
      setCopied(false);
      setSaveNotice(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const publicUrl = PublicPortalService.getPublicUrl();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = publicUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handleToggle = (key: keyof PublicPortalConfig) => {
    const updated = PublicPortalService.saveConfig({ [key]: !config[key] });
    setConfig(updated);
    setSaveNotice('Pengaturan visibilitas tautan publik berhasil diperbarui.');
    setTimeout(() => setSaveNotice(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-start justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              <Share2 className="w-3.5 h-3.5" />
              <span>Tautan Publik Divisi Produksi I</span>
            </div>
            <h3 className="text-lg font-bold">Bagikan &amp; Atur Tautan Publik</h3>
            <p className="text-xs text-slate-300">
              Tautan ini dapat diakses oleh tim tanpa login dan hanya menampilkan menu yang Anda izinkan.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Link Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>URL Tautan Publik (Read-Only Tanpa Login):</span>
              </span>
              <span className="text-[11px] text-emerald-600 font-bold bg-emerald-100/70 px-2 py-0.5 rounded-full">
                Siap Dibagikan
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 select-all focus:outline-hidden"
              />
              <button
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all shadow-xs ${
                  copied 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Tersalin!' : 'Salin'}</span>
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition-colors"
                title="Buka pratinjau tautan publik di tab baru"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <p className="text-[11px] text-slate-500">
              Bagikan link ini ke grup WhatsApp tim. Siapa pun yang membuka tautan ini langsung dapat membaca data stok tanpa perlu akun.
            </p>
          </div>

          {saveNotice && (
            <div className="p-2.5 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveNotice}</span>
            </div>
          )}

          {/* Whitelist Menu Toggles */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                <span>Pilih Menu yang Ditampilkan ke Publik</span>
              </h4>
              <span className="text-[11px] text-slate-400">Atur sesuai kebutuhan divisi</span>
            </div>

            <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden text-xs">
              {/* Menu 1: Ringkasan Stok */}
              <label className="p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <LayoutDashboard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Ringkasan Stok</div>
                    <div className="text-[11px] text-slate-500">Overview 4 Bahan Baku Utama (Tembakau, Cengkeh, Krosok, Rajang II)</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.showRingkasan}
                  onChange={() => handleToggle('showRingkasan')}
                  className="w-4 h-4 text-indigo-600 rounded-md focus:ring-indigo-500 cursor-pointer"
                />
              </label>

              {/* Menu 2: Mutasi Lintas Bahan */}
              <label className="p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <ArrowLeftRight className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Mutasi Lintas Bahan</div>
                    <div className="text-[11px] text-slate-500">Mutasi masuk/keluar harian, filter komoditas &amp; cek list</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.showMutasi}
                  onChange={() => handleToggle('showMutasi')}
                  className="w-4 h-4 text-indigo-600 rounded-md focus:ring-indigo-500 cursor-pointer"
                />
              </label>

              {/* Menu 3: Saldo Bahan */}
              <label className="p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Saldo Bahan</div>
                    <div className="text-[11px] text-slate-500">Daftar saldo stok riil per grade/kode kartu persediaan</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.showSaldoKode}
                  onChange={() => handleToggle('showSaldoKode')}
                  className="w-4 h-4 text-indigo-600 rounded-md focus:ring-indigo-500 cursor-pointer"
                />
              </label>

              {/* Opsi Sub-Fitur: Kalkulator Estimasi Stock & Planing */}
              <label className="p-3 flex items-center justify-between bg-amber-50/40 hover:bg-amber-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-amber-950 flex items-center gap-1.5">
                      <span>Kalkulator Estimasi Stock &amp; Planing</span>
                      <span className="text-[10px] bg-amber-200 text-amber-900 font-semibold px-1.5 py-0.2 rounded-full">
                        Opsi Sub-Fitur
                      </span>
                    </div>
                    <div className="text-[11px] text-amber-900/80">
                      Rencana campuran blend &amp; formula kebutuhan pruf. <em>(Default: Nonaktif)</em>
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.showKalkulatorPruf}
                  onChange={() => handleToggle('showKalkulatorPruf')}
                  className="w-4 h-4 text-indigo-600 rounded-md focus:ring-indigo-500 cursor-pointer"
                />
              </label>

              {/* Menu 4: BSPP */}
              <label className="p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Bukti Selisih Persediaan (BSPP)</div>
                    <div className="text-[11px] text-slate-500">Laporan penyesuaian timbang &amp; selisih stok</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.showBspp}
                  onChange={() => handleToggle('showBspp')}
                  className="w-4 h-4 text-indigo-600 rounded-md focus:ring-indigo-500 cursor-pointer"
                />
              </label>

              {/* Menu 5: Analisa */}
              <label className="p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Analisa &amp; Grafik</div>
                    <div className="text-[11px] text-slate-500">Grafik pergerakan dan proporsi stok</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.showAnalisa}
                  onChange={() => handleToggle('showAnalisa')}
                  className="w-4 h-4 text-indigo-600 rounded-md focus:ring-indigo-500 cursor-pointer"
                />
              </label>

              {/* Menu 6: AI Logistik */}
              <label className="p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">AI Logistik &amp; Prediksi</div>
                    <div className="text-[11px] text-slate-500">Prediksi runout &amp; audit stok cerdas</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.showAiLogistik}
                  onChange={() => handleToggle('showAiLogistik')}
                  className="w-4 h-4 text-indigo-600 rounded-md focus:ring-indigo-500 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Keamanan & Proteksi Informasi */}
          <div className="p-3 rounded-xl bg-slate-100 text-slate-600 text-[11px] space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Proteksi Otomatis Link Publik:</span>
            </div>
            <p>
              Link publik secara otomatis meniadakan akses ke menu <em>Admin, Kelola Staf, Database GAS, Ganti Password,</em> dan tombol login. Siapa pun yang mengakses via link publik berada pada status <strong>Read-Only</strong> murni.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={handleCopyLink}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-xs transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin Tautan Publik'}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
