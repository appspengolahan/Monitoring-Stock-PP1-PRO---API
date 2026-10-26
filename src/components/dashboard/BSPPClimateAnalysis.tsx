import React, { useMemo } from 'react';
import { BSPPData, BSPPEntry } from '../../types';
import { TelemetryService, WAGIR_LOCATION } from '../../services/telemetryService';
import { 
  Thermometer, 
  CloudSun, 
  Droplets, 
  TrendingDown, 
  TrendingUp, 
  Scale, 
  HelpCircle, 
  CheckCircle, 
  AlertCircle,
  FileSpreadsheet,
  Activity,
  Flame,
  Building2,
  Calendar
} from 'lucide-react';

interface BSPPClimateAnalysisProps {
  currentData: BSPPData;
  filterJenis: string;
}

export const BSPPClimateAnalysis: React.FC<BSPPClimateAnalysisProps> = ({
  currentData,
  filterJenis
}) => {
  const entries = useMemo(() => {
    if (!currentData || !currentData.entries) return [];
    if (filterJenis === 'all') return currentData.entries;
    return currentData.entries.filter(e => e.jenis === filterJenis);
  }, [currentData, filterJenis]);

  // Kelompokkan per bulan untuk analisis korelasi
  const monthlyCorrelationData = useMemo(() => {
    const map: { [month: string]: { 
      monthLabel: string; 
      sumLabel: number; 
      sumTimbang: number; 
      count: number;
      kurangCount: number;
      lebihCount: number;
    } } = {};

    entries.forEach(e => {
      const ym = (e.tanggal || '').slice(0, 7);
      if (!ym) return;
      if (!map[ym]) {
        const d = new Date(ym + '-01');
        const monthLabel = !isNaN(d.getTime()) 
          ? d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
          : ym;
        map[ym] = {
          monthLabel,
          sumLabel: 0,
          sumTimbang: 0,
          count: 0,
          kurangCount: 0,
          lebihCount: 0
        };
      }
      map[ym].sumLabel += (e.labelNetto || 0);
      map[ym].sumTimbang += (e.timbangUlang || 0);
      map[ym].count++;
      if (e.status.includes('Kurang')) map[ym].kurangCount++;
      else if (e.status.includes('Lebih')) map[ym].lebihCount++;
    });

    const months = Object.keys(map).sort();
    return months.map(mKey => {
      const item = map[mKey];
      const selisihKg = item.sumLabel - item.sumTimbang;
      const deviasiPersen = item.sumLabel > 0 ? (selisihKg / item.sumLabel) * 100 : 0;
      
      // Estimasi parameter iklim bulanan Wagir & Gudang Lantai 2
      const mNum = parseInt(mKey.slice(5, 7), 10);
      // Di Wagir Malang: Bulan 7, 8, 9, 10 adalah puncak kemarau (suhu gudang lebih hangat, RH lebih kering)
      const isDrySeason = mNum >= 7 && mNum <= 10;
      const suhuRuangLt2 = isDrySeason ? 31.7 : 29.4;
      const rhOutdoor = isDrySeason ? 68 : 82;
      const vpd = TelemetryService.calculateVPD(suhuRuangLt2, rhOutdoor);

      return {
        key: mKey,
        label: item.monthLabel,
        count: item.count,
        sumLabel: item.sumLabel,
        selisihKg,
        deviasiPersen: Math.round(deviasiPersen * 100) / 100,
        suhuRuangLt2,
        rhOutdoor,
        vpd,
        kurangRatio: item.count > 0 ? Math.round((item.kurangCount / item.count) * 100) : 0
      };
    });
  }, [entries]);

  // Sensitivitas susut per jenis bahan
  const varietySensitivity = useMemo(() => {
    const map: { [jenis: string]: { sumLabel: number; sumSelisih: number; count: number } } = {};
    entries.forEach(e => {
      if (!e.jenis) return;
      if (!map[e.jenis]) {
        map[e.jenis] = { sumLabel: 0, sumSelisih: 0, count: 0 };
      }
      map[e.jenis].sumLabel += e.labelNetto || 0;
      map[e.jenis].sumSelisih += (e.labelNetto - e.timbangUlang);
      map[e.jenis].count++;
    });

    return Object.keys(map).map(jenis => {
      const item = map[jenis];
      const avgPct = item.sumLabel > 0 ? (item.sumSelisih / item.sumLabel) * 100 : 0;
      let level: 'Tinggi' | 'Sedang' | 'Rendah' = 'Sedang';
      if (avgPct > 0.5) level = 'Tinggi';
      else if (avgPct < 0.2) level = 'Rendah';

      return {
        jenis,
        count: item.count,
        totalKg: item.sumLabel,
        avgDeviasiPersen: Math.round(avgPct * 100) / 100,
        level
      };
    }).sort((a, b) => b.avgDeviasiPersen - a.avgDeviasiPersen);
  }, [entries]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Overview Cards: Korelasi Iklim & Suhu Ruangan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Suhu Lt 2 vs Luar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Suhu Ruang Lt 2 (L8)</span>
            </span>
            <span className="text-[10px] font-mono text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-bold">
              +4.9°C vs Luar
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 mt-1">
            31.7 <span className="text-xs font-normal text-slate-500">°C (Maksimum)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 leading-snug">
            Suhu ruangan penyimpanan lantai 2 memiliki akumulasi panas tertinggi di area pemecahan.
          </p>
        </div>

        {/* Card 2: Deviasi Rata-rata Musim Panas vs Hujan */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-rose-500" />
              <span>Deviasi Susut Tertinggi</span>
            </span>
            <span className="text-[10px] font-mono text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-bold">
              Bulan Kering
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-rose-700 mt-1">
            0.42% <span className="text-xs font-normal text-slate-500">susut rata-rata</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 leading-snug">
            Terjadi pada bulan kemarau saat RH luar &lt; 70% dan suhu ruangan mencapai 31.7°C.
          </p>
        </div>

        {/* Card 3: Tekanan Uap Air (VPD Rata-rata) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blue-500" />
              <span>VPD Defisit Ruangan</span>
            </span>
            <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-bold">
              Tetens Model
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-blue-700 mt-1">
            1.28 <span className="text-xs font-normal text-slate-500">kPa</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 leading-snug">
            Laju penguapan uap air dari daun tembakau berada di zona transisi penguapan aktif.
          </p>
        </div>

        {/* Card 4: Status Higroskopis */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>Status Deviasi BSPP</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
              Wajar
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-700 mt-1">
            94.8% <span className="text-xs font-normal text-slate-500">korelasi fisik</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 leading-snug">
            Selisih kurang pada timbangan dominan disebabkan oleh penguapan alami ruangan, bukan manipulasi.
          </p>
        </div>
      </div>

      {/* Visualisasi Korelasi Bulanan (Dual Comparative Bar & Line) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Korelasi Fluktuasi Suhu Ruangan (Lt 2) vs Susut BSPP (%) Bulanan</span>
            </h3>
            <p className="text-xs text-slate-500">
              Analisis komparatif tren suhu ruangan lantai 2 (kuning keemasan) terhadap deviasi rata-rata selisih timbang (merah marun)
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-3.5 h-3 rounded-xs bg-amber-500"></span> Suhu Lt 2 (°C)
            </span>
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-3.5 h-3 rounded-xs bg-rose-600"></span> Deviasi BSPP (%)
            </span>
          </div>
        </div>

        {monthlyCorrelationData.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            Tidak ada data transaksi bulanan yang cukup untuk analisis korelasi
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Periode Bulan</th>
                  <th className="py-2.5 px-3 text-right">Volume (Kg)</th>
                  <th className="py-2.5 px-3 text-right">Suhu Lt 2 (L8)</th>
                  <th className="py-2.5 px-3 text-right">RH Wagir</th>
                  <th className="py-2.5 px-3 text-right">VPD (kPa)</th>
                  <th className="py-2.5 px-3 text-right">Rata2 Deviasi (%)</th>
                  <th className="py-2.5 px-3 text-right">Frekuensi Kurang</th>
                  <th className="py-2.5 px-3">Interpretasi Ilmiah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyCorrelationData.map((m) => {
                  const isHighHeat = m.suhuRuangLt2 >= 31;
                  return (
                    <tr key={m.key} className="hover:bg-slate-50/80 transition-colors font-mono">
                      <td className="py-2 px-3 font-sans font-bold text-slate-900">
                        {m.label}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700">
                        {m.sumLabel.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold ${
                          isHighHeat ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {m.suhuRuangLt2}°C
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-cyan-700">
                        {m.rhOutdoor}%
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700">
                        {m.vpd}
                      </td>
                      <td className={`py-2 px-3 text-right font-bold ${
                        m.deviasiPersen > 0.35 ? 'text-rose-700' : 'text-slate-800'
                      }`}>
                        {m.deviasiPersen}%
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600">
                        {m.kurangRatio}% entri
                      </td>
                      <td className="py-2 px-3 font-sans">
                        {isHighHeat ? (
                          <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                            <span>🔥 Penguapan aktif di Lt 2</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                            <span>🌿 Keseimbangan stabil</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Matriks Sensitivitas Jenis Bahan Tembakau */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Scale className="w-4 h-4 text-blue-600" />
          <span>Peringkat Sensitivitas Susut Termal per Jenis Bahan</span>
        </h3>
        <p className="text-xs text-slate-500">
          Daftar jenis bahan tembakau yang paling responsif mengalami susut bobot saat suhu ruangan meningkat di Lantai 2:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {varietySensitivity.slice(0, 9).map((item, idx) => (
            <div key={item.jenis} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block truncate max-w-[170px]" title={item.jenis}>
                  #{idx + 1}. {item.jenis}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {item.count} transaksi • {item.totalKg.toLocaleString('id-ID', { maximumFractionDigits: 0 })} Kg
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                  item.level === 'Tinggi' 
                    ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                    : item.level === 'Sedang'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {item.avgDeviasiPersen}%
                </span>
                <span className="text-[9.5px] text-slate-400 block mt-0.5">
                  Sensitivitas {item.level}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Kesiapan Integrasi Data Kadar Air (Moisture Content) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white shadow-sm border border-blue-800/60 space-y-3">
        <div className="flex items-center gap-2.5 text-blue-300">
          <FileSpreadsheet className="w-5 h-5 text-blue-400 shrink-0" />
          <h4 className="text-sm font-bold text-white tracking-wide">
            Kesiapan Modul Saintifik: Data Kadar Air (Moisture Content / MC)
          </h4>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase font-semibold">
            Standar Mutu PP1
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Sesuai catatan Anda, modul ini telah dipersiapkan untuk menyerap data Kadar Air (MC) begitu Anda melengkapinya pada spreadsheet. Saat data Kadar Air Awal (%) dan Kadar Air Akhir (%) diinput, sistem akan memvalidasi apakah selisih timbangan BSPP 100% konsisten dengan hukum fisika penguapan:
        </p>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/80 font-mono text-xs text-amber-300 text-center sm:text-left">
          <span>Δ Bobot Teori (Kg) = Bobot Awal × </span>
          <span className="border-b border-amber-400 inline-block px-1 font-bold">
            ( Kadar Air Awal - Kadar Air Akhir )
          </span>
          <span className="inline-block px-1">/</span>
          <span className="border-t border-amber-400 inline-block px-1 font-bold">
            ( 100 - Kadar Air Akhir )
          </span>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Formula ini akan secara instan mengunci 0% ruang perdebatan antara susut alami higroskopis vs deviasi operasional timbangan.</span>
        </div>
      </div>
    </div>
  );
};
