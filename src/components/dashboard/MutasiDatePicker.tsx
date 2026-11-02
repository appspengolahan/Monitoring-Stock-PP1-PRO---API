import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  CalendarDays, 
  CalendarRange, 
  RotateCcw, 
  Check, 
  Sparkles,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { formatTanggalIndo, getTodayKey } from '../../utils/dateUtils';

export type DateFilterMode = 'latest' | 'daily' | 'weekly' | 'monthly' | 'custom' | 'all';

interface MutasiDatePickerProps {
  filterFrom: string;
  filterTo: string;
  showAllDates: boolean;
  latestTanggal: string;
  availableDates: string[];
  totalFilteredCount: number;
  onApplyDateFilter: (from: string, to: string, showAll: boolean, mode: DateFilterMode) => void;
  onResetToLatest: () => void;
  onResetToToday?: () => void;
}

export const MutasiDatePicker: React.FC<MutasiDatePickerProps> = ({
  filterFrom,
  filterTo,
  showAllDates,
  latestTanggal,
  availableDates,
  totalFilteredCount,
  onApplyDateFilter,
  onResetToLatest,
  onResetToToday
}) => {
  const todayKey = useMemo(() => getTodayKey(), []);

  // Determine current active mode
  const initialMode = useMemo<DateFilterMode>(() => {
    if (showAllDates && !filterFrom && !filterTo) return 'all';
    if (!filterFrom && !filterTo) return 'daily'; // Default hari ini (tanggal berjalan)
    if (filterFrom && filterTo && filterFrom === filterTo) {
      if (latestTanggal && filterFrom === latestTanggal && latestTanggal !== todayKey) {
        return 'latest';
      }
      return 'daily';
    }
    if (filterFrom && filterTo) {
      // Check if it corresponds to an exact full month
      const fromMatch = filterFrom.match(/^(\d{4})-(\d{2})-01$/);
      if (fromMatch) {
        const year = parseInt(fromMatch[1], 10);
        const month = parseInt(fromMatch[2], 10);
        const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        const expectedTo = `${fromMatch[1]}-${fromMatch[2]}-${String(lastDay).padStart(2, '0')}`;
        if (filterTo === expectedTo) return 'monthly';
      }
      // Check if it's 7 days range (weekly)
      const dFrom = new Date(filterFrom + 'T00:00:00Z');
      const dTo = new Date(filterTo + 'T00:00:00Z');
      const diffDays = Math.round((dTo.getTime() - dFrom.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays === 7) return 'weekly';
      return 'custom';
    }
    return 'custom';
  }, [filterFrom, filterTo, showAllDates, todayKey, latestTanggal]);

  const [activeMode, setActiveMode] = useState<DateFilterMode>(initialMode);
  const [selectedSingleDate, setSelectedSingleDate] = useState<string>(() => filterFrom || todayKey);
  const [customFrom, setCustomFrom] = useState<string>(() => filterFrom || todayKey);
  const [customTo, setCustomTo] = useState<string>(() => filterTo || todayKey);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const base = filterFrom || todayKey;
    return base.slice(0, 7); // 'YYYY-MM'
  });
  const [selectedWeekDate, setSelectedWeekDate] = useState<string>(() => filterTo || todayKey);

  // Sync internal mode when external props change
  useEffect(() => {
    setActiveMode(initialMode);
    if (filterFrom && filterTo && filterFrom === filterTo) {
      setSelectedSingleDate(filterFrom);
    }
    if (filterFrom) setCustomFrom(filterFrom);
    if (filterTo) setCustomTo(filterTo);
  }, [initialMode, filterFrom, filterTo]);

  // Distinct months present in available data
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    availableDates.forEach(d => {
      if (d && d.length >= 7) set.add(d.slice(0, 7));
    });
    return Array.from(set).sort().reverse();
  }, [availableDates]);

  // Helper: Format YYYY-MM into Indonesian Month Year label
  const formatMonthIndo = (yearMonth: string) => {
    const parts = yearMonth.split('-');
    if (parts.length !== 2) return yearMonth;
    const y = parts[0];
    const m = parseInt(parts[1], 10);
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${months[m - 1] || parts[1]} ${y}`;
  };

  // Helper: Compute weekly range (7 days ending on referenceDate)
  const computeWeekRange = (refDate: string) => {
    const d = new Date(refDate + 'T00:00:00Z');
    if (isNaN(d.getTime())) return { from: refDate, to: refDate };
    const toStr = d.toISOString().slice(0, 10);
    const dFrom = new Date(d.getTime() - 6 * 24 * 60 * 60 * 1000);
    const fromStr = dFrom.toISOString().slice(0, 10);
    return { from: fromStr, to: toStr };
  };

  // Helper: Compute full month range (01 to last day of month)
  const computeMonthRange = (yearMonthStr: string) => {
    const parts = yearMonthStr.split('-');
    if (parts.length !== 2) return { from: '', to: '' };
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const from = `${parts[0]}-${String(m).padStart(2, '0')}-01`;
    const to = `${parts[0]}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { from, to };
  };

  // Handlers for switching modes
  const handleSelectMode = (mode: DateFilterMode) => {
    setActiveMode(mode);

    if (mode === 'latest') {
      if (latestTanggal) {
        setSelectedSingleDate(latestTanggal);
        onApplyDateFilter(latestTanggal, latestTanggal, false, 'latest');
      } else {
        onResetToLatest();
      }
    } else if (mode === 'all') {
      onApplyDateFilter('', '', true, 'all');
    } else if (mode === 'daily') {
      const target = selectedSingleDate || todayKey;
      onApplyDateFilter(target, target, false, 'daily');
    } else if (mode === 'weekly') {
      const target = selectedWeekDate || todayKey;
      const { from, to } = computeWeekRange(target);
      onApplyDateFilter(from, to, false, 'weekly');
    } else if (mode === 'monthly') {
      const targetM = selectedMonth || todayKey.slice(0, 7);
      const { from, to } = computeMonthRange(targetM);
      onApplyDateFilter(from, to, false, 'monthly');
    } else if (mode === 'custom') {
      const f = customFrom || todayKey;
      const t = customTo || todayKey;
      if (f || t) {
        onApplyDateFilter(f, t, false, 'custom');
      }
    }
  };

  // Daily date change
  const handleDailyDateChange = (dateStr: string) => {
    setSelectedSingleDate(dateStr);
    onApplyDateFilter(dateStr, dateStr, false, 'daily');
  };

  // Weekly date change
  const handleWeeklyRefChange = (dateStr: string) => {
    setSelectedWeekDate(dateStr);
    const { from, to } = computeWeekRange(dateStr);
    onApplyDateFilter(from, to, false, 'weekly');
  };

  // Monthly date change
  const handleMonthChange = (ymStr: string) => {
    setSelectedMonth(ymStr);
    const { from, to } = computeMonthRange(ymStr);
    onApplyDateFilter(from, to, false, 'monthly');
  };

  // Custom range apply
  const handleApplyCustom = () => {
    let f = customFrom;
    let t = customTo;
    if (f && t && f > t) {
      // Auto-swap if reversed
      const temp = f;
      f = t;
      t = temp;
      setCustomFrom(f);
      setCustomTo(t);
    }
    onApplyDateFilter(f, t, false, 'custom');
  };

  // Active status description text
  const activePeriodDescription = useMemo(() => {
    if (activeMode === 'all') {
      return 'Menampilkan seluruh riwayat transaksi (tanpa batasan tanggal)';
    }
    if (activeMode === 'latest') {
      return latestTanggal 
        ? `Data Terkini / Rencana: ${formatTanggalIndo(latestTanggal)}`
        : 'Transaksi Terkini Lintas Bahan';
    }
    if (activeMode === 'daily') {
      const isToday = selectedSingleDate === todayKey;
      return isToday
        ? `Hari Ini (Tanggal Berjalan): ${formatTanggalIndo(selectedSingleDate)}`
        : `Harian: ${formatTanggalIndo(selectedSingleDate)}`;
    }
    if (activeMode === 'weekly') {
      return `Mingguan (7 Hari): ${formatTanggalIndo(filterFrom)} s/d ${formatTanggalIndo(filterTo)}`;
    }
    if (activeMode === 'monthly') {
      return `Bulanan: ${formatMonthIndo(selectedMonth)} (${formatTanggalIndo(filterFrom)} – ${formatTanggalIndo(filterTo)})`;
    }
    if (activeMode === 'custom') {
      if (filterFrom && filterTo) {
        return `Rentang Bebas: ${formatTanggalIndo(filterFrom)} s/d ${formatTanggalIndo(filterTo)}`;
      }
      if (filterFrom) return `Mulai dari ${formatTanggalIndo(filterFrom)}`;
      if (filterTo) return `Sampai ${formatTanggalIndo(filterTo)}`;
    }
    return '';
  }, [activeMode, filterFrom, filterTo, latestTanggal, selectedSingleDate, selectedMonth, todayKey]);

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs space-y-2.5">
      {/* Top Header: Title, Preset Tabs & Result Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1.5">
              <span>Filter Tanggal Mutasi</span>
              <span className="text-[10px] font-medium text-slate-500 font-mono">
                ({totalFilteredCount.toLocaleString('id-ID')} mutasi ditemukan)
              </span>
            </h4>
            <p className="text-[11px] text-blue-700 font-semibold leading-tight mt-0.5">
              {activePeriodDescription}
            </p>
          </div>
        </div>

        {/* Mode Selector Buttons (Default: Hari Ini / Berjalan, Terkini, Mingguan, Bulanan, Custom, Semua) */}
        <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => {
              setSelectedSingleDate(todayKey);
              onApplyDateFilter(todayKey, todayKey, false, 'daily');
              setActiveMode('daily');
            }}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
              activeMode === 'daily' && selectedSingleDate === todayKey
                ? 'bg-white text-blue-700 shadow-2xs font-bold' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Tampilkan transaksi hari ini (hari/tanggal bulan tahun berjalan)"
          >
            <Clock className="w-3 h-3 text-blue-600" />
            <span>Hari Ini</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectMode('daily')}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
              activeMode === 'daily' && selectedSingleDate !== todayKey
                ? 'bg-white text-blue-700 shadow-2xs font-bold' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Pilih tanggal harian spesifik"
          >
            <Calendar className="w-3 h-3 text-indigo-600" />
            <span>Harian</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectMode('latest')}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
              activeMode === 'latest' 
                ? 'bg-white text-blue-700 shadow-2xs font-bold' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Tampilkan transaksi data terkini atau rencana masa depan yang sudah dicicil inputnya"
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Terkini (Rencana)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectMode('weekly')}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
              activeMode === 'weekly' 
                ? 'bg-white text-blue-700 shadow-2xs font-bold' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-3 h-3 text-emerald-600" />
            <span>Mingguan</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectMode('monthly')}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
              activeMode === 'monthly' 
                ? 'bg-white text-blue-700 shadow-2xs font-bold' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarRange className="w-3 h-3 text-purple-600" />
            <span>Bulanan</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectMode('custom')}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
              activeMode === 'custom' 
                ? 'bg-white text-blue-700 shadow-2xs font-bold' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3 text-indigo-600" />
            <span>Rentang Bebas</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectMode('all')}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
              activeMode === 'all' 
                ? 'bg-white text-blue-700 shadow-2xs font-bold' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Semua</span>
          </button>
        </div>
      </div>

      {/* Sub-Panel Controls according to Active Mode */}
      <div className="bg-slate-50/80 rounded-lg p-2.5 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* MODE: HARIAN */}
        {activeMode === 'daily' && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <span className="font-semibold text-slate-700 flex items-center gap-1 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Pilih Tanggal Spesifik:</span>
            </span>

            {/* Native Datepicker input */}
            <input
              type="date"
              value={selectedSingleDate}
              onChange={e => e.target.value && handleDailyDateChange(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 shadow-2xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />

            {/* Quick date jumps from available dataset dates */}
            {availableDates.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[11px] text-slate-500 font-medium">Jadwal ada data:</span>
                <select
                  value={availableDates.includes(selectedSingleDate) ? selectedSingleDate : ''}
                  onChange={e => e.target.value && handleDailyDateChange(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-700 font-medium"
                >
                  <option value="" disabled>-- Pilih Hari Terdata --</option>
                  {availableDates.slice(0, 15).map(dateStr => (
                    <option key={dateStr} value={dateStr}>
                      {formatTanggalIndo(dateStr)} {dateStr === todayKey ? '★ (Hari Ini)' : (dateStr === latestTanggal ? '(Data Rencana Terbaru)' : '')}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Tombol kembali ke Hari Ini jika sedang memilih tanggal lain */}
            {selectedSingleDate !== todayKey && (
              <button
                type="button"
                onClick={() => handleDailyDateChange(todayKey)}
                className="px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                title="Kembali ke hari atau tanggal bulan tahun berjalan"
              >
                <Clock className="w-3 h-3 text-emerald-600" />
                <span>Ke Hari Ini ({formatTanggalIndo(todayKey)})</span>
              </button>
            )}

            {/* Tombol ke Data Terkini / Rencana jika ada data masa depan */}
            {latestTanggal && latestTanggal !== todayKey && selectedSingleDate !== latestTanggal && (
              <button
                type="button"
                onClick={() => {
                  setActiveMode('latest');
                  handleDailyDateChange(latestTanggal);
                }}
                className="px-2 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                title="Lihat data yang sudah diinput/direncanakan terlebih dahulu"
              >
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>Ke Data Terkini / Rencana ({formatTanggalIndo(latestTanggal)})</span>
              </button>
            )}
          </div>
        )}

        {/* MODE: MINGGUAN */}
        {activeMode === 'weekly' && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <span className="font-semibold text-slate-700 flex items-center gap-1 shrink-0">
              <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pilih Titik Akhir 7 Hari:</span>
            </span>

            <input
              type="date"
              value={selectedWeekDate}
              onChange={e => e.target.value && handleWeeklyRefChange(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />

            {/* Preset shortcuts for week */}
            <div className="flex items-center gap-1 flex-wrap">
              {latestTanggal && (
                <button
                  type="button"
                  onClick={() => handleWeeklyRefChange(latestTanggal)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer border ${
                    selectedWeekDate === latestTanggal 
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs' 
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  7 Hari Terakhir dari Data Terbaru
                </button>
              )}

              <button
                type="button"
                onClick={() => handleWeeklyRefChange(new Date().toISOString().slice(0, 10))}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer border ${
                  selectedWeekDate === new Date().toISOString().slice(0, 10)
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs' 
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                7 Hari Hari Ini
              </button>
            </div>
          </div>
        )}

        {/* MODE: BULANAN */}
        {activeMode === 'monthly' && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <span className="font-semibold text-slate-700 flex items-center gap-1 shrink-0">
              <CalendarRange className="w-3.5 h-3.5 text-purple-600" />
              <span>Pilih Bulan &amp; Tahun:</span>
            </span>

            {/* Month input */}
            <input
              type="month"
              value={selectedMonth}
              onChange={e => e.target.value && handleMonthChange(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 shadow-2xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
            />

            {/* Quick buttons for months present in database */}
            {availableMonths.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {availableMonths.map(ym => (
                  <button
                    key={ym}
                    type="button"
                    onClick={() => handleMonthChange(ym)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer border ${
                      selectedMonth === ym 
                        ? 'bg-purple-600 text-white border-purple-700 shadow-2xs' 
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    {formatMonthIndo(ym)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODE: RENTANG BEBAS (CUSTOM) */}
        {activeMode === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <span className="font-semibold text-slate-700 shrink-0">Dari:</span>
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 shadow-2xs"
            />

            <span className="text-slate-400 font-medium">s/d</span>

            <span className="font-semibold text-slate-700 shrink-0">Sampai:</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 shadow-2xs"
            />

            <button
              type="button"
              onClick={handleApplyCustom}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Terapkan Rentang</span>
            </button>
          </div>
        )}

        {/* MODE: TERKINI & SEMUA */}
        {activeMode === 'latest' && (
          <div className="text-slate-600 text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Menampilkan data mutasi transaksi terbaru yang tersedia di database pabrik PP1.</span>
          </div>
        )}

        {activeMode === 'all' && (
          <div className="text-slate-600 text-xs flex items-center gap-2">
            <span>Seluruh data mutasi lintas tanggal ditampilkan. Gunakan pencarian atau filter komoditas untuk menyaring data.</span>
          </div>
        )}

        {/* Reset Action */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Tombol Reset ke Hari Ini (Tanggal Berjalan) */}
          {(selectedSingleDate !== todayKey || filterFrom !== todayKey || filterTo !== todayKey || showAllDates) && (
            <button
              type="button"
              onClick={() => {
                if (onResetToToday) {
                  onResetToToday();
                } else {
                  handleDailyDateChange(todayKey);
                }
              }}
              className="inline-flex items-center gap-1 text-[11px] text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer shadow-2xs"
              title="Reset tampilan kembali ke hari/tanggal berjalan saat ini"
            >
              <RotateCcw className="w-3 h-3 text-emerald-600" />
              <span>Reset ke Hari Ini</span>
            </button>
          )}

          {/* Tombol pintas ke Data Terkini jika ada data rencana di masa depan */}
          {latestTanggal && latestTanggal !== todayKey && selectedSingleDate !== latestTanggal && (
            <button
              type="button"
              onClick={() => handleSelectMode('latest')}
              className="inline-flex items-center gap-1 text-[11px] text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer shadow-2xs"
              title="Lihat data yang sudah dicicil/diinput terlebih dahulu"
            >
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>Ke Data Terkini ({formatTanggalIndo(latestTanggal)})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
