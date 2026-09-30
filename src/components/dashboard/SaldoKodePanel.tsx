import React, { useState, useMemo } from 'react';
import { KomoditasData } from '../../types';
import { GasService } from '../../services/gasService';
import { exportToPdf } from '../../services/pdfExport';
import { 
  Layers, 
  Calendar, 
  Download, 
  Search, 
  Clock, 
  CheckCircle, 
  AlertCircle
} from 'lucide-react';

interface SaldoKodePanelProps {
  data: KomoditasData[];
  initialCommodity?: string;
}

export const SaldoKodePanel: React.FC<SaldoKodePanelProps> = ({
  data,
  initialCommodity = 'all'
}) => {
  const [filterKomoditas, setFilterKomoditas] = useState<string>(initialCommodity);
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [isSnapshotMode, setIsSnapshotMode] = useState<boolean>(false);
  const [snapshotDate, setSnapshotDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [hideZero, setHideZero] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  const formatNumber = (n: number): string => {
    return Number(n).toLocaleString('id-ID', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
  };

  const formatTanggalIndo = (dateStr?: string | null): string => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const s = d.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  // Active commodities
  const activeKomoditasList = useMemo(() => {
    return filterKomoditas === 'all'
      ? data
      : data.filter(k => k.komoditas === filterKomoditas);
  }, [data, filterKomoditas]);

  // Grade options for dropdown
  const gradeOptions = useMemo(() => {
    return activeKomoditasList.map(k => ({
      komoditas: k.komoditas,
      kodes: k.kodeList.map(item => item.nama)
    }));
  }, [activeKomoditasList]);

  // Compute items based on whether in Snapshot Mode or Live Mode
  const displayedItems = useMemo(() => {
    if (isSnapshotMode && snapshotDate) {
      // Snapshot mode per date
      const items: { komoditas: string; satuan: string; nama: string; saldo: number; tanggalTerakhir?: string | null }[] = [];
      activeKomoditasList.forEach(k => {
        const idx = data.findIndex(item => item.komoditas === k.komoditas);
        const snapshot = GasService.getSaldoPerTanggal(idx, snapshotDate);
        snapshot.kodeList.forEach(kd => {
          if (filterGrade !== 'all' && kd.nama !== filterGrade) return;
          items.push({
            komoditas: k.komoditas,
            satuan: k.satuan,
            nama: kd.nama,
            saldo: kd.saldo,
            tanggalTerakhir: snapshotDate
          });
        });
      });
      return items;
    }

    // Live mode
    const items: { komoditas: string; satuan: string; nama: string; saldo: number; tanggalTerakhir?: string | null }[] = [];
    activeKomoditasList.forEach(k => {
      k.kodeList.forEach(kd => {
        if (filterGrade !== 'all' && kd.nama !== filterGrade) return;

        // Date range filter by last mutation
        if (filterDateFrom && kd.tanggalTerakhir) {
          if (new Date(kd.tanggalTerakhir).getTime() < new Date(filterDateFrom).getTime()) return;
        }
        if (filterDateTo && kd.tanggalTerakhir) {
          if (new Date(kd.tanggalTerakhir).getTime() > new Date(filterDateTo + 'T23:59:59Z').getTime()) return;
        }

        items.push({
          komoditas: k.komoditas,
          satuan: k.satuan,
          nama: kd.nama,
          saldo: kd.saldo,
          tanggalTerakhir: kd.tanggalTerakhir
        });
      });
    });
    return items;
  }, [isSnapshotMode, snapshotDate, activeKomoditasList, data, filterGrade, filterDateFrom, filterDateTo]);

  // Filter out zeros & search query
  const filteredItems = useMemo(() => {
    let result = displayedItems;
    if (hideZero) {
      result = result.filter(item => Math.round(Math.abs(item.saldo) * 10) / 10 !== 0);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(item => 
        item.nama.toLowerCase().includes(q) ||
        item.komoditas.toLowerCase().includes(q)
      );
    }
    return result;
  }, [displayedItems, hideZero, searchQuery]);

  const totalSaldo = filteredItems.reduce((acc, curr) => acc + (curr.saldo || 0), 0);

  // PDF Export
  const handleExportPdf = () => {
    const title = isSnapshotMode 
      ? `Saldo per Kode/Grade (Snapshot per ${formatTanggalIndo(snapshotDate)})`
      : 'Saldo Terkini per Kode/Grade';

    const head = isSnapshotMode
      ? ['Bahan', 'Kode / Grade', 'Saldo Snapshot (Kg)']
      : ['Bahan', 'Kode / Grade', 'Mutasi Terakhir', 'Saldo Terkini (Kg)'];

    const body = isSnapshotMode
      ? filteredItems.map(item => [item.komoditas, item.nama, formatNumber(item.saldo)])
      : filteredItems.map(item => [item.komoditas, item.nama, formatTanggalIndo(item.tanggalTerakhir), formatNumber(item.saldo)]);

    // Add Total Row
    body.push(['', 'TOTAL KESELURUHAN', isSnapshotMode ? '' : '', `${formatNumber(totalSaldo)} Kg`]);

    exportToPdf({
      title,
      infoLines: [
        `Filter Bahan: ${filterKomoditas === 'all' ? 'Semua Bahan' : filterKomoditas}`,
        `Mode Perhitungan: ${isSnapshotMode ? `Historis per Tanggal ${snapshotDate}` : 'Saldo Berjalan Terkini'}`,
        `Jumlah Kode / Grade: ${filteredItems.length} | Total Saldo: ${formatNumber(totalSaldo)} Kg`
      ],
      head,
      body,
      fileName: `Saldo_Kode_PP1_${isSnapshotMode ? snapshotDate : 'Terkini'}`
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            {isSnapshotMode ? 'Saldo per Kode / Grade (Snapshot Historis)' : 'Saldo Terkini per Kode / Grade'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isSnapshotMode 
              ? `Saldo dihitung seolah-olah dicek pada tanggal ${formatTanggalIndo(snapshotDate)}`
              : 'Daftar stok per tab kartu persediaan berjalan'}
          </p>
        </div>

        <button
          onClick={handleExportPdf}
          disabled={filteredItems.length === 0}
          className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 transition-colors shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export PDF Saldo</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200 space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Bahan */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Bahan
            </label>
            <select
              value={filterKomoditas}
              onChange={e => {
                setFilterKomoditas(e.target.value);
                setFilterGrade('all');
              }}
              className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Bahan</option>
              {data.map(k => (
                <option key={k.komoditas} value={k.komoditas}>
                  {k.komoditas}
                </option>
              ))}
            </select>
          </div>

          {/* Grade / Kode */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Grade / Kode
            </label>
            <select
              value={filterGrade}
              onChange={e => setFilterGrade(e.target.value)}
              className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Grade</option>
              {gradeOptions.map(group => (
                <optgroup key={group.komoditas} label={group.komoditas}>
                  {group.kodes.map(kode => (
                    <option key={kode} value={kode}>
                      {kode}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Pencarian Grade
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari nama grade/kode..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Snapshot Mode Switcher & Date Picker */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-blue-900 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isSnapshotMode}
                onChange={e => setIsSnapshotMode(e.target.checked)}
                className="rounded-sm border-blue-400 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span>Mode: Saldo per Tanggal Tertentu (Snapshot)</span>
            </label>

            {isSnapshotMode ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 font-medium">Per Tanggal:</span>
                <input
                  type="date"
                  value={snapshotDate}
                  onChange={e => setSnapshotDate(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Mutasi Terakhir:</span>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={e => setFilterDateFrom(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-700"
                />
                <span className="text-xs text-slate-400">s/d</span>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={e => setFilterDateTo(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-700"
                />
              </div>
            )}
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideZero}
              onChange={e => setHideZero(e.target.checked)}
              className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <span>Sembunyikan Saldo 0</span>
          </label>
        </div>
      </div>

      {/* Summary Card */}
      <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block mb-0.5">
              Jumlah Kode / Grade
            </span>
            <span className="text-xl font-bold text-slate-900 font-mono tabular-nums">
              {filteredItems.length}
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block mb-0.5">
              Total Akumulasi Saldo
            </span>
            <span className="text-xl font-bold text-blue-800 font-mono tabular-nums">
              {formatNumber(totalSaldo)} <span className="text-xs font-normal">Kg</span>
            </span>
          </div>
        </div>

        {isSnapshotMode && (
          <p className="text-[11.5px] text-slate-500 mt-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>
              Saldo dihitung seolah-olah dicek pada <strong>{formatTanggalIndo(snapshotDate)}</strong> — mutasi setelah tanggal ini diabaikan untuk verifikasi data.
            </span>
          </p>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-[11.5px] font-semibold text-slate-600 uppercase tracking-wider">
              <th className="py-3 px-4">Bahan</th>
              <th className="py-3 px-4">Kode / Grade</th>
              {!isSnapshotMode && <th className="py-3 px-4">Mutasi Terakhir</th>}
              <th className="py-3 px-4 text-right">Saldo {isSnapshotMode ? 'Snapshot' : 'Terkini'} (Kg)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={isSnapshotMode ? 3 : 4} className="py-12 text-center text-slate-400">
                  Tidak ada data kode/grade yang cocok dengan filter.
                </td>
              </tr>
            ) : (
              filteredItems.map((item, idx) => (
                <tr key={`${item.komoditas}-${item.nama}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                    {item.komoditas}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-900">
                    {item.nama}
                  </td>
                  {!isSnapshotMode && (
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-medium">
                      {formatTanggalIndo(item.tanggalTerakhir)}
                    </td>
                  )}
                  <td className="py-3 px-4 whitespace-nowrap text-right font-mono tabular-nums font-bold text-slate-900">
                    {formatNumber(item.saldo)}{' '}
                    <span className="text-[11px] font-normal text-slate-500">{item.satuan}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
