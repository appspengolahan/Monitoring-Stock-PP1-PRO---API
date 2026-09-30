import React, { useState, useMemo } from 'react';
import { KomoditasData, MutasiItem } from '../../types';
import { 
  Filter, 
  Download, 
  Check, 
  Calendar, 
  Layers, 
  FileText,
  Search,
  CheckCircle2,
  Minus
} from 'lucide-react';
import { exportToPdf } from '../../services/pdfExport';

interface MutasiPanelProps {
  data: KomoditasData[];
  onToggleCek: (komoditasName: string, mutasiId: string, currentStatus: boolean) => void;
  initialCommodity?: string;
}

export const MutasiPanel: React.FC<MutasiPanelProps> = ({
  data,
  onToggleCek,
  initialCommodity = 'all'
}) => {
  const [filterKomoditas, setFilterKomoditas] = useState<string>(initialCommodity);
  const [filterKode, setFilterKode] = useState<string>('all');
  const [filterJenis, setFilterJenis] = useState<string>('all');
  const [filterFrom, setFilterFrom] = useState<string>('');
  const [filterTo, setFilterTo] = useState<string>('');
  const [filterHideZero, setFilterHideZero] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const formatNumber = (n: number): string => {
    return Number(n).toLocaleString('id-ID', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
  };

  const formatTanggalIndo = (dateStr: string | null): string => {
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

  // 1. Relevant commodities
  const activeKomoditasList = useMemo(() => {
    return filterKomoditas === 'all'
      ? data
      : data.filter(k => k.komoditas === filterKomoditas);
  }, [data, filterKomoditas]);

  // 2. Kode options for dropdown
  const kodeOptions = useMemo(() => {
    return activeKomoditasList.map(k => ({
      komoditas: k.komoditas,
      kodes: k.kodeList.map(item => item.nama)
    }));
  }, [activeKomoditasList]);

  // 3. Pool entries
  const poolEntries = useMemo(() => {
    const list: { komoditas: string; mutasi: MutasiItem }[] = [];
    activeKomoditasList.forEach(k => {
      k.mutasiTerbaru.forEach(m => {
        if (filterKode !== 'all' && m.kode !== filterKode) return;
        list.push({ komoditas: k.komoditas, mutasi: m });
      });
    });
    return list;
  }, [activeKomoditasList, filterKode]);

  // 4. Jenis Mutasi options
  const jenisOptions = useMemo(() => {
    const set = new Set<string>();
    poolEntries.forEach(e => {
      if (e.mutasi.jenisMutasi) set.add(e.mutasi.jenisMutasi);
    });
    return Array.from(set).sort();
  }, [poolEntries]);

  // 5. Final filtered entries
  const filteredEntries = useMemo(() => {
    let result = poolEntries;

    if (filterJenis !== 'all') {
      result = result.filter(e => e.mutasi.jenisMutasi === filterJenis);
    }

    if (filterFrom) {
      const fromTime = new Date(filterFrom + 'T00:00:00Z').getTime();
      result = result.filter(e => {
        if (!e.mutasi.tanggal) return false;
        return new Date(e.mutasi.tanggal).getTime() >= fromTime;
      });
    }

    if (filterTo) {
      const toTime = new Date(filterTo + 'T23:59:59Z').getTime();
      result = result.filter(e => {
        if (!e.mutasi.tanggal) return false;
        return new Date(e.mutasi.tanggal).getTime() <= toTime;
      });
    }

    if (filterHideZero) {
      result = result.filter(e => (e.mutasi.masuk || 0) !== 0 || (e.mutasi.keluar || 0) !== 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(e => 
        e.mutasi.kode.toLowerCase().includes(q) ||
        e.mutasi.jenisMutasi.toLowerCase().includes(q) ||
        e.komoditas.toLowerCase().includes(q)
      );
    }

    // Sort descending by date
    return result.sort((a, b) => {
      const ta = a.mutasi.tanggal ? new Date(a.mutasi.tanggal).getTime() : 0;
      const tb = b.mutasi.tanggal ? new Date(b.mutasi.tanggal).getTime() : 0;
      return tb - ta;
    });
  }, [poolEntries, filterJenis, filterFrom, filterTo, filterHideZero, searchQuery]);

  // Totals for summary card
  const totalMasuk = filteredEntries.reduce((sum, e) => sum + (e.mutasi.masuk || 0), 0);
  const totalKeluar = filteredEntries.reduce((sum, e) => sum + (e.mutasi.keluar || 0), 0);

  // Export PDF Handler
  const handleExportPdf = () => {
    const head = ['Tanggal', 'Bahan', 'Kode / Grade', 'Jenis Mutasi', 'Masuk (Kg)', 'Keluar (Kg)', 'Cek'];
    const body = filteredEntries.map(e => [
      formatTanggalIndo(e.mutasi.tanggal),
      e.komoditas,
      e.mutasi.kode,
      e.mutasi.jenisMutasi,
      e.mutasi.masuk ? formatNumber(e.mutasi.masuk) : '—',
      e.mutasi.keluar ? `-${formatNumber(e.mutasi.keluar)}` : '—',
      e.mutasi.cek ? 'VALID' : 'PENDING'
    ]);

    exportToPdf({
      title: 'Laporan Mutasi Terkini Lintas Bahan',
      infoLines: [
        `Filter Bahan: ${filterKomoditas === 'all' ? 'Semua Bahan' : filterKomoditas} | Kode: ${filterKode === 'all' ? 'Semua Kode' : filterKode}`,
        `Jenis Mutasi: ${filterJenis === 'all' ? 'Semua Jenis' : filterJenis} | Periode: ${filterFrom || 'Awal'} s/d ${filterTo || 'Sekarang'}`,
        `Jumlah Mutasi: ${filteredEntries.length} entri | Total Masuk: ${formatNumber(totalMasuk)} Kg | Total Keluar: ${formatNumber(totalKeluar)} Kg`
      ],
      head,
      body,
      fileName: `Mutasi_Stock_PP1_${new Date().toISOString().slice(0, 10)}`
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Panel Header */}
      <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Mutasi Terbaru Lintas Bahan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Log riwayat pergerakan masuk dan keluar gudang bahan baku
          </p>
        </div>

        <button
          onClick={handleExportPdf}
          disabled={filteredEntries.length === 0}
          className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 transition-colors shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export PDF Laporan</span>
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200 space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Bahan Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Bahan
            </label>
            <select
              value={filterKomoditas}
              onChange={e => {
                setFilterKomoditas(e.target.value);
                setFilterKode('all');
                setFilterJenis('all');
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

          {/* Kode Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Kode / Grade
            </label>
            <select
              value={filterKode}
              onChange={e => setFilterKode(e.target.value)}
              className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Kode / Grade</option>
              {kodeOptions.map(group => (
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

          {/* Jenis Mutasi Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Jenis Mutasi
            </label>
            <select
              value={filterJenis}
              onChange={e => setFilterJenis(e.target.value)}
              className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Jenis Mutasi</option>
              {jenisOptions.map(j => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Search */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Pencarian Cepat
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari kode, mutasi..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Date Ranges & Toggle Zero */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Rentang:</span>
            </span>
            <input
              type="date"
              value={filterFrom}
              onChange={e => setFilterFrom(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700"
              title="Dari tanggal"
            />
            <span className="text-xs text-slate-400">s/d</span>
            <input
              type="date"
              value={filterTo}
              onChange={e => setFilterTo(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700"
              title="Sampai tanggal"
            />

            {(filterFrom || filterTo) && (
              <button
                onClick={() => { setFilterFrom(''); setFilterTo(''); }}
                className="text-[11px] text-blue-700 hover:underline px-1.5"
              >
                Reset Tanggal
              </button>
            )}
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterHideZero}
              onChange={e => setFilterHideZero(e.target.checked)}
              className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <span>Sembunyikan mutasi bernilai 0</span>
          </label>
        </div>
      </div>

      {/* Summary Box (Equivalent to .metric-row-3) */}
      <div className="p-4 sm:p-5 bg-blue-50/50 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <span className="text-xs font-bold text-blue-900 tracking-tight">
            Ringkasan Filter Aktif
          </span>
          <span className="text-xs text-slate-500 font-mono">
            {filterFrom || filterTo ? `${filterFrom || 'Awal'} s/d ${filterTo || 'Hari ini'}` : 'Semua Periode'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block mb-0.5">
              Jumlah Entri
            </span>
            <span className="text-base sm:text-xl font-bold text-slate-900 font-mono tabular-nums">
              {filteredEntries.length}
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block mb-0.5">
              Total Masuk
            </span>
            <span className="text-base sm:text-xl font-bold text-emerald-700 font-mono tabular-nums">
              +{formatNumber(totalMasuk)} <span className="text-xs font-normal">Kg</span>
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block mb-0.5">
              Total Keluar
            </span>
            <span className="text-base sm:text-xl font-bold text-rose-700 font-mono tabular-nums">
              -{formatNumber(totalKeluar)} <span className="text-xs font-normal">Kg</span>
            </span>
          </div>
        </div>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-[11.5px] font-semibold text-slate-600 uppercase tracking-wider">
              <th className="py-3 px-4">Tanggal</th>
              <th className="py-3 px-4">Bahan</th>
              <th className="py-3 px-4">Kode / Grade</th>
              <th className="py-3 px-4">Jenis Mutasi</th>
              <th className="py-3 px-4 text-right">Masuk (Kg)</th>
              <th className="py-3 px-4 text-right">Keluar (Kg)</th>
              <th className="py-3 px-4 text-center">Cek</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  Tidak ada data mutasi yang cocok dengan filter saat ini.
                </td>
              </tr>
            ) : (
              filteredEntries.map((e, index) => {
                const m = e.mutasi;
                return (
                  <tr 
                    key={m.id || index}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 px-4 whitespace-nowrap text-slate-700 font-medium">
                      {formatTanggalIndo(m.tanggal)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      {e.komoditas}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-900">
                      {m.kode}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      {m.jenisMutasi}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right font-mono tabular-nums font-semibold text-emerald-700">
                      {m.masuk ? `+${formatNumber(m.masuk)}` : '—'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right font-mono tabular-nums font-semibold text-rose-700">
                      {m.keluar ? `-${formatNumber(m.keluar)}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onToggleCek(e.komoditas, m.id || `${e.komoditas}-${index}`, m.cek)}
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-md transition-all ${
                          m.cek
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                        title={m.cek ? 'Tervalidasi (Klik untuk ubah)' : 'Belum dicek (Klik untuk validasi)'}
                      >
                        {m.cek ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Minus className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
