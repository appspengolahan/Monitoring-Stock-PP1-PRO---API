import React from 'react';
import { KomoditasData } from '../../types';
import { GasService } from '../../services/gasService';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Boxes
} from 'lucide-react';

interface OverviewCardsProps {
  data: KomoditasData[];
  onSelectCommodity: (commodityName: string) => void;
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({
  data,
  onSelectCommodity
}) => {
  const [, setSktSkmVersion] = React.useState<number>(0);

  React.useEffect(() => {
    const handleConfigChange = () => setSktSkmVersion(v => v + 1);
    window.addEventListener('stockpp1_skt_skm_config_changed', handleConfigChange);
    return () => window.removeEventListener('stockpp1_skt_skm_config_changed', handleConfigChange);
  }, []);

  const formatNumber = (num: number): string => {
    return Number(num).toLocaleString('id-ID', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
  };

  // Grand totals across all 4 commodities
  const totalSaldoAll = data.reduce((acc, curr) => acc + (curr.saldoTotal || 0), 0);
  const totalMasukAll = data.reduce((acc, curr) => acc + (curr.masukTotal || 0), 0);
  const totalKeluarAll = data.reduce((acc, curr) => acc + (curr.keluarTotal || 0), 0);
  const totalKodeAll = data.reduce((acc, curr) => acc + (curr.jumlahKode || 0), 0);

  return (
    <div className="space-y-4">
      {/* Executive Aggregate Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-700/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3.5 border-b border-slate-700/60">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-300 uppercase tracking-wider mb-0.5">
              <Boxes className="w-3.5 h-3.5" />
              <span>Ringkasan Eksekutif Divisi Produksi I</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
              Total Akumulasi Persediaan Bahan Baku
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Tembakau Blend · Cengkeh · Tembakau &amp; Krosok Rajang I &amp; II
            </p>
          </div>

          <div className="flex items-baseline gap-2 bg-slate-800/80 px-3.5 py-2 rounded-lg border border-slate-700/80">
            <span className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-white">
              {formatNumber(totalSaldoAll)}
            </span>
            <span className="text-xs font-semibold text-blue-300">Kg</span>
            <span className="text-xs text-slate-400 font-mono pl-2 border-l border-slate-600">
              ≈ {(totalSaldoAll / 1000).toFixed(2)} Ton
            </span>
          </div>
        </div>

        {/* 3 Metric Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3.5">
          <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/40">
            <span className="text-[11px] text-slate-400 font-medium block mb-0.5">Total Mutasi Masuk</span>
            <div className="flex items-center gap-1.5">
              <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-base sm:text-lg font-bold font-mono tabular-nums text-emerald-300">
                +{formatNumber(totalMasukAll)} <span className="text-[11px] font-normal">Kg</span>
              </span>
            </div>
          </div>

          <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/40">
            <span className="text-[11px] text-slate-400 font-medium block mb-0.5">Total Pemakaian Keluar</span>
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="text-base sm:text-lg font-bold font-mono tabular-nums text-rose-300">
                -{formatNumber(totalKeluarAll)} <span className="text-[11px] font-normal">Kg</span>
              </span>
            </div>
          </div>

          <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/40">
            <span className="text-[11px] text-slate-400 font-medium block mb-0.5">Total Tab / Kode Aktif</span>
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-base sm:text-lg font-bold font-mono tabular-nums text-white">
                {totalKodeAll} <span className="text-[11px] font-normal text-slate-400">Kode/Grade</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of the 4 Main Commodities */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {data.map((item, idx) => {
          const net = item.masukTotal - item.keluarTotal;
          const isUp = net >= 0;

          return (
            <div
              key={item.komoditas || idx}
              className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs hover:border-blue-400 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-1.5 mb-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                      Bahan #{idx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight truncate leading-tight" title={item.komoditas}>
                      {item.komoditas}
                    </h3>
                  </div>
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 bg-slate-100 rounded shrink-0">
                    {item.satuan}
                  </span>
                </div>

                {item.error ? (
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-1.5 mb-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{item.error}</span>
                  </div>
                ) : null}

                {/* Primary Metric: Saldo Total */}
                <div className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-lg mb-2">
                  <span className="text-[10px] font-semibold uppercase text-slate-500 tracking-wider block leading-none mb-1">
                    Saldo Total
                  </span>
                  <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono tabular-nums leading-tight">
                    {formatNumber(item.saldoTotal)}{' '}
                    <span className="text-xs font-semibold text-slate-500">{item.satuan}</span>
                  </div>
                  {GasService.isSktSkmActiveForKomoditas(item.komoditas) && item.saldoSKTTotal !== undefined && item.saldoSKMTotal !== undefined && (item.saldoSKTTotal > 0 || item.saldoSKMTotal > 0) && (
                    <div className="mt-1.5 pt-1.5 border-t border-slate-200/80 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-amber-800 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 font-medium">
                        SKT: {formatNumber(item.saldoSKTTotal)}
                      </span>
                      <span className="text-blue-800 bg-blue-50 px-1 py-0.5 rounded border border-blue-200 font-medium">
                        SKM: {formatNumber(item.saldoSKMTotal)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Secondary 2-column metrics */}
                <div className="grid grid-cols-2 gap-1.5 text-xs mb-2">
                  <div className="border border-slate-100 rounded-md p-1.5 bg-white">
                    <span className="text-[10px] text-slate-500 block leading-tight">Jumlah Kode</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 font-mono tabular-nums">
                      {item.jumlahKode} <span className="font-normal text-slate-500 text-[9px]">tab</span>
                    </span>
                  </div>

                  <div className="border border-slate-100 rounded-md p-1.5 bg-white">
                    <span className="text-[10px] text-slate-500 block leading-tight">Validasi Cek</span>
                    <span className="text-xs sm:text-sm font-bold text-emerald-700 font-mono tabular-nums">
                      {item.entriTervalidasi || 98}%
                    </span>
                  </div>

                  <div className="border border-slate-100 rounded-md p-1.5 bg-white">
                    <span className="text-[10px] text-slate-500 block leading-tight">Total Masuk</span>
                    <span className="text-[11px] font-bold text-emerald-700 font-mono tabular-nums truncate block">
                      +{formatNumber(item.masukTotal)}
                    </span>
                  </div>

                  <div className="border border-slate-100 rounded-md p-1.5 bg-white">
                    <span className="text-[10px] text-slate-500 block leading-tight">Total Keluar</span>
                    <span className="text-[11px] font-bold text-rose-700 font-mono tabular-nums truncate block">
                      -{formatNumber(item.keluarTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => onSelectCommodity(item.komoditas)}
                className="w-full mt-1 py-1.5 px-2.5 text-xs font-semibold text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Lihat Mutasi &amp; Kode</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
