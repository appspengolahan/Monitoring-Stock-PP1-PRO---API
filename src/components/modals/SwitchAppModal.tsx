import React from 'react';
import { X, ExternalLink, Layers, CheckCircle2 } from 'lucide-react';

interface SwitchAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  allowedKomoditas?: string[];
}

export const SwitchAppModal: React.FC<SwitchAppModalProps> = ({ isOpen, onClose, allowedKomoditas = ['*'] }) => {
  if (!isOpen) return null;

  const allBoards = [
    {
      id: 'main',
      nama: 'Monitoring Stock Persediaan PP1',
      desc: 'Board saat ini (Tembakau, Krosok, Cengkeh, Blend & BSPP)',
      url: '#',
      commodityKey: 'all',
      isCurrent: true
    },
    {
      id: 'blend',
      nama: 'Rekap Susut Blend',
      desc: 'Monitoring susut pengolahan & rekap mixing blend tembakau',
      url: 'https://appspengolahan.github.io/Rekap-Proses-Blend/',
      commodityKey: 'blend',
      isCurrent: false
    },
    {
      id: 'cengkeh',
      nama: 'Rekap Susut Cengkeh',
      desc: 'Monitoring susut perajangan & drying cengkeh',
      url: 'https://appspengolahan.github.io/Rekap-proses-cengkeh/',
      commodityKey: 'cengkeh',
      isCurrent: false
    },
    {
      id: 'tembakau',
      nama: 'Rekap Susut Tembakau',
      desc: 'Rekapitulasi proses dan susut bahan tembakau',
      url: 'https://appspengolahan.github.io/Rekap-Proses-Tembakau/',
      commodityKey: 'tembakau',
      isCurrent: false
    },
    {
      id: 'krosok',
      nama: 'Rekap Susut Krosok',
      desc: 'Monitoring susut perajangan krosok (Rajang I & II)',
      url: 'https://appspengolahan.github.io/Rekap-Proses-Krosok/',
      commodityKey: 'krosok',
      isCurrent: false
    }
  ];

  // Filter boards based on user's allowed commodities
  const boards = allBoards.filter(b => {
    if (b.isCurrent) return true; // always show main board
    if (!allowedKomoditas || allowedKomoditas.includes('*') || allowedKomoditas.includes('all')) {
      return true;
    }
    return allowedKomoditas.some(ak => {
      const lower = ak.toLowerCase();
      if (lower === '*' || lower === 'all') return true;
      if (b.commodityKey === 'blend' && lower.includes('blend')) return true;
      if (b.commodityKey === 'cengkeh' && lower.includes('cengkeh')) return true;
      if (b.commodityKey === 'tembakau' && lower.includes('tembakau') && !lower.includes('blend')) return true;
      if (b.commodityKey === 'krosok' && lower.includes('krosok')) return true;
      return false;
    });
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Pindah Board / Switch App
              </h2>
              <p className="text-xs text-slate-500">
                Akses board monitoring lainnya di Divisi Produksi I
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

        <div className="p-5 space-y-2.5">
          {boards.map(b => (
            <div
              key={b.nama}
              className={`p-3.5 rounded-xl border transition-all ${
                b.isCurrent
                  ? 'bg-blue-50/80 border-blue-200 text-blue-900'
                  : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                    <span>{b.nama}</span>
                    {b.isCurrent && (
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {b.desc}
                  </p>
                </div>

                {!b.isCurrent ? (
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg shrink-0 transition-colors"
                    title="Buka di tab baru"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end bg-slate-50/80">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
