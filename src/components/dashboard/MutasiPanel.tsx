import React, { useState, useMemo } from 'react';
import { KomoditasData, MutasiItem } from '../../types';
import { 
  Search, 
  Filter, 
  Calendar, 
  Check, 
  Minus, 
  Download, 
  ArrowUpDown, 
  FileText,
  Layers,
  Sparkles
} from 'lucide-react';
import { exportToPdf } from '../../services/pdfExport';

interface MutasiPanelProps {
  data: KomoditasData[];
  onToggleCek: (komoditasName: string, mutasiId: string, currentStatus: boolean) => void;
  initialCommodity?: string;
}

interface FlattenedMutasi {
  komoditas: string;
  satuan: string;
  mutasi: MutasiItem;
}

export const MutasiPanel: React.FC<MutasiPanelProps> = ({
  data,
  onToggleCek,
  initialCommodity = 'all'
}) => {
  // Filters state
  const [filterKomoditas, setFilterKomoditas] = useState<string>(initialCommodity);
  const [filterKode, setFilterKode] = useState<string>('all');
  const [filterJenis, setFilterJenis] = useState<string>('all');
  const [filterFrom, setFilterFrom] = useState<string>('');
  const [filterTo, setFilterTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterHideZero, setFilterHideZero] = useState<boolean>(false);

  // Sync initialCommodity if parent changes it
  React.useEffect(() => {
    if (initialCommodity) {
      setFilterKomoditas(initialCommodity);
    }
  }, [initialCommodity]);

  // Flatten all mutasi from all komoditas
  const allMutasi = useMemo(() => {
    const list: FlattenedMutasi[] = [];
    data.forEach(k => {
      k.mutasiTerbaru.forEach(m => {
        list.push({
          komoditas: k.komoditas,
          satuan: k.satuan,
          mutasi: m
        });
      });
    });

    // Sort by date descending (terbaru di atas)
    return list.sort((a, b) => {
      const dateA = new Date(a.mutasi.tanggal || '').getTime() || 0;
      const dateB = new Date(b.mutasi.tanggal || '').getTime() || 0;
      return dateB - dateA;
    });
  }, [data]);

  // Available Kode options based on selected Komoditas
  const kodeOptions = useMemo(() => {
    if (filterKomoditas === 'all') {
      return data.map(k => ({
        komoditas: k.komoditas,
        kodes: k.kodeList.map(item => item.nama)
      }));
    }
    const target = data.find(k => k.komoditas === filterKomoditas);
    return target ? [{ komoditas: target.komoditas, kodes: target.kodeList.map(i => i.nama) }] : [];
  }, [data, filterKomoditas]);

  // Unique Jenis Mutasi across data
  const jenisOptions = useMemo(() => {
    const set = new Set<string>();
    allMutasi.forEach(e => {
      if (e.mutasi.jenisMutasi) set.add(e.mutasi.jenisMutasi);
    });
    return Array.from(set).sort();
  }, [allMutasi]);

  // Filtered mutasi items
  const filteredEntries = useMemo(() => {
    return allMutasi.filter(e => {
      const m = e.mutasi;

      // Filter Komoditas
      if (filterKomoditas !== 'all' && e.komoditas !== filterKomoditas) {
        return false;
      }

      // Filter Kode
      if (filterKode !== 'all' && m.kode !== filterKode) {
        return false;
      }

      // Filter Jenis Mutasi
      if (filterJenis !== 'all' && m.jenisMutasi !== filterJenis) {
        return false;
      }

      // Filter Zero entries
      if (filterHideZero && (m.masuk === 0 || !m.masuk) && (m.keluar === 0 || !m.keluar)) {
        return false;
      }

      // Filter Date Range
      if (filterFrom && m.tanggal) {
        if (m.tanggal < filterFrom) return false;
      }
      if (filterTo && m.tanggal) {
        if (m.tanggal > filterTo) return false;
      }

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchKode = m.kode?.toLowerCase().includes(q);
        const matchJenis = m.jenisMutasi?.toLowerCase().includes(q);
        const matchBahan = e.komoditas.toLowerCase().includes(q);
        const matchTanggal = m.tanggal?.toLowerCase().includes(q);
        if (!matchKode && !matchJenis && !matchBahan && !matchTanggal) {
          return false;
        }
      }

      return true;
    });
  }, [allMutasi, filterKomoditas, filterKode, filterJenis, filterHideZero, filterFrom, filterTo, searchQuery]);

  // Totals for filtered data
  const totalMasuk = useMemo(() => {
    return filteredEntries.reduce((acc, curr) => acc + (curr.mutasi.masuk || 0), 0);
  }, [filteredEntries]);

  const totalKeluar = useMemo(() => {
    return filteredEntries.reduce((acc, curr) => acc + (curr.mutasi.keluar || 0), 0);
  }, [filteredEntries]);

  const formatNumber = (num: number): string => {
    return Number(num).toLocaleString('id-ID', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
  };

  const formatTanggalIndo = (tanggalISO: string): string => {
    if (!tanggalISO) return '—';
    try {
      const date = new Date(tanggalISO);
      if (isNaN(date.getTime())) return tanggalISO;
      return date.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return tanggalISO;
    }
  };

  // PDF Export Trigger
  const handleExportPdf = () => {
    const head = [['TANGGAL', 'BAHAN', 'KODE / GRADE', 'JENIS MUTASI', 'MASUK (KG)', 'KELUAR (KG)', 'CEK']];
    const body = filteredEntries.map(e => [
      formatTanggalIndo(e.mutasi.tanggal),
      e.komoditas,
      e.mutasi.kode,
      e.mutasi.jenisMutasi,
      e.mutasi.masuk ? `+${formatNumber(e.mutasi.masuk)}` : '-',
      e.mutasi.keluar ? `-${formatNumber(e.mutasi.keluar)}` : '-',
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
      {/* Panel Header - Compact */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Mutasi Terbaru Lintas Bahan
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            Log riwayat pergerakan masuk dan keluar gudang bahan baku
          </p>
        </div>

        <button
          onClick={handleExportPdf}
          disabled={filteredEntries.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 transition-colors shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export PDF Laporan</span>
        </button>
      </div>

      {/* Filter Controls Bar - Compact */}
      <div className="px-4 py-3 sm:px-5 sm:py-3 bg-slate-50/70 border-b border-slate-200 space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Bahan Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
              Bahan
            </label>
            <select
              value={filterKomoditas}
              onChange={e => {
                setFilterKomoditas(e.target.value);
                setFilterKode('all');
                setFilterJenis('all');
              }}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
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
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
              Kode / Grade
            </label>
            <select
              value={filterKode}
              onChange={e => setFilterKode(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
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
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
              Jenis Mutasi
            </label>
            <select
              value={filterJenis}
              onChange={e => setFilterJenis(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
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
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
              Pencarian Cepat
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari kode, mutasi..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Date Ranges & Toggle Zero - Compact */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-500" />
              <span>Rentang:</span>
            </span>
            <input
              type="date"
              value={filterFrom}
              onChange={e => setFilterFrom(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-700"
              title="Dari tanggal"
            />
            <span className="text-[11px] text-slate-400">s/d</span>
            <input
              type="date"
              value={filterTo}
              onChange={e => setFilterTo(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-700"
              title="Sampai tanggal"
            />

            {(filterFrom || filterTo) && (
              <button
                onClick={() => { setFilterFrom(''); setFilterTo(''); }}
                className="text-[10.5px] text-blue-700 hover:underline px-1"
              >
                Reset
              </button>
            )}
          </div>

          <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterHideZero}
              onChange={e => setFilterHideZero(e.target.checked)}
              className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
            />
            <span className="text-[11px]">Sembunyikan mutasi bernilai 0</span>
          </label>
        </div>
      </div>

      {/* Summary Box (Streamlined Compact) */}
      <div className="px-4 py-2.5 sm:px-5 sm:py-2.5 bg-blue-50/50 border-b border-slate-200">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[11px] font-bold text-blue-900 tracking-tight">
            Ringkasan Filter Aktif
          </span>
          <span className="text-[10.5px] text-slate-500 font-mono">
            {filterFrom || filterTo ? `${filterFrom || 'Awal'} s/d ${filterTo || 'Hari ini'}` : 'Semua Periode'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white px-3 py-1.5 rounded-lg border border-blue-100 shadow-2xs">
            <span className="text-[10px] font-semibold uppercase text-slate-500 block">
              Jumlah Entri
            </span>
            <span className="text-sm sm:text-base font-bold text-slate-900 font-mono tabular-nums leading-tight">
              {filteredEntries.length}
            </span>
          </div>

          <div className="bg-white px-3 py-1.5 rounded-lg border border-blue-100 shadow-2xs">
            <span className="text-[10px] font-semibold uppercase text-slate-500 block">
              Total Masuk
            </span>
            <span className="text-sm sm:text-base font-bold text-emerald-700 font-mono tabular-nums leading-tight">
              +{formatNumber(totalMasuk)} <span className="text-[10px] font-normal text-slate-500">Kg</span>
            </span>
          </div>

          <div className="bg-white px-3 py-1.5 rounded-lg border border-blue-100 shadow-2xs">
            <span className="text-[10px] font-semibold uppercase text-slate-500 block">
              Total Keluar
            </span>
            <span className="text-sm sm:text-base font-bold text-rose-700 font-mono tabular-nums leading-tight">
              -{formatNumber(totalKeluar)} <span className="text-[10px] font-normal text-slate-500">Kg</span>
            </span>
          </div>
        </div>
      </div>

      {/* Table Data - Compact Row Density */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/90 border-b border-slate-200 text-[10.5px] font-semibold text-slate-600 uppercase tracking-wider">
              <th className="py-2 px-3 sm:px-4">Tanggal</th>
              <th className="py-2 px-3 sm:px-4">Bahan</th>
              <th className="py-2 px-3 sm:px-4">Kode / Grade</th>
              <th className="py-2 px-3 sm:px-4">Jenis Mutasi</th>
              <th className="py-2 px-3 sm:px-4 text-right">Masuk (Kg)</th>
              <th className="py-2 px-3 sm:px-4 text-right">Keluar (Kg)</th>
              <th className="py-2 px-3 sm:px-4 text-center">Cek</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  Tidak ada data mutasi yang cocok dengan filter saat ini.
                </td>
              </tr>
            ) : (
              filteredEntries.map((e, index) => {
                const m = e.mutasi;
                return (
                  <tr 
                    key={m.id || index}
                    className="hover:bg-slate-50/90 transition-colors"
                  >
                    <td className="py-1.5 px-3 sm:px-4 whitespace-nowrap text-slate-700 font-medium">
                      {formatTanggalIndo(m.tanggal)}
                    </td>
                    <td className="py-1.5 px-3 sm:px-4 whitespace-nowrap text-slate-600">
                      {e.komoditas}
                    </td>
                    <td className="py-1.5 px-3 sm:px-4 whitespace-nowrap font-bold text-slate-900">
                      {m.kode}
                    </td>
                    <td className="py-1.5 px-3 sm:px-4 whitespace-nowrap text-slate-600">
                      {m.jenisMutasi}
                    </td>
                    <td className="py-1.5 px-3 sm:px-4 whitespace-nowrap text-right font-mono tabular-nums font-semibold text-emerald-700">
                      {m.masuk ? `+${formatNumber(m.masuk)}` : '—'}
                    </td>
                    <td className="py-1.5 px-3 sm:px-4 whitespace-nowrap text-right font-mono tabular-nums font-semibold text-rose-700">
                      {m.keluar ? `-${formatNumber(m.keluar)}` : '—'}
                    </td>
                    <td className="py-1.5 px-3 sm:px-4 text-center">
                      <button
                        onClick={() => onToggleCek(e.komoditas, m.id || `${e.komoditas}-${index}`, m.cek)}
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-md transition-all ${
                          m.cek
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                        title={m.cek ? 'Tervalidasi (Klik untuk ubah)' : 'Belum dicek (Klik untuk validasi)'}
                      >
                        {m.cek ? <Check className="w-3 h-3 stroke-[3]" /> : <Minus className="w-3 h-3" />}
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
