import React, { useState, useMemo } from 'react';
import { KomoditasData } from '../../types';
import { 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  Layers, 
  Download, 
  Sparkles,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { GasService } from '../../services/gasService';
import { exportToPdf } from '../../services/pdfExport';

interface SaldoKodePanelProps {
  data: KomoditasData[];
  initialCommodity?: string;
}

interface FlattenedKode {
  komoditas: string;
  satuan: string;
  nama: string;
  saldo: number;
  saldoSKT?: number;
  saldoSKM?: number;
  kategoriProduksi?: 'Murni SKT' | 'Murni SKM' | 'Gabungan' | 'Nol';
  tanggalTerakhir?: string;
}

export const SaldoKodePanel: React.FC<SaldoKodePanelProps> = ({
  data,
  initialCommodity = 'all'
}) => {
  const [filterKomoditas, setFilterKomoditas] = useState<string>(initialCommodity);
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterProduksi, setFilterProduksi] = useState<'all' | 'SKT' | 'SKM' | 'Gabungan'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSnapshotMode, setIsSnapshotMode] = useState<boolean>(false);
  const [snapshotDate, setSnapshotDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [hideZero, setHideZero] = useState<boolean>(false);

  // Sync initialCommodity if parent updates
  React.useEffect(() => {
    if (initialCommodity) {
      setFilterKomoditas(initialCommodity);
    }
  }, [initialCommodity]);

  // Available grade options
  const gradeOptions = useMemo(() => {
    if (filterKomoditas === 'all') {
      return data.map(k => ({
        komoditas: k.komoditas,
        kodes: k.kodeList.map(item => item.nama)
      }));
    }
    const target = data.find(k => k.komoditas === filterKomoditas);
    return target ? [{ komoditas: target.komoditas, kodes: target.kodeList.map(i => i.nama) }] : [];
  }, [data, filterKomoditas]);

  // Compute live or snapshot items
  const flattenedItems = useMemo(() => {
    const list: FlattenedKode[] = [];

    data.forEach((k, index) => {
      if (filterKomoditas !== 'all' && k.komoditas !== filterKomoditas) {
        return;
      }

      if (isSnapshotMode && snapshotDate) {
        // Compute date snapshot via GasService
        const snapshot = GasService.getSaldoPerTanggal(index, snapshotDate);
        snapshot.kodeList.forEach(item => {
          list.push({
            komoditas: k.komoditas,
            satuan: k.satuan,
            nama: item.nama,
            saldo: item.saldo,
            tanggalTerakhir: snapshotDate
          });
        });
      } else {
        // Standard live running saldo
        k.kodeList.forEach(item => {
          // find last mutasi date for this code
          const lastMutasi = k.mutasiTerbaru.find(m => m.kode === item.nama);
          list.push({
            komoditas: k.komoditas,
            satuan: k.satuan,
            nama: item.nama,
            saldo: item.saldo,
            saldoSKT: item.saldoSKT,
            saldoSKM: item.saldoSKM,
            kategoriProduksi: item.kategoriProduksi,
            tanggalTerakhir: lastMutasi?.tanggal || item.tanggalTerakhir || undefined
          });
        });
      }
    });

    return list;
  }, [data, filterKomoditas, isSnapshotMode, snapshotDate]);

  // Check if current view has SKT / SKM data breakdown
  const hasProduksiBreakdown = useMemo(() => {
    return flattenedItems.some(i => i.kategoriProduksi || i.saldoSKT !== undefined || i.saldoSKM !== undefined);
  }, [flattenedItems]);

  // Filter items
  const filteredItems = useMemo(() => {
    return flattenedItems.filter(item => {
      if (filterGrade !== 'all' && item.nama !== filterGrade) {
        return false;
      }

      if (hideZero && (item.saldo === 0 || !item.saldo)) {
        return false;
      }

      if (filterProduksi !== 'all') {
        if (filterProduksi === 'SKT') {
          if (item.kategoriProduksi !== 'Murni SKT' && !(item.saldoSKT && item.saldoSKT > 0 && !item.saldoSKM)) {
            return false;
          }
        } else if (filterProduksi === 'SKM') {
          if (item.kategoriProduksi !== 'Murni SKM' && !(item.saldoSKM && item.saldoSKM > 0 && !item.saldoSKT)) {
            return false;
          }
        } else if (filterProduksi === 'Gabungan') {
          if (item.kategoriProduksi !== 'Gabungan' && !(item.saldoSKT && item.saldoSKT > 0 && item.saldoSKM && item.saldoSKM > 0)) {
            return false;
          }
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.nama.toLowerCase().includes(q);
        const matchBahan = item.komoditas.toLowerCase().includes(q);
        if (!matchName && !matchBahan) return false;
      }

      return true;
    });
  }, [flattenedItems, filterGrade, filterProduksi, hideZero, searchQuery]);

  // Aggregate totals
  const totalSaldo = useMemo(() => {
    return filteredItems.reduce((acc, curr) => acc + (curr.saldo || 0), 0);
  }, [filteredItems]);

  const totalSaldoSKT = useMemo(() => {
    return filteredItems.reduce((acc, curr) => acc + (curr.saldoSKT || 0), 0);
  }, [filteredItems]);

  const totalSaldoSKM = useMemo(() => {
    return filteredItems.reduce((acc, curr) => acc + (curr.saldoSKM || 0), 0);
  }, [filteredItems]);

  const countSKT = useMemo(() => {
    return flattenedItems.filter(i => i.kategoriProduksi === 'Murni SKT' || (i.saldoSKT && i.saldoSKT > 0 && !i.saldoSKM)).length;
  }, [flattenedItems]);

  const countSKM = useMemo(() => {
    return flattenedItems.filter(i => i.kategoriProduksi === 'Murni SKM' || (i.saldoSKM && i.saldoSKM > 0 && !i.saldoSKT)).length;
  }, [flattenedItems]);

  const countGabungan = useMemo(() => {
    return flattenedItems.filter(i => i.kategoriProduksi === 'Gabungan' || (i.saldoSKT && i.saldoSKT > 0 && i.saldoSKM && i.saldoSKM > 0)).length;
  }, [flattenedItems]);

  const formatNumber = (num: number): string => {
    return Number(num).toLocaleString('id-ID', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
  };

  const formatTanggalIndo = (tanggalISO?: string): string => {
    if (!tanggalISO) return '—';
    try {
      const date = new Date(tanggalISO);
      if (isNaN(date.getTime())) return tanggalISO;
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return tanggalISO;
    }
  };

  // Export PDF
  const handleExportPdf = () => {
    const title = isSnapshotMode
      ? `Saldo Persediaan Bahan PP1 (Snapshot per ${snapshotDate})`
      : hasProduksiBreakdown
        ? 'Saldo Terkini per Kode (Rincian SKT, SKM & Gabungan)'
        : 'Saldo Terkini per Kode / Grade';

    const head: string[] = isSnapshotMode
      ? ['BAHAN', 'KODE / GRADE', 'SALDO HISTORIS (KG)']
      : hasProduksiBreakdown
        ? ['BAHAN', 'KODE / GRADE', 'TIPE PRODUKSI', 'SKT (KG)', 'SKM (KG)', 'TOTAL (KG)']
        : ['BAHAN', 'KODE / GRADE', 'MUTASI TERAKHIR', 'SALDO TERKINI (KG)'];

    const body = filteredItems.map(item => {
      if (isSnapshotMode) {
        return [item.komoditas, item.nama, formatNumber(item.saldo)];
      }
      if (hasProduksiBreakdown) {
        return [
          item.komoditas,
          item.nama,
          item.kategoriProduksi || '—',
          formatNumber(item.saldoSKT || 0),
          formatNumber(item.saldoSKM || 0),
          formatNumber(item.saldo)
        ];
      }
      return [item.komoditas, item.nama, formatTanggalIndo(item.tanggalTerakhir), formatNumber(item.saldo)];
    });

    const infoLines = [
      `Filter Bahan: ${filterKomoditas === 'all' ? 'Semua Bahan' : filterKomoditas}`,
      `Filter Produksi: ${filterProduksi === 'all' ? 'Semua Jalur (SKT + SKM)' : filterProduksi}`,
      `Jumlah Kode / Grade: ${filteredItems.length} | Total Saldo: ${formatNumber(totalSaldo)} Kg`
    ];

    if (hasProduksiBreakdown) {
      infoLines.push(`Rincian Saldo: SKT (Tangan) = ${formatNumber(totalSaldoSKT)} Kg | SKM (Mesin) = ${formatNumber(totalSaldoSKM)} Kg`);
    }

    exportToPdf({
      title,
      infoLines,
      head,
      body,
      fileName: `Saldo_Kode_PP1_${isSnapshotMode ? snapshotDate : 'Terkini'}`
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Header - Compact */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {isSnapshotMode ? 'Saldo per Kode / Grade (Snapshot Historis)' : 'Saldo Terkini per Kode / Grade'}
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            {isSnapshotMode 
              ? `Saldo dihitung seolah-olah dicek pada tanggal ${formatTanggalIndo(snapshotDate)}`
              : 'Daftar stok per tab kartu persediaan berjalan'}
          </p>
        </div>

        <button
          onClick={handleExportPdf}
          disabled={filteredItems.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 transition-colors shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export PDF Saldo</span>
        </button>
      </div>

      {/* Filter Bar - Compact */}
      <div className="px-4 py-3 sm:px-5 sm:py-3 bg-slate-50/70 border-b border-slate-200 space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Bahan */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
              Bahan
            </label>
            <select
              value={filterKomoditas}
              onChange={e => {
                setFilterKomoditas(e.target.value);
                setFilterGrade('all');
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

          {/* Grade / Kode */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
              Grade / Kode
            </label>
            <select
              value={filterGrade}
              onChange={e => setFilterGrade(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
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
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
              Pencarian Grade
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari nama grade/kode..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Snapshot Toggle & Checkbox - Compact */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200/60">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSnapshotMode(!isSnapshotMode)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all flex items-center gap-1.5 ${
                isSnapshotMode
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{isSnapshotMode ? 'Mode Snapshot: AKTIF' : 'Hitung Saldo per Tanggal'}</span>
            </button>

            {isSnapshotMode && (
              <div className="flex items-center gap-1 animate-in fade-in duration-200">
                <input
                  type="date"
                  value={snapshotDate}
                  onChange={e => setSnapshotDate(e.target.value)}
                  className="text-xs bg-white border border-blue-300 rounded-md px-2 py-1 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideZero}
              onChange={e => setHideZero(e.target.checked)}
              className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
            />
            <span className="text-[11px]">Sembunyikan Saldo 0</span>
          </label>
        </div>

        {/* Jalur Produksi Filter Tabs (Muncul otomatis saat data memuat SKT/SKM) */}
        {hasProduksiBreakdown && (
          <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">
              Jalur Produksi:
            </span>
            <button
              onClick={() => setFilterProduksi('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                filterProduksi === 'all'
                  ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Semua ({flattenedItems.length})
            </button>
            <button
              onClick={() => setFilterProduksi('SKT')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all flex items-center gap-1.5 cursor-pointer ${
                filterProduksi === 'SKT'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                  : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Murni SKT ({countSKT})</span>
            </button>
            <button
              onClick={() => setFilterProduksi('SKM')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all flex items-center gap-1.5 cursor-pointer ${
                filterProduksi === 'SKM'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-white text-blue-800 border-blue-300 hover:bg-blue-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>Murni SKM ({countSKM})</span>
            </button>
            <button
              onClick={() => setFilterProduksi('Gabungan')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all flex items-center gap-1.5 cursor-pointer ${
                filterProduksi === 'Gabungan'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                  : 'bg-white text-purple-800 border-purple-300 hover:bg-purple-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              <span>Gabungan SKT &amp; SKM ({countGabungan})</span>
            </button>
          </div>
        )}
      </div>

      {/* Summary Card - Compact */}
      <div className="px-4 py-2.5 sm:px-5 sm:py-2.5 bg-slate-50 border-b border-slate-200">
        {hasProduksiBreakdown ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="text-[10px] font-semibold uppercase text-slate-500 block">
                Jumlah Kode
              </span>
              <span className="text-sm sm:text-base font-bold text-slate-900 font-mono tabular-nums leading-tight">
                {filteredItems.length}
              </span>
            </div>

            <div className="bg-white px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50/20">
              <span className="text-[10px] font-semibold uppercase text-amber-700 block flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Saldo SKT (Tangan)
              </span>
              <span className="text-sm sm:text-base font-bold text-amber-900 font-mono tabular-nums leading-tight">
                {formatNumber(totalSaldoSKT)} <span className="text-[10px] font-normal text-slate-500">Kg</span>
              </span>
            </div>

            <div className="bg-white px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50/20">
              <span className="text-[10px] font-semibold uppercase text-blue-700 block flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                Saldo SKM (Mesin)
              </span>
              <span className="text-sm sm:text-base font-bold text-blue-900 font-mono tabular-nums leading-tight">
                {formatNumber(totalSaldoSKM)} <span className="text-[10px] font-normal text-slate-500">Kg</span>
              </span>
            </div>

            <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="text-[10px] font-semibold uppercase text-slate-500 block">
                Total Akumulasi
              </span>
              <span className="text-sm sm:text-base font-bold text-slate-900 font-mono tabular-nums leading-tight">
                {formatNumber(totalSaldo)} <span className="text-[10px] font-normal text-slate-500">Kg</span>
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-w-md">
            <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="text-[10px] font-semibold uppercase text-slate-500 block">
                Jumlah Kode / Grade
              </span>
              <span className="text-sm sm:text-base font-bold text-slate-900 font-mono tabular-nums leading-tight">
                {filteredItems.length}
              </span>
            </div>

            <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="text-[10px] font-semibold uppercase text-slate-500 block">
                Total Akumulasi Saldo
              </span>
              <span className="text-sm sm:text-base font-bold text-blue-800 font-mono tabular-nums leading-tight">
                {formatNumber(totalSaldo)} <span className="text-[10px] font-normal text-slate-500">Kg</span>
              </span>
            </div>
          </div>
        )}

        {isSnapshotMode && (
          <p className="text-[10.5px] text-slate-500 mt-1.5 flex items-center gap-1">
            <Clock className="w-3 h-3 text-blue-600 shrink-0" />
            <span>
              Saldo dihitung seolah-olah dicek pada <strong>{formatTanggalIndo(snapshotDate)}</strong> — mutasi setelah tanggal ini diabaikan untuk verifikasi data.
            </span>
          </p>
        )}
      </div>

      {/* Table - Compact Row Density */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/90 border-b border-slate-200 text-[10.5px] font-semibold text-slate-600 uppercase tracking-wider">
              <th className="py-2 px-3 sm:px-4">Bahan</th>
              <th className="py-2 px-3 sm:px-4">Kode / Grade</th>
              {hasProduksiBreakdown && <th className="py-2 px-3 sm:px-4">Tipe Produksi</th>}
              {!isSnapshotMode && <th className="py-2 px-3 sm:px-4">Mutasi Terakhir</th>}
              <th className="py-2 px-3 sm:px-4 text-right">Saldo {isSnapshotMode ? 'Snapshot' : 'Terkini'} (Kg)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={isSnapshotMode ? (hasProduksiBreakdown ? 4 : 3) : (hasProduksiBreakdown ? 5 : 4)} className="py-8 text-center text-slate-400">
                  Tidak ada data kode/grade yang cocok dengan filter.
                </td>
              </tr>
            ) : (
              filteredItems.map((item, idx) => (
                <tr key={`${item.komoditas}-${item.nama}-${idx}`} className="hover:bg-slate-50/90 transition-colors">
                  <td className="py-1.5 px-3 sm:px-4 whitespace-nowrap text-slate-600 font-medium">
                    {item.komoditas}
                  </td>
                  <td className="py-1.5 px-3 sm:px-4 whitespace-nowrap font-bold text-slate-900">
                    {item.nama}
                  </td>
                  {hasProduksiBreakdown && (
                    <td className="py-1.5 px-3 sm:px-4 whitespace-nowrap">
                      {item.kategoriProduksi === 'Murni SKT' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          Murni SKT
                        </span>
                      ) : item.kategoriProduksi === 'Murni SKM' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          Murni SKM
                        </span>
                      ) : item.kategoriProduksi === 'Gabungan' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                          Gabungan
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                  )}
                  {!isSnapshotMode && (
                    <td className="py-1.5 px-3 sm:px-4 whitespace-nowrap text-slate-500 font-medium">
                      {formatTanggalIndo(item.tanggalTerakhir)}
                    </td>
                  )}
                  <td className="py-1.5 px-3 sm:px-4 whitespace-nowrap text-right font-mono tabular-nums">
                    <div className="font-bold text-slate-900">
                      {formatNumber(item.saldo)}{' '}
                      <span className="text-[10px] font-normal text-slate-500">{item.satuan}</span>
                    </div>
                    {hasProduksiBreakdown && (item.saldoSKT !== undefined || item.saldoSKM !== undefined) && item.saldo > 0 && (
                      <div className="text-[10px] text-slate-500 font-mono tracking-tight flex items-center justify-end gap-1 mt-0.5">
                        <span className="text-amber-800 bg-amber-50/90 px-1 py-0.2 rounded border border-amber-200/60 font-medium">
                          SKT: {formatNumber(item.saldoSKT || 0)}
                        </span>
                        <span className="text-blue-800 bg-blue-50/90 px-1 py-0.2 rounded border border-blue-200/60 font-medium">
                          SKM: {formatNumber(item.saldoSKM || 0)}
                        </span>
                      </div>
                    )}
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
