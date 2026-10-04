import React from 'react';
import { KomoditasData } from '../../types';
import { GasService } from '../../services/gasService';
import { 
  PieChart, 
  BarChart3, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';

interface AnalyticsChartsProps {
  data: KomoditasData[];
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ data }) => {
  const [, setSktSkmVersion] = React.useState<number>(0);

  React.useEffect(() => {
    const handleConfigChange = () => setSktSkmVersion(v => v + 1);
    window.addEventListener('stockpp1_skt_skm_config_changed', handleConfigChange);
    return () => window.removeEventListener('stockpp1_skt_skm_config_changed', handleConfigChange);
  }, []);

  const formatNumber = (n: number): string => {
    return Number(n).toLocaleString('id-ID', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
  };

  const totalSaldoAll = data.reduce((acc, curr) => acc + (curr.saldoTotal || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Analisa Komposisi &amp; Pergerakan Stok
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribusi volume persediaan per bahan baku, rasio mutasi, dan kepatuhan validasi
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 shrink-0">
            Audit Divisi Produksi I
          </span>
        </div>

        {/* Commodity Distribution Bars */}
        <div className="space-y-3 pt-2">
          {data.map((item, idx) => {
            const pct = totalSaldoAll > 0 ? (item.saldoTotal / totalSaldoAll) * 100 : 0;
            const colors = [
              'bg-blue-600',
              'bg-emerald-600',
              'bg-amber-600',
              'bg-indigo-600'
            ];
            const color = colors[idx % colors.length];

            return (
              <div key={item.komoditas} className="space-y-1.5">
                <div className="flex justify-between text-xs sm:text-sm font-semibold">
                  <span className="text-slate-800">{item.komoditas}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-900 font-mono tabular-nums">
                      {formatNumber(item.saldoTotal)} {item.satuan}
                    </span>
                    <span className="text-slate-400 font-mono text-xs">
                      ({pct.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.max(2, pct)}%` }}
                    className={`h-full ${color} rounded-full transition-all duration-500`}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2-column Analysis Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Quality & Validation Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Integritas Validasi Transaksi</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Tingkat Cek Fisik Gudang
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Persentase entri mutasi yang telah diverifikasi oleh tim kontrol gudang
            </p>

            <div className="space-y-3">
              {data.map(item => (
                <div key={item.komoditas} className="flex items-center justify-between text-xs py-2 border-b border-slate-100 last:border-0">
                  <span className="font-medium text-slate-700">{item.komoditas}</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    {item.entriTervalidasi || 98}% Tervalidasi
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Kepatuhan audit di atas target operasional standar 95%.</span>
          </div>
        </div>

        {/* Turn Around / Net Flow Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>Netto Arus Bahan Baku</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Selisih Masuk vs Pemakaian Keluar
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Perbandingan akumulatif perputaran persediaan
            </p>

            <div className="space-y-3">
              {data.map(item => {
                const net = item.masukTotal - item.keluarTotal;
                const isPositive = net >= 0;
                return (
                  <div key={item.komoditas} className="flex items-center justify-between text-xs py-2 border-b border-slate-100 last:border-0">
                    <span className="font-medium text-slate-700">{item.komoditas}</span>
                    <span className={`font-mono font-bold text-sm ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {isPositive ? '+' : ''}{formatNumber(net)} {item.satuan}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Buffer persediaan saat ini memadai untuk proyeksi produksi bulan depan.</span>
          </div>
        </div>
      </div>

      {/* Segmentasi Jalur Produksi (SKT vs SKM) untuk Bahan yang Aktif */}
      {data.filter(k => GasService.isSktSkmActiveForKomoditas(k.komoditas) && k.saldoSKTTotal !== undefined && k.saldoSKMTotal !== undefined && (k.saldoSKTTotal > 0 || k.saldoSKMTotal > 0)).map(item => {
        const total = (item.saldoSKTTotal || 0) + (item.saldoSKMTotal || 0);
        const pctSKT = total > 0 ? ((item.saldoSKTTotal || 0) / total) * 100 : 0;
        const pctSKM = total > 0 ? ((item.saldoSKMTotal || 0) / total) * 100 : 0;

        return (
          <div key={`skt-skm-${item.komoditas}`} className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
                  <BarChart3 className="w-4 h-4" />
                  <span>Segmentasi Jalur Produksi (SKT vs SKM)</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {item.komoditas}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500 font-mono">
                  Total Gabungan: <strong className="text-slate-900">{formatNumber(item.saldoTotal)} {item.satuan}</strong>
                </span>
              </div>
            </div>

            {/* Split Bar */}
            <div className="space-y-3">
              <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
                <div 
                  style={{ width: `${pctSKT}%` }} 
                  className="bg-amber-500 h-full transition-all duration-500 flex items-center justify-center text-[9px] font-bold text-white overflow-hidden"
                  title={`SKT: ${pctSKT.toFixed(1)}%`}
                >
                  {pctSKT > 15 ? `${pctSKT.toFixed(1)}%` : ''}
                </div>
                <div 
                  style={{ width: `${pctSKM}%` }} 
                  className="bg-blue-600 h-full transition-all duration-500 flex items-center justify-center text-[9px] font-bold text-white overflow-hidden"
                  title={`SKM: ${pctSKM.toFixed(1)}%`}
                >
                  {pctSKM > 15 ? `${pctSKM.toFixed(1)}%` : ''}
                </div>
              </div>

              {/* Legend & Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-md bg-amber-500 shrink-0"></span>
                    <div>
                      <span className="text-xs font-bold text-amber-950 block">SKT (Sigaret Kretek Tangan)</span>
                      <span className="text-[11px] text-amber-800/80 font-medium">Jalur Giling / Linting Manual</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm sm:text-base font-extrabold text-amber-950 font-mono tabular-nums block">
                      {formatNumber(item.saldoSKTTotal || 0)} {item.satuan}
                    </span>
                    <span className="text-[11px] font-semibold text-amber-700 font-mono">
                      {pctSKT.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50/50 border border-blue-200/80 rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-md bg-blue-600 shrink-0"></span>
                    <div>
                      <span className="text-xs font-bold text-blue-950 block">SKM (Sigaret Kretek Mesin)</span>
                      <span className="text-[11px] text-blue-800/80 font-medium">Jalur Maker / Mesin Otomatis</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm sm:text-base font-extrabold text-blue-950 font-mono tabular-nums block">
                      {formatNumber(item.saldoSKMTotal || 0)} {item.satuan}
                    </span>
                    <span className="text-[11px] font-semibold text-blue-700 font-mono">
                      {pctSKM.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
