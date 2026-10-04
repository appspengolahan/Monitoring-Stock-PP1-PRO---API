import React, { useState, useEffect } from 'react';
import { GasService } from '../../services/gasService';
import { 
  X, 
  Sliders, 
  Check, 
  AlertCircle, 
  RotateCcw, 
  CheckSquare, 
  Square,
  ShieldCheck,
  Info,
  Sparkles
} from 'lucide-react';

interface SktSkmSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged?: () => void;
}

const COMMODITY_METADATA: { name: string; desc: string; defaultActive: boolean; statusLabel: string }[] = [
  {
    name: 'Tembakau & Krosok (Rajang II)',
    desc: 'Memiliki 2 jalur mutasi di Google Sheets (Kolom D: T Masuk/Keluar/Saldo & Kolom G: M Masuk/Keluar/Saldo).',
    defaultActive: true,
    statusLabel: 'Mendukung Dual-Lane (SKT & SKM)'
  },
  {
    name: 'Tembakau Blend',
    desc: 'Format kartu stok saat ini menggunakan alur tunggal (Single-Lane: Kolom C Masuk, Kolom D Keluar, Kolom E Saldo).',
    defaultActive: false,
    statusLabel: 'Format Standar (Single-Lane)'
  },
  {
    name: 'Tembakau & Krosok (Rajang I)',
    desc: 'Format kartu stok saat ini menggunakan alur tunggal (Single-Lane). Pemisahan SKT & SKM belum diterapkan.',
    defaultActive: false,
    statusLabel: 'Format Standar (Single-Lane)'
  },
  {
    name: 'Cengkeh',
    desc: 'Format kartu stok alur tunggal persediaan gudang cengkeh murni.',
    defaultActive: false,
    statusLabel: 'Format Standar (Single-Lane)'
  }
];

export const SktSkmSettingsModal: React.FC<SktSkmSettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigChanged
}) => {
  const [config, setConfig] = useState<Record<string, boolean>>(() => GasService.getSktSkmConfig());
  const [showSavedNotification, setShowSavedNotification] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(GasService.getSktSkmConfig());
      setShowSavedNotification(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = (commodityName: string) => {
    const nextVal = !config[commodityName];
    const newConfig = { ...config, [commodityName]: nextVal };
    setConfig(newConfig);
    GasService.setSktSkmActiveForKomoditas(commodityName, nextVal);
    setShowSavedNotification(true);
    if (onConfigChanged) onConfigChanged();
    setTimeout(() => setShowSavedNotification(false), 2000);
  };

  const handleResetDefault = () => {
    const defaultVal: Record<string, boolean> = {
      'Tembakau & Krosok (Rajang II)': true,
      'Tembakau Blend': false,
      'Cengkeh': false,
      'Tembakau & Krosok (Rajang I)': false
    };
    for (const [key, val] of Object.entries(defaultVal)) {
      GasService.setSktSkmActiveForKomoditas(key, val);
    }
    setConfig(defaultVal);
    setShowSavedNotification(true);
    if (onConfigChanged) onConfigChanged();
    setTimeout(() => setShowSavedNotification(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Sliders className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Pengaturan Fitur Jalur SKT &amp; SKM
              </h2>
              <p className="text-xs text-slate-500">
                Pilih bahan baku yang menerapkan pemisahan Sigaret Kretek Tangan &amp; Mesin
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

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Note Banner */}
          <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-blue-950">Catatan Operasional:</p>
              <p className="text-blue-800/90 leading-relaxed">
                Pemisahan SKT dan SKM saat ini secara default <strong>hanya aktif pada Tembakau &amp; Krosok (Rajang II)</strong>. 
                Untuk <strong>Tembakau Blend</strong> dan <strong>Tembakau &amp; Krosok (Rajang I)</strong>, fitur ini disembunyikan agar tampilan saldo tetap presisi sesuai kolom spreadsheet alur tunggal.
              </p>
            </div>
          </div>

          {/* Checklist Items */}
          <div className="space-y-2.5 pt-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Pilihan Bahan Baku (Centang untuk Mengaktifkan):
            </label>

            {COMMODITY_METADATA.map(item => {
              const isActive = !!config[item.name];

              return (
                <div
                  key={item.name}
                  onClick={() => handleToggle(item.name)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    isActive
                      ? 'bg-amber-50/60 border-amber-300 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isActive ? (
                      <div className="w-5 h-5 rounded-md bg-amber-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-md border-2 border-slate-300 bg-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {item.name}
                      </h4>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        isActive
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isActive ? 'SKT & SKM Aktif' : 'Single-Lane (Total Saja)'}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-slate-500 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Notification when updated */}
          {showSavedNotification && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-in fade-in duration-150">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Pengaturan berhasil diperbarui dan diterapkan ke seluruh dashboard!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            onClick={handleResetDefault}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            title="Kembalikan konfigurasi awal (Hanya Rajang II yang aktif)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset ke Default</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            Selesai &amp; Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
