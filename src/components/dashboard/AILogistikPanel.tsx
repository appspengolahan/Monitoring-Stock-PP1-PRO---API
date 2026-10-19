import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Bot,
  ShieldCheck,
  Lightbulb,
  Volume2,
  Square,
  ListOrdered
} from 'lucide-react';
import { KomoditasData, BSPPData, UserSession } from '../../types';
import { 
  AIService, 
  StockRunoutItem, 
  SlowMovingItem, 
  BsppAnomalyItem, 
  SktSkmAllocationAnalysis 
} from '../../services/aiService';
import { exportExecutiveReportPdf, exportDailyAuditPdf } from '../../services/pdfExport';
import { DailyAuditorService } from '../../services/dailyAuditorService';
import { VoiceSettingsService } from '../../services/voiceSettingsService';
import { VoiceSettingsModal } from '../modals/VoiceSettingsModal';
import { formatTanggalIndo, getTanggalKey } from '../../utils/dateUtils';

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
  const [activeTab, setActiveTab] = useState<'auditor' | 'runout' | 'anomali' | 'slow_moving' | 'skt_skm' | 'report'>('auditor');
  const [filterBahan, setFilterBahan] = useState<string>('all');
  const [searchKode, setSearchKode] = useState<string>('');
  const [selectedAuditDate, setSelectedAuditDate] = useState<string>('');
  const [showWorkflowInfo, setShowWorkflowInfo] = useState<boolean>(false);
  const [showCategorizedReport, setShowCategorizedReport] = useState<boolean>(false);
  const [isSpeakingCategorized, setIsSpeakingCategorized] = useState<boolean>(false);
  const [copiedCategorized, setCopiedCategorized] = useState<boolean>(false);
  const speechQueueRef = useRef<string[]>([]);
  const isSpeechCancelledRef = useRef<boolean>(false);
  
  // Executive Report States
  const [reportPeriod, setReportPeriod] = useState<string>('Mingguan');
  const [reportText, setReportText] = useState<string>('');
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // Daily Auditor Detective Analytics
  const dailyAudit = useMemo(() => {
    return DailyAuditorService.runDailyAudit(komoditasList, bsppList, selectedAuditDate || undefined);
  }, [komoditasList, bsppList, selectedAuditDate]);

  // Categorized Mutation Report per Category & Material (Siap Dibacakan)
  const categorizedAudit = useMemo(() => {
    return DailyAuditorService.getCategorizedDailyAuditReport(komoditasList, bsppList, selectedAuditDate || undefined);
  }, [komoditasList, bsppList, selectedAuditDate]);

  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);

  const stopSpeakingCategorized = () => {
    VoiceSettingsService.stopSpeaking();
    setIsSpeakingCategorized(false);
  };

  useEffect(() => {
    return () => {
      stopSpeakingCategorized();
    };
  }, []);

  const handleToggleSpeakCategorized = () => {
    if (isSpeakingCategorized) {
      stopSpeakingCategorized();
      return;
    }

    setIsSpeakingCategorized(true);
    VoiceSettingsService.speakText(categorizedAudit.spokenScript, {
      onStart: () => setIsSpeakingCategorized(true),
      onEnd: () => setIsSpeakingCategorized(false),
      onError: () => setIsSpeakingCategorized(false)
    });
  };

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
    <div className="w-full space-y-5 animate-in fade-in duration-200">
      {/* Executive Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-2xl p-5 sm:p-7 shadow-md border border-slate-700/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-700/60">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider mb-1.5 flex-wrap">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Pusat Intelijen Logistik &amp; Prediksi AI</span>
              <span className="text-slate-400">·</span>
              <span className="bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded-full text-[10px] font-mono">
                Gemini 3.8 Flash
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-mono">
                ✓ Live Engine
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Sistem Analisis Prediktif &amp; Audit Persediaan
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
              Divisi Produksi I PT Batu Karang — Prediksi sisa hari stok, audit susut timbangan BSPP, slow-moving, &amp; laporan manajerial
            </p>
          </div>

          {/* Center Intelligence Snapshot Widget - Fills middle gap */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700/90 shadow-inner">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white">Status Rekonsiliasi:</span>
                <span className="text-emerald-300 font-extrabold font-mono bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-700/60 text-[11px]">
                  100% Klop Paripurna
                </span>
              </div>
              <span className="text-[11px] text-slate-300 block mt-0.5">
                Audit 2-Way Matching · Toleransi Nol Deviasi Fisik vs DHP
              </span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsVoiceModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800/90 hover:bg-slate-700/90 text-amber-300 border border-slate-600 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer hover:scale-105 active:scale-95"
              title="Atur Pilihan Suara AI Natural (Gemini Studio AI / Suara Natural Browser)"
            >
              <Volume2 className="w-4 h-4 text-amber-400" />
              <span>Suara Natural</span>
            </button>
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
          onClick={() => setActiveTab('auditor')}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'auditor'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
          <span>Auditor Harian Otomatis</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
            activeTab === 'auditor' ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-100 text-emerald-800'
          }`}>
            {dailyAudit.overallStatus === 'CLEAN' ? '100% Klop' : 'Perhatian'}
          </span>
        </button>

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

      {/* TAB 0: AUDITOR HARIAN OTOMATIS (DAILY RECONCILIATION DETECTIVE) */}
      {activeTab === 'auditor' && (
        <div className="space-y-4">
          {/* Main Auditor Header Card */}
          {/* Main Auditor Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            {/* Tier 1 & Tier 2 Header Container */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70">
              {/* Tier 1: Identity, Title, Status, and Metrics */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                    dailyAudit.overallStatus === 'CLEAN'
                      ? 'bg-emerald-600 text-white'
                      : dailyAudit.overallStatus === 'PERHATIAN'
                      ? 'bg-amber-600 text-white'
                      : 'bg-rose-600 text-white'
                  }`}>
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                        Auditor Harian Otomatis <span className="text-slate-500 font-semibold text-xs sm:text-sm">(Daily Reconciliation Detective)</span>
                      </h3>
                      <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border shadow-2xs ${
                        dailyAudit.overallStatus === 'CLEAN'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : dailyAudit.overallStatus === 'PERHATIAN'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}>
                        {dailyAudit.overallStatus === 'CLEAN' ? '✓ STATUS: CLEAN (100% KLOP)' : `STATUS: ${dailyAudit.overallStatus}`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Inspeksi proaktif silang otomatis antara fisik gudang persediaan vs seluruh lembar kerja DHP, Setoran, dan BSPP
                    </p>
                  </div>
                </div>

                {/* Right: Live Audit Metric Pills to eliminate center/right empty space */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-slate-600 font-medium">Audit Aktif:</span>
                    <span className="font-mono font-bold text-slate-900">{dailyAudit.kpi.totalTransaksiHariIni} Mutasi</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs">
                    <span className="text-slate-600 font-medium">Toleransi:</span>
                    <span className="font-mono font-bold text-emerald-700">0,0 Kg</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs">
                    <span className="text-slate-600 font-medium">Integritas:</span>
                    <span className="font-mono font-bold text-blue-700">{dailyAudit.overallScore}%</span>
                  </div>
                </div>
              </div>

              {/* Tier 2: Controls Toolbar spanning full width comfortably */}
              <div className="mt-4 pt-3.5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5">
                {/* Date Picker on Left */}
                <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs shadow-2xs">
                  <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-xs font-semibold text-slate-600">Pilih Tanggal:</span>
                  <select
                    value={dailyAudit.tanggalIso}
                    onChange={e => setSelectedAuditDate(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer text-xs"
                  >
                    {dailyAudit.availableDates.map((dIso, idx) => {
                      const formatted = formatTanggalIndo(dIso, { withWeekday: true, monthFormat: 'short', withYear: true });
                      const isToday = dIso === getTanggalKey(new Date());
                      const label = isToday ? `${formatted} (Hari Ini)` : (idx === 0 ? `${formatted} (Data Terkini)` : formatted);
                      return (
                        <option key={dIso} value={dIso}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Action Buttons on Right */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setShowWorkflowInfo(prev => !prev)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer ${
                      showWorkflowInfo
                        ? 'bg-blue-600 text-white border border-blue-700'
                        : 'text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200'
                    }`}
                    title="Pelajari mekanisme & cara kerja mesin Auditor Harian Otomatis"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>{showWorkflowInfo ? 'Tutup Panduan' : 'Cara Kerja Auditor'}</span>
                  </button>

                  <button
                    onClick={() => setShowCategorizedReport(prev => !prev)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer ${
                      showCategorizedReport
                        ? 'bg-amber-600 text-white border border-amber-700'
                        : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300'
                    }`}
                    title="Laporan harian per jenis bahan dan semua jenis mutasi per kategori (siap dibacakan)"
                  >
                    <ListOrdered className="w-3.5 h-3.5 text-amber-700" />
                    <span>{showCategorizedReport ? 'Tutup Mutasi Terkategori' : 'Mutasi Per Kategori (Siap Baca)'}</span>
                  </button>

                  <button
                    onClick={() => exportDailyAuditPdf(dailyAudit)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-all shadow-2xs cursor-pointer"
                    title="Unduh Laporan Resmi Hasil Pemeriksaan Auditor Detektif Harian (PDF)"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Unduh PDF Audit</span>
                  </button>

                  <button
                    onClick={onOpenAIBot}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all shadow-2xs cursor-pointer"
                    title="Tanya rincian investigasi ke AI Bot"
                  >
                    <Bot className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Tanya AI Bot</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Expandable Cara Kerja Auditor Harian Workflow Guide */}
            {showWorkflowInfo && (
              <div className="p-4 sm:p-5 bg-gradient-to-br from-blue-50/90 via-indigo-50/60 to-white border-b border-blue-200 transition-all animate-in fade-in duration-200">
                <div className="flex items-start justify-between gap-3 mb-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <Sparkles className="w-4 h-4 text-blue-100 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
                        Bagaimana Cara Kerja "Auditor Harian Otomatis" (Daily Reconciliation Detective)?
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        Arsitektur investigasi proaktif yang menghubungkan transaksi fisik gudang dengan seluruh lembar kerja tanpa intervensi manual
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowWorkflowInfo(false)}
                    className="text-slate-400 hover:text-slate-700 text-xs font-bold px-2 py-1 rounded-md hover:bg-slate-200/50 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs space-y-1">
                    <div className="flex items-center gap-1.5 text-blue-700 font-bold text-xs">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">1</span>
                      <span>Sinkronisasi Paralel</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Menarik data mutasi fisik gudang dan lembar kerja DHP/BSPP via headless CSV langsung (~300ms) tanpa jeda otorisasi.
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs space-y-1">
                    <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-xs">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">2</span>
                      <span>Normalisasi Multi-Kunci</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Menyamakan format tanggal (ISO YYYY-MM-DD), standardisasi nama grade bahan, dan klasifikasi jenis mutasi masuk/keluar.
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">3</span>
                      <span>Verifikasi Toleransi Nol</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Membandingkan timbangan fisik vs netto DHP (Kolom I). Jika deviasi 0,0 Kg, otomatis tersemat badge <strong>100% Klop</strong>.
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-2xs space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-700 font-bold text-xs">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px]">4</span>
                      <span>Skoring Integritas Data</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Menghitung indeks akurasi dan status harian: <strong>CLEAN</strong> (100% Klop), <strong>PERHATIAN</strong>, atau <strong>KRITIS</strong>.
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center text-[10px]">5</span>
                      <span>Rekomendasi &amp; PDF</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Memberikan arahan operasional preventif untuk mandor/engineer serta ekspor dokumen PDF Audit Resmi 1-klik.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Expandable Categorized Daily Mutation Audit Report (Per Kategori & Per Bahan, Siap Dibacakan) */}
            {showCategorizedReport && (
              <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-white border-b border-amber-200 transition-all animate-in fade-in duration-200">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 pb-3 border-b border-amber-200/70">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <ListOrdered className="w-4 h-4 text-amber-100" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
                          Laporan Audit Mutasi Per Kategori &amp; Per Bahan
                        </h4>
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                          {categorizedAudit.tanggalIndo}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Disajikan berurutan per kategori jenis transaksi agar terstruktur dan tidak lompat-lompat, lengkap dengan narasi audio resmi.
                      </p>
                    </div>
                  </div>

                  {/* Summary metric chips bridging middle space */}
                  <div className="flex items-center gap-2 text-xs font-mono shrink-0">
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-[11px] font-bold shadow-2xs">
                      +{categorizedAudit.totalMasukKg.toLocaleString('id-ID')} Kg Masuk
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-rose-300 text-rose-800 text-[11px] font-bold shadow-2xs">
                      -{categorizedAudit.totalKeluarKg.toLocaleString('id-ID')} Kg Keluar
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 text-[11px] font-bold shadow-2xs hidden sm:inline-block">
                      {categorizedAudit.totalTransaksi} Transaksi
                    </span>
                  </div>

                  {/* Audio & Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <button
                      onClick={handleToggleSpeakCategorized}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer ${
                        isSpeakingCategorized
                          ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                      title={isSpeakingCategorized ? 'Hentikan pembacaan audio' : 'Dengarkan pembacaan naskah mutasi secara urut'}
                    >
                      {isSpeakingCategorized ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Hentikan Suara</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Dengarkan Pembacaan Runtut 🔊</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setIsVoiceModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-all shadow-2xs cursor-pointer"
                      title="Atur Pilihan Suara AI Natural (Gemini Studio AI / Suara Natural Browser)"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Pilihan Suara</span>
                    </button>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(categorizedAudit.spokenScript);
                        setCopiedCategorized(true);
                        setTimeout(() => setCopiedCategorized(false), 2000);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
                      title="Salin Naskah Narasi Suara"
                    >
                      {copiedCategorized ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                      <span>{copiedCategorized ? 'Tersalin' : 'Salin Naskah'}</span>
                    </button>

                    <button
                      onClick={() => setShowCategorizedReport(false)}
                      className="text-slate-400 hover:text-slate-700 text-xs font-bold px-2 py-1.5 rounded-md hover:bg-slate-200/50 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Categories Flow Grid */}
                <div className="space-y-3.5">
                  {categorizedAudit.groups.map(grp => (
                    <div 
                      key={grp.kategoriKey} 
                      className={`p-3.5 rounded-xl border transition-all ${
                        grp.totalTransaksi > 0
                          ? 'bg-white border-amber-200/90 shadow-2xs'
                          : 'bg-slate-50/70 border-slate-200 opacity-75'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{grp.icon}</span>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block leading-tight">
                              {grp.kategoriJudul}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {grp.deskripsi}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded-md ${
                            grp.totalTransaksi > 0
                              ? (grp.tipeArus === 'masuk' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800')
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {grp.tipeArus === 'masuk' ? '+' : grp.tipeArus === 'keluar' ? '-' : ''}{grp.totalKg.toLocaleString('id-ID')} Kg
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({grp.totalTransaksi} transaksi)
                          </span>
                        </div>
                      </div>

                      {/* Items under this category */}
                      {grp.totalTransaksi === 0 ? (
                        <p className="text-[11px] text-slate-400 italic pt-2 pl-6">
                          Nihil / Tidak ada mutasi yang tercatat pada kategori ini.
                        </p>
                      ) : (
                        <div className="pt-2 space-y-2">
                          {grp.perBahan.map((pb, pIdx) => (
                            <div key={pIdx} className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/70">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1.5">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                  <span>{pb.komoditas}</span>
                                  <span className="text-slate-400 font-normal">·</span>
                                  <span className="font-mono text-slate-700 bg-white px-1.5 py-0.2 rounded border border-slate-200 text-[11px]">
                                    {pb.kode}
                                  </span>
                                </span>
                                <span className="font-mono text-slate-900 font-extrabold text-[11px]">
                                  Subtotal: {pb.subtotalKg.toLocaleString('id-ID')} Kg
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                                {pb.items.map((it, itIdx) => (
                                  <div key={itIdx} className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between gap-1.5">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-slate-400 font-mono text-[10px] w-3.5">{itIdx + 1}.</span>
                                        {it.sakKoli && (
                                          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold border border-slate-200/60">
                                            {it.sakKoli} Sak/Koli
                                          </span>
                                        )}
                                        <span className="font-bold text-slate-900 text-xs">{it.jenisMutasi}</span>
                                        {it.jalur && (
                                          <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded font-bold">
                                            {it.jalur}
                                          </span>
                                        )}
                                      </div>
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                        it.statusAudit === 'MATCH'
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                          : it.statusAudit === 'SELISIH'
                                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}>
                                        {it.statusAudit === 'MATCH' ? '100% Klop' : it.statusAudit === 'SELISIH' ? 'Selisih' : 'Tercatat'}
                                      </span>
                                    </div>

                                    <div className="flex items-end justify-between pt-1 border-t border-slate-100 text-[11px] gap-2">
                                      <span className="text-slate-600 truncate flex-1" title={it.keterangan}>
                                        {it.keterangan || '-'}
                                      </span>
                                      <span className="font-mono font-bold text-slate-900 text-xs shrink-0">
                                        {it.bobotKg.toLocaleString('id-ID')} <span className="text-[10px] text-slate-500 font-normal">Kg</span>
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Spoken Text Preview Quote */}
                <div className="mt-3.5 p-3 rounded-xl bg-amber-100/60 border border-amber-300/80 text-[11px] text-amber-950 flex items-start gap-2">
                  <Volume2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold block mb-0.5">Naskah Siaran Audio yang Dibacakan:</span>
                    <p className="italic leading-relaxed text-slate-700">
                      "{categorizedAudit.spokenScript}"
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Detective Verdict Banner */}
            <div className={`p-4 border-b transition-all ${
              dailyAudit.overallStatus === 'CLEAN'
                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-950'
                : 'bg-amber-50/50 border-amber-100 text-amber-950'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 max-w-2xl">
                  <div className="p-1.5 rounded-lg bg-white border border-emerald-200 shrink-0 shadow-2xs">
                    <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                      Kesimpulan Detektif AI
                    </span>
                    <p className="text-xs sm:text-sm font-semibold leading-relaxed">
                      "{dailyAudit.overallSummary}"
                    </p>
                  </div>
                </div>

                {/* Key Verification Badges - Bridges empty middle & right space */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-white border border-emerald-200 text-emerald-800 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Toleransi Deviasi: 0,0 Kg</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-white border border-indigo-200 text-indigo-800 shadow-2xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>2-Way Matching Aktif</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold bg-emerald-600 text-white shadow-2xs">
                    <span>{dailyAudit.kpi.persentaseKesesuaian}% Akurasi</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 4 Metric KPI Cards for Selected Date */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-50/40">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
                <span className="text-[11px] text-slate-500 font-medium block mb-1">Hasil Olah Tervalidasi</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold font-mono text-emerald-700 tabular-nums">
                    +{dailyAudit.kpi.totalHasilProsesKg.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[11px] text-slate-500">Kg</span>
                </div>
                <span className="text-[10px] text-emerald-600 font-bold block mt-1">
                  ✓ {dailyAudit.categories.pemasukanHasilProses.matchedCount} dari {dailyAudit.categories.pemasukanHasilProses.totalEntri} Bahan 100% Klop
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
                <span className="text-[11px] text-slate-500 font-medium block mb-1">Setoran Tervalidasi</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold font-mono text-blue-700 tabular-nums">
                    {dailyAudit.categories.pengeluaranSetoran.totalKg.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[11px] text-slate-500">Kg</span>
                </div>
                <span className="text-[10px] text-blue-600 font-bold block mt-1">
                  ✓ {dailyAudit.categories.pengeluaranSetoran.matchedCount} dari {dailyAudit.categories.pengeluaranSetoran.totalEntri} Transaksi Cocok
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
                <span className="text-[11px] text-slate-500 font-medium block mb-1">Total Deviasi / Selisih</span>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-xl font-extrabold font-mono tabular-nums ${
                    dailyAudit.kpi.totalSelisihKg === 0 ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {dailyAudit.kpi.totalSelisihKg}
                  </span>
                  <span className="text-[11px] text-slate-500">Kg</span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium block mt-1">
                  {dailyAudit.kpi.totalSelisihKg === 0 ? 'Nol deviasi bobot riil' : 'Memerlukan verifikasi timbang'}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
                <span className="text-[11px] text-slate-500 font-medium block mb-1">Indeks Integritas Audit</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold font-mono text-indigo-700 tabular-nums">
                    {dailyAudit.kpi.persentaseKesesuaian}%
                  </span>
                  <span className="text-[11px] text-slate-500">akurasi</span>
                </div>
                <span className="text-[10px] text-indigo-600 font-bold block mt-1">
                  Predikat: {dailyAudit.overallStatus === 'CLEAN' ? 'A+ (Paripurna)' : 'Memerlukan Tindak Lanjut'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Pemasukan Hasil Proses (Rajang II) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                  1. Rincian Pemasukan Hasil Proses vs Kertas Kerja DHP (Rajang II)
                </h4>
              </div>

              {/* Center status chip - Fills middle space */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-semibold">Acuan: DHP Kolom I (Netto)</span>
                <span className="text-emerald-400">·</span>
                <span className="font-bold">Toleransi: 0,0 Kg (Nol Deviasi)</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-semibold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                  Total Tonase: <strong className="text-emerald-700 font-mono">+{dailyAudit.categories.pemasukanHasilProses.totalKg.toLocaleString('id-ID')} Kg</strong> ({dailyAudit.categories.pemasukanHasilProses.totalEntri} entri)
                </span>
              </div>
            </div>

            {dailyAudit.categories.pemasukanHasilProses.items.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Tidak ada transaksi Pemasukan Hasil Proses pada tanggal ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 text-[11px] font-bold text-slate-700 uppercase border-b border-slate-200 tracking-wider">
                      <th className="py-3 px-3.5 w-12 text-center">No</th>
                      <th className="py-3 px-4 w-44">Kode &amp; Bahan Baku</th>
                      <th className="py-3 px-3 w-20 text-center">Jalur</th>
                      <th className="py-3 px-4 w-36 text-right">Timbangan Fisik</th>
                      <th className="py-3 px-4 w-36 text-right">Kertas Kerja DHP</th>
                      <th className="py-3 px-3.5 w-28 text-right">Selisih</th>
                      <th className="py-3 px-4 min-w-[240px]">Rujukan Dokumen &amp; Validasi Silang</th>
                      <th className="py-3 px-4 w-36 text-center">Status Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {dailyAudit.categories.pemasukanHasilProses.items.map((it, idx) => (
                      <tr key={it.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3.5 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block font-mono text-xs">{it.kode}</span>
                          <span className="text-[10.5px] text-slate-500 font-medium">Tembakau &amp; Krosok (Rajang II)</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            it.jalur === 'SKM' 
                              ? 'bg-blue-50 text-blue-900 border-blue-200' 
                              : 'bg-amber-50 text-amber-900 border-amber-200'
                          }`}>
                            {it.jalur || 'SKT'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700 font-mono text-xs tabular-nums">
                          +{it.fisikKg.toLocaleString('id-ID', { minimumFractionDigits: 1 })} <span className="text-[10px] text-slate-400 font-normal">Kg</span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-700 font-mono text-xs tabular-nums">
                          {it.kertasKerjaKg.toLocaleString('id-ID', { minimumFractionDigits: 1 })} <span className="text-[10px] text-slate-400 font-normal">Kg</span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-bold font-mono text-xs">
                          {it.selisihKg === 0 ? (
                            <span className="inline-block text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">0,0 Kg</span>
                          ) : (
                            <span className="inline-block text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px]">{it.selisihKg > 0 ? '+' : ''}{it.selisihKg} Kg</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-700 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200/90 font-mono text-[11px] font-semibold">
                              <FileText className="w-3.5 h-3.5 text-slate-500" />
                              <span>{it.sumberKertasKerja}</span>
                            </span>
                            <span className="text-[11px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80">
                              Kolom I Netto · Sinkron Fisik
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-2xs ${
                            it.status === 'MATCH'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{it.status === 'MATCH' ? 'VALID 100%' : 'ADA SELISIH'}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Pengeluaran Setoran (Rajang II) */}
          {dailyAudit.categories.pengeluaranSetoran.items.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                    2. Rincian Pengeluaran Setoran vs Kertas Kerja BSPP SETORAN (Kolom H)
                  </h4>
                </div>

                {/* Center status chip - Fills middle space */}
                <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-semibold">Acuan: BSPP Setoran Kolom H</span>
                  <span className="text-blue-400">·</span>
                  <span className="font-bold">Verifikasi Meja Giling</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-semibold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    Total Keluar: <strong className="text-blue-700 font-mono">-{dailyAudit.categories.pengeluaranSetoran.totalKg.toLocaleString('id-ID')} Kg</strong> ({dailyAudit.categories.pengeluaranSetoran.totalEntri} entri)
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 text-[11px] font-bold text-slate-700 uppercase border-b border-slate-200 tracking-wider">
                      <th className="py-3 px-3.5 w-12 text-center">No</th>
                      <th className="py-3 px-4 w-44">Kode &amp; Bahan Baku</th>
                      <th className="py-3 px-4 w-36 text-right">Fisik Keluar</th>
                      <th className="py-3 px-4 w-36 text-right">Label Netto Setoran</th>
                      <th className="py-3 px-3.5 w-28 text-right">Selisih</th>
                      <th className="py-3 px-4 min-w-[240px]">Rujukan Dokumen &amp; Validasi Silang</th>
                      <th className="py-3 px-4 w-36 text-center">Status Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {dailyAudit.categories.pengeluaranSetoran.items.map((it, idx) => (
                      <tr key={it.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3.5 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block font-mono text-xs">{it.kode}</span>
                          <span className="text-[10.5px] text-slate-500 font-medium">Rajang II (Setoran Meja Giling)</span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-rose-600 font-mono text-xs tabular-nums">
                          -{it.fisikKg.toLocaleString('id-ID', { minimumFractionDigits: 1 })} <span className="text-[10px] text-slate-400 font-normal">Kg</span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-700 font-mono text-xs tabular-nums">
                          {it.kertasKerjaKg.toLocaleString('id-ID', { minimumFractionDigits: 1 })} <span className="text-[10px] text-slate-400 font-normal">Kg</span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-bold font-mono text-xs">
                          {it.selisihKg === 0 ? (
                            <span className="inline-block text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">0,0 Kg</span>
                          ) : (
                            <span className="inline-block text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">{it.selisihKg} Kg</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-700 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200/90 font-mono text-[11px] font-semibold">
                              <FileText className="w-3.5 h-3.5 text-slate-500" />
                              <span>{it.sumberKertasKerja}</span>
                            </span>
                            <span className="text-[11px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80">
                              BSPP Setoran Kolom H · Sinkron
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-2xs ${
                            it.status === 'MATCH'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                            <span>{it.status === 'MATCH' ? 'COCOK 100%' : 'BELUM COCOK'}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 3: Temuan Detektif AI & Rekomendasi Tindakan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Temuan Investigasi Lapangan</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-700">
                {dailyAudit.detectiveFindings.map((f, fIdx) => (
                  <li key={fIdx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 leading-relaxed">
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                <span>Rekomendasi Operasional &amp; Kunci Baseline</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-700">
                {dailyAudit.actionRecommendations.map((r, rIdx) => (
                  <li key={rIdx} className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80 leading-relaxed text-amber-950">
                    <strong>Tindakan #{rIdx + 1}:</strong> {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: PREDIKSI SISA HARI (RUNOUT & ROP) */}
      {activeTab === 'runout' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Prediksi Sisa Hari Persediaan (*Days of Inventory*) &amp; Reorder Point
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dihitung secara prediktif berdasarkan riwayat laju pemakaian keluar (*burn-rate*) harian per grade
              </p>
            </div>

            {/* Center Summary Indicator - Bridges gap between title and filters */}
            <div className="hidden lg:flex items-center gap-2.5 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
              <span className="text-slate-500 font-medium">Rata-rata DOI:</span>
              <span className="font-mono font-bold text-blue-700">{kpi.avgDaysOfInventory} Hari Buffer</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500 font-medium">Kritis:</span>
              <span className={`font-mono font-bold ${kpi.totalKritis > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {kpi.totalKritis} Grade
              </span>
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
                <tr className="bg-slate-100/90 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  <th className="py-3 px-4 w-48">Bahan &amp; Kode Grade</th>
                  <th className="py-3 px-4 w-36 text-right">Saldo Saat Ini</th>
                  <th className="py-3 px-4 w-36 text-right">Laju Pakai / Hari</th>
                  <th className="py-3 px-4 min-w-[220px]">Sisa Hari Stok (DOI)</th>
                  <th className="py-3 px-4 w-36">Proyeksi Habis</th>
                  <th className="py-3 px-4 w-40 text-right">Titik Re-order (ROP)</th>
                  <th className="py-3 px-4 w-32 text-center">Status</th>
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
                          <div className="w-24 sm:w-32 bg-slate-100 h-2.5 rounded-full overflow-hidden">
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
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Hasil Audit Deviasi &amp; Anomali Timbangan BSPP
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  AI memindai transaksi penerimaan gudang Cengkeh &amp; Rajang II yang menyusut atau lebih di luar ambang batas 0,5%
                </p>
              </div>

              {/* Center & Right Badges */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <span className="text-xs font-semibold px-3 py-1 bg-white text-slate-700 border border-slate-200 rounded-lg shadow-2xs">
                  Total Terpantau: <strong className={bsppAnomalies.length > 0 ? 'text-amber-700' : 'text-emerald-700'}>{bsppAnomalies.length} Kasus</strong>
                </span>
                <span className="text-xs font-semibold px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg shrink-0">
                  Ambang Batas Toleransi: 0,5%
                </span>
              </div>
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
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Peringatan Stok Mengendap &amp; Bahan Baku Tidak Bergerak (*Slow-Moving*)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mendeteksi kode grade yang memiliki saldo aktif namun tidak mengalami mutasi keluar selama &gt; 25 hari
              </p>
            </div>

            {/* Center & Right Badges - Bridges gap */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <span className="text-xs font-semibold px-3 py-1 bg-white text-slate-700 border border-slate-200 rounded-lg shadow-2xs">
                Kriteria: <strong className="text-purple-700">&gt; 25 Hari Dormant</strong>
              </span>
              <span className="text-xs font-semibold px-3 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-lg shrink-0">
                Total Mengendap: {slowMovingList.length} Kode
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-[10.5px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4 w-52">Kode &amp; Bahan Baku</th>
                  <th className="py-3 px-4 w-36 text-right">Saldo Mengendap</th>
                  <th className="py-3 px-4 w-36 text-center">Hari Tanpa Mutasi</th>
                  <th className="py-3 px-4 w-36">Aktivitas Terakhir</th>
                  <th className="py-3 px-4 w-44 text-center">Tingkat Risiko Mutu</th>
                  <th className="py-3 px-4 min-w-[240px]">Rekomendasi Tindakan AI</th>
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Main Document Viewer (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    DOKUMEN RESMI MANAJERIAL
                  </span>
                  <span className="text-slate-400 text-xs hidden sm:inline">·</span>
                  <span className="text-xs text-slate-500 hidden sm:inline">PT Batu Karang Divisi Produksi I</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Laporan Eksekutif Logistik ({reportPeriod})
                </h3>
              </div>

              {/* Center model badge - Fills middle gap */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-semibold">AI Generator:</span>
                <span className="font-mono font-bold text-indigo-800">Gemini 3.8 Flash</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
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
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingReport ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingReport ? 'Menyusun...' : 'Regenerate'}</span>
                </button>
              </div>
            </div>

            {/* Document Paper Container */}
            <div className="bg-slate-950 text-slate-100 p-5 sm:p-6 rounded-xl font-mono text-xs sm:text-[13px] leading-relaxed overflow-x-auto border border-slate-800 max-h-[560px] overflow-y-auto whitespace-pre-wrap select-text shadow-inner">
              {isGeneratingReport ? (
                <div className="py-20 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                  <p className="text-slate-300 font-sans text-sm font-medium">
                    Gemini 3.8 Flash sedang menganalisis tonase masuk, keluar, susut BSPP, dan menyusun narasi resmi...
                  </p>
                </div>
              ) : (
                reportText
              )}
            </div>

            {/* Quick Export Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium">
                Terverifikasi secara otomatis oleh Sistem AI Logistik &amp; Audit Persediaan
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyReport}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
                >
                  {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedReport ? 'Tersalin!' : 'Salin Teks (WA / Email)'}</span>
                </button>
                <button
                  onClick={handleDownloadReportPdf}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Download PDF Resmi</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Executive KPI & Actions Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Quick Metrics Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Indikator Logistik Kunci</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Status Integritas Data:</span>
                  <span className="font-bold text-emerald-700 font-mono">
                    {dailyAudit.kpi.persentaseKesesuaian}% Klop (Paripurna)
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Bahan Kritis (&lt; 7 Hari):</span>
                  <span className={`font-bold font-mono ${kpi.totalKritis > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {kpi.totalKritis} Kode Bahan
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Stok Mengendap (&gt;25 Hari):</span>
                  <span className="font-bold text-purple-700 font-mono">
                    {kpi.totalSlowMoving} Kode Grade
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Anomali Susut BSPP:</span>
                  <span className="font-bold text-blue-700 font-mono">
                    {kpi.totalBsppAnomalies} Kasus Terpantau
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 space-y-1.5">
                <span className="font-bold flex items-center gap-1.5 text-amber-900">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                  <span>Kaidah Pelaporan Manajerial:</span>
                </span>
                <p className="text-[11px] text-amber-900/90 leading-relaxed">
                  Laporan merangkum pergerakan gudang tembakau, cengkeh, krosok, dan saus, serta mengaudit akurasi timbangan BSPP agar jajaran Direksi menerima data siap eksekusi.
                </p>
              </div>
            </div>

            {/* Quick Action Card */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-xs space-y-3.5 border border-indigo-800">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300 font-mono uppercase tracking-wider">
                <Bot className="w-4 h-4" />
                <span>Konsultasi Cepat AI</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Butuh pendalaman mengenai analisa biaya susut atau simulasi pemesanan grade tertentu?
              </p>
              <button
                onClick={onOpenAIBot}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Bot className="w-4 h-4 text-amber-300" />
                <span>Buka Diskusi dengan AI Bot</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Settings Modal */}
      <VoiceSettingsModal 
        isOpen={isVoiceModalOpen} 
        onClose={() => setIsVoiceModalOpen(false)} 
      />
    </div>
  );
};
