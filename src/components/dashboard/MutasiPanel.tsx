import React, { useState, useMemo, useEffect } from 'react';
import { KomoditasData, MutasiItem, KategoriProduksi } from '../../types';
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
  Sparkles,
  Sliders
} from 'lucide-react';
import { exportToPdf } from '../../services/pdfExport';
import { GasService } from '../../services/gasService';
import { SktSkmSettingsModal } from '../modals/SktSkmSettingsModal';

interface MutasiPanelProps {
  data: KomoditasData[];
  onToggleCek: (komoditasName: string, mutasiId: string, currentStatus: boolean) => void;
  initialCommodity?: string;
}

interface FlattenedMutasi {
  komoditas: string;
  satuan: string;
  mutasi: MutasiItem;
  kategoriProduksi?: KategoriProduksi;
  masukSKT?: number;
  keluarSKT?: number;
  masukSKM?: number;
  keluarSKM?: number;
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
  const [filterProduksi, setFilterProduksi] = useState<'all' | 'SKT' | 'SKM' | 'Gabungan'>('all');
  const [filterFrom, setFilterFrom] = useState<string>('');
  const [filterTo, setFilterTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterHideZero, setFilterHideZero] = useState<boolean>(false);
  const [isSktSkmModalOpen, setIsSktSkmModalOpen] = useState<boolean>(false);
  const [sktSkmVersion, setSktSkmVersion] = useState<number>(0);

  // Sync initialCommodity if parent changes it
  useEffect(() => {
    if (initialCommodity) {
      setFilterKomoditas(initialCommodity);
    }
  }, [initialCommodity]);

  // Listen to SKT/SKM settings updates
  useEffect(() => {
    const handleConfigChange = () => setSktSkmVersion(v => v + 1);
    window.addEventListener('stockpp1_skt_skm_config_changed', handleConfigChange);
    return () => window.removeEventListener('stockpp1_skt_skm_config_changed', handleConfigChange);
  }, []);

  // Check if current view has SKT / SKM data breakdown active
  const hasProduksiBreakdown = useMemo(() => {
    if (filterKomoditas !== 'all') {
      return GasService.isSktSkmActiveForKomoditas(filterKomoditas);
    }
    return data.some(k => GasService.isSktSkmActiveForKomoditas(k.komoditas));
  }, [data, filterKomoditas, sktSkmVersion]);

  // Flatten all mutasi from all komoditas with SKT/SKM lane categorization
  const allMutasi = useMemo(() => {
    const list: FlattenedMutasi[] = [];
    data.forEach(k => {
      const isDual = GasService.isSktSkmActiveForKomoditas(k.komoditas);
      // Map kode name to its KodeItem for quick lookup
      const kodeMap = new Map<string, any>();
      k.kodeList?.forEach(kd => kodeMap.set(kd.nama, kd));

      k.mutasiTerbaru.forEach(m => {
        let kategoriProduksi: KategoriProduksi | undefined = undefined;
        let masukSKT = m.masukSKT;
        let keluarSKT = m.keluarSKT;
        let masukSKM = m.masukSKM;
        let keluarSKM = m.keluarSKM;

        if (isDual) {
          const matchedKode = kodeMap.get(m.kode);
          const kodeKat: KategoriProduksi | undefined = matchedKode?.kategoriProduksi;

          // If explicit masukSKT / keluarSKT or masukSKM / keluarSKM are defined
          const hasExplicitSKT = (masukSKT !== undefined && masukSKT > 0) || (keluarSKT !== undefined && keluarSKT > 0);
          const hasExplicitSKM = (masukSKM !== undefined && masukSKM > 0) || (keluarSKM !== undefined && keluarSKM > 0);

          if (hasExplicitSKT && hasExplicitSKM) {
            kategoriProduksi = 'Gabungan';
          } else if (hasExplicitSKT && !hasExplicitSKM) {
            kategoriProduksi = 'Murni SKT';
          } else if (hasExplicitSKM && !hasExplicitSKT) {
            kategoriProduksi = 'Murni SKM';
          } else if (kodeKat) {
            kategoriProduksi = kodeKat;
            if (kodeKat === 'Murni SKT') {
              masukSKT = m.masuk;
              keluarSKT = m.keluar;
              masukSKM = 0;
              keluarSKM = 0;
            } else if (kodeKat === 'Murni SKM') {
              masukSKM = m.masuk;
              keluarSKM = m.keluar;
              masukSKT = 0;
              keluarSKT = 0;
            } else if (kodeKat === 'Gabungan') {
              // For Gabungan without explicit transaction breakdown, allocate by kode proportion or 50/50
              if (matchedKode && matchedKode.saldoSKT !== undefined && matchedKode.saldoSKM !== undefined && matchedKode.saldo > 0) {
                const ratioSKT = matchedKode.saldoSKT / matchedKode.saldo;
                masukSKT = Math.round(m.masuk * ratioSKT * 10) / 10;
                masukSKM = Math.round((m.masuk - masukSKT) * 10) / 10;
                keluarSKT = Math.round(m.keluar * ratioSKT * 10) / 10;
                keluarSKM = Math.round((m.keluar - keluarSKT) * 10) / 10;
              } else {
                masukSKT = Math.round((m.masuk / 2) * 10) / 10;
                masukSKM = Math.round((m.masuk - masukSKT) * 10) / 10;
                keluarSKT = Math.round((m.keluar / 2) * 10) / 10;
                keluarSKM = Math.round((m.keluar - keluarSKT) * 10) / 10;
              }
            }
          }
        }

        list.push({
          komoditas: k.komoditas,
          satuan: k.satuan,
          mutasi: m,
          kategoriProduksi,
          masukSKT,
          keluarSKT,
          masukSKM,
          keluarSKM
        });
      });
    });

    // Sort by date descending (terbaru di atas)
    return list.sort((a, b) => {
      const dateA = new Date(a.mutasi.tanggal || '').getTime() || 0;
      const dateB = new Date(b.mutasi.tanggal || '').getTime() || 0;
      return dateB - dateA;
    });
  }, [data, sktSkmVersion]);

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

  // Unique Jenis Mutasi filtered by selected Bahan (Komoditas) and Kode
  const jenisOptions = useMemo(() => {
    // If specific Bahan is selected
    if (filterKomoditas !== 'all') {
      const targetKomoditas = data.find(k => k.komoditas === filterKomoditas);
      const set = new Set<string>();
      if (targetKomoditas) {
        targetKomoditas.mutasiTerbaru.forEach(m => {
          if (m.jenisMutasi) {
            // Also filter by selected Kode if any
            if (filterKode === 'all' || m.kode === filterKode) {
              set.add(m.jenisMutasi);
            }
          }
        });
      }
      return Array.from(set).sort();
    }

    // If 'Semua Bahan' is selected, collect all unique mutasi across dataset
    const set = new Set<string>();
    allMutasi.forEach(e => {
      if (e.mutasi.jenisMutasi) {
        if (filterKode === 'all' || e.mutasi.kode === filterKode) {
          set.add(e.mutasi.jenisMutasi);
        }
      }
    });
    return Array.from(set).sort();
  }, [allMutasi, data, filterKomoditas, filterKode]);

  // Grouped Jenis Mutasi for categorized display when 'Semua Bahan' is selected
  const groupedJenisOptions = useMemo(() => {
    if (filterKomoditas !== 'all') return null;

    return data.map(k => {
      const set = new Set<string>();
      k.mutasiTerbaru.forEach(m => {
        if (m.jenisMutasi) {
          if (filterKode === 'all' || m.kode === filterKode) {
            set.add(m.jenisMutasi);
          }
        }
      });
      return {
        komoditas: k.komoditas,
        jenisList: Array.from(set).sort()
      };
    }).filter(g => g.jenisList.length > 0);
  }, [data, filterKomoditas, filterKode]);

  // Automatically reset filterJenis if it's no longer present in available jenisOptions
  React.useEffect(() => {
    if (filterJenis !== 'all' && !jenisOptions.includes(filterJenis)) {
      setFilterJenis('all');
    }
  }, [filterKomoditas, filterKode, jenisOptions, filterJenis]);

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

      // Filter Jalur Produksi
      if (filterProduksi !== 'all') {
        if (!GasService.isSktSkmActiveForKomoditas(e.komoditas)) {
          return false;
        }
        if (filterProduksi === 'SKT') {
          if (e.kategoriProduksi !== 'Murni SKT' && !(e.masukSKT && e.masukSKT > 0 && !e.masukSKM) && !(e.keluarSKT && e.keluarSKT > 0 && !e.keluarSKM)) {
            return false;
          }
        } else if (filterProduksi === 'SKM') {
          if (e.kategoriProduksi !== 'Murni SKM' && !(e.masukSKM && e.masukSKM > 0 && !e.masukSKT) && !(e.keluarSKM && e.keluarSKM > 0 && !e.keluarSKT)) {
            return false;
          }
        } else if (filterProduksi === 'Gabungan') {
          if (e.kategoriProduksi !== 'Gabungan') {
            return false;
          }
        }
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
  }, [allMutasi, filterKomoditas, filterKode, filterJenis, filterProduksi, filterHideZero, filterFrom, filterTo, searchQuery, sktSkmVersion]);

  // Totals for filtered data
  const totalMasuk = useMemo(() => {
    return filteredEntries.reduce((acc, curr) => acc + (curr.mutasi.masuk || 0), 0);
  }, [filteredEntries]);

  const totalKeluar = useMemo(() => {
    return filteredEntries.reduce((acc, curr) => acc + (curr.mutasi.keluar || 0), 0);
  }, [filteredEntries]);

  const totalMasukSKT = useMemo(() => {
    return filteredEntries.reduce((acc, curr) => {
      if (!GasService.isSktSkmActiveForKomoditas(curr.komoditas)) return acc;
      return acc + (curr.masukSKT || 0);
    }, 0);
  }, [filteredEntries, sktSkmVersion]);

  const totalKeluarSKT = useMemo(() => {
    return filteredEntries.reduce((acc, curr) => {
      if (!GasService.isSktSkmActiveForKomoditas(curr.komoditas)) return acc;
      return acc + (curr.keluarSKT || 0);
    }, 0);
  }, [filteredEntries, sktSkmVersion]);

  const totalMasukSKM = useMemo(() => {
    return filteredEntries.reduce((acc, curr) => {
      if (!GasService.isSktSkmActiveForKomoditas(curr.komoditas)) return acc;
      return acc + (curr.masukSKM || 0);
    }, 0);
  }, [filteredEntries, sktSkmVersion]);

  const totalKeluarSKM = useMemo(() => {
    return filteredEntries.reduce((acc, curr) => {
      if (!GasService.isSktSkmActiveForKomoditas(curr.komoditas)) return acc;
      return acc + (curr.keluarSKM || 0);
    }, 0);
  }, [filteredEntries, sktSkmVersion]);

  const countSKT = useMemo(() => {
    return allMutasi.filter(e => GasService.isSktSkmActiveForKomoditas(e.komoditas) && (e.kategoriProduksi === 'Murni SKT' || (e.masukSKT && e.masukSKT > 0 && !e.masukSKM) || (e.keluarSKT && e.keluarSKT > 0 && !e.keluarSKM))).length;
  }, [allMutasi, sktSkmVersion]);

  const countSKM = useMemo(() => {
    return allMutasi.filter(e => GasService.isSktSkmActiveForKomoditas(e.komoditas) && (e.kategoriProduksi === 'Murni SKM' || (e.masukSKM && e.masukSKM > 0 && !e.masukSKT) || (e.keluarSKM && e.keluarSKM > 0 && !e.keluarSKT))).length;
  }, [allMutasi, sktSkmVersion]);

  const countGabungan = useMemo(() => {
    return allMutasi.filter(e => GasService.isSktSkmActiveForKomoditas(e.komoditas) && e.kategoriProduksi === 'Gabungan').length;
  }, [allMutasi, sktSkmVersion]);

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
    const head: string[] = hasProduksiBreakdown 
      ? ['TANGGAL', 'BAHAN', 'KODE / GRADE', 'TIPE PRODUKSI', 'JENIS MUTASI', 'MASUK (KG)', 'KELUAR (KG)', 'CEK']
      : ['TANGGAL', 'BAHAN', 'KODE / GRADE', 'JENIS MUTASI', 'MASUK (KG)', 'KELUAR (KG)', 'CEK'];

    const body = filteredEntries.map(e => {
      const row = [
        formatTanggalIndo(e.mutasi.tanggal || ''),
        e.komoditas,
        e.mutasi.kode
      ];
      if (hasProduksiBreakdown) {
        row.push(GasService.isSktSkmActiveForKomoditas(e.komoditas) ? (e.kategoriProduksi || '—') : '—');
      }
      row.push(
        e.mutasi.jenisMutasi,
        e.mutasi.masuk ? `+${formatNumber(e.mutasi.masuk)}` : '-',
        e.mutasi.keluar ? `-${formatNumber(e.mutasi.keluar)}` : '-',
        e.mutasi.cek ? 'VALID' : 'PENDING'
      );
      return row;
    });

    exportToPdf({
      title: 'Laporan Mutasi Terkini Lintas Bahan',
      infoLines: [
        `Filter Bahan: ${filterKomoditas === 'all' ? 'Semua Bahan' : filterKomoditas} | Kode: ${filterKode === 'all' ? 'Semua Kode' : filterKode}${hasProduksiBreakdown ? ` | Jalur: ${filterProduksi}` : ''}`,
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

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsSktSkmModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300/80 transition-colors cursor-pointer"
            title="Pengaturan Fitur Jalur SKT & SKM per Bahan"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden sm:inline">Pengaturan Jalur SKT/SKM</span>
            <span className="sm:hidden">SKT/SKM</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={filteredEntries.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF Laporan</span>
          </button>
        </div>
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
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Jenis Mutasi
              </label>
              {filterKomoditas !== 'all' && (
                <span className="text-[9.5px] font-medium text-blue-600">
                  {filterKomoditas}
                </span>
              )}
            </div>
            <select
              value={filterJenis}
              onChange={e => setFilterJenis(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">
                {filterKomoditas === 'all' 
                  ? 'Semua Jenis Mutasi' 
                  : `Semua Mutasi (${filterKomoditas})`}
              </option>
              {filterKomoditas === 'all' && groupedJenisOptions ? (
                groupedJenisOptions.map(group => (
                  <optgroup key={group.komoditas} label={group.komoditas}>
                    {group.jenisList.map(j => (
                      <option key={`${group.komoditas}-${j}`} value={j}>
                        {j}
                      </option>
                    ))}
                  </optgroup>
                ))
              ) : (
                jenisOptions.map(j => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))
              )}
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
              Semua ({allMutasi.length})
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

        {hasProduksiBreakdown ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-semibold uppercase text-slate-500 block">
                Jumlah Entri
              </span>
              <span className="text-sm sm:text-base font-bold text-slate-900 font-mono tabular-nums leading-tight">
                {filteredEntries.length}
              </span>
            </div>

            <div className="bg-white px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50/20 shadow-2xs">
              <span className="text-[10px] font-semibold uppercase text-amber-700 block flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Mutasi SKT (Tangan)
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xs sm:text-sm font-bold text-emerald-700 font-mono tabular-nums">
                  +{formatNumber(totalMasukSKT)}
                </span>
                <span className="text-xs sm:text-sm font-bold text-rose-700 font-mono tabular-nums">
                  -{formatNumber(totalKeluarSKT)}
                </span>
              </div>
            </div>

            <div className="bg-white px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50/20 shadow-2xs">
              <span className="text-[10px] font-semibold uppercase text-blue-700 block flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                Mutasi SKM (Mesin)
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xs sm:text-sm font-bold text-emerald-700 font-mono tabular-nums">
                  +{formatNumber(totalMasukSKM)}
                </span>
                <span className="text-xs sm:text-sm font-bold text-rose-700 font-mono tabular-nums">
                  -{formatNumber(totalKeluarSKM)}
                </span>
              </div>
            </div>

            <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-semibold uppercase text-slate-500 block">
                Total Akumulasi
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xs sm:text-sm font-bold text-emerald-700 font-mono tabular-nums">
                  +{formatNumber(totalMasuk)}
                </span>
                <span className="text-xs sm:text-sm font-bold text-rose-700 font-mono tabular-nums">
                  -{formatNumber(totalKeluar)}
                </span>
              </div>
            </div>
          </div>
        ) : (
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
        )}
      </div>

      {/* Table Data - Compact Row Density */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/90 border-b border-slate-200 text-[10.5px] font-semibold text-slate-600 uppercase tracking-wider">
              <th className="py-2 px-3 sm:px-4">Tanggal</th>
              <th className="py-2 px-3 sm:px-4">Bahan</th>
              <th className="py-2 px-3 sm:px-4">Kode / Grade</th>
              {hasProduksiBreakdown && <th className="py-2 px-3 sm:px-4">Tipe Produksi</th>}
              <th className="py-2 px-3 sm:px-4">Jenis Mutasi</th>
              <th className="py-2 px-3 sm:px-4 text-right">Masuk (Kg)</th>
              <th className="py-2 px-3 sm:px-4 text-right">Keluar (Kg)</th>
              <th className="py-2 px-3 sm:px-4 text-center">Cek</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={hasProduksiBreakdown ? 8 : 7} className="py-8 text-center text-slate-400">
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
                      {formatTanggalIndo(m.tanggal || '')}
                    </td>
                    <td className="py-1.5 px-3 sm:px-4 whitespace-nowrap text-slate-600">
                      {e.komoditas}
                    </td>
                    <td className="py-1.5 px-3 sm:px-4 whitespace-nowrap font-bold text-slate-900">
                      {m.kode}
                    </td>
                    {hasProduksiBreakdown && (
                      <td className="py-1.5 px-3 sm:px-4 whitespace-nowrap">
                        {GasService.isSktSkmActiveForKomoditas(e.komoditas) && e.kategoriProduksi === 'Murni SKT' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Murni SKT
                          </span>
                        ) : GasService.isSktSkmActiveForKomoditas(e.komoditas) && e.kategoriProduksi === 'Murni SKM' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Murni SKM
                          </span>
                        ) : GasService.isSktSkmActiveForKomoditas(e.komoditas) && e.kategoriProduksi === 'Gabungan' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                            Gabungan
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                    )}
                    <td className="py-1.5 px-3 sm:px-4 whitespace-nowrap text-slate-600">
                      {m.jenisMutasi}
                    </td>
                    <td className="py-1.5 px-3 sm:px-4 whitespace-nowrap text-right font-mono tabular-nums">
                      <div className="font-semibold text-emerald-700">
                        {m.masuk ? `+${formatNumber(m.masuk)}` : '—'}
                      </div>
                      {hasProduksiBreakdown && GasService.isSktSkmActiveForKomoditas(e.komoditas) && (e.masukSKT !== undefined || e.masukSKM !== undefined) && (m.masuk || 0) > 0 && (
                        <div className="text-[9.5px] text-slate-500 font-mono tracking-tight flex items-center justify-end gap-1 mt-0.5">
                          {e.masukSKT !== undefined && e.masukSKT > 0 && (
                            <span className="text-amber-800 bg-amber-50/90 px-1 py-0.2 rounded border border-amber-200/60 font-medium">
                              SKT: +{formatNumber(e.masukSKT)}
                            </span>
                          )}
                          {e.masukSKM !== undefined && e.masukSKM > 0 && (
                            <span className="text-blue-800 bg-blue-50/90 px-1 py-0.2 rounded border border-blue-200/60 font-medium">
                              SKM: +{formatNumber(e.masukSKM)}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 px-3 sm:px-4 whitespace-nowrap text-right font-mono tabular-nums">
                      <div className="font-semibold text-rose-700">
                        {m.keluar ? `-${formatNumber(m.keluar)}` : '—'}
                      </div>
                      {hasProduksiBreakdown && GasService.isSktSkmActiveForKomoditas(e.komoditas) && (e.keluarSKT !== undefined || e.keluarSKM !== undefined) && (m.keluar || 0) > 0 && (
                        <div className="text-[9.5px] text-slate-500 font-mono tracking-tight flex items-center justify-end gap-1 mt-0.5">
                          {e.keluarSKT !== undefined && e.keluarSKT > 0 && (
                            <span className="text-amber-800 bg-amber-50/90 px-1 py-0.2 rounded border border-amber-200/60 font-medium">
                              SKT: -{formatNumber(e.keluarSKT)}
                            </span>
                          )}
                          {e.keluarSKM !== undefined && e.keluarSKM > 0 && (
                            <span className="text-blue-800 bg-blue-50/90 px-1 py-0.2 rounded border border-blue-200/60 font-medium">
                              SKM: -{formatNumber(e.keluarSKM)}
                            </span>
                          )}
                        </div>
                      )}
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

      {/* SktSkmSettingsModal for toggling SKT/SKM */}
      <SktSkmSettingsModal
        isOpen={isSktSkmModalOpen}
        onClose={() => setIsSktSkmModalOpen(false)}
      />
    </div>
  );
};
