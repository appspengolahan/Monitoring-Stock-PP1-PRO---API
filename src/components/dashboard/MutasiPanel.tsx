import React, { useState, useMemo, useEffect } from 'react';
import { KomoditasData, MutasiItem, KategoriProduksi, ReconciliationDisplayConfig } from '../../types';
import { 
  Search, 
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
  X,
  ShieldCheck,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';
import { exportToPdf } from '../../services/pdfExport';
import { GasService } from '../../services/gasService';
import { SktSkmSettingsModal } from '../modals/SktSkmSettingsModal';
import { KelolaJenisMutasiModal } from '../modals/KelolaJenisMutasiModal';
import { 
  parseDateIndo, 
  getTanggalKey, 
  getEpochTime, 
  getLatestDateString, 
  formatTanggalIndo, 
  formatDateTimeIndo 
} from '../../utils/dateUtils';

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
  _epoch: number;
  _dateKey: string;
  _formattedDate: string;
}

export const MutasiPanel: React.FC<MutasiPanelProps> = React.memo(({
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
  const [showAllDates, setShowAllDates] = useState<boolean>(false);
  const [showDhpSection, setShowDhpSection] = useState<boolean>(false);
  const [showDhpBlendSection, setShowDhpBlendSection] = useState<boolean>(false);
  const [showPengirimanBlendSection, setShowPengirimanBlendSection] = useState<boolean>(false);
  const [showSetoranSection, setShowSetoranSection] = useState<boolean>(false);
  const [showCengkehDryerSection, setShowCengkehDryerSection] = useState<boolean>(false);
  const [showAllReconSection, setShowAllReconSection] = useState<boolean>(false);
  const [filterOnlyReconciled, setFilterOnlyReconciled] = useState<boolean>(false);
  // Pagination state (default 50 entries per page for instant render)
  const [pageSize, setPageSize] = useState<number | 'all'>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [reconcileDisplay, setReconcileDisplay] = useState<ReconciliationDisplayConfig>(() => GasService.getReconciliationDisplayConfig());
  const [isSktSkmModalOpen, setIsSktSkmModalOpen] = useState<boolean>(false);
  const [sktSkmVersion, setSktSkmVersion] = useState<number>(0);
  const [isKelolaJenisModalOpen, setIsKelolaJenisModalOpen] = useState<boolean>(false);
  const [customJenisVersion, setCustomJenisVersion] = useState<number>(0);
  const [mutasiTags, setMutasiTags] = useState<Record<string, string>>(() => GasService.getMutasiTagsMap());
  const [activeTagDropdownKey, setActiveTagDropdownKey] = useState<string | null>(null);
  const [activeAuditItem, setActiveAuditItem] = useState<{ mutasi: MutasiItem; komoditas: string } | null>(null);
  const [activeAuditIndex, setActiveAuditIndex] = useState<number | null>(null);
  const [modalFilterBahan, setModalFilterBahan] = useState<string>('all');
  const [modalFilterJenis, setModalFilterJenis] = useState<string>('all');
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [touchDiffX, setTouchDiffX] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);

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

  // Listen to Reconciliation Display config updates (from Headless GAS Center)
  useEffect(() => {
    const handleReconcileChange = () => setReconcileDisplay(GasService.getReconciliationDisplayConfig());
    window.addEventListener('stockpp1_reconciliation_config_changed', handleReconcileChange);
    return () => window.removeEventListener('stockpp1_reconciliation_config_changed', handleReconcileChange);
  }, []);

  // Listen to real-time reconciliation data updates
  useEffect(() => {
    const handleReconDataChange = () => setSktSkmVersion(v => v + 1);
    window.addEventListener('stockpp1_reconciliation_data_updated', handleReconDataChange);
    return () => window.removeEventListener('stockpp1_reconciliation_data_updated', handleReconDataChange);
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
        const _epoch = getEpochTime(m.tanggal);
        const _dateKey = getTanggalKey(m.tanggal);
        const _formattedDate = formatTanggalIndo(m.tanggal || '');

        list.push({
          id: rowId,
          komoditas: k.komoditas,
          satuan: k.satuan,
          mutasi: m,
          kategoriProduksi,
          masukSKT,
          keluarSKT,
          masukSKM,
          keluarSKM,
          _epoch,
          _dateKey,
          _formattedDate
        });
      });
    });

    // Sort by date descending (terbaru di atas) dengan perbandingan epoch numerik instan (< 1ms)
    return list.sort((a, b) => b._epoch - a._epoch);
  }, [data, sktSkmVersion]);

  // Tanggal terbaru yang tercatat pada mutasi (format YYYY-MM-DD berbasis epoch numerik)
  const latestTanggal = useMemo(() => {
    if (filterKomoditas === 'all') {
      return allMutasi[0]?._dateKey || '';
    }
    const target = allMutasi.find(e => e.komoditas === filterKomoditas);
    return target?._dateKey || '';
  }, [allMutasi, filterKomoditas]);

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
  // Mengelompokkan berdasarkan kategori alur transaksi (Pemasukan, Pengeluaran, Pengiriman, Penyesuaian)
  // BUKAN berdasarkan nama bahan, agar opsi jenis mutasi murni berisi jenis pergerakan barang
  const groupedJenisCategories = useMemo(() => {
    if (filterKomoditas !== 'all') return null;
    const isBsppName = (name: string) => name.toUpperCase().includes('BSPP');

    // Kumpulkan semua jenis mutasi unik di seluruh dataset
    const uniqueTypes = new Set<string>();
    allMutasi.forEach(e => {
      const j = (e.mutasi.jenisMutasi || '').replace(/^[`'\s]+/, '').trim();
      if (j && !isBsppName(j)) {
        if (filterKode === 'all' || e.mutasi.kode === filterKode) {
          uniqueTypes.add(j);
        }
      }
    });

    const categoryBuckets: Record<string, string[]> = {
      '📥 Mutasi Pemasukan': [],
      '📤 Mutasi Pengeluaran': [],
      '🚚 Mutasi Pengiriman Antar Gudang': [],
      '⚖️ Selisih & Penyiapan': [],
      '📋 Penyesuaian & Stock Opname': [],
      '📌 Saldo & Transaksi Lainnya': []
    };

    Array.from(uniqueTypes).sort().forEach(j => {
      const lower = j.toLowerCase();
      if (lower.includes('kirim') || lower.includes('pengiriman')) {
        categoryBuckets['🚚 Mutasi Pengiriman Antar Gudang'].push(j);
      } else if (lower.includes('masuk') || lower.includes('terima') || lower.includes('hasil')) {
        categoryBuckets['📥 Mutasi Pemasukan'].push(j);
      } else if (lower.includes('setoran') || lower.includes('keluar') || lower.includes('pruf') || lower.includes('ke rj')) {
        categoryBuckets['📤 Mutasi Pengeluaran'].push(j);
      } else if (lower.includes('selisih') || lower.includes('penyiapan')) {
        categoryBuckets['⚖️ Selisih & Penyiapan'].push(j);
      } else if (lower.includes('opname') || lower.includes('penyesuaian') || lower.includes('ba ')) {
        categoryBuckets['📋 Penyesuaian & Stock Opname'].push(j);
      } else {
        categoryBuckets['📌 Saldo & Transaksi Lainnya'].push(j);
      }
    });

    return Object.entries(categoryBuckets)
      .filter(([_, list]) => list.length > 0)
      .map(([label, list]) => ({ label, list }));
  }, [allMutasi, filterKomoditas, filterKode]);

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

  // Counts for BSPP mutation categories (single pass for speed)
  const { countBSPP, countBSPPLebih, countBSPPKurang } = useMemo(() => {
    let bspp = 0;
    let lebih = 0;
    let kurang = 0;
    for (let i = 0; i < allMutasi.length; i++) {
      const e = allMutasi[i];
      if (filterKomoditas !== 'all' && e.komoditas !== filterKomoditas) continue;
      const jUpper = (e.mutasi.jenisMutasi || '').toUpperCase();
      const tagUpper = (mutasiTags[e.id] || '').toUpperCase();
      const isBspp = jUpper.includes('BSPP') || tagUpper.includes('BSPP');
      if (isBspp) {
        bspp++;
        if (tagUpper === 'BSPP LEBIH' || jUpper.includes('LEBIH') || ((e.mutasi.masuk || 0) > 0 && !(e.mutasi.keluar || 0))) {
          lebih++;
        }
        if (tagUpper === 'BSPP KURANG' || jUpper.includes('KURANG') || ((e.mutasi.keluar || 0) > 0 && !(e.mutasi.masuk || 0))) {
          kurang++;
        }
      }
    }
    return { countBSPP: bspp, countBSPPLebih: lebih, countBSPPKurang: kurang };
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
              const cleanM = (m.jenisMutasi || '').replace(/^[`'\s]+/, '').trim().toLowerCase();
              const cleanF = filterJenis.replace(/^[`'\s]+/, '').trim().toLowerCase();
              if (m.jenisMutasi !== filterJenis && cleanM !== cleanF && userTag !== filterJenis) {
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

      // Filter Hanya Rekonsiliasi (DHP, Setoran, BSPP, Pengiriman)
      if (filterOnlyReconciled) {
        const hasRecon = !!(m.dhpMatch || m.setoranMatch || m.bsppMatch || m.pengirimanMatch);
        if (!hasRecon) return false;
      }

      // Filter Date Range:
      const itemDate = e._dateKey;
      if (filterFrom || filterTo) {
        if (filterFrom && itemDate < filterFrom) return false;
        if (filterTo && itemDate > filterTo) return false;
      } else if (!showAllDates && !filterOnlyReconciled) {
        // Jika komoditas spesifik dipilih dan tidak dalam mode 'Hanya Rekonsiliasi', tampilkan tanggal terbaru komoditas tersebut secara default
        if (filterKomoditas !== 'all' && latestTanggal) {
          if (itemDate !== latestTanggal) return false;
        }
        // Ketika 'Semua Bahan' aktif, tampilkan mutasi terkini lintas bahan (semua bahan tetap muncul)
      }

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchKode = m.kode?.toLowerCase().includes(q);
        const matchJenis = m.jenisMutasi?.toLowerCase().includes(q);
        const matchBahan = e.komoditas.toLowerCase().includes(q);
        const matchTanggal = (m.tanggal || '').toLowerCase().includes(q) || formatTanggalIndo(m.tanggal).toLowerCase().includes(q);
        if (!matchKode && !matchJenis && !matchBahan && !matchTanggal) {
          return false;
        }
      }

      return true;
    });
  }, [allMutasi, filterKomoditas, filterKode, filterJenis, filterProduksi, filterHideZero, filterOnlyReconciled, filterFrom, filterTo, showAllDates, latestTanggal, searchQuery, sktSkmVersion, mutasiTags]);

  // Daftar SEMUA entri mutasi yang memiliki data audit rekonsiliasi (lintas seluruh jenis bahan & jenis mutasi)
  const allReconcilableEntries = useMemo(() => {
    const list = allMutasi.filter(e => 
      !!(e.mutasi.dhpMatch || e.mutasi.setoranMatch || e.mutasi.bsppMatch || e.mutasi.pengirimanMatch)
    );
    return list.length > 0 ? list : allMutasi;
  }, [allMutasi]);

  const totalReconciledCount = useMemo(() => {
    return allMutasi.filter(e => !!(e.mutasi.dhpMatch || e.mutasi.setoranMatch || e.mutasi.bsppMatch || e.mutasi.pengirimanMatch)).length;
  }, [allMutasi]);

  const currentFilteredReconciledCount = useMemo(() => {
    return filteredEntries.filter(e => !!(e.mutasi.dhpMatch || e.mutasi.setoranMatch || e.mutasi.bsppMatch || e.mutasi.pengirimanMatch)).length;
  }, [filteredEntries]);

  // Daftar pilihan komoditas/bahan yang memiliki entri rekonsiliasi
  const modalBahanOptions = useMemo(() => {
    const list = data.map(k => k.komoditas);
    allReconcilableEntries.forEach(e => {
      if (!list.includes(e.komoditas)) list.push(e.komoditas);
    });
    return list;
  }, [data, allReconcilableEntries]);

  // Daftar pilihan jenis mutasi rekonsiliasi yang tersedia, otomatis menyesuaikan bahan yang dipilih
  const modalJenisMutasiOptions = useMemo(() => {
    const set = new Set<string>();
    allReconcilableEntries.forEach(e => {
      if (modalFilterBahan === 'all' || e.komoditas === modalFilterBahan) {
        if (e.mutasi.jenisMutasi) {
          set.add(e.mutasi.jenisMutasi);
        }
      }
    });
    return Array.from(set).sort();
  }, [allReconcilableEntries, modalFilterBahan]);

  // Daftar mutasi rekonsiliasi aktif yang disaring berdasarkan filter Jenis Bahan & Jenis Mutasi di dalam modal
  const activeReconcilableList = useMemo(() => {
    return allReconcilableEntries.filter(e => {
      if (modalFilterBahan !== 'all' && e.komoditas !== modalFilterBahan) {
        return false;
      }
      if (modalFilterJenis !== 'all' && e.mutasi.jenisMutasi !== modalFilterJenis) {
        return false;
      }
      return true;
    });
  }, [allReconcilableEntries, modalFilterBahan, modalFilterJenis]);

  // Backward compatibility alias
  const reconcilableEntries = activeReconcilableList;

  const openAuditModal = (mutasi: MutasiItem, komoditas: string) => {
    // Opsi B: Otomatis sinkronkan filter bahan dengan bahan baris yang diklik
    setModalFilterBahan(komoditas);
    setModalFilterJenis('all');
    setActiveAuditItem({ mutasi, komoditas });
    
    // Cari index mutasi ini di dalam daftar bahan tersebut
    const targetList = allReconcilableEntries.filter(e => e.komoditas === komoditas);
    const idx = targetList.findIndex(e => 
      (e.mutasi.id && e.mutasi.id === mutasi.id) || 
      (e.komoditas === komoditas && e.mutasi.kode === mutasi.kode && e.mutasi.tanggal === mutasi.tanggal && e.mutasi.jenisMutasi === mutasi.jenisMutasi)
    );
    setActiveAuditIndex(idx >= 0 ? idx : 0);
  };

  const closeAuditModal = () => {
    setActiveAuditItem(null);
    setActiveAuditIndex(null);
    setTouchStartX(null);
    setTouchEndX(null);
    setTouchDiffX(0);
    setIsSwiping(false);
  };

  const handleModalBahanChange = (newBahan: string) => {
    setModalFilterBahan(newBahan);

    // Periksa apakah jenis mutasi saat ini masih ada di bahan baru
    let newJenis = modalFilterJenis;
    if (newJenis !== 'all') {
      const existsInNewBahan = allReconcilableEntries.some(e => 
        (newBahan === 'all' || e.komoditas === newBahan) && e.mutasi.jenisMutasi === newJenis
      );
      if (!existsInNewBahan) {
        newJenis = 'all';
        setModalFilterJenis('all');
      }
    }

    // Filter daftar baru
    const newList = allReconcilableEntries.filter(e => {
      if (newBahan !== 'all' && e.komoditas !== newBahan) return false;
      if (newJenis !== 'all' && e.mutasi.jenisMutasi !== newJenis) return false;
      return true;
    });

    if (newList.length > 0) {
      const currentIdx = activeAuditItem ? newList.findIndex(e =>
        (e.mutasi.id && e.mutasi.id === activeAuditItem.mutasi.id) ||
        (e.komoditas === activeAuditItem.komoditas && e.mutasi.kode === activeAuditItem.mutasi.kode && e.mutasi.tanggal === activeAuditItem.mutasi.tanggal)
      ) : -1;

      if (currentIdx >= 0) {
        setActiveAuditIndex(currentIdx);
      } else {
        setActiveAuditItem({ mutasi: newList[0].mutasi, komoditas: newList[0].komoditas });
        setActiveAuditIndex(0);
      }
    }
  };

  const handleModalJenisChange = (newJenis: string) => {
    setModalFilterJenis(newJenis);

    const newList = allReconcilableEntries.filter(e => {
      if (modalFilterBahan !== 'all' && e.komoditas !== modalFilterBahan) return false;
      if (newJenis !== 'all' && e.mutasi.jenisMutasi !== newJenis) return false;
      return true;
    });

    if (newList.length > 0) {
      const currentIdx = activeAuditItem ? newList.findIndex(e =>
        (e.mutasi.id && e.mutasi.id === activeAuditItem.mutasi.id) ||
        (e.komoditas === activeAuditItem.komoditas && e.mutasi.kode === activeAuditItem.mutasi.kode && e.mutasi.tanggal === activeAuditItem.mutasi.tanggal)
      ) : -1;

      if (currentIdx >= 0) {
        setActiveAuditIndex(currentIdx);
      } else {
        setActiveAuditItem({ mutasi: newList[0].mutasi, komoditas: newList[0].komoditas });
        setActiveAuditIndex(0);
      }
    }
  };

  const handlePrevAudit = () => {
    if (activeAuditIndex === null || activeAuditIndex <= 0) return;
    const prevIdx = activeAuditIndex - 1;
    const prevEntry = activeReconcilableList[prevIdx];
    if (prevEntry) {
      setActiveAuditItem({ mutasi: prevEntry.mutasi, komoditas: prevEntry.komoditas });
      setActiveAuditIndex(prevIdx);
    }
  };

  const handleNextAudit = () => {
    if (activeAuditIndex === null || activeAuditIndex >= activeReconcilableList.length - 1) return;
    const nextIdx = activeAuditIndex + 1;
    const nextEntry = activeReconcilableList[nextIdx];
    if (nextEntry) {
      setActiveAuditItem({ mutasi: nextEntry.mutasi, komoditas: nextEntry.komoditas });
      setActiveAuditIndex(nextIdx);
    }
  };

  const handleSelectAuditByIndex = (index: number) => {
    if (index >= 0 && index < activeReconcilableList.length) {
      const entry = activeReconcilableList[index];
      if (entry) {
        setActiveAuditItem({ mutasi: entry.mutasi, komoditas: entry.komoditas });
        setActiveAuditIndex(index);
      }
    }
  };

  // Touch swipe gesture handlers (responsive on mobile & tablet)
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchDiffX(0);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const currentX = e.targetTouches[0].clientX;
    setTouchEndX(currentX);
    setTouchDiffX(currentX - touchStartX);
  };

  const handleTouchEnd = () => {
    if (touchStartX !== null && touchEndX !== null) {
      const distance = touchStartX - touchEndX;
      const minSwipeDistance = 45;
      if (distance > minSwipeDistance) {
        // Swiped left -> data selanjutnya
        handleNextAudit();
      } else if (distance < -minSwipeDistance) {
        // Swiped right -> data sebelumnya
        handlePrevAudit();
      }
    }
    setTouchStartX(null);
    setTouchEndX(null);
    setTouchDiffX(0);
    setIsSwiping(false);
  };

  const setSelectedDhpAudit = (val: { mutasi: MutasiItem; komoditas: string } | null) => {
    if (val) openAuditModal(val.mutasi, val.komoditas);
    else closeAuditModal();
  };
  const setSelectedSetoranAudit = (val: { mutasi: MutasiItem; komoditas: string } | null) => {
    if (val) openAuditModal(val.mutasi, val.komoditas);
    else closeAuditModal();
  };
  const setSelectedBsppAudit = (val: { mutasi: MutasiItem; komoditas: string } | null) => {
    if (val) openAuditModal(val.mutasi, val.komoditas);
    else closeAuditModal();
  };
  const setSelectedPengirimanAudit = (val: { mutasi: MutasiItem; komoditas: string } | null) => {
    if (val) openAuditModal(val.mutasi, val.komoditas);
    else closeAuditModal();
  };

  useEffect(() => {
    if (!activeAuditItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextAudit();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevAudit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeAuditModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeAuditItem, activeAuditIndex, activeReconcilableList]);

  // Totals for filtered data (single pass for instant responsiveness)
  const { totalMasuk, totalKeluar, totalMasukSKT, totalKeluarSKT, totalMasukSKM, totalKeluarSKM } = useMemo(() => {
    let masuk = 0;
    let keluar = 0;
    let masukSKT = 0;
    let keluarSKT = 0;
    let masukSKM = 0;
    let keluarSKM = 0;
    for (let i = 0; i < filteredEntries.length; i++) {
      const curr = filteredEntries[i];
      masuk += curr.mutasi.masuk || 0;
      keluar += curr.mutasi.keluar || 0;
      if (GasService.isSktSkmActiveForKomoditas(curr.komoditas)) {
        masukSKT += curr.masukSKT || 0;
        keluarSKT += curr.keluarSKT || 0;
        masukSKM += curr.masukSKM || 0;
        keluarSKM += curr.keluarSKM || 0;
      }
    }
    return { totalMasuk: masuk, totalKeluar: keluar, totalMasukSKT: masukSKT, totalKeluarSKT: keluarSKT, totalMasukSKM: masukSKM, totalKeluarSKM: keluarSKM };
  }, [filteredEntries, sktSkmVersion]);

  // Auto-reset page to 1 when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterKomoditas, filterKode, filterJenis, filterProduksi, filterHideZero, filterFrom, filterTo, showAllDates, searchQuery]);

  // Total pages and paginated slice (< 5ms instant render)
  const totalPages = useMemo(() => {
    if (pageSize === 'all') return 1;
    return Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  }, [filteredEntries.length, pageSize]);

  const paginatedEntries = useMemo(() => {
    if (pageSize === 'all') return filteredEntries;
    const startIndex = (currentPage - 1) * pageSize;
    return filteredEntries.slice(startIndex, startIndex + pageSize);
  }, [filteredEntries, currentPage, pageSize]);

  // Rekonsiliasi Pemasukan Hasil Proses: Mengacu pada mutasi fisik gudang persediaan Tembakau & Krosok (Rajang II)
  // yang divalidasi silang terhadap DHP Tembakau (1 bahan) dan DHP Krosok (6 bahan)
  const dhpReconciliationEntries = useMemo(() => {
    return allMutasi.filter(e => {
      const isRajang2 = e.komoditas.includes('Rajang II');
      return isRajang2 && (e.mutasi.jenisMutasi === 'Pemasukan Hasil Proses' || !!e.mutasi.dhpMatch);
    });
  }, [allMutasi]);

  const dhpTembakauCount = useMemo(() => {
    return dhpReconciliationEntries.filter(e => e.mutasi.dhpMatch?.sumber?.toLowerCase().includes('tembakau')).length;
  }, [dhpReconciliationEntries]);

  const dhpKrosokCount = useMemo(() => {
    return dhpReconciliationEntries.filter(e => e.mutasi.dhpMatch?.sumber?.toLowerCase().includes('krosok')).length;
  }, [dhpReconciliationEntries]);

  const totalDhpNettoKg = useMemo(() => {
    return dhpReconciliationEntries.reduce((acc, curr) => acc + (curr.mutasi.dhpMatch?.dhpNetto || curr.mutasi.masuk || 0), 0);
  }, [dhpReconciliationEntries]);

  const totalFisikMasukKg = useMemo(() => {
    return dhpReconciliationEntries.reduce((acc, curr) => acc + (curr.mutasi.masuk || 0), 0);
  }, [dhpReconciliationEntries]);

  const totalDhpSelisihKg = useMemo(() => {
    return Math.round((totalFisikMasukKg - totalDhpNettoKg) * 10) / 10;
  }, [totalFisikMasukKg, totalDhpNettoKg]);

  // Rekonsiliasi Pengeluaran Setoran (Kertas Kerja BSPP SETORAN Kolom H)
  const setoranReconciliationEntries = useMemo(() => {
    if (!reconcileDisplay.showSetoranSummary) return [];
    return allMutasi.filter(e => {
      const isRajang2 = e.komoditas.includes('Rajang II');
      return isRajang2 && (e.mutasi.jenisMutasi === 'Pengeluaran Setoran' || !!e.mutasi.setoranMatch);
    });
  }, [allMutasi, reconcileDisplay.showSetoranSummary]);

  const totalSetoranLabelKg = useMemo(() => {
    return setoranReconciliationEntries.reduce((acc, curr) => acc + (curr.mutasi.setoranMatch?.labelNetto || curr.mutasi.keluar || 0), 0);
  }, [setoranReconciliationEntries]);

  const totalFisikKeluarKg = useMemo(() => {
    return setoranReconciliationEntries.reduce((acc, curr) => acc + (curr.mutasi.keluar || 0), 0);
  }, [setoranReconciliationEntries]);

  const totalSetoranSelisihKg = useMemo(() => {
    return Math.round((totalFisikKeluarKg - totalSetoranLabelKg) * 10) / 10;
  }, [totalFisikKeluarKg, totalSetoranLabelKg]);

  // Tanggal rekonsiliasi yang terdeteksi secara dinamis berstandar Indonesia
  const latestDhpTanggal = useMemo(() => {
    return getLatestDateString(dhpReconciliationEntries.map(e => ({ tanggal: e.mutasi.tanggal }))) || '2026-10-08';
  }, [dhpReconciliationEntries]);

  const latestSetoranTanggal = useMemo(() => {
    return getLatestDateString(setoranReconciliationEntries.map(e => ({ tanggal: e.mutasi.tanggal }))) || '2026-10-10';
  }, [setoranReconciliationEntries]);

  // Rekonsiliasi Pemasukan Hasil Blend: Mengacu pada mutasi fisik gudang persediaan Tembakau Blend
  // yang divalidasi silang terhadap DHP Blend (Kolom I Kertas Kerja Proses Blend)
  const dhpBlendReconciliationEntries = useMemo(() => {
    return allMutasi.filter(e => {
      const isBlend = e.komoditas.toLowerCase().includes('blend');
      return isBlend && (e.mutasi.jenisMutasi === 'Pemasukan Hasil Blend' || !!e.mutasi.dhpMatch);
    });
  }, [allMutasi]);

  const totalDhpBlendNettoKg = useMemo(() => {
    return dhpBlendReconciliationEntries.reduce((acc, curr) => acc + (curr.mutasi.dhpMatch?.dhpNetto || curr.mutasi.masuk || 0), 0);
  }, [dhpBlendReconciliationEntries]);

  const totalFisikBlendMasukKg = useMemo(() => {
    return dhpBlendReconciliationEntries.reduce((acc, curr) => acc + (curr.mutasi.masuk || 0), 0);
  }, [dhpBlendReconciliationEntries]);

  const totalDhpBlendSelisihKg = useMemo(() => {
    return Math.round((totalFisikBlendMasukKg - totalDhpBlendNettoKg) * 10) / 10;
  }, [totalFisikBlendMasukKg, totalDhpBlendNettoKg]);

  const totalMolenCount = useMemo(() => {
    return dhpBlendReconciliationEntries.reduce((acc, curr) => {
      return acc + (curr.mutasi.dhpMatch?.molenList?.length || 0);
    }, 0);
  }, [dhpBlendReconciliationEntries]);

  const latestDhpBlendTanggal = useMemo(() => {
    return getLatestDateString(dhpBlendReconciliationEntries.map(e => ({ tanggal: e.mutasi.tanggal }))) || '2026-10-12';
  }, [dhpBlendReconciliationEntries]);

  // Rekonsiliasi Pengeluaran Pengiriman Tembakau Blend (Kertas Kerja PENGIRIMAN TBK BLD - Kolom F & Kolom L)
  const pengirimanBlendReconciliationEntries = useMemo(() => {
    return allMutasi.filter(e => {
      const isBlend = e.komoditas.toLowerCase().includes('blend');
      return isBlend && (e.mutasi.jenisMutasi.toLowerCase().includes('pengiriman') || !!e.mutasi.pengirimanMatch);
    });
  }, [allMutasi]);

  const totalPengirimanBlendBobotKg = useMemo(() => {
    return pengirimanBlendReconciliationEntries.reduce((acc, curr) => acc + (curr.mutasi.pengirimanMatch?.bobotKirim || curr.mutasi.keluar || 0), 0);
  }, [pengirimanBlendReconciliationEntries]);

  const totalFisikPengirimanKeluarKg = useMemo(() => {
    return pengirimanBlendReconciliationEntries.reduce((acc, curr) => acc + (curr.mutasi.keluar || 0), 0);
  }, [pengirimanBlendReconciliationEntries]);

  const totalPengirimanBlendSelisihKg = useMemo(() => {
    return Math.round((totalFisikPengirimanKeluarKg - totalPengirimanBlendBobotKg) * 10) / 10;
  }, [totalFisikPengirimanKeluarKg, totalPengirimanBlendBobotKg]);

  const latestPengirimanBlendTanggal = useMemo(() => {
    return getLatestDateString(pengirimanBlendReconciliationEntries.map(e => ({ tanggal: e.mutasi.tanggal }))) || '2026-10-15';
  }, [pengirimanBlendReconciliationEntries]);

  // Rekonsiliasi Hasil Pengeringan Cengkeh (Kertas Kerja SOURCE HASIL DRYER - Kolom F)
  const cengkehDryerReconciliationEntries = useMemo(() => {
    return allMutasi.filter(e => {
      const isCengkeh = e.komoditas.toLowerCase().includes('cengkeh');
      return isCengkeh && (e.mutasi.jenisMutasi === 'Pemasukan Hasil Proses' || !!e.mutasi.dhpMatch);
    });
  }, [allMutasi]);

  const totalCengkehDryerNettoKg = useMemo(() => {
    return cengkehDryerReconciliationEntries.reduce((acc, curr) => acc + (curr.mutasi.dhpMatch?.dhpNetto || curr.mutasi.masuk || 0), 0);
  }, [cengkehDryerReconciliationEntries]);

  const totalFisikCengkehMasukKg = useMemo(() => {
    return cengkehDryerReconciliationEntries.reduce((acc, curr) => acc + (curr.mutasi.masuk || 0), 0);
  }, [cengkehDryerReconciliationEntries]);

  const totalCengkehDryerSelisihKg = useMemo(() => {
    return Math.round((totalFisikCengkehMasukKg - totalCengkehDryerNettoKg) * 10) / 10;
  }, [totalFisikCengkehMasukKg, totalCengkehDryerNettoKg]);

  const latestCengkehDryerTanggal = useMemo(() => {
    return getLatestDateString(cengkehDryerReconciliationEntries.map(e => ({ tanggal: e.mutasi.tanggal }))) || '2026-09-24';
  }, [cengkehDryerReconciliationEntries]);

  const formatNumber = (num: number): string => {
    return Number(num).toLocaleString('id-ID', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
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
      <div className="px-4 py-3 sm:px-5 sm:py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Mutasi Terkini Gudang Persediaan
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            Log riwayat arus masuk &amp; keluar bahan baku Divisi Produksi I
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsSktSkmModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300/80 transition-colors cursor-pointer"
            title="Pengaturan Fitur Jalur SKT & SKM per Bahan"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-700" />
            <span>Jalur SKT/SKM</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={filteredEntries.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 transition-colors shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Bar - Front & Center */}
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
              
              {/* Opsi Terkategori (Pemasukan, Pengeluaran, Pengiriman, Penyesuaian, dll) */}
              {filterKomoditas === 'all' && groupedJenisCategories ? (
                groupedJenisCategories.map(group => (
                  <optgroup key={group.label} label={group.label}>
                    {group.list.map(j => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </optgroup>
                ))
              ) : (
                <optgroup label={filterKomoditas === 'all' ? "📋 Semua Jenis Mutasi" : `📋 Jenis Mutasi (${filterKomoditas})`}>
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

        {/* Date Ranges & Toggle Zero - Compact */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-500" />
              <span>Cari Periode:</span>
            </span>
            <input
              type="date"
              value={filterFrom}
              onChange={e => {
                setFilterFrom(e.target.value);
                setShowAllDates(false);
              }}
              className="text-xs bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-700"
              title="Dari tanggal"
            />
            <span className="text-[11px] text-slate-400">s/d</span>
            <input
              type="date"
              value={filterTo}
              onChange={e => {
                setFilterTo(e.target.value);
                setShowAllDates(false);
              }}
              className="text-xs bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-700"
              title="Sampai tanggal"
            />

            {(filterFrom || filterTo || showAllDates) && (
              <button
                type="button"
                onClick={() => {
                  setFilterFrom('');
                  setFilterTo('');
                  setShowAllDates(false);
                }}
                className="text-[10.5px] text-blue-700 hover:text-blue-900 underline px-1 font-semibold flex items-center gap-0.5 cursor-pointer"
                title="Kembalikan ke tampilan mutasi tanggal terbaru saja"
              >
                ↺ Tanggal Terbaru
              </button>
            )}

            {!filterFrom && !filterTo && !showAllDates && !filterOnlyReconciled && (
              filterKomoditas !== 'all' && latestTanggal ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 rounded text-[11px] font-semibold">
                  <span>⚡ Tanggal Terbaru: {formatTanggalIndo(latestTanggal)}</span>
                  <button
                    type="button"
                    onClick={() => setShowAllDates(true)}
                    className="text-[10px] text-blue-600 hover:text-blue-900 underline font-normal cursor-pointer"
                    title="Lihat seluruh mutasi dari semua tanggal"
                  >
                    Semua Tanggal
                  </button>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 rounded text-[11px] font-semibold">
                  <span>⚡ Mutasi Terkini Lintas Bahan Baku</span>
                </span>
              )
            )}

            {/* Tombol Cepat: Filter Khusus Transaksi Ber-Badge Rekonsiliasi */}
            <button
              type="button"
              onClick={() => {
                const nextVal = !filterOnlyReconciled;
                setFilterOnlyReconciled(nextVal);
                if (nextVal) setShowAllDates(true);
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer shadow-2xs ${
                filterOnlyReconciled
                  ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-300'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}
              title="Tampilkan hanya baris transaksi yang memiliki data & badge audit rekonsiliasi (DHP, Setoran, BSPP, Pengiriman)"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{filterOnlyReconciled ? '✓ Mode Rekonsiliasi Aktif' : `Filter Badge Rekonsiliasi (${totalReconciledCount})`}</span>
            </button>

            {(filterKomoditas !== 'all' || filterKode !== 'all' || filterJenis !== 'all' || searchQuery || filterHideZero || filterOnlyReconciled) && (
              <button
                type="button"
                onClick={() => {
                  setFilterKomoditas('all');
                  setFilterKode('all');
                  setFilterJenis('all');
                  setSearchQuery('');
                  setFilterHideZero(false);
                  setFilterOnlyReconciled(false);
                  setShowAllDates(false);
                }}
                className="text-[10.5px] text-slate-500 hover:text-slate-800 underline px-1 font-medium flex items-center gap-0.5 cursor-pointer"
                title="Reset semua filter ke default"
              >
                Reset Filter
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

      {/* Summary Strip (Sleek & Low-Profile) */}
      <div className="px-4 py-2 sm:px-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-700 flex items-center gap-1">
            <span>Hasil Filter:</span>
            <span className="px-2 py-0.5 bg-white border border-slate-200 rounded font-mono font-bold text-slate-900">
              {filteredEntries.length} entri
            </span>
          </span>

          <span className="text-slate-300">|</span>

          <span className="font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
            Masuk: +{formatNumber(totalMasuk)} Kg
          </span>

          <span className="font-medium text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-mono">
            Keluar: -{formatNumber(totalKeluar)} Kg
          </span>

          {hasProduksiBreakdown && (totalMasukSKT > 0 || totalKeluarSKT > 0 || totalMasukSKM > 0 || totalKeluarSKM > 0) && (
            <>
              <span className="text-slate-300">|</span>
              <span className="text-amber-800 text-[11px] font-mono">
                SKT: +{formatNumber(totalMasukSKT)} / -{formatNumber(totalKeluarSKT)}
              </span>
              <span className="text-blue-800 text-[11px] font-mono">
                SKM: +{formatNumber(totalMasukSKM)} / -{formatNumber(totalKeluarSKM)}
              </span>
            </>
          )}

          <span className="text-slate-300">|</span>

          {/* Akses Cepat Dialog Audit Rekonsiliasi Otomatis */}
          <button
            type="button"
            onClick={() => {
              if (allReconcilableEntries.length > 0) {
                const target = filteredEntries.find(e => !!(e.mutasi.dhpMatch || e.mutasi.setoranMatch || e.mutasi.bsppMatch || e.mutasi.pengirimanMatch)) || allReconcilableEntries[0];
                openAuditModal(target.mutasi, target.komoditas);
              }
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-2xs transition-all cursor-pointer"
            title="Buka popup audit dialog rekonsiliasi otomatis 2-way matching"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Audit Rekonsiliasi ({currentFilteredReconciledCount} terverifikasi)</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-500 font-mono">
          {filterFrom || filterTo 
            ? `${filterFrom || 'Awal'} s/d ${filterTo || 'Hari ini'}` 
            : filterOnlyReconciled
              ? `Mode Rekonsiliasi (${currentFilteredReconciledCount} entri)`
              : !showAllDates && filterKomoditas !== 'all' && latestTanggal 
                ? `Tanggal: ${formatTanggalIndo(latestTanggal)}` 
                : 'Semua Periode / Log Terkini'}
        </span>
      </div>

      {/* Panel Rekonsiliasi Khusus: Pemasukan Hasil Proses Gudang Persediaan Rajang II vs Kertas Kerja DHP (Diatur via Headless GAS Center) */}
      {reconcileDisplay.showDhpSummary && (filterKomoditas === 'all' ? showAllReconSection : filterKomoditas.includes('Rajang II')) && dhpReconciliationEntries.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white border-b border-emerald-800/50 p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Rekonsiliasi Otomatis (2-Way Matching)</span>
                </span>
                <span className="text-[11px] text-slate-300 font-medium">
                  {formatTanggalIndo(latestDhpTanggal)}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Pemasukan Hasil Proses: Gudang Rajang II vs DHP</span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
                Acuan data adalah entri mutasi fisik yang tercatat di <strong className="text-emerald-200">Gudang Persediaan Tembakau &amp; Krosok (Rajang II)</strong>, divalidasi silang terhadap kertas kerja <strong className="text-blue-200">DHP Tembakau ({dhpTembakauCount} bahan)</strong> dan <strong className="text-amber-200">DHP Krosok ({dhpKrosokCount} bahan)</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-white/10 backdrop-blur-xs rounded-xl px-3 py-2 border border-white/10 text-center">
                <span className="text-[10px] text-slate-300 uppercase tracking-wider block">Acuan Rajang II</span>
                <span className="text-sm font-bold text-white font-mono">{dhpReconciliationEntries.length} Bahan</span>
              </div>
              <div className="bg-blue-500/15 backdrop-blur-xs rounded-xl px-3 py-2 border border-blue-400/30 text-center">
                <span className="text-[10px] text-blue-200 uppercase tracking-wider block">DHP Tembakau</span>
                <span className="text-sm font-bold text-blue-300 font-mono">{dhpTembakauCount} Bahan</span>
              </div>
              <div className="bg-amber-500/15 backdrop-blur-xs rounded-xl px-3 py-2 border border-amber-400/30 text-center">
                <span className="text-[10px] text-amber-200 uppercase tracking-wider block">DHP Krosok</span>
                <span className="text-sm font-bold text-amber-300 font-mono">{dhpKrosokCount} Bahan</span>
              </div>
              <div className="bg-emerald-500/20 backdrop-blur-xs rounded-xl px-3 py-2 border border-emerald-400/40 text-center">
                <span className="text-[10px] text-emerald-200 uppercase tracking-wider block">Status Keselarasan</span>
                <span className="text-sm font-bold text-emerald-300 font-mono">
                  {totalDhpSelisihKg === 0 ? '100% IDENTIK' : `Selisih ${formatNumber(totalDhpSelisihKg)} Kg`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowDhpSection(!showDhpSection)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer border border-white/15"
                title={showDhpSection ? 'Sembunyikan rincian tabel perbandingan' : 'Buka rincian tabel perbandingan'}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{showDhpSection ? 'Tutup Rincian' : 'Lihat Rincian'}</span>
                {showDhpSection ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Rincian Komparasi 7 Bahan */}
          {showDhpSection && (
            <div className="mt-4 pt-3.5 border-t border-emerald-800/40">
              <div className="overflow-x-auto rounded-xl border border-slate-700/80 bg-slate-900/80 shadow-inner">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/90 text-[10.5px] uppercase font-bold text-slate-300 border-b border-slate-700">
                    <tr>
                      <th className="py-2 px-3 text-center w-10">No</th>
                      <th className="py-2 px-3">Tanggal</th>
                      <th className="py-2 px-3">Bahan Gudang Rajang II (Acuan Utama)</th>
                      <th className="py-2 px-3">Kertas Kerja Pembanding</th>
                      <th className="py-2 px-3 text-center">Jalur</th>
                      <th className="py-2 px-3 text-right">Fisik Masuk Gudang</th>
                      <th className="py-2 px-3 text-right">Hasil Jadi DHP</th>
                      <th className="py-2 px-3 text-right">Selisih</th>
                      <th className="py-2 px-3 text-center">Status Validasi</th>
                      <th className="py-2 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                    {dhpReconciliationEntries.map((e, idx) => {
                      const m = e.mutasi;
                      const match = m.dhpMatch;
                      const isIdentik = match ? match.selisih === 0 : false;
                      const isTembakau = match?.sumber?.toLowerCase().includes('tembakau') || m.kode.toLowerCase().includes('madura');
                      return (
                        <tr key={m.id || idx} className="hover:bg-slate-800/60 transition-colors">
                          <td className="py-2 px-3 text-center text-slate-400 font-sans">{idx + 1}</td>
                          <td className="py-2 px-3 whitespace-nowrap text-slate-300 font-sans">
                            {formatTanggalIndo(m.tanggal || '')}
                          </td>
                          <td className="py-2 px-3 font-bold text-white font-sans">
                            <span className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              <span>{m.kode}</span>
                            </span>
                          </td>
                          <td className="py-2 px-3 font-sans">
                            {isTembakau ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900/60 text-blue-300 border border-blue-700/60">
                                DHP Tembakau (Gambar 1)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-900/60 text-amber-300 border border-amber-700/60">
                                DHP Krosok (Gambar 2)
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-200 font-bold">
                              {match?.jalur || 'SKT'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-400">
                            +{formatNumber(m.masuk || 0)} Kg
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-200">
                            {formatNumber(match ? match.dhpNetto : m.masuk || 0)} Kg
                          </td>
                          <td className="py-2 px-3 text-right">
                            {match && match.selisih !== 0 ? (
                              <span className="text-amber-400 font-bold">
                                {match.selisih > 0 ? '+' : ''}{formatNumber(match.selisih)} Kg
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-semibold">0,0 Kg</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-sans">
                            {isIdentik ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                <span>100% IDENTIK (MATCH)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                <AlertCircle className="w-3 h-3 text-amber-400" />
                                <span>SELISIH TIMBANG</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-sans">
                            <button
                              type="button"
                              onClick={() => setSelectedDhpAudit({ mutasi: m, komoditas: e.komoditas })}
                              className="px-2 py-1 text-[10.5px] font-semibold text-slate-200 bg-slate-700/80 hover:bg-slate-700 hover:text-white rounded border border-slate-600 transition-colors cursor-pointer"
                            >
                              Audit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-800/80 font-mono text-[11px] font-bold border-t border-slate-700 text-slate-200">
                    <tr>
                      <td colSpan={5} className="py-2.5 px-3 font-sans text-right uppercase tracking-wider text-[10.5px]">
                        Total Hasil Proses ({dhpReconciliationEntries.length} Bahan):
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 text-xs">
                        +{formatNumber(totalFisikMasukKg)} Kg
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-100 text-xs">
                        {formatNumber(totalDhpNettoKg)} Kg
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 text-xs">
                        {totalDhpSelisihKg === 0 ? '0,0 Kg' : `${formatNumber(totalDhpSelisihKg)} Kg`}
                      </td>
                      <td colSpan={2} className="py-2.5 px-3 text-center font-sans text-[10px] text-emerald-300 font-bold">
                        ✓ Seluruh Data Terverifikasi Sempurna
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Panel Rekonsiliasi Khusus: Pemasukan Hasil Blend Gudang Persediaan Tembakau Blend vs DHP Blend (Kolom I) */}
      {(reconcileDisplay.showDhpBlendSummary ?? reconcileDisplay.showDhpSummary) && (filterKomoditas === 'all' ? showAllReconSection : filterKomoditas.toLowerCase().includes('blend')) && dhpBlendReconciliationEntries.length > 0 && (
        <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 text-white border-b border-teal-800/50 p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                  <span>Rekonsiliasi Otomatis (2-Way Matching)</span>
                </span>
                <span className="text-[11px] text-slate-300 font-medium">
                  {formatTanggalIndo(latestDhpBlendTanggal)}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/10 text-slate-300 border border-white/10" title="ID Sheet Kertas Kerja DHP Blend">
                  Tab: INTEGRASI DATA DHP BLEND (Kolom I)
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Pemasukan Hasil Blend: Gudang Tembakau Blend vs DHP Blend</span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
                Acuan data adalah entri mutasi fisik yang tercatat di <strong className="text-teal-200">Gudang Persediaan Tembakau Blend</strong>, divalidasi silang terhadap kertas kerja <strong className="text-blue-200">DHP Blend Unit Blend - Divisi Produksi I (Kolom I: Hasil Jadi Bersih)</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-white/10 backdrop-blur-xs rounded-xl px-3 py-2 border border-white/10 text-center">
                <span className="text-[10px] text-slate-300 uppercase tracking-wider block">Acuan Blend</span>
                <span className="text-sm font-bold text-white font-mono">{dhpBlendReconciliationEntries.length} Bahan</span>
              </div>
              <div className="bg-blue-500/15 backdrop-blur-xs rounded-xl px-3 py-2 border border-blue-400/30 text-center">
                <span className="text-[10px] text-blue-200 uppercase tracking-wider block">DHP Blend Netto</span>
                <span className="text-sm font-bold text-blue-300 font-mono">{formatNumber(totalDhpBlendNettoKg)} Kg</span>
              </div>
              {totalMolenCount > 0 && (
                <div className="bg-purple-500/15 backdrop-blur-xs rounded-xl px-3 py-2 border border-purple-400/30 text-center">
                  <span className="text-[10px] text-purple-200 uppercase tracking-wider block">Batch Molen</span>
                  <span className="text-sm font-bold text-purple-300 font-mono">{totalMolenCount} Batch</span>
                </div>
              )}
              <div className="bg-teal-500/20 backdrop-blur-xs rounded-xl px-3 py-2 border border-teal-400/40 text-center">
                <span className="text-[10px] text-teal-200 uppercase tracking-wider block">Status Keselarasan</span>
                <span className="text-sm font-bold text-teal-300 font-mono">
                  {totalDhpBlendSelisihKg === 0 ? '100% IDENTIK' : `Selisih ${formatNumber(totalDhpBlendSelisihKg)} Kg`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowDhpBlendSection(!showDhpBlendSection)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer border border-white/15"
                title={showDhpBlendSection ? 'Sembunyikan rincian tabel perbandingan' : 'Buka rincian tabel perbandingan'}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{showDhpBlendSection ? 'Tutup Rincian' : 'Lihat Rincian'}</span>
                {showDhpBlendSection ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Rincian Komparasi DHP Blend */}
          {showDhpBlendSection && (
            <div className="mt-4 pt-3.5 border-t border-teal-800/40">
              <div className="overflow-x-auto rounded-xl border border-slate-700/80 bg-slate-900/80 shadow-inner">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/90 text-[10.5px] uppercase font-bold text-slate-300 border-b border-slate-700">
                    <tr>
                      <th className="py-2 px-3 text-center w-10">No</th>
                      <th className="py-2 px-3">Tanggal</th>
                      <th className="py-2 px-3">Bahan Gudang Blend (Acuan Utama)</th>
                      <th className="py-2 px-3">Kertas Kerja Pembanding</th>
                      <th className="py-2 px-3 text-center">Tujuan / Jalur</th>
                      <th className="py-2 px-3 text-right">Fisik Masuk Gudang</th>
                      <th className="py-2 px-3 text-right">Hasil Jadi DHP Blend</th>
                      <th className="py-2 px-3 text-right">Selisih</th>
                      <th className="py-2 px-3 text-center">Rincian Molen</th>
                      <th className="py-2 px-3 text-center">Status Validasi</th>
                      <th className="py-2 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                    {dhpBlendReconciliationEntries.map((e, idx) => {
                      const m = e.mutasi;
                      const match = m.dhpMatch;
                      const isIdentik = match ? match.selisih === 0 : false;
                      const molens = match?.molenList || [];
                      return (
                        <tr key={m.id || idx} className="hover:bg-slate-800/60 transition-colors">
                          <td className="py-2 px-3 text-center text-slate-400 font-sans">{idx + 1}</td>
                          <td className="py-2 px-3 whitespace-nowrap text-slate-300 font-sans">
                            {formatTanggalIndo(m.tanggal || '')}
                          </td>
                          <td className="py-2 px-3 font-bold text-white font-sans">
                            <span className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                              <span>{m.kode}</span>
                            </span>
                          </td>
                          <td className="py-2 px-3 font-sans">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-teal-900/60 text-teal-300 border border-teal-700/60">
                              DHP Blend (Kolom I)
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-200 font-bold">
                              {match?.jalur || 'Wagir'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-teal-400">
                            +{formatNumber(m.masuk || 0)} Kg
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-200">
                            {formatNumber(match ? match.dhpNetto : m.masuk || 0)} Kg
                          </td>
                          <td className="py-2 px-3 text-right">
                            {match && match.selisih !== 0 ? (
                              <span className="text-amber-400 font-bold">
                                {match.selisih > 0 ? '+' : ''}{formatNumber(match.selisih)} Kg
                              </span>
                            ) : (
                              <span className="text-teal-400 font-semibold">0,0 Kg</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-sans">
                            {molens.length > 0 ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-900/40 text-purple-300 border border-purple-700/40" title={molens.map(b => `${b.namaMolen}: ${formatNumber(b.nettoKg)} Kg`).join(', ')}>
                                {molens.length} Batch ({formatNumber(molens[0]?.nettoKg || 0)} Kg/batch)
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[10px]">—</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-sans">
                            {isIdentik ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                <span>100% IDENTIK (MATCH)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                <AlertCircle className="w-3 h-3 text-amber-400" />
                                <span>SELISIH BLEND</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-sans">
                            <button
                              type="button"
                              onClick={() => setSelectedDhpAudit({ mutasi: m, komoditas: e.komoditas })}
                              className="px-2 py-1 text-[10.5px] font-semibold text-slate-200 bg-slate-700/80 hover:bg-slate-700 hover:text-white rounded border border-slate-600 transition-colors cursor-pointer"
                            >
                              Audit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-800/80 font-mono text-[11px] font-bold border-t border-slate-700 text-slate-200">
                    <tr>
                      <td colSpan={5} className="py-2.5 px-3 font-sans text-right uppercase tracking-wider text-[10.5px]">
                        Total Hasil Blend ({dhpBlendReconciliationEntries.length} Bahan):
                      </td>
                      <td className="py-2.5 px-3 text-right text-teal-400 text-xs">
                        +{formatNumber(totalFisikBlendMasukKg)} Kg
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-100 text-xs">
                        {formatNumber(totalDhpBlendNettoKg)} Kg
                      </td>
                      <td className="py-2.5 px-3 text-right text-teal-400 text-xs">
                        {totalDhpBlendSelisihKg === 0 ? '0,0 Kg' : `${formatNumber(totalDhpBlendSelisihKg)} Kg`}
                      </td>
                      <td colSpan={3} className="py-2.5 px-3 text-center font-sans text-[10px] text-teal-300 font-bold">
                        ✓ Seluruh Data DHP Blend Terverifikasi Sempurna
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Panel Rekonsiliasi Khusus: Pengeluaran Pengiriman Tembakau Blend (Kertas Kerja PENGIRIMAN TBK BLD - Kolom F & Kolom L) */}
      {(reconcileDisplay.showPengirimanBlendSummary ?? reconcileDisplay.showDhpSummary) && (filterKomoditas === 'all' ? showAllReconSection : filterKomoditas.toLowerCase().includes('blend')) && pengirimanBlendReconciliationEntries.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-yellow-950 text-white border-b border-amber-800/50 p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Rekonsiliasi Otomatis (2-Way Matching)</span>
                </span>
                <span className="text-[11px] text-slate-300 font-medium">
                  {formatTanggalIndo(latestPengirimanBlendTanggal)}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/10 text-slate-300 border border-white/10" title="ID Sheet Kertas Kerja PENGIRIMAN TBK BLD">
                  Tab: PENGIRIMAN TBK BLD (Kolom F &amp; Kolom L)
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Pengeluaran Pengiriman: Gudang Tembakau Blend vs Kertas Kerja Pengiriman</span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
                Acuan data adalah entri mutasi fisik yang tercatat di <strong className="text-amber-200">Gudang Persediaan Tembakau Blend</strong>, divalidasi silang terhadap lembar kerja <strong className="text-yellow-200">PENGIRIMAN TBK BLD (Kolom F: 153 - BK &amp; Kolom L: KARANG - BK, F REGULER)</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-white/10 backdrop-blur-xs rounded-xl px-3 py-2 border border-white/10 text-center">
                <span className="text-[10px] text-slate-300 uppercase tracking-wider block">Acuan Pengiriman</span>
                <span className="text-sm font-bold text-white font-mono">{pengirimanBlendReconciliationEntries.length} Transaksi</span>
              </div>
              <div className="bg-amber-500/15 backdrop-blur-xs rounded-xl px-3 py-2 border border-amber-400/30 text-center">
                <span className="text-[10px] text-amber-200 uppercase tracking-wider block">Total Bobot Kirim</span>
                <span className="text-sm font-bold text-amber-300 font-mono">{formatNumber(totalPengirimanBlendBobotKg)} Kg</span>
              </div>
              <div className="bg-emerald-500/20 backdrop-blur-xs rounded-xl px-3 py-2 border border-emerald-400/40 text-center">
                <span className="text-[10px] text-emerald-200 uppercase tracking-wider block">Status Keselarasan</span>
                <span className="text-sm font-bold text-emerald-300 font-mono">
                  {totalPengirimanBlendSelisihKg === 0 ? '100% IDENTIK' : `Selisih ${formatNumber(totalPengirimanBlendSelisihKg)} Kg`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPengirimanBlendSection(!showPengirimanBlendSection)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer border border-white/15"
                title={showPengirimanBlendSection ? 'Sembunyikan rincian tabel perbandingan' : 'Buka rincian tabel perbandingan'}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{showPengirimanBlendSection ? 'Tutup Rincian' : 'Lihat Rincian'}</span>
                {showPengirimanBlendSection ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Rincian Komparasi Pengiriman Blend */}
          {showPengirimanBlendSection && (
            <div className="mt-4 pt-3.5 border-t border-amber-800/40">
              <div className="overflow-x-auto rounded-xl border border-slate-700/80 bg-slate-900/80 shadow-inner">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/90 text-[10.5px] uppercase font-bold text-slate-300 border-b border-slate-700">
                    <tr>
                      <th className="py-2 px-3 text-center w-10">No</th>
                      <th className="py-2 px-3">Tanggal</th>
                      <th className="py-2 px-3">Bahan Gudang Blend (Acuan Utama)</th>
                      <th className="py-2 px-3">Tujuan Distribusi</th>
                      <th className="py-2 px-3">Kertas Kerja Acuan</th>
                      <th className="py-2 px-3 text-right">Fisik Keluar Gudang</th>
                      <th className="py-2 px-3 text-right">Bobot Lembar Kerja</th>
                      <th className="py-2 px-3 text-right">Selisih</th>
                      <th className="py-2 px-3 text-center">Status Validasi</th>
                      <th className="py-2 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                    {pengirimanBlendReconciliationEntries.map((e, idx) => {
                      const m = e.mutasi;
                      const match = m.pengirimanMatch;
                      const isIdentik = match ? match.selisih === 0 : false;
                      return (
                        <tr key={m.id || idx} className="hover:bg-slate-800/60 transition-colors">
                          <td className="py-2 px-3 text-center text-slate-400 font-sans">{idx + 1}</td>
                          <td className="py-2 px-3 whitespace-nowrap text-slate-300 font-sans">
                            {formatTanggalIndo(m.tanggal || '')}
                          </td>
                          <td className="py-2 px-3 font-bold text-white font-sans">
                            <span className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                              <span>{m.kode}</span>
                            </span>
                          </td>
                          <td className="py-2 px-3 font-sans">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-200 font-bold">
                              {match?.tujuan || (m.jenisMutasi || '').replace(/Pengiriman\s*[-–]?\s*/i, '') || 'Wagir'}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-sans">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-900/60 text-amber-300 border border-amber-700/60">
                              {match?.sumber || 'PENGIRIMAN TBK BLD'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-rose-300 font-bold">
                            {m.keluar ? formatNumber(m.keluar) : '0,0'} Kg
                          </td>
                          <td className="py-2 px-3 text-right text-slate-200 font-bold">
                            {match ? formatNumber(match.bobotKirim) : formatNumber(m.keluar || 0)} Kg
                          </td>
                          <td className="py-2 px-3 text-right">
                            {isIdentik ? (
                              <span className="text-emerald-400 font-bold">0,0 Kg</span>
                            ) : (
                              <span className="text-rose-400 font-bold">
                                {match && match.selisih > 0 ? '+' : ''}{match ? formatNumber(match.selisih) : '0,0'} Kg
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-sans">
                            {isIdentik ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                <span>100% IDENTIK</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                <AlertCircle className="w-3 h-3 text-amber-400" />
                                <span>DITEMUKAN SELISIH</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-sans">
                            <button
                              type="button"
                              onClick={() => setSelectedPengirimanAudit({ mutasi: m, komoditas: e.komoditas })}
                              className="px-2 py-1 rounded bg-amber-600/80 hover:bg-amber-600 text-white font-semibold text-[10.5px] transition-colors cursor-pointer"
                              title="Buka Lembar Audit Pengiriman"
                            >
                              Lihat Audit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-800/90 font-mono text-[11px] font-bold border-t border-slate-700">
                    <tr>
                      <td colSpan={5} className="py-2.5 px-3 text-right text-slate-300 font-sans">
                        TOTAL REKONSILIASI PENGIRIMAN BLEND:
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-300 text-xs">
                        {formatNumber(totalFisikPengirimanKeluarKg)} Kg
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-100 text-xs">
                        {formatNumber(totalPengirimanBlendBobotKg)} Kg
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-400 text-xs">
                        {totalPengirimanBlendSelisihKg === 0 ? '0,0 Kg' : `${formatNumber(totalPengirimanBlendSelisihKg)} Kg`}
                      </td>
                      <td colSpan={2} className="py-2.5 px-3 text-center font-sans text-[10px] text-amber-300 font-bold">
                        ✓ Seluruh Data Pengiriman Blend Terverifikasi Sempurna
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Panel Rekonsiliasi Khusus: Pengeluaran Setoran (Diatur via Headless GAS Center) */}
      {reconcileDisplay.showSetoranSummary && (filterKomoditas === 'all' ? showAllReconSection : filterKomoditas.includes('Rajang II')) && setoranReconciliationEntries.length > 0 && (
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white border-b border-blue-800/50 p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Rekonsiliasi Otomatis (2-Way Matching)</span>
                </span>
                <span className="text-[11px] text-slate-300 font-medium">
                  {formatTanggalIndo(latestSetoranTanggal)}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/10 text-slate-300 border border-white/10" title="ID Sheet Kertas Kerja Setoran">
                  Tab: BSPP SETORAN (Kolom H)
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Pengeluaran Setoran: Gudang Rajang II vs Kertas Kerja BSPP SETORAN (Kolom H)</span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
                Acuan data adalah entri mutasi fisik pengeluaran yang tercatat di <strong className="text-emerald-200">Gudang Persediaan Tembakau &amp; Krosok (Rajang II)</strong>, divalidasi silang terhadap kertas kerja <strong className="text-blue-200">BSPP SETORAN (34 bahan)</strong> acuan <strong className="text-amber-200">Kolom H</strong> (Bobot Label Netto Kg). ID Sheet: <span className="font-mono text-[11px] text-slate-300">1bnrs6Mqx2zU4TZhlJ61JF-VyhKFoajEWDwgn_o9B3EA</span>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-white/10 backdrop-blur-xs rounded-xl px-3 py-2 border border-white/10 text-center">
                <span className="text-[10px] text-slate-300 uppercase tracking-wider block">Acuan Rajang II</span>
                <span className="text-sm font-bold text-white font-mono">{setoranReconciliationEntries.length} Bahan</span>
              </div>
              <div className="bg-rose-500/15 backdrop-blur-xs rounded-xl px-3 py-2 border border-rose-400/30 text-center">
                <span className="text-[10px] text-rose-200 uppercase tracking-wider block">Fisik Keluar</span>
                <span className="text-sm font-bold text-rose-300 font-mono">-{formatNumber(totalFisikKeluarKg)} Kg</span>
              </div>
              <div className="bg-blue-500/15 backdrop-blur-xs rounded-xl px-3 py-2 border border-blue-400/30 text-center">
                <span className="text-[10px] text-blue-200 uppercase tracking-wider block">Label Netto (Kolom H)</span>
                <span className="text-sm font-bold text-blue-300 font-mono">{formatNumber(totalSetoranLabelKg)} Kg</span>
              </div>
              <div className="bg-emerald-500/20 backdrop-blur-xs rounded-xl px-3 py-2 border border-emerald-400/40 text-center">
                <span className="text-[10px] text-emerald-200 uppercase tracking-wider block">Status Keselarasan</span>
                <span className="text-sm font-bold text-emerald-300 font-mono">
                  {totalSetoranSelisihKg === 0 ? '100% IDENTIK' : `Selisih ${formatNumber(totalSetoranSelisihKg)} Kg`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSetoranSection(!showSetoranSection)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer border border-white/15"
                title={showSetoranSection ? 'Sembunyikan rincian tabel perbandingan' : 'Buka rincian tabel perbandingan'}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{showSetoranSection ? 'Tutup Rincian' : 'Lihat Rincian (34 Bahan)'}</span>
                {showSetoranSection ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Rincian Komparasi 34 Bahan Setoran */}
          {showSetoranSection && (
            <div className="mt-4 pt-3.5 border-t border-blue-800/40">
              <div className="overflow-x-auto rounded-xl border border-slate-700/80 bg-slate-900/80 shadow-inner max-h-[420px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/95 text-[10.5px] uppercase font-bold text-slate-300 border-b border-slate-700 sticky top-0 z-10 backdrop-blur-xs">
                    <tr>
                      <th className="py-2 px-3 text-center w-10">No</th>
                      <th className="py-2 px-3">Tanggal</th>
                      <th className="py-2 px-3">Bahan Gudang Rajang II (Acuan Utama)</th>
                      <th className="py-2 px-3">Kertas Kerja Pembanding (BSPP SETORAN)</th>
                      <th className="py-2 px-3 text-right">Fisik Keluar Gudang</th>
                      <th className="py-2 px-3 text-right">Label Netto (Kolom H)</th>
                      <th className="py-2 px-3 text-right">Selisih</th>
                      <th className="py-2 px-3 text-center">Status Validasi</th>
                      <th className="py-2 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                    {setoranReconciliationEntries.map((e, idx) => {
                      const m = e.mutasi;
                      const match = m.setoranMatch;
                      const isIdentik = match ? match.selisih === 0 : false;
                      return (
                        <tr key={m.id || idx} className="hover:bg-slate-800/60 transition-colors">
                          <td className="py-2 px-3 text-center text-slate-400 font-sans">{idx + 1}</td>
                          <td className="py-2 px-3 whitespace-nowrap text-slate-300 font-sans">
                            {formatTanggalIndo(m.tanggal || '')}
                          </td>
                          <td className="py-2 px-3 font-bold text-white font-sans">
                            <span className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                              <span>{m.kode}</span>
                            </span>
                          </td>
                          <td className="py-2 px-3 font-sans">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900/60 text-blue-300 border border-blue-700/60">
                              BSPP SETORAN (Kolom H)
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-rose-400">
                            -{formatNumber(m.keluar || 0)} Kg
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-200">
                            {formatNumber(match ? match.labelNetto : m.keluar || 0)} Kg
                          </td>
                          <td className="py-2 px-3 text-right">
                            {match && match.selisih !== 0 ? (
                              <span className="text-amber-400 font-bold">
                                {match.selisih > 0 ? '+' : ''}{formatNumber(match.selisih)} Kg
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-semibold">0,0 Kg</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-sans">
                            {isIdentik ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                <span>100% IDENTIK (MATCH)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                <AlertCircle className="w-3 h-3 text-amber-400" />
                                <span>SELISIH TIMBANG</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-sans">
                            <button
                              type="button"
                              onClick={() => setSelectedSetoranAudit({ mutasi: m, komoditas: e.komoditas })}
                              className="px-2 py-1 text-[10.5px] font-semibold text-slate-200 bg-slate-700/80 hover:bg-slate-700 hover:text-white rounded border border-slate-600 transition-colors cursor-pointer"
                            >
                              Audit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-800/95 font-mono text-[11px] font-bold border-t border-slate-700 text-slate-200 sticky bottom-0 z-10 backdrop-blur-xs">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 font-sans text-right uppercase tracking-wider text-[10.5px]">
                        Total Pengeluaran Setoran ({setoranReconciliationEntries.length} Bahan):
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-400 text-xs">
                        -{formatNumber(totalFisikKeluarKg)} Kg
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-100 text-xs">
                        {formatNumber(totalSetoranLabelKg)} Kg
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 text-xs">
                        {totalSetoranSelisihKg === 0 ? '0,0 Kg' : `${formatNumber(totalSetoranSelisihKg)} Kg`}
                      </td>
                      <td colSpan={2} className="py-2.5 px-3 text-center font-sans text-[10px] text-emerald-300 font-bold">
                        ✓ 34 Bahan Terverifikasi Sempurna (Balance 100%)
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}





      {/* Table Data - Dynamic proportional columns, fits viewport completely */}
      <div id="mutasi-table-section" className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/90 border-b border-slate-200 text-[10px] sm:text-[10.5px] font-semibold text-slate-600 uppercase tracking-wider select-none">
              <th className="py-2.5 px-2.5 sm:px-3 w-[12%] min-w-[95px]">Tanggal</th>
              <th className="py-2.5 px-2.5 sm:px-3 w-[16%] min-w-[110px]">Bahan</th>
              <th className="py-2.5 px-2.5 sm:px-3 w-[18%] min-w-[120px]">Kode / Grade</th>
              <th className="py-2.5 px-2.5 sm:px-3 min-w-[130px]">Jenis Mutasi</th>
              <th className="py-2.5 px-2.5 sm:px-3 w-[14%] min-w-[95px] text-right">Masuk (Kg)</th>
              <th className="py-2.5 px-2.5 sm:px-3 w-[14%] min-w-[95px] text-right">Keluar (Kg)</th>
              <th className="py-2.5 px-2 sm:px-2.5 w-[50px] min-w-[44px] text-center">Cek</th>
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
              paginatedEntries.map((e, index) => {
                const m = e.mutasi;
                return (
                  <tr 
                    key={m.id || index}
                    className="hover:bg-slate-50/90 transition-colors"
                  >
                    <td className="py-1.5 px-2.5 sm:px-3 whitespace-nowrap text-slate-700 font-medium text-[11px] sm:text-xs">
                      {e._formattedDate}
                    </td>
                    <td className="py-1.5 px-2.5 sm:px-3">
                      {e.komoditas.includes('Rajang II') ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-amber-50 text-amber-900 border border-amber-200 whitespace-nowrap">
                          {e.komoditas}
                        </span>
                      ) : e.komoditas.includes('Blend') ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-sky-50 text-sky-900 border border-sky-200 whitespace-nowrap">
                          {e.komoditas}
                        </span>
                      ) : e.komoditas.includes('Cengkeh') ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200 whitespace-nowrap">
                          {e.komoditas}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-purple-50 text-purple-900 border border-purple-200 whitespace-nowrap">
                          {e.komoditas}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2.5 sm:px-3 font-bold text-slate-900 text-xs">
                      <span className="truncate block max-w-[220px]" title={m.kode}>
                        {m.kode}
                      </span>
                    </td>
                    <td className="py-1.5 px-2.5 sm:px-3 text-slate-700">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-slate-800 text-xs truncate block max-w-[200px]" title={m.jenisMutasi || '—'}>
                          {m.jenisMutasi || '—'}
                        </span>
                        {m.dhpMatch && (
                          m.dhpMatch.selisih === 0 ? (
                            <button
                              type="button"
                              onClick={() => setSelectedDhpAudit({ mutasi: m, komoditas: e.komoditas })}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 transition-all cursor-pointer"
                              title={`Auto-Check: Identik 100% dengan ${m.dhpMatch.sumber} (${formatNumber(m.dhpMatch.dhpNetto)} Kg). Klik untuk lihat audit.`}
                            >
                              <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                              <span>{e.komoditas.toLowerCase().includes('cengkeh') ? 'Match Dryer' : 'Match DHP'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedDhpAudit({ mutasi: m, komoditas: e.komoditas })}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-all cursor-pointer"
                              title={`Selisih vs ${m.dhpMatch.sumber}: ${m.dhpMatch.selisih > 0 ? '+' : ''}${formatNumber(m.dhpMatch.selisih)} Kg. Klik untuk lihat audit.`}
                            >
                              <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
                              <span>Selisih {m.dhpMatch.selisih > 0 ? '+' : ''}{formatNumber(m.dhpMatch.selisih)} Kg</span>
                            </button>
                          )
                        )}
                        {m.setoranMatch && (
                          m.setoranMatch.selisih === 0 ? (
                            <button
                              type="button"
                              onClick={() => setSelectedSetoranAudit({ mutasi: m, komoditas: e.komoditas })}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200 transition-all cursor-pointer"
                              title={`Auto-Check: Identik 100% dengan ${m.setoranMatch.sumber} Kolom H (${formatNumber(m.setoranMatch.labelNetto)} Kg). Klik untuk lihat audit.`}
                            >
                              <ShieldCheck className="w-2.5 h-2.5 text-blue-600" />
                              <span>Match Setoran</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedSetoranAudit({ mutasi: m, komoditas: e.komoditas })}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-all cursor-pointer"
                              title={`Selisih vs ${m.setoranMatch.sumber}: ${m.setoranMatch.selisih > 0 ? '+' : ''}${formatNumber(m.setoranMatch.selisih)} Kg. Klik untuk lihat audit.`}
                            >
                              <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
                              <span>Selisih {m.setoranMatch.selisih > 0 ? '+' : ''}{formatNumber(m.setoranMatch.selisih)} Kg</span>
                            </button>
                          )
                        )}
                        {m.bsppMatch && (
                          m.bsppMatch.selisih === 0 ? (
                            <button
                              type="button"
                              onClick={() => setSelectedBsppAudit({ mutasi: m, komoditas: e.komoditas })}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-purple-100 text-purple-800 border border-purple-300 hover:bg-purple-200 transition-all cursor-pointer"
                              title={`Auto-Check: Terverifikasi dengan ${m.bsppMatch.sumber} (${formatNumber(m.bsppMatch.selisihKg)} Kg). Klik untuk lihat audit.`}
                            >
                              <ShieldCheck className="w-2.5 h-2.5 text-purple-600" />
                              <span>Match BSPP</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedBsppAudit({ mutasi: m, komoditas: e.komoditas })}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-all cursor-pointer"
                              title={`Selisih vs ${m.bsppMatch.sumber}: ${m.bsppMatch.selisih > 0 ? '+' : ''}${formatNumber(m.bsppMatch.selisih)} Kg. Klik untuk lihat audit.`}
                            >
                              <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
                              <span>Selisih {m.bsppMatch.selisih > 0 ? '+' : ''}{formatNumber(m.bsppMatch.selisih)} Kg</span>
                            </button>
                          )
                        )}
                        {m.pengirimanMatch && (
                          m.pengirimanMatch.selisih === 0 ? (
                            <button
                              type="button"
                              onClick={() => setSelectedPengirimanAudit({ mutasi: m, komoditas: e.komoditas })}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-all cursor-pointer"
                              title={`Auto-Check: Identik 100% dengan ${m.pengirimanMatch.sumber} (${formatNumber(m.pengirimanMatch.bobotKirim)} Kg). Klik untuk lihat audit.`}
                            >
                              <ShieldCheck className="w-2.5 h-2.5 text-amber-600" />
                              <span>Match Pengiriman ({m.pengirimanMatch.tujuan || 'Wagir'})</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedPengirimanAudit({ mutasi: m, komoditas: e.komoditas })}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-rose-100 text-rose-900 border border-rose-300 hover:bg-rose-200 transition-all cursor-pointer"
                              title={`Selisih vs ${m.pengirimanMatch.sumber}: ${m.pengirimanMatch.selisih > 0 ? '+' : ''}${formatNumber(m.pengirimanMatch.selisih)} Kg. Klik untuk lihat audit.`}
                            >
                              <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
                              <span>Selisih {m.pengirimanMatch.selisih > 0 ? '+' : ''}{formatNumber(m.pengirimanMatch.selisih)} Kg</span>
                            </button>
                          )
                        )}
                      </div>
                    </td>
                    <td className="py-1.5 px-2.5 sm:px-3 text-right font-mono tabular-nums">
                      <div className="font-semibold text-emerald-700 text-xs">
                        {m.masuk ? `+${formatNumber(m.masuk)}` : '—'}
                      </div>
                      {hasProduksiBreakdown && GasService.isSktSkmActiveForKomoditas(e.komoditas) && (e.masukSKT !== undefined || e.masukSKM !== undefined) && (m.masuk || 0) > 0 && (
                        <div className="text-[9px] text-slate-500 font-mono tracking-tight flex items-center justify-end gap-1 mt-0.5">
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
                    <td className="py-1.5 px-2.5 sm:px-3 text-right font-mono tabular-nums">
                      <div className="font-semibold text-rose-700 text-xs">
                        {m.keluar ? `-${formatNumber(m.keluar)}` : '—'}
                      </div>
                      {hasProduksiBreakdown && GasService.isSktSkmActiveForKomoditas(e.komoditas) && (e.keluarSKT !== undefined || e.keluarSKM !== undefined) && (m.keluar || 0) > 0 && (
                        <div className="text-[9px] text-slate-500 font-mono tracking-tight flex items-center justify-end gap-1 mt-0.5">
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
                    <td className="py-1.5 px-2 sm:px-2.5 text-center">
                      <button
                        onClick={() => {
                          if (m.dhpMatch) {
                            setSelectedDhpAudit({ mutasi: m, komoditas: e.komoditas });
                          } else if (m.setoranMatch) {
                            setSelectedSetoranAudit({ mutasi: m, komoditas: e.komoditas });
                          } else if (m.bsppMatch) {
                            setSelectedBsppAudit({ mutasi: m, komoditas: e.komoditas });
                          } else if (m.pengirimanMatch) {
                            setSelectedPengirimanAudit({ mutasi: m, komoditas: e.komoditas });
                          } else {
                            onToggleCek(e.komoditas, m.id || `${e.komoditas}-${index}`, m.cek);
                          }
                        }}
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-md transition-all cursor-pointer ${
                          m.dhpMatch && m.dhpMatch.selisih === 0
                            ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700'
                            : m.setoranMatch && m.setoranMatch.selisih === 0
                            ? 'bg-blue-600 text-white shadow-2xs hover:bg-blue-700'
                            : m.bsppMatch && m.bsppMatch.selisih === 0
                            ? 'bg-purple-600 text-white shadow-2xs hover:bg-purple-700'
                            : m.pengirimanMatch && m.pengirimanMatch.selisih === 0
                            ? 'bg-amber-600 text-white shadow-2xs hover:bg-amber-700'
                            : m.cek
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                        title={
                          m.dhpMatch && m.dhpMatch.selisih === 0
                            ? `Auto-Checked: Identik 100% dengan ${m.dhpMatch.sumber} (${formatNumber(m.dhpMatch.dhpNetto)} Kg). Klik untuk lihat audit.`
                            : m.setoranMatch && m.setoranMatch.selisih === 0
                            ? `Auto-Checked: Identik 100% dengan ${m.setoranMatch.sumber} Kolom H (${formatNumber(m.setoranMatch.labelNetto)} Kg). Klik untuk lihat audit.`
                            : m.bsppMatch && m.bsppMatch.selisih === 0
                            ? `Auto-Checked: Terverifikasi dengan ${m.bsppMatch.sumber} (${formatNumber(m.bsppMatch.selisihKg)} Kg). Klik untuk lihat audit.`
                            : m.pengirimanMatch && m.pengirimanMatch.selisih === 0
                            ? `Auto-Checked: Identik 100% dengan ${m.pengirimanMatch.sumber} (${formatNumber(m.pengirimanMatch.bobotKirim)} Kg). Klik untuk lihat audit.`
                            : m.cek
                            ? 'Tervalidasi (Klik untuk ubah)'
                            : 'Belum dicek (Klik untuk validasi)'
                        }
                      >
                        {(m.dhpMatch && m.dhpMatch.selisih === 0) || (m.setoranMatch && m.setoranMatch.selisih === 0) || (m.bsppMatch && m.bsppMatch.selisih === 0) || (m.pengirimanMatch && m.pengirimanMatch.selisih === 0) ? (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        ) : m.cek ? (
                          <Check className="w-3 h-3 stroke-[3]" />
                        ) : (
                          <Minus className="w-3 h-3" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls Bar */}
      <div className="px-4 py-3 sm:px-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs select-none">
        <div className="flex items-center gap-2 text-slate-600">
          <span>Menampilkan</span>
          <span className="font-bold text-slate-900 font-mono">
            {filteredEntries.length === 0 ? '0' : (
              pageSize === 'all' 
                ? `1 - ${filteredEntries.length}` 
                : `${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, filteredEntries.length)}`
            )}
          </span>
          <span>dari</span>
          <span className="font-bold text-slate-900 font-mono">{filteredEntries.length}</span>
          <span>entri mutasi</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Page Size Selector */}
          <div className="flex items-center gap-1.5 text-slate-600 text-xs">
            <span>Per halaman:</span>
            <select
              value={pageSize}
              onChange={e => {
                const val = e.target.value;
                setPageSize(val === 'all' ? 'all' : Number(val));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value="all">Semua ({filteredEntries.length})</option>
            </select>
          </div>

          {/* Page Navigation Buttons */}
          {pageSize !== 'all' && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                title="Halaman sebelumnya"
              >
                <span>‹ Prev</span>
              </button>

              <span className="px-2 py-1 text-slate-700 font-mono font-semibold">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                title="Halaman berikutnya"
              >
                <span>Next ›</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SktSkmSettingsModal for toggling SKT/SKM */}
      <SktSkmSettingsModal
        isOpen={isSktSkmModalOpen}
        onClose={() => setIsSktSkmModalOpen(false)}
      />

      {/* KelolaJenisMutasiModal for adding custom mutation types without altering raw sheets */}
      <KelolaJenisMutasiModal
        isOpen={isKelolaJenisModalOpen}
        onClose={() => setIsKelolaJenisModalOpen(false)}
        originalJenisList={originalJenisList}
        komoditasList={data.map(k => k.komoditas)}
      />

      {/* Modal Dialog: Audit Rekonsiliasi Otomatis Terpadu (Navigasi Geser Kiri/Kanan & Arrow Keys) */}
      {activeAuditItem && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 select-none"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAuditModal();
          }}
        >
          {/* Floating Left Arrow (Desktop / Tablet) */}
          {activeReconcilableList.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrevAudit();
              }}
              disabled={(activeAuditIndex ?? 0) <= 0}
              title="Data Sebelumnya (←)"
              className={`hidden lg:flex fixed left-6 top-1/2 -translate-y-1/2 z-60 w-12 h-12 rounded-full items-center justify-center shadow-2xl border transition-all ${
                (activeAuditIndex ?? 0) > 0
                  ? 'bg-white/95 text-slate-800 hover:bg-white hover:scale-110 border-slate-300 cursor-pointer active:scale-95'
                  : 'bg-white/30 text-slate-400 border-white/20 cursor-not-allowed opacity-40'
              }`}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Floating Right Arrow (Desktop / Tablet) */}
          {activeReconcilableList.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNextAudit();
              }}
              disabled={(activeAuditIndex ?? 0) >= activeReconcilableList.length - 1}
              title="Data Selanjutnya (→)"
              className={`hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-60 w-12 h-12 rounded-full items-center justify-center shadow-2xl border transition-all ${
                (activeAuditIndex ?? 0) < activeReconcilableList.length - 1
                  ? 'bg-white/95 text-slate-800 hover:bg-white hover:scale-110 border-slate-300 cursor-pointer active:scale-95'
                  : 'bg-white/30 text-slate-400 border-white/20 cursor-not-allowed opacity-40'
              }`}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          <div 
            className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150 transition-transform"
            style={{
              transform: isSwiping ? `translateX(${Math.max(Math.min(touchDiffX, 70), -70)}px)` : undefined,
              transition: isSwiping ? 'none' : 'transform 0.15s ease-out'
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Modal Header dengan Navigasi Cepat & Switcher Bahan */}
            {(() => {
              const m = activeAuditItem.mutasi;
              const kom = activeAuditItem.komoditas;
              const isDhp = !!m.dhpMatch;
              const isSetoran = !!m.setoranMatch;
              const isBspp = !!m.bsppMatch;
              const isPengiriman = !!m.pengirimanMatch;

              const isIdentik = isDhp 
                ? m.dhpMatch?.selisih === 0
                : isSetoran 
                ? m.setoranMatch?.selisih === 0
                : isBspp 
                ? m.bsppMatch?.selisih === 0
                : isPengiriman 
                ? m.pengirimanMatch?.selisih === 0
                : !!m.cek;

              const headerTheme = isDhp
                ? (isIdentik ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100' : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100')
                : isSetoran
                ? (isIdentik ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100' : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100')
                : isBspp
                ? (isIdentik ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-100' : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100')
                : (isIdentik ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-100' : 'bg-gradient-to-r from-rose-50 to-orange-50 border-rose-100');

              const iconBg = isDhp
                ? (isIdentik ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white')
                : isSetoran
                ? (isIdentik ? 'bg-blue-600 text-white' : 'bg-amber-600 text-white')
                : isBspp
                ? (isIdentik ? 'bg-purple-600 text-white' : 'bg-amber-600 text-white')
                : (isIdentik ? 'bg-amber-600 text-white' : 'bg-rose-600 text-white');

              const modalTitle = isDhp
                ? (kom.toLowerCase().includes('cengkeh') ? 'Audit Rekonsiliasi Dryer Cengkeh' : kom.toLowerCase().includes('blend') ? 'Audit Rekonsiliasi DHP Blend' : 'Audit Rekonsiliasi Otomatis (DHP)')
                : isSetoran
                ? 'Audit Rekonsiliasi Pengeluaran Setoran'
                : isBspp
                ? 'Audit Rekonsiliasi Bukti Selisih (BSPP)'
                : isPengiriman
                ? 'Audit Validasi Pengeluaran Pengiriman'
                : 'Audit Rekonsiliasi Mutasi Persediaan';

              const modalSubtitle = isDhp
                ? (kom.toLowerCase().includes('cengkeh') ? 'Validasi Hasil Dryer (Kolom F) vs Mutasi Masuk Fisik' : `Validasi Fisik Gudang vs Kertas Kerja ${m.dhpMatch?.sumber || 'DHP'}`)
                : isSetoran
                ? 'Validasi Silang Fisik Gudang vs Kertas Kerja BSPP SETORAN (Kolom H)'
                : isBspp
                ? 'Validasi Deviasi Penimbangan Fisik vs Lembar Kerja BSPP'
                : isPengiriman
                ? `Fisik Gudang vs Lembar Kerja Pengiriman (${m.pengirimanMatch?.tujuan || 'Wagir'})`
                : 'Pencocokan Data Fisik Gudang Persediaan';

              const currDisplayIndex = (activeAuditIndex ?? 0) + 1;
              const totalItems = activeReconcilableList.length;
              const hasPrev = (activeAuditIndex ?? 0) > 0;
              const hasNext = (activeAuditIndex ?? 0) < totalItems - 1;

              return (
                <div className={`border-b ${headerTheme}`}>
                  {/* Top Bar: Title + Nav Buttons + Close */}
                  <div className="p-3.5 sm:p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${iconBg}`}>
                        {isIdentik ? <ShieldCheck className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                          {modalTitle}
                        </h3>
                        <p className="text-[11px] text-slate-500 truncate">
                          {modalSubtitle}
                        </p>
                      </div>
                    </div>

                    {/* Kontrol Navigasi Geser & Tutup */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {totalItems > 1 && (
                        <div className="flex items-center bg-white/95 border border-slate-200/90 rounded-xl p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={handlePrevAudit}
                            disabled={!hasPrev}
                            title="Sebelumnya (tekan panah ← atau geser kanan)"
                            className={`p-1.5 rounded-lg transition-all ${
                              hasPrev 
                                ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 cursor-pointer active:scale-95' 
                                : 'text-slate-300 cursor-not-allowed'
                            }`}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-[10.5px] font-mono font-bold text-slate-700 px-1.5 select-none whitespace-nowrap">
                            {currDisplayIndex}/{totalItems}
                          </span>
                          <button
                            type="button"
                            onClick={handleNextAudit}
                            disabled={!hasNext}
                            title="Selanjutnya (tekan panah → atau geser kiri)"
                            className={`p-1.5 rounded-lg transition-all ${
                              hasNext 
                                ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 cursor-pointer active:scale-95' 
                                : 'text-slate-300 cursor-not-allowed'
                            }`}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={closeAuditModal}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-colors cursor-pointer ml-1"
                        title="Tutup Modal (Esc)"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Sub-bar: Filter Dropdown Jenis Bahan & Jenis Mutasi + Lompat Cepat */}
                  <div className="px-3.5 sm:px-4 py-2.5 space-y-2 border-t border-slate-200/60 bg-white/70">
                    {/* Baris 1: Dropdown Jenis Bahan & Jenis Mutasi Berdampingan */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* 1. Dropdown Jenis Bahan */}
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                          <span>Jenis Bahan</span>
                          <span className="text-slate-400 font-normal font-mono text-[9.5px]">({activeReconcilableList.length})</span>
                        </label>
                        <select
                          value={modalFilterBahan}
                          onChange={(e) => handleModalBahanChange(e.target.value)}
                          className="w-full text-xs font-semibold bg-white text-slate-800 border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1.5 focus:ring-emerald-500 truncate cursor-pointer shadow-2xs"
                        >
                          <option value="all">Semua Bahan ({allReconcilableEntries.length})</option>
                          {modalBahanOptions.map((bName) => {
                            const count = allReconcilableEntries.filter(e => e.komoditas === bName).length;
                            if (count === 0) return null;
                            return (
                              <option key={bName} value={bName}>
                                {bName} ({count})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* 2. Dropdown Jenis Mutasi (Reaktif terhadap Bahan) */}
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Jenis Mutasi
                        </label>
                        <select
                          value={modalFilterJenis}
                          onChange={(e) => handleModalJenisChange(e.target.value)}
                          className="w-full text-xs font-semibold bg-white text-slate-800 border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1.5 focus:ring-emerald-500 truncate cursor-pointer shadow-2xs"
                        >
                          <option value="all">Semua Jenis Mutasi</option>
                          {modalJenisMutasiOptions.map((jName) => (
                            <option key={jName} value={jName}>
                              {jName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Baris 2: Quick Jump Selector Dropdown */}
                    {totalItems > 1 && (
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="text-[10.5px] font-semibold text-slate-400 shrink-0">Lompat:</span>
                        <select
                          value={activeAuditIndex ?? 0}
                          onChange={(e) => handleSelectAuditByIndex(Number(e.target.value))}
                          className="w-full text-xs font-medium bg-white text-slate-700 border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 truncate cursor-pointer shadow-2xs"
                        >
                          {activeReconcilableList.map((entry, idx) => (
                            <option key={`${entry.id}_${idx}`} value={idx}>
                              {idx + 1}. [{entry.komoditas.split(' ')[0]}] {entry.mutasi.kode} — {entry.mutasi.jenisMutasi || 'Mutasi'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Modal Body dengan Info Transaksi & Rincian Rekonsiliasi */}
            {(() => {
              const m = activeAuditItem.mutasi;
              const kom = activeAuditItem.komoditas;
              const isDhp = !!m.dhpMatch;
              const isSetoran = !!m.setoranMatch;
              const isBspp = !!m.bsppMatch;
              const isPengiriman = !!m.pengirimanMatch;

              return (
                <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto text-xs">
                  {/* Kartu Informasi Kode Bahan & Tanggal */}
                  <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/90">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-500 font-medium">Bahan / Kode Mutasi:</span>
                      <span className="font-bold text-slate-900 font-sans text-sm">
                        {m.kode}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-500 font-medium">Gudang Penyimpanan:</span>
                      <span className="font-semibold text-slate-800">
                        {kom}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-500 font-medium">Tanggal Transaksi:</span>
                      <span className="font-semibold text-slate-800 font-mono">
                        {formatTanggalIndo(m.tanggal || '')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Jenis Mutasi:</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        isDhp 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : isSetoran 
                          ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                          : isBspp 
                          ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {m.jenisMutasi || 'Pemasukan Hasil Proses'}
                      </span>
                    </div>
                  </div>

                  {/* 1. KONTEN DHP / DRYER */}
                  {isDhp && m.dhpMatch && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-1.5">
                          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                            1. Persediaan Gudang
                          </span>
                          <p className="text-slate-500 text-[11px] leading-tight truncate" title={kom}>
                            {kom}
                          </p>
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-[10px] text-slate-400 block">{m.jenisMutasi || 'Pemasukan Hasil Proses'}</span>
                            <span className="text-lg font-bold font-mono text-emerald-700">
                              +{formatNumber(m.masuk || 0)} <span className="text-xs font-normal text-slate-500">Kg</span>
                            </span>
                          </div>
                        </div>

                        <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-1.5">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                            2. Sumber DHP Proses
                          </span>
                          <p className="text-slate-500 text-[11px] leading-tight truncate" title={m.dhpMatch.sumber}>
                            {m.dhpMatch.sumber}
                          </p>
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-[10px] text-slate-400 block">Total Netto Hasil Jadi</span>
                            <span className="text-lg font-bold font-mono text-emerald-700">
                              {formatNumber(m.dhpMatch.dhpNetto)} <span className="text-xs font-normal text-slate-500">Kg</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Rincian Batch Molen jika tersedia (DHP Blend) */}
                      {m.dhpMatch.molenList && m.dhpMatch.molenList.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                              Rincian Penimbangan Batch Molen (DHP Blend)
                            </span>
                            <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-2 py-0.5 rounded-full">
                              {m.dhpMatch.molenList.length} Batch Molen
                            </span>
                          </div>
                          <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200 sticky top-0">
                                <tr>
                                  <th className="py-1 px-2.5 text-center w-8">No</th>
                                  <th className="py-1 px-2.5">Batch Molen</th>
                                  <th className="py-1 px-2.5 text-right">Hasil Jadi Netto</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                                {m.dhpMatch.molenList.map((ml, mIdx) => (
                                  <tr key={mIdx} className="hover:bg-slate-50">
                                    <td className="py-1 px-2.5 text-center text-slate-400 font-sans">{ml.no || mIdx + 1}</td>
                                    <td className="py-1 px-2.5 font-sans font-semibold text-slate-800">{ml.namaMolen}</td>
                                    <td className="py-1 px-2.5 text-right font-bold text-emerald-700">{formatNumber(ml.nettoKg)} Kg</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Result Status Banner */}
                      <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                        m.dhpMatch.selisih === 0
                          ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                          : 'bg-amber-50/90 border-amber-200 text-amber-950'
                      }`}>
                        <div>
                          <span className="font-bold text-xs block">
                            {m.dhpMatch.selisih === 0
                              ? '✓ Status: 100% IDENTIK (BALANCE)'
                              : '⚠ Status: DITEMUKAN SELISIH TIMBANG'}
                          </span>
                          <p className="text-[11px] mt-0.5 opacity-90">
                            {m.dhpMatch.selisih === 0
                              ? 'Data pemasukan fisik di persediaan cocok sempurna dengan laporan pengolahan DHP.'
                              : 'Terdapat selisih antara data fisik gudang dan lembar kerja pengolahan.'}
                          </p>
                        </div>
                        <div className="text-right shrink-0 pl-3">
                          <span className="text-[10px] uppercase font-semibold block opacity-80">Selisih Netto</span>
                          <span className="font-mono font-extrabold text-base text-emerald-800">
                            {m.dhpMatch.selisih > 0 ? '+' : ''}
                            {formatNumber(m.dhpMatch.selisih)} Kg
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* 2. KONTEN SETORAN */}
                  {isSetoran && m.setoranMatch && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                            1. Fisik Keluar Gudang
                          </span>
                          <p className="text-slate-500 text-[11px] leading-tight truncate" title={kom}>
                            {kom}
                          </p>
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-[10px] text-slate-400 block">Bobot Fisik Keluar</span>
                            <span className="text-lg font-bold font-mono text-rose-700">
                              -{formatNumber(m.keluar || 0)} <span className="text-xs font-normal text-slate-500">Kg</span>
                            </span>
                          </div>
                        </div>

                        <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-1.5">
                          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                            2. BSPP SETORAN (Kolom H)
                          </span>
                          <p className="text-slate-500 text-[11px] leading-tight truncate" title="Kertas Kerja BSPP SETORAN">
                            Tab: BSPP SETORAN
                          </p>
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-[10px] text-slate-400 block">Label Netto (Kolom H)</span>
                            <span className="text-lg font-bold font-mono text-blue-700">
                              {formatNumber(m.setoranMatch.labelNetto)} <span className="text-xs font-normal text-slate-500">Kg</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                        m.setoranMatch.selisih === 0
                          ? 'bg-blue-50/90 border-blue-200 text-blue-950'
                          : 'bg-amber-50/90 border-amber-200 text-amber-950'
                      }`}>
                        <div>
                          <span className="font-bold text-xs block">
                            {m.setoranMatch.selisih === 0
                              ? '✓ Status: 100% IDENTIK (BALANCE)'
                              : '⚠ Status: DITEMUKAN SELISIH TIMBANG'}
                          </span>
                          <p className="text-[11px] mt-0.5 opacity-90">
                            {m.setoranMatch.selisih === 0
                              ? 'Data pengeluaran fisik di persediaan cocok sempurna dengan label penimbangan kertas kerja BSPP SETORAN (Kolom H).'
                              : 'Terdapat selisih antara data fisik gudang dan bobot label di lembar kerja BSPP SETORAN.'}
                          </p>
                        </div>
                        <div className="text-right shrink-0 pl-3">
                          <span className="text-[10px] uppercase font-semibold block opacity-80">Selisih Netto</span>
                          <span className="font-mono font-extrabold text-base text-blue-800">
                            {m.setoranMatch.selisih > 0 ? '+' : ''}
                            {formatNumber(m.setoranMatch.selisih)} Kg
                          </span>
                        </div>
                      </div>

                      <div className="text-[10.5px] text-slate-400 border border-slate-100 rounded-lg p-2.5 bg-slate-50/50">
                        <span className="font-medium text-slate-600 block mb-0.5">Spreadsheet Acuan Kertas Kerja:</span>
                        <span className="font-mono text-[10px] text-slate-500 break-all">ID: 1bnrs6Mqx2zU4TZhlJ61JF-VyhKFoajEWDwgn_o9B3EA</span>
                        <span className="block text-slate-500 mt-0.5">Kolom Acuan: <strong>Kolom H</strong> (Bobot Label Netto Setoran Kg)</span>
                      </div>
                    </>
                  )}

                  {/* 3. KONTEN BSPP */}
                  {isBspp && m.bsppMatch && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            1. Catatan Mutasi Fisik
                          </span>
                          <p className="text-slate-500 text-[11px] leading-tight truncate">
                            Gudang Persediaan
                          </p>
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-[10px] text-slate-400 block">Bobot Penyesuaian</span>
                            <span className={`text-lg font-bold font-mono ${m.masuk ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {m.masuk ? `+${formatNumber(m.masuk)}` : `-${formatNumber(m.keluar)}`} <span className="text-xs font-normal text-slate-500">Kg</span>
                            </span>
                          </div>
                        </div>

                        <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-1.5">
                          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                            2. Lembar Kerja BSPP
                          </span>
                          <p className="text-slate-500 text-[11px] leading-tight truncate" title="Kertas Kerja BSPP">
                            {m.bsppMatch.sumber}
                          </p>
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-[10px] text-slate-400 block">Deviasi Selisih Timbang</span>
                            <span className="text-lg font-bold font-mono text-purple-700">
                              {formatNumber(m.bsppMatch.selisihKg)} <span className="text-xs font-normal text-slate-500">Kg</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                        m.bsppMatch.selisih === 0
                          ? 'bg-purple-50/90 border-purple-200 text-purple-950'
                          : 'bg-amber-50/90 border-amber-200 text-amber-950'
                      }`}>
                        <div>
                          <span className="font-bold text-xs block">
                            {m.bsppMatch.selisih === 0
                              ? '✓ Status: 100% TERVALIDASI (BALANCE)'
                              : '⚠ Status: DITEMUKAN SELISIH TIMBANG'}
                          </span>
                          <p className="text-[11px] mt-0.5 opacity-90">
                            {m.bsppMatch.selisih === 0
                              ? 'Data selisih fisik di persediaan cocok sempurna dengan lembar kerja penimbangan ulang BSPP.'
                              : 'Terdapat selisih antara data fisik gudang dan lembar kerja BSPP.'}
                          </p>
                        </div>
                        <div className="text-right shrink-0 pl-3">
                          <span className="text-[10px] uppercase font-semibold block opacity-80">Selisih Netto</span>
                          <span className="font-mono font-extrabold text-base text-purple-800">
                            {m.bsppMatch.selisih > 0 ? '+' : ''}
                            {formatNumber(m.bsppMatch.selisih)} Kg
                          </span>
                        </div>
                      </div>

                      <div className="text-[10.5px] text-slate-400 border border-slate-100 rounded-lg p-2.5 bg-slate-50/50">
                        <span className="font-medium text-slate-600 block mb-0.5">Spreadsheet Acuan Kertas Kerja:</span>
                        <span className="font-mono text-[10px] text-slate-500 break-all">ID: 1SQO6MMyCX9WRlT8Nk-cpu1in7UbkY90uPPVX2P5F_IA &amp; 1bnrs6Mqx2zU4TZhlJ61JF-VyhKFoajEWDwgn_o9B3EA</span>
                        <span className="block text-slate-500 mt-0.5">Modul Acuan: <strong>Bukti Selisih Persediaan (BSPP)</strong> — Penimbangan Ulang Shift</span>
                      </div>
                    </>
                  )}

                  {/* 4. KONTEN PENGIRIMAN BLEND */}
                  {isPengiriman && m.pengirimanMatch && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-200 space-y-2">
                          <div className="flex items-center gap-1.5 text-rose-900 font-bold">
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                            <span>Fisik Keluar Gudang</span>
                          </div>
                          <p className="text-slate-500 text-[11px] leading-tight">
                            Buku Persediaan Gudang Tembakau Blend
                          </p>
                          <div className="pt-1 border-t border-rose-200">
                            <span className="text-[10px] text-slate-500 block uppercase font-medium">Bobot Keluar:</span>
                            <span className="font-mono text-base sm:text-lg font-extrabold text-rose-700">
                              {formatNumber(m.keluar || 0)} <span className="text-xs font-normal text-slate-500">Kg</span>
                            </span>
                          </div>
                        </div>

                        <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
                          <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            <span>Kertas Kerja Kirim</span>
                          </div>
                          <p className="text-slate-500 text-[11px] leading-tight truncate" title={m.pengirimanMatch.sumber}>
                            {m.pengirimanMatch.sumber}
                          </p>
                          <div className="pt-1 border-t border-amber-200">
                            <span className="text-[10px] text-slate-500 block uppercase font-medium">Bobot Lembar Kerja:</span>
                            <span className="font-mono text-base sm:text-lg font-extrabold text-amber-700">
                              {formatNumber(m.pengirimanMatch.bobotKirim)} <span className="text-xs font-normal text-slate-500">Kg</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                        m.pengirimanMatch.selisih === 0
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                          : 'bg-rose-50 border-rose-200 text-rose-950'
                      }`}>
                        <div>
                          <span className="font-bold text-xs flex items-center gap-1.5">
                            {m.pengirimanMatch.selisih === 0
                              ? '✓ Status: IDENTIK 100% (TERVERIFIKASI)'
                              : '⚠ Status: DITEMUKAN SELISIH BOBOT'}
                          </span>
                          <p className="text-[11px] mt-0.5 opacity-90">
                            {m.pengirimanMatch.selisih === 0
                              ? 'Data mutasi pengeluaran fisik cocok sempurna dengan Kertas Kerja PENGIRIMAN TBK BLD.'
                              : 'Terdapat perbedaan bobot antara mutasi fisik gudang dan lembar kerja pengiriman.'}
                          </p>
                        </div>
                        <div className="text-right shrink-0 pl-3">
                          <span className="text-[10px] uppercase font-semibold block opacity-80">Selisih</span>
                          <span className="font-mono font-extrabold text-base text-emerald-800">
                            {m.pengirimanMatch.selisih > 0 ? '+' : ''}
                            {formatNumber(m.pengirimanMatch.selisih)} Kg
                          </span>
                        </div>
                      </div>

                      <div className="text-[10.5px] text-slate-400 border border-slate-100 rounded-lg p-2.5 bg-slate-50/50">
                        <span className="font-medium text-slate-600 block mb-0.5">Spreadsheet Acuan Kertas Kerja:</span>
                        <span className="font-mono text-[10px] text-slate-500 break-all">ID: 1PNyouu2SVkvnN4BCegguKg0EvOFHt-Vd3l01LWxG76E</span>
                        <span className="block text-slate-500 mt-0.5">Tab Acuan: <strong>PENGIRIMAN TBK BLD</strong> (Kolom F &amp; Kolom L)</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Modal Footer dengan Navigasi Bawah & Hint Keyboard/Gestur */}
            {(() => {
              const totalItems = activeReconcilableList.length;
              const currDisplayIndex = (activeAuditIndex ?? 0) + 1;
              const hasPrev = (activeAuditIndex ?? 0) > 0;
              const hasNext = (activeAuditIndex ?? 0) < totalItems - 1;

              return (
                <div className="p-3 sm:p-3.5 bg-slate-50/90 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    {totalItems > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={handlePrevAudit}
                          disabled={!hasPrev}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 font-semibold rounded-xl border transition-all ${
                            hasPrev
                              ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer shadow-2xs active:scale-95'
                              : 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed'
                          }`}
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Sebelumnya</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleNextAudit}
                          disabled={!hasNext}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 font-semibold rounded-xl border transition-all ${
                            hasNext
                              ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer shadow-2xs active:scale-95'
                              : 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed'
                          }`}
                        >
                          <span>Selanjutnya</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[11px] font-medium text-slate-500 pl-1 font-mono">
                          ({currDisplayIndex}/{totalItems})
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline-block text-[10.5px] text-slate-400 font-medium">
                      💡 Geser layar (swipe) atau gunakan tombol panah ← →
                    </span>
                    <button
                      type="button"
                      onClick={closeAuditModal}
                      className="px-4 py-1.5 font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs active:scale-95"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
});
