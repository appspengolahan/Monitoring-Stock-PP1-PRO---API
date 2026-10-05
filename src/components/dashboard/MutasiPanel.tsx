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
  Sliders,
  PlusCircle,
  Tag,
  Scale,
  X
} from 'lucide-react';
import { exportToPdf } from '../../services/pdfExport';
import { GasService } from '../../services/gasService';
import { SktSkmSettingsModal } from '../modals/SktSkmSettingsModal';
import { KelolaJenisMutasiModal } from '../modals/KelolaJenisMutasiModal';

interface MutasiPanelProps {
  data: KomoditasData[];
  onToggleCek: (komoditasName: string, mutasiId: string, currentStatus: boolean) => void;
  initialCommodity?: string;
}

interface FlattenedMutasi {
  id: string;
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
  const [showSummary, setShowSummary] = useState<boolean>(true);
  const [isSktSkmModalOpen, setIsSktSkmModalOpen] = useState<boolean>(false);
  const [sktSkmVersion, setSktSkmVersion] = useState<number>(0);
  const [isKelolaJenisModalOpen, setIsKelolaJenisModalOpen] = useState<boolean>(false);
  const [customJenisVersion, setCustomJenisVersion] = useState<number>(0);
  const [mutasiTags, setMutasiTags] = useState<Record<string, string>>(() => GasService.getMutasiTagsMap());
  const [activeTagDropdownKey, setActiveTagDropdownKey] = useState<string | null>(null);

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

  // Listen to Custom Jenis Mutasi updates
  useEffect(() => {
    const handleCustomChange = () => setCustomJenisVersion(v => v + 1);
    window.addEventListener('stockpp1_custom_jenis_mutasi_changed', handleCustomChange);
    return () => window.removeEventListener('stockpp1_custom_jenis_mutasi_changed', handleCustomChange);
  }, []);

  // Listen to Mutasi custom tags updates
  useEffect(() => {
    const handleTagsChange = () => setMutasiTags(GasService.getMutasiTagsMap());
    window.addEventListener('stockpp1_mutasi_tags_changed', handleTagsChange);
    return () => window.removeEventListener('stockpp1_mutasi_tags_changed', handleTagsChange);
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

        const rowId = m.id || `${k.komoditas}_${m.tanggal || ''}_${m.kode}_${m.masuk || 0}_${m.keluar || 0}_${list.length}`;
        list.push({
          id: rowId,
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

  // Custom mutation types list filtered by active commodity (exclude BSPP since it has dedicated group)
  const customJenisList = useMemo(() => {
    const list = GasService.getCustomJenisMutasiList().filter(c => c.nama.toUpperCase() !== 'BSPP');
    if (filterKomoditas === 'all') return list;
    return list.filter(c => c.komoditas === 'all' || c.komoditas === filterKomoditas);
  }, [filterKomoditas, customJenisVersion]);

  // All unique original mutation types from the raw Google Sheets
  const originalJenisList = useMemo(() => {
    const set = new Set<string>();
    data.forEach(k => {
      k.mutasiTerbaru.forEach(m => {
        if (m.jenisMutasi) set.add(m.jenisMutasi);
      });
    });
    return Array.from(set).sort();
  }, [data]);

  // Unique Jenis Mutasi filtered by selected Bahan (Komoditas) and Kode (excluding BSPP which has dedicated group)
  const jenisOptions = useMemo(() => {
    const isBsppName = (name: string) => name.toUpperCase().includes('BSPP');

    // If specific Bahan is selected
    if (filterKomoditas !== 'all') {
      const targetKomoditas = data.find(k => k.komoditas === filterKomoditas);
      const set = new Set<string>();
      if (targetKomoditas) {
        targetKomoditas.mutasiTerbaru.forEach(m => {
          if (m.jenisMutasi && !isBsppName(m.jenisMutasi)) {
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
      if (e.mutasi.jenisMutasi && !isBsppName(e.mutasi.jenisMutasi)) {
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
    const isBsppName = (name: string) => name.toUpperCase().includes('BSPP');

    return data.map(k => {
      const set = new Set<string>();
      k.mutasiTerbaru.forEach(m => {
        if (m.jenisMutasi && !isBsppName(m.jenisMutasi)) {
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

  // Automatically reset filterJenis if it's no longer present in available options, custom list, or BSPP special options
  useEffect(() => {
    if (filterJenis !== 'all') {
      const inOriginal = jenisOptions.includes(filterJenis);
      const inCustom = customJenisList.some(c => c.nama === filterJenis);
      const isBsppSpecial = ['BSPP', 'BSPP Lebih', 'BSPP Kurang'].includes(filterJenis);
      if (!inOriginal && !inCustom && !isBsppSpecial) {
        setFilterJenis('all');
      }
    }
  }, [filterKomoditas, filterKode, jenisOptions, customJenisList, filterJenis]);

  // Counts for BSPP mutation categories
  const countBSPP = useMemo(() => {
    return allMutasi.filter(e => {
      if (filterKomoditas !== 'all' && e.komoditas !== filterKomoditas) return false;
      const jUpper = (e.mutasi.jenisMutasi || '').toUpperCase();
      const tagUpper = (mutasiTags[e.id] || '').toUpperCase();
      return jUpper.includes('BSPP') || tagUpper.includes('BSPP');
    }).length;
  }, [allMutasi, filterKomoditas, mutasiTags]);

  const countBSPPLebih = useMemo(() => {
    return allMutasi.filter(e => {
      if (filterKomoditas !== 'all' && e.komoditas !== filterKomoditas) return false;
      const jUpper = (e.mutasi.jenisMutasi || '').toUpperCase();
      const tagUpper = (mutasiTags[e.id] || '').toUpperCase();
      if (tagUpper === 'BSPP LEBIH') return true;
      return jUpper.includes('BSPP') && (jUpper.includes('LEBIH') || ((e.mutasi.masuk || 0) > 0 && !(e.mutasi.keluar || 0)));
    }).length;
  }, [allMutasi, filterKomoditas, mutasiTags]);

  const countBSPPKurang = useMemo(() => {
    return allMutasi.filter(e => {
      if (filterKomoditas !== 'all' && e.komoditas !== filterKomoditas) return false;
      const jUpper = (e.mutasi.jenisMutasi || '').toUpperCase();
      const tagUpper = (mutasiTags[e.id] || '').toUpperCase();
      if (tagUpper === 'BSPP KURANG') return true;
      return jUpper.includes('BSPP') && (jUpper.includes('KURANG') || ((e.mutasi.keluar || 0) > 0 && !(e.mutasi.masuk || 0)));
    }).length;
  }, [allMutasi, filterKomoditas, mutasiTags]);

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

      // Filter Jenis Mutasi (Original Sheet, Custom Web Type, or BSPP Special)
      if (filterJenis !== 'all') {
        const userTag = mutasiTags[e.id];
        const fUpper = filterJenis.trim().toUpperCase();
        const jUpper = (m.jenisMutasi || '').trim().toUpperCase();
        const tagUpper = (userTag || '').trim().toUpperCase();

        // 1. Special Case: BSPP (menampilkan jenis yang nilainya plus DAN minus)
        if (fUpper === 'BSPP' || fUpper === 'BSPP (SEMUA)') {
          const isBspp = jUpper.includes('BSPP') || tagUpper.includes('BSPP');
          if (!isBspp) return false;
        }
        // 2. Special Case: BSPP LEBIH (menampilkan jenis yang nilainya plus / masuk)
        else if (fUpper === 'BSPP LEBIH' || (fUpper.includes('BSPP') && fUpper.includes('LEBIH'))) {
          const matchTag = tagUpper === 'BSPP LEBIH' || tagUpper.includes('LEBIH');
          const matchSheet = jUpper.includes('BSPP') && (jUpper.includes('LEBIH') || ((m.masuk || 0) > 0 && !(m.keluar || 0)));
          if (!matchTag && !matchSheet) return false;
        }
        // 3. Special Case: BSPP KURANG (menampilkan jenis yang nilainya minus / keluar)
        else if (fUpper === 'BSPP KURANG' || (fUpper.includes('BSPP') && (fUpper.includes('KURANG') || fUpper.includes('SUSUT')))) {
          const matchTag = tagUpper === 'BSPP KURANG' || tagUpper.includes('KURANG');
          const matchSheet = jUpper.includes('BSPP') && (jUpper.includes('KURANG') || ((m.keluar || 0) > 0 && !(m.masuk || 0)));
          if (!matchTag && !matchSheet) return false;
        }
        // 4. Custom & Sheet general matching
        else {
          if (userTag === filterJenis) {
            // Perfectly matched by custom web tag!
          } else {
            const isCustomSelected = customJenisList.some(c => c.nama === filterJenis);
            if (isCustomSelected) {
              const targetCustom = customJenisList.find(c => c.nama === filterJenis);
              const q = (targetCustom?.nama || filterJenis).toLowerCase();
              const matchDirect = m.jenisMutasi === filterJenis;
              const matchPartial = (m.jenisMutasi || '').toLowerCase().includes(q) || (m.kode || '').toLowerCase().includes(q);
              if (!matchDirect && !matchPartial) {
                return false;
              }
            } else {
              if (m.jenisMutasi !== filterJenis && userTag !== filterJenis) {
                return false;
              }
            }
          }
        }
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
  }, [allMutasi, filterKomoditas, filterKode, filterJenis, filterProduksi, filterHideZero, filterFrom, filterTo, searchQuery, sktSkmVersion, mutasiTags]);

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
        `Jenis Mutasi: ${filterJenis === 'all' ? 'Semua Jenis' : filterJenis === 'BSPP' ? 'BSPP (Semua: Nilai Plus & Minus)' : filterJenis === 'BSPP Lebih' ? 'BSPP Lebih (Nilai Plus +)' : filterJenis === 'BSPP Kurang' ? 'BSPP Kurang (Nilai Minus -)' : filterJenis} | Periode: ${filterFrom || 'Awal'} s/d ${filterTo || 'Sekarang'}`,
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 transition-colors shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF Laporan</span>
          </button>
        </div>
      </div>

      {/* 1. Tab Navigasi Bahan Baku (Pemisahan per Komoditas agar data terorganisir & tidak tercampur aduk) */}
      <div className="bg-slate-100/90 border-b border-slate-200 px-3 sm:px-5 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1 hidden md:inline">
          Pilih Bahan:
        </span>
        <button
          type="button"
          onClick={() => {
            setFilterKomoditas('all');
            setFilterKode('all');
            setFilterJenis('all');
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            filterKomoditas === 'all'
              ? 'bg-blue-600 text-white shadow-xs font-bold'
              : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Semua Bahan</span>
          <span className={`text-[10.5px] px-1.5 py-0.2 rounded-full font-mono ${
            filterKomoditas === 'all' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {allMutasi.length}
          </span>
        </button>

        {data.map(k => {
          const isSelected = filterKomoditas === k.komoditas;
          const count = k.mutasiTerbaru.length;
          return (
            <button
              key={k.komoditas}
              type="button"
              onClick={() => {
                setFilterKomoditas(k.komoditas);
                setFilterKode('all');
                setFilterJenis('all');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
              }`}
            >
              <span>{k.komoditas}</span>
              <span className={`text-[10.5px] px-1.5 py-0.2 rounded-full font-mono ${
                isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Filter Controls Bar - Compact & Efisien */}
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
              <option value="all">Semua Bahan ({allMutasi.length})</option>
              {data.map(k => (
                <option key={k.komoditas} value={k.komoditas}>
                  {k.komoditas} ({k.mutasiTerbaru.length})
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

          {/* Jenis Mutasi Filter (Bawaan Sheet + BSPP Saja, Jenis Tambahan Web App Disembunyikan) */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
              Jenis Mutasi
            </label>
            <select
              value={filterJenis}
              onChange={e => setFilterJenis(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
            >
              <option value="all">
                {filterKomoditas === 'all' 
                  ? 'Semua Jenis Mutasi' 
                  : `Semua Mutasi (${filterKomoditas})`}
              </option>

              {/* Opsi Khusus BSPP (Bukti Selisih Persediaan) */}
              <optgroup label="⚖️ Mutasi BSPP (Selisih Timbangan)">
                <option value="BSPP">
                  ⚖️ BSPP (Semua: Nilai Plus &amp; Minus) {countBSPP > 0 ? `(${countBSPP})` : ''}
                </option>
                <option value="BSPP Lebih">
                  ➕ BSPP Lebih (Hanya Nilai Plus / Masuk) {countBSPPLebih > 0 ? `(${countBSPPLebih})` : ''}
                </option>
                <option value="BSPP Kurang">
                  ➖ BSPP Kurang (Hanya Nilai Minus / Keluar) {countBSPPKurang > 0 ? `(${countBSPPKurang})` : ''}
                </option>
              </optgroup>
              
              {/* Opsi Asli dari Google Spreadsheet */}
              {filterKomoditas === 'all' && groupedJenisOptions ? (
                groupedJenisOptions.map(group => (
                  <optgroup key={group.komoditas} label={`📋 Sheet ${group.komoditas}`}>
                    {group.jenisList.map(j => (
                      <option key={`${group.komoditas}-${j}`} value={j}>
                        {j}
                      </option>
                    ))}
                  </optgroup>
                ))
              ) : (
                <optgroup label={filterKomoditas === 'all' ? "📋 Bawaan Sheet Asli" : `📋 Sheet Asli (${filterKomoditas})`}>
                  {jenisOptions.map(j => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </optgroup>
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

        {/* Baris 2: Rentang Tanggal, Jalur Produksi Compact, dan Aksi Utilitas */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200/70">
          <div className="flex flex-wrap items-center gap-2">
            {/* Rentang Tanggal */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="date"
                value={filterFrom}
                onChange={e => setFilterFrom(e.target.value)}
                className="text-xs text-slate-700 bg-transparent focus:outline-hidden"
                title="Dari tanggal"
              />
              <span className="text-[11px] text-slate-400">s/d</span>
              <input
                type="date"
                value={filterTo}
                onChange={e => setFilterTo(e.target.value)}
                className="text-xs text-slate-700 bg-transparent focus:outline-hidden"
                title="Sampai tanggal"
              />
              {(filterFrom || filterTo) && (
                <button
                  type="button"
                  onClick={() => { setFilterFrom(''); setFilterTo(''); }}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-bold ml-1 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Jalur Produksi compact pills if dual breakdown is active */}
            {hasProduksiBreakdown && (
              <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setFilterProduksi('all')}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    filterProduksi === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({allMutasi.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterProduksi('SKT')}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    filterProduksi === 'SKT' ? 'bg-amber-600 text-white shadow-2xs font-bold' : 'text-amber-800 hover:text-amber-900'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  SKT ({countSKT})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterProduksi('SKM')}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    filterProduksi === 'SKM' ? 'bg-blue-600 text-white shadow-2xs font-bold' : 'text-blue-800 hover:text-blue-900'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  SKM ({countSKM})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterProduksi('Gabungan')}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    filterProduksi === 'Gabungan' ? 'bg-purple-600 text-white shadow-2xs font-bold' : 'text-purple-800 hover:text-purple-900'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                  Gabungan ({countGabungan})
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filterHideZero}
                onChange={e => setFilterHideZero(e.target.checked)}
                className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
              />
              <span className="text-[11px]">Sembunyikan nilai 0</span>
            </label>

            {/* Toggle Summary Bar */}
            <button
              type="button"
              onClick={() => setShowSummary(prev => !prev)}
              className="text-[11px] text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded-md font-medium cursor-pointer shadow-2xs"
            >
              {showSummary ? 'Sembunyikan Ringkasan' : 'Tampilkan Ringkasan'}
            </button>

            {/* Reset All Filters button if any filter is active */}
            {(filterKomoditas !== 'all' || filterKode !== 'all' || filterJenis !== 'all' || filterProduksi !== 'all' || filterFrom || filterTo || searchQuery || filterHideZero) && (
              <button
                type="button"
                onClick={() => {
                  setFilterKomoditas('all');
                  setFilterKode('all');
                  setFilterJenis('all');
                  setFilterProduksi('all');
                  setFilterFrom('');
                  setFilterTo('');
                  setSearchQuery('');
                  setFilterHideZero(false);
                }}
                className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold cursor-pointer underline"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Summary Box (Streamlined Compact & Collapsible) */}
      {showSummary && (
        <div className="px-4 py-2 sm:px-5 sm:py-2.5 bg-blue-50/50 border-b border-slate-200 animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-blue-900 tracking-tight">
                Ringkasan Filter Aktif
              </span>
              {filterJenis === 'BSPP' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-2xs">
                  ⚖️ Mode BSPP (Menampilkan Nilai Plus [+] &amp; Minus [-])
                </span>
              )}
              {filterJenis === 'BSPP Lebih' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                  ➕ Mode BSPP Lebih (Hanya Nilai Plus [+])
                </span>
              )}
              {filterJenis === 'BSPP Kurang' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-100 text-rose-800 border border-rose-200 shadow-2xs">
                  ➖ Mode BSPP Kurang (Hanya Nilai Minus [-])
                </span>
              )}
            </div>
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
      )}

      {/* 4. Table Data - Compact Row Density with Full Width & Horizontal Scroll */}
      <div className="overflow-x-auto w-full border-t border-slate-200">
        <table className="w-full text-left border-collapse min-w-[960px]">
          <thead>
            <tr className="bg-slate-100/90 border-b border-slate-200 text-[10.5px] font-semibold text-slate-600 uppercase tracking-wider sticky top-0 z-10">
              <th className="py-2 px-3 sm:px-4 w-28 whitespace-nowrap">Tanggal</th>
              <th className="py-2 px-3 sm:px-4 w-40 whitespace-nowrap">Bahan</th>
              <th className="py-2 px-3 sm:px-4 min-w-[130px] whitespace-nowrap">Kode / Grade</th>
              {hasProduksiBreakdown && <th className="py-2 px-3 sm:px-4 w-28 whitespace-nowrap">Tipe Produksi</th>}
              <th className="py-2 px-3 sm:px-4 min-w-[150px] whitespace-nowrap">Jenis Mutasi</th>
              <th className="py-2 px-3 sm:px-4 text-right w-32 whitespace-nowrap">Masuk (Kg)</th>
              <th className="py-2 px-3 sm:px-4 text-right w-32 whitespace-nowrap">Keluar (Kg)</th>
              <th className="py-2 px-3 sm:px-4 text-center w-20 whitespace-nowrap pr-6 sm:pr-8">Cek</th>
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
                    <td className="py-1.5 px-3 sm:px-4 whitespace-nowrap text-slate-600 font-medium">
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
                    <td className="py-1.5 px-3 sm:px-4 whitespace-nowrap text-slate-700">
                      <span className="font-medium text-slate-800 text-xs">
                        {m.jenisMutasi || '—'}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 sm:px-4 whitespace-nowrap text-right font-mono tabular-nums w-32">
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
                    <td className="py-1.5 px-3 sm:px-4 whitespace-nowrap text-right font-mono tabular-nums w-32">
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
                    <td className="py-1.5 px-3 sm:px-4 text-center whitespace-nowrap w-20 pr-6 sm:pr-8">
                      <button
                        onClick={() => onToggleCek(e.komoditas, m.id || `${e.komoditas}-${index}`, m.cek)}
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-md transition-all cursor-pointer ${
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

      {/* KelolaJenisMutasiModal (Hanya dibuka jika dipanggil) */}
      {isKelolaJenisModalOpen && (
        <KelolaJenisMutasiModal
          isOpen={isKelolaJenisModalOpen}
          onClose={() => setIsKelolaJenisModalOpen(false)}
          originalJenisList={originalJenisList}
          komoditasList={data.map(k => k.komoditas)}
        />
      )}
    </div>
  );
};
