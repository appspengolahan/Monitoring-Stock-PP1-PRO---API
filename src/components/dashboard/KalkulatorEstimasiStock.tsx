import React, { useState, useMemo, useEffect } from 'react';
import { KomoditasData } from '../../types';
import { 
  CalculatedStockItem, 
  EstimationConfig, 
  CommodityCategory, 
  DailyUsageBasis,
  DayOfWeek
} from '../../types/stockEstimation';
import { StockEstimationService } from '../../services/stockEstimationService';
import { GasService } from '../../services/gasService';
import { 
  Calculator, 
  RefreshCw, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Flame, 
  Info, 
  HelpCircle, 
  Layers, 
  Clock, 
  Calendar, 
  FileSpreadsheet, 
  SlidersHorizontal,
  ChevronRight,
  TrendingDown,
  Warehouse,
  ExternalLink,
  Edit3,
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface Props {
  komoditasList: KomoditasData[];
}

export const KalkulatorEstimasiStock: React.FC<Props> = ({ komoditasList }) => {
  // 1. Config states
  const [config, setConfig] = useState<EstimationConfig>(() => StockEstimationService.getConfig());
  const [categoryFilter, setCategoryFilter] = useState<'all' | CommodityCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Defisit' | 'Menipis' | 'Aman'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hideZeroStock, setHideZeroStock] = useState<boolean>(true); // Default: sembunyikan saldo 0 / tidak aktif
  const [sortField, setSortField] = useState<'nama' | 'kodeIntern' | 'totalKebutuhan' | 'saldoRiilGudang' | 'sisaSaldo' | 'ketahananHari' | 'status'>('nama');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [selectedItemDetail, setSelectedItemDetail] = useState<CalculatedStockItem | null>(null);
  const [showWeeklyPlanModal, setShowWeeklyPlanModal] = useState<boolean>(false);
  const [showPlanAdjustModal, setShowPlanAdjustModal] = useState<boolean>(false);
  const [tempPlan, setTempPlan] = useState<{
    campur153: number;
    campurKarang: number;
    campurSP: number;
    campurTIS: number;
    campurFReguler: number;
    campurFRLABold: number;
  }>({
    campur153: 40,
    campurKarang: 6,
    campurSP: 0,
    campurTIS: 0,
    campurFReguler: 1,
    campurFRLABold: 0
  });

  const handleToggleSort = (field: 'nama' | 'kodeIntern' | 'totalKebutuhan' | 'saldoRiilGudang' | 'sisaSaldo' | 'ketahananHari' | 'status') => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // User session & RBAC for raw spreadsheet access (Opsi 1: Hanya Developer, Engineer, & Manajer Operasional)
  const [session, setSession] = useState(() => GasService.getCurrentSession());

  useEffect(() => {
    const handleSessionChange = () => {
      setSession(GasService.getCurrentSession());
    };
    window.addEventListener('stockpp1_session_updated', handleSessionChange);
    window.addEventListener('storage', handleSessionChange);
    return () => {
      window.removeEventListener('stockpp1_session_updated', handleSessionChange);
      window.removeEventListener('storage', handleSessionChange);
    };
  }, []);

  const canAccessRawSpreadsheet = useMemo(() => {
    if (!session) return false;
    if (session.hasDevAccess) return true;
    const role = (session.role || '').toLowerCase();
    return (
      role.includes('developer') ||
      role.includes('engineer') ||
      role.includes('pm') ||
      role.includes('manajer') ||
      role.includes('manager') ||
      role.includes('kepala bagian')
    );
  }, [session]);

  const [prufVersion, setPrufVersion] = useState<number>(0);

  // Auto-sync data resep pruf & rencana campur saat kalkulator pertama kali dibuka
  // serta mendengarkan sinyal update jika ditarik dari navbar atas
  useEffect(() => {
    const handlePrufUpdate = () => setPrufVersion(v => v + 1);
    window.addEventListener('stockpp1_pruf_data_updated', handlePrufUpdate);

    // Tarik data terbaru dari Google Sheets secara senyap di background
    StockEstimationService.refreshFromGoogleSheets().catch(() => {});

    return () => window.removeEventListener('stockpp1_pruf_data_updated', handlePrufUpdate);
  }, []);

  // 2. Refresh manual from Google Sheets
  const handleRefreshSheet = async () => {
    setIsRefreshing(true);
    setRefreshMessage(null);
    try {
      const res = await StockEstimationService.refreshFromGoogleSheets();
      setRefreshMessage(res.message);
      setTimeout(() => setRefreshMessage(null), 5000);
    } catch (e: any) {
      setRefreshMessage(`Gagal: ${e.message || String(e)}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 3. Update configuration
  const handleUpdateConfig = (patch: Partial<EstimationConfig>) => {
    const updated = StockEstimationService.saveConfig(patch);
    setConfig(updated);
  };

  // 4. Calculate estimation items (Otomatis recalculate saat isRefreshing atau prufVersion berubah)
  const prufData = useMemo(() => StockEstimationService.getPrufData(), [isRefreshing, prufVersion]);

  const { items, summary } = useMemo(() => {
    return StockEstimationService.calculateStockEstimations(komoditasList, config, prufData);
  }, [komoditasList, config, prufData]);

  // 5. Filtered & Sorted items (Default: Alphabet A - Z)
  const filteredItems = useMemo(() => {
    const list = items.filter(item => {
      // Category filter - strict match
      if (categoryFilter === 'Cengkeh' && item.kategori !== 'Cengkeh') return false;
      if (categoryFilter === 'Tembakau & Krosok (Rajang II)' && item.kategori !== 'Tembakau & Krosok (Rajang II)') return false;

      // Checkbox "Sembunyikan Saldo 0":
      // Ketika aktif (default), sembunyikan bahan yang tidak memiliki saldo riil gudang dan tidak ada rencana pemakaian
      if (hideZeroStock && item.saldoRiilGudang <= 0 && item.totalKebutuhan <= 0) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.nama.toLowerCase().includes(q);
        const matchKode = item.kodeIntern.toLowerCase().includes(q);
        const matchMatched = item.matchedStockGradeName.toLowerCase().includes(q);
        return matchName || matchKode || matchMatched;
      }

      return true;
    });

    // Urutkan data - Default adalah Alphabet A - Z berdasarkan Nama Bahan & Grade
    list.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'nama') {
        comparison = a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' });
      } else if (sortField === 'kodeIntern') {
        comparison = (a.kodeIntern || '').localeCompare(b.kodeIntern || '', 'id');
      } else if (sortField === 'totalKebutuhan') {
        comparison = a.totalKebutuhan - b.totalKebutuhan;
      } else if (sortField === 'saldoRiilGudang') {
        comparison = a.saldoRiilGudang - b.saldoRiilGudang;
      } else if (sortField === 'sisaSaldo') {
        comparison = a.sisaSaldo - b.sisaSaldo;
      } else if (sortField === 'ketahananHari') {
        comparison = a.ketahananHari - b.ketahananHari;
      } else if (sortField === 'status') {
        const order = { Defisit: 1, Menipis: 2, Aman: 3 };
        comparison = (order[a.status] || 99) - (order[b.status] || 99);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [items, categoryFilter, statusFilter, searchQuery, hideZeroStock, sortField, sortDirection]);

  // Plan Breakdown info
  const planInfo = prufData.planInfo;

  // Status tracking realisasi harian
  const isTrackingActive = config.trackingMode === 'realisasi_berjalan';
  const completedDays = isTrackingActive ? (config.completedDays || []) : [];

  const handleOpenPlanModal = () => {
    setTempPlan({
      campur153: config.customBatchPlan?.campur153 ?? planInfo.campur153 ?? 40,
      campurKarang: config.customBatchPlan?.campurKarang ?? planInfo.campurKarang ?? 6,
      campurSP: config.customBatchPlan?.campurSP ?? planInfo.campurSP ?? 0,
      campurTIS: config.customBatchPlan?.campurTIS ?? planInfo.campurTIS ?? 0,
      campurFReguler: config.customBatchPlan?.campurFReguler ?? planInfo.campurFReguler ?? (planInfo.campurTotalSKM || 1),
      campurFRLABold: config.customBatchPlan?.campurFRLABold ?? planInfo.campurFRLABold ?? 0
    });
    setShowPlanAdjustModal(true);
  };

  const handleSaveCustomPlan = () => {
    const totalSKT = tempPlan.campur153 + tempPlan.campurKarang + tempPlan.campurSP + tempPlan.campurTIS;
    const totalSKM = tempPlan.campurFReguler + tempPlan.campurFRLABold;
    const totalSemua = totalSKT + totalSKM;
    handleUpdateConfig({
      customBatchPlan: {
        ...tempPlan,
        campurTotalSKT: totalSKT,
        campurTotalSKM: totalSKM,
        campurTotalSemua: totalSemua
      }
    });
    setShowPlanAdjustModal(false);
  };

  const handleResetCustomPlan = () => {
    handleUpdateConfig({
      customBatchPlan: undefined
    });
    setShowPlanAdjustModal(false);
  };

  // Rincian rencana campuran per jenis tembakau blend (bisa rencana awal atau sisa yang belum terealisasi)
  const activeBlendPlans = useMemo(() => {
    let b153 = config.customBatchPlan?.campur153 ?? planInfo.campur153 ?? 0;
    let bKarang = config.customBatchPlan?.campurKarang ?? planInfo.campurKarang ?? 0;
    let bSP = config.customBatchPlan?.campurSP ?? planInfo.campurSP ?? 0;
    let bTIS = config.customBatchPlan?.campurTIS ?? planInfo.campurTIS ?? 0;
    let bFReguler = config.customBatchPlan?.campurFReguler ?? planInfo.campurFReguler ?? (planInfo.campurTotalSKM || 0);
    let bFRLABold = config.customBatchPlan?.campurFRLABold ?? planInfo.campurFRLABold ?? 0;

    // Jika mode auto DHP blend aktif, potong langsung dengan molen yang tercatat selesai di DHP Blend
    if (config.autoDhpRealisasi) {
      try {
        const dhpEntries = GasService.getCachedDHPBlend();
        for (const entry of dhpEntries) {
          const tgl = (entry.tanggal || '');
          if (tgl.includes('2026-11') || tgl.includes('Nov 2026') || !tgl) {
            const count = Array.isArray(entry.molenList) && entry.molenList.length > 0 ? entry.molenList.length : 1;
            const name = (entry.nama || '').toUpperCase();
            if (name.includes('SP 153')) bSP = Math.max(0, bSP - count);
            else if (name.includes('153')) b153 = Math.max(0, b153 - count);
            else if (name.includes('KARANG')) bKarang = Math.max(0, bKarang - count);
            else if (name.includes('TIS')) bTIS = Math.max(0, bTIS - count);
            else if (name.includes('LA BOLD')) bFRLABold = Math.max(0, bFRLABold - count);
            else if (name.includes('F REGULER') || name.includes('AVE') || name.includes('FR LN')) bFReguler = Math.max(0, bFReguler - count);
          }
        }
      } catch {}
    } else if (isTrackingActive && completedDays.length > 0 && prufData.weeklyPlan?.schedules) {
      for (const schedule of prufData.weeklyPlan.schedules) {
        const name = schedule.blendName.toUpperCase();
        let daySum = 0;
        for (const day of completedDays) {
          daySum += Number(schedule[day] || 0);
        }

        if (name.includes('SP 153')) bSP = Math.max(0, bSP - daySum);
        else if (name.includes('153')) b153 = Math.max(0, b153 - daySum);
        else if (name.includes('KARANG')) bKarang = Math.max(0, bKarang - daySum);
        else if (name.includes('TIS')) bTIS = Math.max(0, bTIS - daySum);
        else if (name.includes('LA BOLD')) bFRLABold = Math.max(0, bFRLABold - daySum);
        else if (name.includes('F REGULER') || name.includes('AVE')) bFReguler = Math.max(0, bFReguler - daySum);
      }
    }

    const list: { label: string; count: number }[] = [];
    if (b153 > 0) list.push({ label: '153-BK', count: b153 });
    if (bKarang > 0) list.push({ label: 'Karang', count: bKarang });
    if (bSP > 0) list.push({ label: 'SP 153', count: bSP });
    if (bTIS > 0) list.push({ label: 'TIS KBT24', count: bTIS });
    if (bFReguler > 0) list.push({ label: 'F REGULER (LN, AVE)', count: bFReguler });
    if (bFRLABold > 0) list.push({ label: 'FR LA Bold', count: bFRLABold });

    if (list.length === 0) {
      list.push({ label: 'Semua Rencana Selesai', count: 0 });
    }
    return list;
  }, [planInfo, config.customBatchPlan, config.autoDhpRealisasi, isTrackingActive, completedDays, prufData.weeklyPlan]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header Info & Title */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              <Calculator className="w-3.5 h-3.5 text-amber-300" />
              <span>Kalkulator Estimasi Kebutuhan &amp; Ketahanan Stock</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Perencanaan Kebutuhan Bahan Tembakau Blend PP1
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Mengombinasikan master resep dari <span className="text-amber-300 font-semibold">DATABASEPRUF TEMBAKAU &amp; KROSOK</span> dan <span className="text-amber-300 font-semibold">DATABASEPRUF CENGKEH</span> dengan saldo riil fisik di <span className="text-emerald-300 font-semibold">Gudang Rajang II &amp; Cengkeh PP1</span>.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleOpenPlanModal}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-xs border ${
                config.customBatchPlan
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300 font-bold'
                  : 'bg-indigo-600/70 hover:bg-indigo-600 text-white border-indigo-400/40'
              }`}
              title="Atur atau ubah jumlah rencana campur secara fleksibel sesuai kondisi riil pabrik"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-300" />
              <span>{config.customBatchPlan ? `Plan Riil: ${summary.totalBatchPlan} Campur` : 'Sesuaikan Rencana'}</span>
            </button>
            <button
              onClick={() => setShowWeeklyPlanModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-slate-700 flex items-center gap-2 transition-all shadow-xs"
              title="Buka Rincian Jadwal Harian Blend Mingguan (Senin - Minggu) dari tab PLANING BLEND MINGGUAN"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              <span>Jadwal Harian Blend</span>
            </button>
            <button
              onClick={handleRefreshSheet}
              disabled={isRefreshing}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 transition-all shadow-xs disabled:opacity-50"
              title="Tarik pembaruan resep &amp; rencana campur langsung dari Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Menyinkronkan...' : 'Segarkan Data Pruf'}</span>
            </button>
            {/* Opsi 1: Tombol Spreadsheet diamankan dengan RBAC ketat. Hanya Developer, Engineer, & Manajer Operasional yang dapat melihat/mengakses */}
            {canAccessRawSpreadsheet && (
              <a
                href={`https://docs.google.com/spreadsheets/d/${prufData.spreadsheetId}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
                title="Buka Spreadsheet DATABASEPRUF (Akses Khusus: Developer / Engineer / Manajer Operasional)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            )}
          </div>
        </div>

        {refreshMessage && (
          <div className="mt-3 p-2.5 rounded-xl text-xs font-medium bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 flex items-center gap-2 animate-in fade-in">
            <Info className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{refreshMessage}</span>
          </div>
        )}
      </div>

      {/* Dynamic Daily Progress & Realization Tracker */}
      <div className="bg-gradient-to-br from-white to-slate-50/80 rounded-2xl p-4 border border-indigo-100/80 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Pelacakan Progres &amp; Realisasi Campuran Harian
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  Dinamis
                </span>
                {config.customBatchPlan && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    Plan Disesuaikan ({summary.totalBatchPlan})
                  </span>
                )}
                {config.autoDhpRealisasi && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Auto-Sync DHP Aktif
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Pilih hari kerja yang campurannya sudah selesai diproses di molen untuk otomatis mengurangi kebutuhan bahan (Kolom X) sisa minggu.
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-200/70 p-1 rounded-xl shrink-0 text-xs font-semibold">
              <button
                onClick={() => handleUpdateConfig({ trackingMode: 'plan_awal' })}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  config.trackingMode !== 'realisasi_berjalan'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Plan Penuh ({summary.totalBatchPlan} Campur)
              </button>
              <button
                onClick={() => handleUpdateConfig({ 
                  trackingMode: 'realisasi_berjalan',
                  completedDays: config.completedDays && config.completedDays.length > 0 ? config.completedDays : ['senin']
                })}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  config.trackingMode === 'realisasi_berjalan'
                    ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Realisasi Berjalan (Sisa {summary.totalBatchSisa})
              </button>
            </div>

            <button
              onClick={() => handleUpdateConfig({ autoDhpRealisasi: !config.autoDhpRealisasi })}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                config.autoDhpRealisasi
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="Otomatis potong rencana campuran berdasarkan pencatatan hasil molen di tab DHP Blend"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{config.autoDhpRealisasi ? 'Auto DHP ON' : 'Auto DHP OFF'}</span>
            </button>
          </div>
        </div>

        {/* Realisasi Controls - active when in 'realisasi_berjalan' mode */}
        {config.trackingMode === 'realisasi_berjalan' ? (
          <div className="space-y-3 pt-1">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <span>Centang Hari yang Sudah Selesai:</span>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-slate-400 font-medium mr-1">Preset Cepat:</span>
                <button
                  onClick={() => handleUpdateConfig({ completedDays: [] })}
                  className={`px-2 py-1 rounded-lg border transition-all ${
                    (config.completedDays || []).length === 0
                      ? 'bg-slate-900 text-white border-slate-900 font-bold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Belum Ada (Sisa {summary.totalBatchPlan})
                </button>
                <button
                  onClick={() => handleUpdateConfig({ completedDays: ['senin'] })}
                  className={`px-2 py-1 rounded-lg border transition-all ${
                    JSON.stringify(config.completedDays) === JSON.stringify(['senin'])
                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Senin Selesai (Sisa {Math.max(0, summary.totalBatchPlan - (prufData.weeklyPlan?.dailyTotals.senin || 9))})
                </button>
                <button
                  onClick={() => handleUpdateConfig({ completedDays: ['senin', 'selasa'] })}
                  className={`px-2 py-1 rounded-lg border transition-all ${
                    (config.completedDays || []).includes('senin') && (config.completedDays || []).includes('selasa') && (config.completedDays || []).length === 2
                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Selasa Selesai (Sisa {Math.max(0, summary.totalBatchPlan - ((prufData.weeklyPlan?.dailyTotals.senin || 9) + (prufData.weeklyPlan?.dailyTotals.selasa || 10)))})
                </button>
                <button
                  onClick={() => handleUpdateConfig({ completedDays: ['senin', 'selasa', 'rabu'] })}
                  className={`px-2 py-1 rounded-lg border transition-all ${
                    (config.completedDays || []).includes('rabu') && (config.completedDays || []).length === 3
                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Rabu Selesai (Sisa {Math.max(0, summary.totalBatchPlan - ((prufData.weeklyPlan?.dailyTotals.senin || 9) + (prufData.weeklyPlan?.dailyTotals.selasa || 10) + (prufData.weeklyPlan?.dailyTotals.rabu || 9)))})
                </button>
                <button
                  onClick={() => handleUpdateConfig({ completedDays: ['senin', 'selasa', 'rabu', 'kamis'] })}
                  className={`px-2 py-1 rounded-lg border transition-all ${
                    (config.completedDays || []).includes('kamis') && (config.completedDays || []).length === 4
                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Kamis Selesai
                </button>
                <button
                  onClick={() => handleUpdateConfig({ completedDays: ['senin', 'selasa', 'rabu', 'kamis', 'jumat'] })}
                  className={`px-2 py-1 rounded-lg border transition-all ${
                    (config.completedDays || []).length === 5
                      ? 'bg-emerald-700 text-white border-emerald-700 font-bold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Semua Selesai (0)
                </button>
              </div>
            </div>

            {/* Day-by-Day Toggle Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { day: 'senin' as DayOfWeek, label: 'Senin', count: prufData.weeklyPlan?.dailyTotals.senin || 9, date: prufData.weeklyPlan?.dates.senin || '02/11/26' },
                { day: 'selasa' as DayOfWeek, label: 'Selasa', count: prufData.weeklyPlan?.dailyTotals.selasa || 10, date: prufData.weeklyPlan?.dates.selasa || '03/11/26' },
                { day: 'rabu' as DayOfWeek, label: 'Rabu', count: prufData.weeklyPlan?.dailyTotals.rabu || 9, date: prufData.weeklyPlan?.dates.rabu || '04/11/26' },
                { day: 'kamis' as DayOfWeek, label: 'Kamis', count: prufData.weeklyPlan?.dailyTotals.kamis || 9, date: prufData.weeklyPlan?.dates.kamis || '05/11/26' },
                { day: 'jumat' as DayOfWeek, label: 'Jumat', count: prufData.weeklyPlan?.dailyTotals.jumat || 10, date: prufData.weeklyPlan?.dates.jumat || '06/11/26' },
              ].map(({ day, label, count, date }) => {
                const isCompleted = (config.completedDays || []).includes(day);
                return (
                  <button
                    key={day}
                    onClick={() => {
                      const current = config.completedDays || [];
                      const next = isCompleted ? current.filter(d => d !== day) : [...current, day];
                      handleUpdateConfig({ completedDays: next });
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      isCompleted
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                          isCompleted ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400 border border-slate-300'
                        }`}>
                          {isCompleted ? '✓' : ''}
                        </span>
                        <span>{label}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{date}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-extrabold ${isCompleted ? 'text-emerald-700 line-through opacity-75' : 'text-slate-900'}`}>
                        {count}
                      </span>
                      <span className="text-[10px] text-slate-500 block">Campur</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Status Information Callout */}
            <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-2.5 text-xs text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>{(config.completedDays || []).length} Hari Selesai ({summary.totalBatchRealisasi} Campur)</strong> $\rightarrow$ Kebutuhan dihitung berdasarkan sisa <strong>{summary.totalBatchSisa} Campuran</strong> yang belum diproses.
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-600 shrink-0">
                Kolom X Terkoreksi: <span className="text-indigo-900 font-black">{summary.totalKebutuhanSemuaKg.toLocaleString('id-ID')} Kg</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-600 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-500" />
              <span>Saat ini menampilkan <strong>Perencanaan Penuh Awal Minggu ({summary.totalBatchPlan} Campuran)</strong>. Beralih ke <em>Realisasi Harian Berjalan</em> untuk memotong kebutuhan berdasarkan progres molen hari kerja.</span>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card 1: Total Plan */}
        <div 
          onClick={() => setShowWeeklyPlanModal(true)}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer group"
          title="Klik untuk melihat matriks jadwal harian blend mingguan"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold group-hover:text-indigo-600 transition-colors">
              {isTrackingActive && completedDays.length > 0 ? 'Sisa Rencana Campur' : 'Rencana Campuran'}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-indigo-600 opacity-80 group-hover:opacity-100">
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-medium">Jadwal</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-black text-slate-900 group-hover:text-indigo-950 transition-colors">
              {summary.activeBatchCount} <span className="text-xs font-semibold text-slate-500">Campur</span>
            </div>
            {isTrackingActive && completedDays.length > 0 && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300">
                {summary.totalBatchRealisasi} Terealisasi
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5" title="Rincian Sisa Campuran per Jenis Tembakau Blend">
            {activeBlendPlans.map((bp, i) => (
              <React.Fragment key={bp.label}>
                <span className="font-semibold text-slate-700 whitespace-nowrap">
                  {bp.label}: {bp.count}
                </span>
                {i < activeBlendPlans.length - 1 && <span className="text-slate-300">·</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Card 2: Total Kebutuhan Plan (Kolom X) */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold">Total Kebutuhan (Kolom X)</span>
            <Warehouse className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {summary.totalKebutuhanSemuaKg.toLocaleString('id-ID')} <span className="text-xs font-semibold text-slate-500">Kg</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Tbk Rajang II: <span className="font-semibold text-slate-800">{summary.totalKebutuhanTembakauKg.toLocaleString('id-ID')} Kg</span>
          </div>
        </div>

        {/* Card 3: Defisit & Kritis Alert */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold">Evaluasi Saldo Gudang</span>
            <AlertTriangle className={`w-4 h-4 ${summary.totalDefisitItemsCount > 0 ? 'text-rose-500' : 'text-amber-500'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black ${summary.totalDefisitItemsCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {summary.totalDefisitItemsCount}
            </span>
            <span className="text-xs font-semibold text-rose-600">Bahan Defisit</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="text-amber-600 font-semibold">{summary.totalMenipisItemsCount} Menipis</span> · 
            <span className="text-emerald-600 font-semibold">{summary.totalAmanItemsCount} Aman</span>
          </div>
        </div>

        {/* Card 4: Bottleneck Bahan */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold">Bottleneck Tercepat Habis</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          {summary.bottleneckItems.length > 0 ? (
            <div>
              <div className="text-xs font-bold text-slate-900 truncate" title={summary.bottleneckItems[0].nama}>
                {summary.bottleneckItems[0].nama}
              </div>
              <div className="text-[11px] text-rose-600 font-semibold mt-1">
                {summary.bottleneckItems[0].status === 'Defisit' 
                  ? `Kurang ${Math.abs(summary.bottleneckItems[0].sisaSaldo).toLocaleString('id-ID')} Kg` 
                  : `Tersisa ${summary.bottleneckItems[0].ketahananHari} Hari`}
              </div>
            </div>
          ) : (
            <div className="text-xs text-emerald-600 font-semibold mt-1">Semua bahan dalam kondisi cukup</div>
          )}
        </div>
      </div>

      {/* Control Panel: Acuan Pemakaian Per Hari */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
              <span>Acuan Perhitungan Rata-Rata Pemakaian Per Hari</span>
            </h3>
            <p className="text-xs text-slate-500">
              Pilih metode acuan yang digunakan pabrik untuk mengonversi saldo menjadi estimasi sisa hari kerja.
            </p>
          </div>

          {/* Basis Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0 text-xs font-semibold">
            <button
              onClick={() => handleUpdateConfig({ usageBasis: 'target_batch_per_day' })}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                config.usageBasis === 'target_batch_per_day' 
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kapasitas Campur Harian (Batch/Hari)
            </button>
            <button
              onClick={() => handleUpdateConfig({ usageBasis: 'target_work_days' })}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                config.usageBasis === 'target_work_days' 
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Durasi Hari Kerja Rencana (Hari)
            </button>
          </div>
        </div>

        {/* Dynamic Inputs based on basis */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          {config.usageBasis === 'target_batch_per_day' ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-700">Target Kapasitas Kerja Harian:</span>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                <button
                  onClick={() => handleUpdateConfig({ targetBatchPerDay: Math.max(1, config.targetBatchPerDay - 1) })}
                  className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold flex items-center justify-center text-xs"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={config.targetBatchPerDay}
                  onChange={(e) => handleUpdateConfig({ targetBatchPerDay: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-14 text-center font-bold text-slate-900 bg-transparent text-sm focus:outline-hidden"
                />
                <button
                  onClick={() => handleUpdateConfig({ targetBatchPerDay: config.targetBatchPerDay + 1 })}
                  className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold flex items-center justify-center text-xs"
                >
                  +
                </button>
                <span className="text-xs font-semibold text-slate-500 pr-1">Molen / Hari</span>
              </div>
              <span className="text-[11.5px] text-slate-500">
                (Standar pabrik: 10 Molen/Hari $\rightarrow$ Rencana {summary.totalBatchPlan} campur setara {(summary.totalBatchPlan / config.targetBatchPerDay).toFixed(1)} hari kerja)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-700">Durasi Hari Kerja Rencana Minggu Ini:</span>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                <button
                  onClick={() => handleUpdateConfig({ targetWorkDays: Math.max(1, config.targetWorkDays - 1) })}
                  className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold flex items-center justify-center text-xs"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={config.targetWorkDays}
                  onChange={(e) => handleUpdateConfig({ targetWorkDays: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-14 text-center font-bold text-slate-900 bg-transparent text-sm focus:outline-hidden"
                />
                <button
                  onClick={() => handleUpdateConfig({ targetWorkDays: config.targetWorkDays + 1 })}
                  className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold flex items-center justify-center text-xs"
                >
                  +
                </button>
                <span className="text-xs font-semibold text-slate-500 pr-1">Hari Kerja</span>
              </div>
              <span className="text-[11.5px] text-slate-500">
                (Pemakaian Harian = Total Kolom X dibagi {config.targetWorkDays} hari kerja)
              </span>
            </div>
          )}

          {/* Quick Filter Buttons & Sembunyikan Saldo 0 */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium mr-0.5">Filter Kategori:</span>
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                categoryFilter === 'all' ? 'bg-slate-900 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Bahan ({items.length})
            </button>
            <button
              onClick={() => setCategoryFilter('Tembakau & Krosok (Rajang II)')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                categoryFilter === 'Tembakau & Krosok (Rajang II)' ? 'bg-amber-800 text-white shadow-2xs' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Rajang II ({items.filter(i => i.kategori === 'Tembakau & Krosok (Rajang II)').length})
            </button>
            <button
              onClick={() => setCategoryFilter('Cengkeh')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                categoryFilter === 'Cengkeh' ? 'bg-emerald-800 text-white shadow-2xs' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Cengkeh ({items.filter(i => i.kategori === 'Cengkeh').length})
            </button>

            <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

            {/* Checkbox Sembunyikan Saldo 0 */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors shadow-2xs">
              <input
                type="checkbox"
                checked={hideZeroStock}
                onChange={(e) => setHideZeroStock(e.target.checked)}
                className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Sembunyikan Saldo 0</span>
            </label>
          </div>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode intern atau nama bahan tembakau / cengkeh..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              statusFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            Semua Status
          </button>
          <button
            onClick={() => setStatusFilter('Defisit')}
            className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              statusFilter === 'Defisit' ? 'bg-rose-600 text-white font-bold' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            <span>Defisit Saja ({summary.totalDefisitItemsCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('Menipis')}
            className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              statusFilter === 'Menipis' ? 'bg-amber-500 text-white font-bold' : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>Menipis Saja ({summary.totalMenipisItemsCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('Aman')}
            className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
              statusFilter === 'Aman' ? 'bg-emerald-600 text-white font-bold' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Aman Saja ({summary.totalAmanItemsCount})</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider font-bold">
                <th className="py-3 px-3 text-center w-12">No</th>
                <th 
                  onClick={() => handleToggleSort('kodeIntern')}
                  className="py-3 px-3 cursor-pointer hover:text-indigo-200 transition-colors select-none"
                  title="Klik untuk urutkan Kode Intern"
                >
                  <div className="flex items-center gap-1">
                    <span>Kode Intern</span>
                    {sortField === 'kodeIntern' && (
                      <span className="text-[10px] text-amber-300 font-mono">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleToggleSort('nama')}
                  className="py-3 px-4 cursor-pointer hover:text-indigo-200 transition-colors select-none bg-slate-800/80"
                  title="Klik untuk mengubah urutan A-Z / Z-A"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nama Bahan &amp; Grade</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/40 text-amber-300 border border-indigo-400/30 font-mono font-bold">
                      {sortField === 'nama' ? (sortDirection === 'asc' ? 'A → Z' : 'Z → A') : 'A-Z'}
                    </span>
                  </div>
                </th>
                <th className="py-3 px-3 text-center">Komoditas</th>
                <th className="py-3 px-3 text-right bg-slate-800 text-indigo-200" title="Kolom T: Total Kebutuhan SKT">SKT (Kg)</th>
                <th className="py-3 px-3 text-right bg-slate-800 text-indigo-200" title="Kolom W: Total Kebutuhan SKM">SKM (Kg)</th>
                <th 
                  onClick={() => handleToggleSort('totalKebutuhan')}
                  className="py-3 px-4 text-right bg-indigo-900 text-amber-300 font-extrabold cursor-pointer hover:bg-indigo-800 transition-colors select-none" 
                  title="Kolom X: Acuan Utama Kebutuhan (Total SKT + SKM). Klik untuk urutkan."
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Kebutuhan (X)</span>
                    {sortField === 'totalKebutuhan' && (
                      <span className="text-[10px] text-amber-300 font-mono">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleToggleSort('saldoRiilGudang')}
                  className="py-3 px-4 text-right font-extrabold bg-slate-800 text-emerald-300 cursor-pointer hover:bg-slate-700 transition-colors select-none" 
                  title="Saldo Terkini Fisik Gudang Rajang II / Cengkeh. Klik untuk urutkan."
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Saldo Riil Gudang</span>
                    {sortField === 'saldoRiilGudang' && (
                      <span className="text-[10px] text-emerald-300 font-mono">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleToggleSort('sisaSaldo')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-indigo-200 transition-colors select-none"
                  title="Klik untuk urutkan Sisa Saldo"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Sisa Saldo</span>
                    {sortField === 'sisaSaldo' && (
                      <span className="text-[10px] text-amber-300 font-mono">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-3 text-right" title="Rata-rata Pemakaian per Hari">Pemakaian / Hari</th>
                <th 
                  onClick={() => handleToggleSort('ketahananHari')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-indigo-200 transition-colors select-none"
                  title="Klik untuk urutkan Ketahanan Hari"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Ketahanan Hari</span>
                    {sortField === 'ketahananHari' && (
                      <span className="text-[10px] text-amber-300 font-mono">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleToggleSort('status')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-indigo-200 transition-colors select-none"
                  title="Klik untuk urutkan Status"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Status</span>
                    {sortField === 'status' && (
                      <span className="text-[10px] text-amber-300 font-mono">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <div>Tidak ada bahan yang cocok dengan kriteria pencarian / filter.</div>
                    {hideZeroStock && (
                      <div className="text-[11px] text-slate-400 mt-1">
                        (Bahan bersaldo 0 disembunyikan. Hilangkan centang &quot;Sembunyikan Saldo 0&quot; di atas untuk menampilkan seluruh bahan).
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const isDefisit = item.status === 'Defisit';
                  const isMenipis = item.status === 'Menipis';

                  return (
                    <tr 
                      key={item.id}
                      onClick={() => setSelectedItemDetail(item)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        isDefisit ? 'bg-rose-50/40' : isMenipis ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">{item.kodeIntern || '—'}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{item.nama}</span>
                          {item.catatanSubstitusi && (
                            <span 
                              className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold" 
                              title={item.catatanSubstitusi}
                            >
                              QC
                            </span>
                          )}
                        </div>
                        {item.matchedStockGradeName && item.matchedStockGradeName !== item.nama && (
                          <div className="text-[10px] text-slate-400">
                            Stok: {item.matchedStockGradeName}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.kategori === 'Cengkeh' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          {item.kategori === 'Cengkeh' ? 'Cengkeh' : 'Rajang II'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {item.kebutuhanSKT > 0 ? item.kebutuhanSKT.toLocaleString('id-ID') : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {item.kebutuhanSKM > 0 ? item.kebutuhanSKM.toLocaleString('id-ID') : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-indigo-950 bg-indigo-50/40">
                        {item.totalKebutuhan > 0 ? `${item.totalKebutuhan.toLocaleString('id-ID')} Kg` : '0 Kg'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 bg-slate-50/60">
                        {item.saldoRiilGudang.toLocaleString('id-ID')} Kg
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        <span className={item.sisaSaldo < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                          {item.sisaSaldo > 0 ? '+' : ''}{item.sisaSaldo.toLocaleString('id-ID')} Kg
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {item.pemakaianPerHari > 0 ? `${item.pemakaianPerHari.toLocaleString('id-ID')} Kg` : '—'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.totalKebutuhan <= 0 ? (
                          <span className="text-slate-400 font-mono text-xs">—</span>
                        ) : item.ketahananHari >= 999 ? (
                          <span className="text-emerald-600 font-bold text-xs">&gt; 30 Hari</span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
                            item.ketahananHari < 2.0 
                              ? 'bg-rose-100 text-rose-800' 
                              : item.ketahananHari < 5.0 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            <Clock className="w-3 h-3" />
                            <span>{item.ketahananHari} Hari</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          isDefisit 
                            ? 'bg-rose-600 text-white shadow-2xs' 
                            : isMenipis 
                            ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {isDefisit ? (
                            <>
                              <AlertTriangle className="w-3 h-3" />
                              <span>Defisit</span>
                            </>
                          ) : isMenipis ? (
                            <>
                              <Flame className="w-3 h-3" />
                              <span>Menipis</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Aman</span>
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row Detail Drawer / Modal */}
      {selectedItemDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden space-y-4 p-6">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  selectedItemDetail.kategori === 'Cengkeh' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                }`}>
                  {selectedItemDetail.kategori}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedItemDetail.nama}</h3>
                <p className="text-xs text-slate-500 font-mono">Kode Intern: {selectedItemDetail.kodeIntern || '—'}</p>
              </div>
              <button
                onClick={() => setSelectedItemDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-500 font-semibold block text-[11px]">Total Kebutuhan (Kolom X):</span>
                <span className="text-base font-black text-indigo-900">{selectedItemDetail.totalKebutuhan.toLocaleString('id-ID')} Kg</span>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  SKT: {selectedItemDetail.kebutuhanSKT} Kg · SKM: {selectedItemDetail.kebutuhanSKM} Kg
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-500 font-semibold block text-[11px]">Saldo Gudang Saat Ini:</span>
                <span className="text-base font-black text-slate-900">{selectedItemDetail.saldoRiilGudang.toLocaleString('id-ID')} Kg</span>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Di {selectedItemDetail.kategori === 'Cengkeh' ? 'Gudang Cengkeh' : 'Rajang II'}
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-500 font-semibold block text-[11px]">Sisa Saldo Tersedia:</span>
                <span className={`text-base font-black ${selectedItemDetail.sisaSaldo < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {selectedItemDetail.sisaSaldo > 0 ? '+' : ''}{selectedItemDetail.sisaSaldo.toLocaleString('id-ID')} Kg
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-500 font-semibold block text-[11px]">Estimasi Ketahanan:</span>
                <span className="text-base font-black text-slate-900">{selectedItemDetail.ketahananHari} Hari</span>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Setara {selectedItemDetail.ketahananBatch} Batch / Molen
                </div>
              </div>
            </div>

            {/* Catatan Substitusi QC */}
            {selectedItemDetail.catatanSubstitusi ? (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <div className="font-bold flex items-center gap-1.5 text-amber-950 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Petunjuk Tindak Lanjut / Substitusi QC:</span>
                </div>
                <p className="leading-relaxed">{selectedItemDetail.catatanSubstitusi}</p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 text-xs">
                Tidak ada aturan substitusi khusus untuk bahan ini dalam panduan pruf saat ini.
              </div>
            )}

            <button
              onClick={() => setSelectedItemDetail(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs"
            >
              Tutup Rincian
            </button>
          </div>
        </div>
      )}

      {/* Modal Jadwal Planing Blend Mingguan */}
      {showWeeklyPlanModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden space-y-4 p-6 max-h-[92vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Sumber Data Terverifikasi
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Google Sheets: Tab PLANING BLEND MINGGUAN</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <span>Jadwal Alokasi Campuran Mingguan PP1 (Senin – Minggu)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Data kapasitas molen dan rencana batch harian untuk seluruh jenis tembakau blend
                </p>
              </div>
              <button
                onClick={() => setShowWeeklyPlanModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Table Schedule Matrix */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-semibold">
                    <th className="py-2.5 px-3">Nama Jenis Tembakau Blend</th>
                    <th className="py-2.5 px-2 text-center">Kapasitas</th>
                    <th className="py-2.5 px-2 text-center bg-slate-800">
                      Senin
                      <div className="text-[10px] text-slate-400 font-normal">{prufData.weeklyPlan?.dates.senin || '02/11/26'}</div>
                    </th>
                    <th className="py-2.5 px-2 text-center">
                      Selasa
                      <div className="text-[10px] text-slate-400 font-normal">{prufData.weeklyPlan?.dates.selasa || '03/11/26'}</div>
                    </th>
                    <th className="py-2.5 px-2 text-center bg-slate-800">
                      Rabu
                      <div className="text-[10px] text-slate-400 font-normal">{prufData.weeklyPlan?.dates.rabu || '04/11/26'}</div>
                    </th>
                    <th className="py-2.5 px-2 text-center">
                      Kamis
                      <div className="text-[10px] text-slate-400 font-normal">{prufData.weeklyPlan?.dates.kamis || '05/11/26'}</div>
                    </th>
                    <th className="py-2.5 px-2 text-center bg-slate-800">
                      Jumat
                      <div className="text-[10px] text-slate-400 font-normal">{prufData.weeklyPlan?.dates.jumat || '06/11/26'}</div>
                    </th>
                    <th className="py-2.5 px-2 text-center text-slate-400">
                      Sabtu
                      <div className="text-[10px] text-slate-500 font-normal">{prufData.weeklyPlan?.dates.sabtu || '07/11/26'}</div>
                    </th>
                    <th className="py-2.5 px-2 text-center text-slate-400 bg-slate-800">
                      Minggu
                      <div className="text-[10px] text-slate-500 font-normal">{prufData.weeklyPlan?.dates.minggu || '08/11/26'}</div>
                    </th>
                    <th className="py-2.5 px-3 text-right bg-indigo-900 font-bold">Total Campuran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prufData.weeklyPlan && prufData.weeklyPlan.schedules.length > 0 ? (
                    prufData.weeklyPlan.schedules.map((item, idx) => (
                      <tr key={idx} className={item.totalCampuran > 0 ? 'bg-indigo-50/20 font-medium' : 'hover:bg-slate-50'}>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{item.blendName}</td>
                        <td className="py-2.5 px-2 text-center text-slate-600 font-mono text-[11px]">{item.kapasitas || '—'}</td>
                        <td className="py-2.5 px-2 text-center text-slate-800 bg-slate-50/50">{item.senin || '—'}</td>
                        <td className="py-2.5 px-2 text-center text-slate-800">{item.selasa || '—'}</td>
                        <td className="py-2.5 px-2 text-center text-slate-800 bg-slate-50/50">{item.rabu || '—'}</td>
                        <td className="py-2.5 px-2 text-center text-slate-800">{item.kamis || '—'}</td>
                        <td className="py-2.5 px-2 text-center text-slate-800 bg-slate-50/50">{item.jumat || '—'}</td>
                        <td className="py-2.5 px-2 text-center text-slate-400">{item.sabtu || '—'}</td>
                        <td className="py-2.5 px-2 text-center text-slate-400 bg-slate-50/50">{item.minggu || '—'}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-indigo-700 bg-indigo-50/60">
                          {item.totalCampuran}
                        </td>
                      </tr>
                    ))
                  ) : (
                    // Fallback visual data jika belum ditarik
                    <>
                      <tr className="bg-indigo-50/20 font-medium">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">153 - BK</td>
                        <td className="py-2.5 px-2 text-center text-slate-600 font-mono text-[11px]">@ 600</td>
                        <td className="py-2.5 px-2 text-center text-slate-800 bg-slate-50/50">8</td>
                        <td className="py-2.5 px-2 text-center text-slate-800">10</td>
                        <td className="py-2.5 px-2 text-center text-slate-800 bg-slate-50/50">9</td>
                        <td className="py-2.5 px-2 text-center text-slate-800">6</td>
                        <td className="py-2.5 px-2 text-center text-slate-800 bg-slate-50/50">7</td>
                        <td className="py-2.5 px-2 text-center text-slate-400">—</td>
                        <td className="py-2.5 px-2 text-center text-slate-400 bg-slate-50/50">—</td>
                        <td className="py-2.5 px-3 text-right font-bold text-indigo-700 bg-indigo-50/60">40</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">SP 153 - BK</td>
                        <td className="py-2.5 px-2 text-center text-slate-600 font-mono text-[11px]">@ 600</td>
                        <td className="py-2.5 px-2 text-center text-slate-400 bg-slate-50/50">—</td>
                        <td className="py-2.5 px-2 text-center text-slate-400">—</td>
                        <td className="py-2.5 px-2 text-center text-slate-400 bg-slate-50/50">—</td>
                        <td className="py-2.5 px-2 text-center text-slate-400">—</td>
                        <td className="py-2.5 px-2 text-center text-slate-400 bg-slate-50/50">—</td>
                        <td className="py-2.5 px-2 text-center text-slate-400">—</td>
                        <td className="py-2.5 px-2 text-center text-slate-400 bg-slate-50/50">—</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-500 bg-indigo-50/60">0</td>
                      </tr>
                      <tr className="bg-indigo-50/20 font-medium">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">KARANG - BK</td>
                        <td className="py-2.5 px-2 text-center text-slate-600 font-mono text-[11px]">@ 600</td>
                        <td className="py-2.5 px-2 text-center text-slate-400 bg-slate-50/50">—</td>
                        <td className="py-2.5 px-2 text-center text-slate-400">—</td>
                        <td className="py-2.5 px-2 text-center text-slate-400 bg-slate-50/50">—</td>
                        <td className="py-2.5 px-2 text-center text-slate-800">3</td>
                        <td className="py-2.5 px-2 text-center text-slate-800 bg-slate-50/50">3</td>
                        <td className="py-2.5 px-2 text-center text-slate-400">—</td>
                        <td className="py-2.5 px-2 text-center text-slate-400 bg-slate-50/50">—</td>
                        <td className="py-2.5 px-3 text-right font-bold text-indigo-700 bg-indigo-50/60">6</td>
                      </tr>
                      <tr className="bg-indigo-50/20 font-medium">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">F REGULER (LN, AVE)</td>
                        <td className="py-2.5 px-2 text-center text-slate-600 font-mono text-[11px]">@ 220</td>
                        <td className="py-2.5 px-2 text-center text-slate-800 bg-slate-50/50">1</td>
                        <td className="py-2.5 px-2 text-center text-slate-400">—</td>
                        <td className="py-2.5 px-2 text-center text-slate-400 bg-slate-50/50">—</td>
                        <td className="py-2.5 px-2 text-center text-slate-400">—</td>
                        <td className="py-2.5 px-2 text-center text-slate-400 bg-slate-50/50">—</td>
                        <td className="py-2.5 px-2 text-center text-slate-400">—</td>
                        <td className="py-2.5 px-2 text-center text-slate-400 bg-slate-50/50">—</td>
                        <td className="py-2.5 px-3 text-right font-bold text-indigo-700 bg-indigo-50/60">1</td>
                      </tr>
                    </>
                  )}
                  {/* Total Row */}
                  <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td className="py-2.5 px-3">TOTAL HARIAN</td>
                    <td className="py-2.5 px-2 text-center text-slate-500">—</td>
                    <td className="py-2.5 px-2 text-center text-indigo-700 bg-slate-200/50">{prufData.weeklyPlan?.dailyTotals.senin || 9}</td>
                    <td className="py-2.5 px-2 text-center text-indigo-700">{prufData.weeklyPlan?.dailyTotals.selasa || 10}</td>
                    <td className="py-2.5 px-2 text-center text-indigo-700 bg-slate-200/50">{prufData.weeklyPlan?.dailyTotals.rabu || 9}</td>
                    <td className="py-2.5 px-2 text-center text-indigo-700">{prufData.weeklyPlan?.dailyTotals.kamis || 9}</td>
                    <td className="py-2.5 px-2 text-center text-indigo-700 bg-slate-200/50">{prufData.weeklyPlan?.dailyTotals.jumat || 10}</td>
                    <td className="py-2.5 px-2 text-center text-slate-400">{prufData.weeklyPlan?.dailyTotals.sabtu || '—'}</td>
                    <td className="py-2.5 px-2 text-center text-slate-400 bg-slate-200/50">{prufData.weeklyPlan?.dailyTotals.minggu || '—'}</td>
                    <td className="py-2.5 px-3 text-right text-indigo-900 bg-indigo-100 font-black text-sm">
                      {prufData.weeklyPlan?.dailyTotals.total || summary.totalBatchPlan}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>
                  {canAccessRawSpreadsheet 
                    ? `Terhubung langsung ke Google Sheets (ID: ${prufData.spreadsheetId})`
                    : 'Sinkronisasi otomatis aktif dengan Master Resep DATABASEPRUF'
                  }
                </span>
              </span>
              <button
                onClick={() => setShowWeeklyPlanModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Penyesuaian Rencana Campuran (Dinamis & Riil) */}
      {showPlanAdjustModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center font-bold">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Penyesuaian Rencana Campuran Riil
                  </h3>
                  <p className="text-xs text-slate-500">
                    Koreksi jumlah batch blend sesuai kondisi operasional terbaru di pabrik.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPlanAdjustModal(false)}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Input Per Jenis Blend */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Rincian Jenis Campuran (Molen)</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  Baseline Sheets: {planInfo.campurTotalSemua || 47} Campur
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { key: 'campur153' as const, label: '153 - BK', desc: 'SKT · @ 600 Kg', color: 'border-blue-200 bg-blue-50/40 text-blue-900' },
                  { key: 'campurKarang' as const, label: 'KARANG - BK', desc: 'SKT · @ 600 Kg', color: 'border-emerald-200 bg-emerald-50/40 text-emerald-900' },
                  { key: 'campurSP' as const, label: 'SP 153 - BK', desc: 'SKT · @ 600 Kg', color: 'border-amber-200 bg-amber-50/40 text-amber-900' },
                  { key: 'campurTIS' as const, label: 'TIS KBT24', desc: 'SKT · @ 140 Kg', color: 'border-purple-200 bg-purple-50/40 text-purple-900' },
                  { key: 'campurFReguler' as const, label: 'F REGULER (LN, AVE)', desc: 'SKM · @ 220 Kg', color: 'border-indigo-200 bg-indigo-50/40 text-indigo-900' },
                  { key: 'campurFRLABold' as const, label: 'FR LA BOLD', desc: 'SKM · @ 300 Kg', color: 'border-rose-200 bg-rose-50/40 text-rose-900' },
                ].map((item) => (
                  <div key={item.key} className={`p-2.5 rounded-xl border ${item.color} flex items-center justify-between`}>
                    <div>
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className="text-[10px] text-slate-500">{item.desc}</div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-1.5 py-0.5">
                      <button
                        onClick={() => setTempPlan(p => ({ ...p, [item.key]: Math.max(0, p[item.key] - 1) }))}
                        className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 font-bold text-xs flex items-center justify-center text-slate-700"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={tempPlan[item.key]}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          setTempPlan(p => ({ ...p, [item.key]: val }));
                        }}
                        className="w-10 text-center font-bold text-slate-900 bg-transparent text-xs focus:outline-hidden"
                      >
                      </input>
                      <button
                        onClick={() => setTempPlan(p => ({ ...p, [item.key]: p[item.key] + 1 }))}
                        className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 font-bold text-xs flex items-center justify-center text-slate-700"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Kalkulasi Preview */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Total Perhitungan Baru:</span>
                <span className="text-base font-black text-slate-900">
                  {tempPlan.campur153 + tempPlan.campurKarang + tempPlan.campurSP + tempPlan.campurTIS + tempPlan.campurFReguler + tempPlan.campurFRLABold} Campur
                </span>
              </div>
              <div className="text-right text-[11px] text-slate-600 space-y-0.5">
                <div>SKT: <strong>{tempPlan.campur153 + tempPlan.campurKarang + tempPlan.campurSP + tempPlan.campurTIS}</strong> Campur</div>
                <div>SKM: <strong>{tempPlan.campurFReguler + tempPlan.campurFRLABold}</strong> Campur</div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Perubahan ini akan langsung menghitung ulang kebutuhan bahan (Kolom X) berdasarkan resep formula per batch, mengoreksi ketahanan hari, dan memperbarui status defisit gudang.
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                onClick={handleResetCustomPlan}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 transition-colors"
                title="Hapus kustomisasi dan gunakan rencana bawaan Google Sheets"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset ke Standar Sheets</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPlanAdjustModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveCustomPlan}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Terapkan Rencana Riil</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
