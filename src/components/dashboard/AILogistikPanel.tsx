import React, { useState, useMemo, useEffect } from 'react';
import { 
  Sparkles, 
  AlertTriangle, 
  Clock, 
  Scale, 
  Calendar, 
  TrendingDown, 
  TrendingUp, 
  ArrowUpRight, 
  Download, 
  Copy, 
  Check, 
  RefreshCw, 
  FileText, 
  Sliders, 
  CheckCircle2, 
  Info, 
  Search, 
  ShieldAlert, 
  Boxes, 
  Factory, 
  Mic, 
  Bot
} from 'lucide-react';
import { KomoditasData, BSPPData, UserSession } from '../../types';
import { 
  AIService, 
  StockRunoutItem, 
  SlowMovingItem, 
  BsppAnomalyItem, 
  SktSkmAllocationAnalysis 
} from '../../services/aiService';
import { exportExecutiveReportPdf } from '../../services/pdfExport';

interface AILogistikPanelProps {
  komoditasList: KomoditasData[];
  bsppList: BSPPData[];
  session: UserSession;
  onOpenAIBot: () => void;
  onSelectCommodity?: (name: string) => void;
}

export const AILogistikPanel: React.FC<AILogistikPanelProps> = ({
  komoditasList,
  bsppList,
  session,
  onOpenAIBot,
  onSelectCommodity
}) => {
  const [activeTab, setActiveTab] = useState<'runout' | 'anomali' | 'slow_moving' | 'skt_skm' | 'report'>('runout');
  const [filterBahan, setFilterBahan] = useState<string>('all');
  const [searchKode, setSearchKode] = useState<string>('');
  
  // Executive Report States
  const [reportPeriod, setReportPeriod] = useState<string>('Mingguan');
  const [reportText, setReportText] = useState<string>('');
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // Compute analytics
  const analytics = useMemo(() => {
    return AIService.calculateLogisticsAnalytics(komoditasList, bsppList);
  }, [komoditasList, bsppList]);

  const { runoutList, slowMovingList, bsppAnomalies, sktSkmAnalysis, kpi } = analytics;

  // Filter runout items
  const filteredRunout = useMemo(() => {
    return runoutList.filter(item => {
      if (filterBahan !== 'all' && item.komoditas !== filterBahan) return false;
      if (searchKode.trim()) {
        const q = searchKode.toLowerCase();
        if (!item.kode.toLowerCase().includes(q) && !item.komoditas.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [runoutList, filterBahan, searchKode]);

  // Handle Generate Report
  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const stockContext = {
        komoditas: komoditasList.map(k => ({
          nama: k.komoditas,
          saldoTotal: k.saldoTotal,
          masukTotal: k.masukTotal,
          keluarTotal: k.keluarTotal,
          saldoSKTTotal: k.saldoSKTTotal,
          saldoSKMTotal: k.saldoSKMTotal,
          jumlahKode: k.jumlahKode
        })),
        bspp: bsppList.map(b => ({
          nama: b.nama,
          jumlahEntri: b.entries?.length || 0,
          rataRataAbsSelisihPersen: b.rataRataAbsSelisihPersen
        })),
        kpi
      };

      const result = await AIService.generateExecutiveReport(stockContext, session.role, reportPeriod);
      setReportText(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Initial load report if empty
  useEffect(() => {
    if (activeTab === 'report' && !reportText) {
      handleGenerateReport();
    }
  }, [activeTab]);

  const handleCopyReport = () => {
    if (!reportText) return;
    navigator.clipboard.writeText(reportText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const handleDownloadReportPdf = () => {
    if (!reportText) return;
    exportExecutiveReportPdf(
      `Laporan Eksekutif Logistik PP1 (${reportPeriod})`,
      reportText,
      `Laporan_Eksekutif_Logistik_PP1_${reportPeriod}_${new Date().toISOString().slice(0, 10)}`
    );
  };

  const formatNumber = (num: number): string => {
    return Number(num).toLocaleString('id-ID', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
  };

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-2xl p-5 sm:p-7 shadow-md border border-slate-700/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-700/60">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider mb-1.5">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Pusat Intelijen Logistik &amp; Prediksi AI</span>
              <span className="text-slate-400">·</span>
              <span className="bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded-full text-[10px] font-mono">
                Gemini 3.8 Flash
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Sistem Analisis Prediktif &amp; Audit Persediaan
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Divisi Produksi I PT Batu Karang — Prediksi sisa hari stok, audit susut timbangan BSPP, slow-moving, &amp; laporan manajerial
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenAIBot}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Mic className="w-4 h-4 text-amber-300" />
              <span>Tanya Jawab Suara AI</span>
            </button>
          </div>
        </div>

        {/* 5 KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-5">
          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-medium block mb-1">Grade Kritis (&lt; 7 Hari)</span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xl font-extrabold font-mono tabular-nums ${kpi.totalKritis > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {kpi.totalKritis}
              </span>
              <span className="text-[11px] text-slate-400">kode</span>
            </div>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-medium block mb-1">Perhatian (7-14 Hari)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold font-mono tabular-nums text-amber-300">
                {kpi.totalPerhatian}
              </span>
              <span className="text-[11px] text-slate-400">kode</span>
            </div>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-medium block mb-1">Rata-rata Sisa Hari (DOI)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold font-mono tabular-nums text-blue-300">
                {kpi.avgDaysOfInventory}
              </span>
              <span className="text-[11px] text-slate-400">hari buffer</span>
            </div>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-medium block mb-1">Anomali Susut BSPP</span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xl font-extrabold font-mono tabular-nums ${kpi.totalBsppAnomalies > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {kpi.totalBsppAnomalies}
              </span>
              <span className="text-[11px] text-slate-400">transaksi</span>
            </div>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-slate-400 font-medium block mb-1">Stok Mengendap (&gt;25 Hari)</span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xl font-extrabold font-mono tabular-nums ${kpi.totalSlowMoving > 0 ? 'text-purple-300' : 'text-slate-300'}`}>
                {kpi.totalSlowMoving}
              </span>
              <span className="text-[11px] text-slate-400">grade</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-1.5 flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('runout')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'runout'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Prediksi Sisa Hari &amp; ROP</span>
          {kpi.totalKritis > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-mono">
              {kpi.totalKritis}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('anomali')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'anomali'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Audit Susut BSPP</span>
          {kpi.totalBsppAnomalies > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-mono">
              {kpi.totalBsppAnomalies}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('slow_moving')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'slow_moving'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>Stok Mengendap</span>
          {kpi.totalSlowMoving > 0 && (
            <span className="px-1.5 py-0.2 bg-purple-500 text-white rounded-full text-[10px] font-mono">
              {kpi.totalSlowMoving}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('skt_skm')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'skt_skm'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Alokasi SKT vs SKM</span>
        </button>

        <button
          onClick={() => setActiveTab('report')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'report'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Laporan Eksekutif 1-Klik</span>
        </button>
      </div>

      {/* TAB 1: PREDIKSI SISA HARI (RUNOUT & ROP) */}
      {activeTab === 'runout' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Prediksi Sisa Hari Persediaan (*Days of Inventory*) &amp; Reorder Point
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dihitung secara prediktif berdasarkan riwayat laju pemakaian keluar (*burn-rate*) harian per grade
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterBahan}
                onChange={e => setFilterBahan(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Semua Bahan Baku</option>
                {komoditasList.map(k => (
                  <option key={k.komoditas} value={k.komoditas}>{k.komoditas}</option>
                ))}
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={searchKode}
                  onChange={e => setSearchKode(e.target.value)}
                  placeholder="Cari kode..."
                  className="pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-36 sm:w-44"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-[10.5px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Bahan &amp; Kode Grade</th>
                  <th className="py-2.5 px-4 text-right">Saldo Saat Ini</th>
                  <th className="py-2.5 px-4 text-right">Laju Pakai / Hari</th>
                  <th className="py-2.5 px-4">Sisa Hari Stok (DOI)</th>
                  <th className="py-2.5 px-4">Proyeksi Habis</th>
                  <th className="py-2.5 px-4 text-right">Titik Re-order (ROP)</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRunout.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Tidak ada data yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredRunout.map((item, idx) => (
                    <tr key={`${item.komoditas}-${item.kode}-${idx}`} className="hover:bg-slate-50/90 transition-colors">
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">{item.kode}</span>
                        <span className="text-[10.5px] text-slate-500">{item.komoditas}</span>
                      </td>

                      <td className="py-2.5 px-4 whitespace-nowrap text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatNumber(item.saldo)} <span className="text-[10px] font-normal text-slate-500">Kg</span>
                      </td>

                      <td className="py-2.5 px-4 whitespace-nowrap text-right font-mono text-slate-700 tabular-nums">
                        {formatNumber(item.avgDailyBurn)} <span className="text-[10px] text-slate-500">Kg/hr</span>
                      </td>

                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${Math.min(100, (item.daysOfInventory / 30) * 100)}%` }}
                              className={`h-full rounded-full ${
                                item.status === 'kritis' ? 'bg-rose-500' : item.status === 'perhatian' ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                            />
                          </div>
                          <span className="font-mono font-bold text-slate-800 text-[11px] tabular-nums">
                            {item.daysOfInventory > 90 ? '>90 Hari' : `${item.daysOfInventory} Hari`}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                        {item.projectedRunoutDate}
                      </td>

                      <td className="py-2.5 px-4 whitespace-nowrap text-right font-mono tabular-nums">
                        <span className="font-semibold text-slate-800">{formatNumber(item.reorderPoint)} Kg</span>
                        {item.recommendedOrderQty > 0 && (
                          <span className="block text-[10px] text-amber-700 font-bold">
                            Pesan: +{formatNumber(item.recommendedOrderQty)} Kg
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-4 whitespace-nowrap text-center">
                        {item.status === 'kritis' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                            Kritis
                          </span>
                        ) : item.status === 'perhatian' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Perhatian
                          </span>
                        ) : item.status === 'habis' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Habis
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Aman
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DETEKSI ANOMALI SUSUT TIMBANGAN BSPP */}
      {activeTab === 'anomali' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Hasil Audit Deviasi &amp; Anomali Timbangan BSPP
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  AI memindai transaksi penerimaan gudang Cengkeh &amp; Rajang II yang menyusut atau lebih di luar ambang batas 0,5%
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg shrink-0">
                Ambang Batas Toleransi: 0,5%
              </span>
            </div>

            <div className="pt-4">
              {bsppAnomalies.length === 0 ? (
                <div className="p-8 text-center bg-emerald-50/50 border border-emerald-200/80 rounded-2xl text-emerald-900 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="font-bold text-sm">Tidak Ditemukan Anomali Timbangan</h4>
                  <p className="text-xs text-emerald-700 max-w-md mx-auto">
                    Seluruh entri bukti selisih persediaan (BSPP) berada dalam toleransi wajar (&lt; 0,5%). Kualitas penimbangan gudang berjalan prima.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bsppAnomalies.map(anomali => (
                    <div
                      key={anomali.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                        anomali.severity === 'kritis'
                          ? 'bg-rose-50/60 border-rose-300'
                          : 'bg-amber-50/60 border-amber-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-bold text-slate-900">
                            {anomali.komoditas} — {anomali.jenis}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            anomali.severity === 'kritis' ? 'bg-rose-200 text-rose-900' : 'bg-amber-200 text-amber-900'
                          }`}>
                            {anomali.severity === 'kritis' ? 'Deviasi Tinggi' : 'Perlu Pengawasan'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs bg-white/80 p-2.5 rounded-lg border border-slate-200/80 mb-3">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Label Netto</span>
                            <span className="font-mono font-bold text-slate-900">{formatNumber(anomali.labelNetto)} Kg</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Timbang Ulang</span>
                            <span className="font-mono font-bold text-slate-900">{formatNumber(anomali.timbangUlang)} Kg</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Selisih Deviasi</span>
                            <span className={`font-mono font-extrabold ${anomali.selisihKg < 0 ? 'text-rose-700' : 'text-blue-700'}`}>
                              {anomali.selisihKg > 0 ? '+' : ''}{formatNumber(anomali.selisihKg)} Kg ({anomali.selisihPersen.toFixed(2)}%)
                            </span>
                          </div>
                        </div>

                        <div className="text-[11.5px] text-slate-700 bg-white/60 p-2.5 rounded-lg border border-slate-200/60">
                          <span className="font-bold text-indigo-900 block mb-0.5">Analisa Cerdas AI:</span>
                          <p className="leading-relaxed">{anomali.aiNote}</p>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Tanggal Transaksi: <strong>{anomali.tanggal}</strong></span>
                        <span className="font-semibold text-slate-700">Status: {anomali.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STOK MENGENDAP & SLOW-MOVING */}
      {activeTab === 'slow_moving' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Peringatan Stok Mengendap &amp; Bahan Baku Tidak Bergerak (*Slow-Moving*)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mendeteksi kode grade yang memiliki saldo aktif namun tidak mengalami mutasi keluar selama &gt; 25 hari
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-lg shrink-0">
              Total Mengendap: {slowMovingList.length} Kode
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-[10.5px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Kode &amp; Bahan Baku</th>
                  <th className="py-2.5 px-4 text-right">Saldo Mengendap</th>
                  <th className="py-2.5 px-4 text-center">Hari Tanpa Mutasi</th>
                  <th className="py-2.5 px-4">Aktivitas Terakhir</th>
                  <th className="py-2.5 px-4 text-center">Tingkat Risiko Mutu</th>
                  <th className="py-2.5 px-4">Rekomendasi Tindakan AI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {slowMovingList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Tidak ada stok mengendap yang melebihi batas 25 hari. Perputaran gudang sangat sehat!
                    </td>
                  </tr>
                ) : (
                  slowMovingList.map((item, idx) => (
                    <tr key={`${item.komoditas}-${item.kode}-${idx}`} className="hover:bg-slate-50/90 transition-colors">
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">{item.kode}</span>
                        <span className="text-[10.5px] text-slate-500">{item.komoditas}</span>
                      </td>

                      <td className="py-2.5 px-4 whitespace-nowrap text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatNumber(item.saldo)} <span className="text-[10px] font-normal text-slate-500">Kg</span>
                      </td>

                      <td className="py-2.5 px-4 whitespace-nowrap text-center font-mono font-bold text-purple-900">
                        {item.daysDormant} Hari
                      </td>

                      <td className="py-2.5 px-4 whitespace-nowrap text-slate-600">
                        {item.lastActivityDate}
                      </td>

                      <td className="py-2.5 px-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                          item.riskLevel === 'tinggi'
                            ? 'bg-rose-100 text-rose-800'
                            : item.riskLevel === 'sedang'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {item.riskLevel === 'tinggi' ? 'Risiko Tinggi (Kadar Air)' : item.riskLevel === 'sedang' ? 'Risiko Sedang' : 'Wajar'}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 text-slate-700 text-[11.5px] leading-relaxed">
                        {item.recommendation}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ALOKASI SKT VS SKM (RAJANG II) */}
      {activeTab === 'skt_skm' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Optimasi Keseimbangan Jalur Giling SKT (Tangan) vs Maker SKM (Mesin)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluasi proporsi ketersediaan bahan baku pada komoditas Tembakau &amp; Krosok (Rajang II)
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg shrink-0">
              Analisa Dual-Lane Engine
            </span>
          </div>

          {sktSkmAnalysis ? (
            <div className="space-y-5">
              {/* Ratio Gauge */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-amber-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    Sigaret Kretek Tangan (SKT): {sktSkmAnalysis.ratioSKT}%
                  </span>
                  <span className="text-blue-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    Sigaret Kretek Mesin (SKM): {sktSkmAnalysis.ratioSKM}%
                  </span>
                </div>

                <div className="w-full h-5 bg-slate-100 rounded-full overflow-hidden flex">
                  <div 
                    style={{ width: `${sktSkmAnalysis.ratioSKT}%` }} 
                    className="bg-amber-500 h-full transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white"
                  >
                    {sktSkmAnalysis.ratioSKT}%
                  </div>
                  <div 
                    style={{ width: `${sktSkmAnalysis.ratioSKM}%` }} 
                    className="bg-blue-600 h-full transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white"
                  >
                    {sktSkmAnalysis.ratioSKM}%
                  </div>
                </div>
              </div>

              {/* Cards details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl">
                  <span className="text-xs font-bold text-amber-950 block mb-1">
                    Jalur Sigaret Kretek Tangan (SKT)
                  </span>
                  <span className="text-2xl font-extrabold text-amber-950 font-mono tabular-nums block mb-1">
                    {formatNumber(sktSkmAnalysis.saldoSKT)} <span className="text-xs font-normal">Kg</span>
                  </span>
                  <p className="text-xs text-amber-800/90 leading-relaxed">
                    Diperuntukkan untuk meja giling / linting rokok kretek manual tangan.
                  </p>
                </div>

                <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl">
                  <span className="text-xs font-bold text-blue-950 block mb-1">
                    Jalur Sigaret Kretek Mesin (SKM)
                  </span>
                  <span className="text-2xl font-extrabold text-blue-950 font-mono tabular-nums block mb-1">
                    {formatNumber(sktSkmAnalysis.saldoSKM)} <span className="text-xs font-normal">Kg</span>
                  </span>
                  <p className="text-xs text-blue-800/90 leading-relaxed">
                    Diperuntukkan untuk mesin maker otomatis berkecepatan tinggi.
                  </p>
                </div>
              </div>

              {/* AI Recommendation Alert */}
              <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-indigo-950">Rekomendasi Alokasi AI:</span>
                  <p className="text-xs text-indigo-900 leading-relaxed">
                    {sktSkmAnalysis.recommendation}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-4 text-center">
              Data alokasi SKT vs SKM saat ini hanya berlaku pada Tembakau &amp; Krosok (Rajang II).
            </p>
          )}
        </div>
      )}

      {/* TAB 5: GENERATOR LAPORAN EKSEKUTIF 1-KLIK */}
      {activeTab === 'report' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Generator Laporan Eksekutif Logistik (1-Klik AI)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Menghasilkan narasi resmi komprehensif untuk Kepala Pabrik, Direksi, dan Pengendalian Mutu
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={reportPeriod}
                onChange={e => setReportPeriod(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold"
              >
                <option value="Harian">Laporan Harian</option>
                <option value="Mingguan">Laporan Mingguan</option>
                <option value="Bulanan">Laporan Bulanan</option>
              </select>

              <button
                onClick={handleGenerateReport}
                disabled={isGeneratingReport}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-60 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingReport ? 'animate-spin' : ''}`} />
                <span>{isGeneratingReport ? 'Menyusun Laporan...' : 'Regenerate Laporan'}</span>
              </button>
            </div>
          </div>

          {/* Action buttons (Copy WA / Download PDF) */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="text-xs text-slate-500 font-medium">
              Format Laporan Resmi PT Batu Karang Divisi Produksi I
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyReport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
                title="Salin untuk WhatsApp / Catatan Memo"
              >
                {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedReport ? 'Tersalin!' : 'Salin Teks (WA / Email)'}</span>
              </button>

              <button
                onClick={handleDownloadReportPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors shadow-2xs cursor-pointer"
                title="Download file PDF resmi Laporan Eksekutif"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                <span>Download PDF Resmi</span>
              </button>
            </div>
          </div>

          {/* Report Viewer */}
          <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl font-mono text-xs sm:text-[13px] leading-relaxed overflow-x-auto border border-slate-800 max-h-[500px] overflow-y-auto whitespace-pre-wrap select-text">
            {isGeneratingReport ? (
              <div className="py-16 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                <p className="text-slate-300 font-sans text-sm">
                  Gemini 3.8 Flash sedang menganalisis tonase masuk, keluar, susut BSPP, dan menyusun laporan eksekutif...
                </p>
              </div>
            ) : (
              reportText
            )}
          </div>
        </div>
      )}
    </div>
  );
};
