import React, { useState, useMemo, useEffect } from 'react';
import { KomoditasData } from '../../types';
import { 
  CalculatedStockItem, 
  EstimationConfig, 
  CommodityCategory, 
  DailyUsageBasis 
} from '../../types/stockEstimation';
import { StockEstimationService } from '../../services/stockEstimationService';
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
  ExternalLink
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

  const handleToggleSort = (field: 'nama' | 'kodeIntern' | 'totalKebutuhan' | 'saldoRiilGudang' | 'sisaSaldo' | 'ketahananHari' | 'status') => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 2. Refresh from Google Sheets
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

  // 4. Calculate estimation items
  const prufData = useMemo(() => StockEstimationService.getPrufData(), [isRefreshing]);

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
              onClick={handleRefreshSheet}
              disabled={isRefreshing}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 transition-all shadow-xs disabled:opacity-50"
              title="Tarik pembaruan resep &amp; rencana campur langsung dari Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Menyinkronkan...' : 'Segarkan Data Pruf'}</span>
            </button>
            <a
              href={`https://docs.google.com/spreadsheets/d/${prufData.spreadsheetId}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
              title="Buka Spreadsheet DATABASEPRUF"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>

        {refreshMessage && (
          <div className="mt-3 p-2.5 rounded-xl text-xs font-medium bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 flex items-center gap-2 animate-in fade-in">
            <Info className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{refreshMessage}</span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card 1: Total Plan */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold">Rencana Campuran</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {summary.totalBatchPlan} <span className="text-xs font-semibold text-slate-500">Campur</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="font-semibold text-slate-700">153-BK: {planInfo.campur153}</span> · 
            <span className="font-semibold text-slate-700">Karang: {planInfo.campurKarang}</span> · 
            <span className="font-semibold text-slate-700">SKM: {planInfo.campurTotalSKM}</span>
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
                (Standar pabrik: 10 Molen/Hari $\rightarrow$ Rencana 47 campur setara {(47 / config.targetBatchPerDay).toFixed(1)} hari kerja)
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
    </div>
  );
};
