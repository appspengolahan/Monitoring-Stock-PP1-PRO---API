import React, { useState, useMemo } from 'react';
import { BSPPData } from '../../types';
import { exportToPdf } from '../../services/pdfExport';
import { 
  Scale, 
  Download, 
  TrendingUp, 
  BarChart2, 
  Calendar,
  Layers,
  Info,
  RotateCcw
} from 'lucide-react';

interface BSPPPanelProps {
  bsppList: BSPPData[];
}

export const BSPPPanel: React.FC<BSPPPanelProps> = ({ bsppList }) => {
  const [selectedBahanIndex, setSelectedBahanIndex] = useState<number>(0);
  const [filterJenis, setFilterJenis] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<'bulan_berjalan' | 'semua' | 'custom'>('bulan_berjalan');
  const [filterFrom, setFilterFrom] = useState<string>('');
  const [filterTo, setFilterTo] = useState<string>('');
  const [filterGranularity, setFilterGranularity] = useState<'bulan' | 'entri'>('bulan');

  const currentData = bsppList[selectedBahanIndex] || bsppList[0];

  const formatNumber = (n: number): string => {
    return Number(n).toLocaleString('id-ID', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
  };

  const formatPercent = (n: number): string => {
    return Number(n).toLocaleString('id-ID', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatTanggalIndo = (dateStr: string): string => {
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

  const formatTanggalPendek = (dateStr: string): string => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short'
    });
  };

  // Bulan berjalan / bulan terbaru yang tercatat pada data
  const latestMonthKey = useMemo(() => {
    if (!currentData || !currentData.entries || currentData.entries.length === 0) return '';
    let max = '';
    currentData.entries.forEach(e => {
      const ym = (e.tanggal || '').slice(0, 7);
      if (ym > max) max = ym;
    });
    return max;
  }, [currentData]);

  const latestMonthLabel = useMemo(() => {
    if (!latestMonthKey) return '';
    const d = new Date(latestMonthKey + '-01');
    if (isNaN(d.getTime())) return latestMonthKey;
    return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }, [latestMonthKey]);

  // Filter entries based on controls & periode bulan berjalan
  const filteredEntries = useMemo(() => {
    if (!currentData || !currentData.entries) return [];
    return currentData.entries.filter(e => {
      if (filterJenis !== 'all' && e.jenis !== filterJenis) return false;
      
      const itemDate = (e.tanggal || '').slice(0, 10);
      if (filterFrom || filterTo) {
        if (filterFrom && itemDate < filterFrom) return false;
        if (filterTo && itemDate > filterTo) return false;
      } else if (filterPeriod === 'bulan_berjalan' && latestMonthKey) {
        if ((e.tanggal || '').slice(0, 7) !== latestMonthKey) return false;
      }

      return true;
    });
  }, [currentData, filterJenis, filterFrom, filterTo, filterPeriod, latestMonthKey]);

  // Table entries sorted DESCENDING (paling atas menampilkan tanggal terbaru)
  const tableEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      const dateA = new Date(a.tanggal).getTime() || 0;
      const dateB = new Date(b.tanggal).getTime() || 0;
      return dateB - dateA;
    });
  }, [filteredEntries]);

  // Chronological entries ASCENDING (untuk grafik garis dan batang time-series dari kiri ke kanan)
  const chronologicalEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      const dateA = new Date(a.tanggal).getTime() || 0;
      const dateB = new Date(b.tanggal).getTime() || 0;
      return dateA - dateB;
    });
  }, [filteredEntries]);

  // Aggregate weighted statistics
  const stats = useMemo(() => {
    let sumLabel = 0;
    let sumTimbang = 0;
    let lebih = 0;
    let kurang = 0;
    let tanpa = 0;

    filteredEntries.forEach(e => {
      sumLabel += e.labelNetto || 0;
      sumTimbang += e.timbangUlang || 0;
      if (e.status.includes('Lebih')) lebih++;
      else if (e.status.includes('Kurang')) kurang++;
      else tanpa++;
    });

    const totalSelisihKg = sumLabel - sumTimbang;
    const totalSelisihPersen = sumLabel > 0 ? (totalSelisihKg / sumLabel) * 100 : 0;

    return {
      count: filteredEntries.length,
      sumLabel,
      sumTimbang,
      totalSelisihKg,
      totalSelisihPersen,
      lebih,
      kurang,
      tanpa
    };
  }, [filteredEntries]);

  // Palette colors for distinct varieties (matching reference chart)
  const LINE_COLORS = [
    '#0284c7', // Sky Blue
    '#047857', // Emerald Green
    '#b91c1c', // Ruby Red
    '#7c3aed', // Purple Violet
    '#ea580c', // Orange
    '#0d9488', // Teal
    '#d97706', // Amber
    '#4338ca', // Indigo
    '#be185d'  // Pink
  ];

  // Distinct kinds present in the filtered set
  const presentJenisList = useMemo(() => {
    const set = new Set<string>();
    filteredEntries.forEach(e => {
      if (e.jenis) set.add(e.jenis);
    });
    return Array.from(set);
  }, [filteredEntries]);

  // Chronological ordered months (untuk mode 'bulan')
  const monthsKeys = useMemo(() => {
    const set = new Set<string>();
    filteredEntries.forEach(e => {
      const d = new Date(e.tanggal);
      if (!isNaN(d.getTime())) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        set.add(key);
      }
    });
    return Array.from(set).sort();
  }, [filteredEntries]);

  // Multi-line chart data (Per Bulan): for each month, calculate weighted selisih% per jenis
  const lineChartMonthlyData = useMemo(() => {
    const map: { [month: string]: { [jenis: string]: { sumLabel: number; sumSelisih: number } } } = {};
    
    filteredEntries.forEach(e => {
      const d = new Date(e.tanggal);
      if (isNaN(d.getTime())) return;
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map[mKey]) map[mKey] = {};
      if (!map[mKey][e.jenis]) {
        map[mKey][e.jenis] = { sumLabel: 0, sumSelisih: 0 };
      }
      map[mKey][e.jenis].sumLabel += e.labelNetto || 0;
      map[mKey][e.jenis].sumSelisih += (e.labelNetto - e.timbangUlang);
    });

    return map;
  }, [filteredEntries]);

  // Monthly aggregated data for bar chart (Lebih vs Kurang Kg)
  const monthlyBarData = useMemo(() => {
    const map: { [month: string]: { label: string; lebihKg: number; kurangKg: number } } = {};
    
    filteredEntries.forEach(e => {
      const d = new Date(e.tanggal);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
      if (!map[key]) {
        map[key] = { label, lebihKg: 0, kurangKg: 0 };
      }
      if (e.status.includes('Lebih')) {
        map[key].lebihKg += Math.abs(e.selisihKg);
      } else if (e.status.includes('Kurang')) {
        map[key].kurangKg += Math.abs(e.selisihKg);
      }
    });

    return monthsKeys.map(k => ({
      key: k,
      label: map[k]?.label || k,
      lebihKg: map[k]?.lebihKg || 0,
      kurangKg: map[k]?.kurangKg || 0
    }));
  }, [filteredEntries, monthsKeys]);

  // SVG Chart Geometry Constants
  const SVG_WIDTH = 1000;
  const SVG_HEIGHT = 280;
  const PADDING = { top: 25, right: 30, bottom: 45, left: 60 };
  const CHART_W = SVG_WIDTH - PADDING.left - PADDING.right;
  const CHART_H = SVG_HEIGHT - PADDING.top - PADDING.bottom;

  // Max value for Bar Chart scaling (Dinamis antara mode bulan & mode entri)
  const maxBarKg = useMemo(() => {
    let max = 15;
    if (filterGranularity === 'bulan') {
      monthlyBarData.forEach(m => {
        if (m.lebihKg > max) max = m.lebihKg;
        if (m.kurangKg > max) max = m.kurangKg;
      });
      return Math.ceil(max * 1.15 / 20) * 20 || 20;
    } else {
      chronologicalEntries.forEach(e => {
        const absKg = Math.abs(e.selisihKg);
        if (absKg > max) max = absKg;
      });
      return Math.ceil(max * 1.15 / 5) * 5 || 15;
    }
  }, [filterGranularity, monthlyBarData, chronologicalEntries]);

  // Y-axis range for Trend Selisih % Line Chart (Dinamis antara mode bulan & mode entri)
  const yDomainTrend = useMemo(() => {
    let min = -0.5;
    let max = 0.5;

    if (filterGranularity === 'bulan') {
      monthsKeys.forEach(mKey => {
        const jMap = lineChartMonthlyData[mKey];
        if (jMap) {
          Object.keys(jMap).forEach(j => {
            const val = jMap[j];
            if (val.sumLabel > 0) {
              const pct = (val.sumSelisih / val.sumLabel) * 100;
              if (pct < min) min = pct;
              if (pct > max) max = pct;
            }
          });
        }
      });
    } else {
      chronologicalEntries.forEach(e => {
        if (e.selisihPersen < min) min = e.selisihPersen;
        if (e.selisihPersen > max) max = e.selisihPersen;
      });
    }

    // Add margin and round to nearest 0.2%
    const yMin = Math.floor((min - 0.2) * 5) / 5;
    const yMax = Math.ceil((max + 0.2) * 5) / 5;
    return { min: yMin, max: yMax };
  }, [filterGranularity, monthsKeys, lineChartMonthlyData, chronologicalEntries]);

  // Helpers to get (x, y) coordinates for line chart
  const getXForMonthIndex = (index: number, total: number) => {
    if (total <= 1) return PADDING.left + CHART_W / 2;
    return PADDING.left + (index / (total - 1)) * CHART_W;
  };

  const getXForEntryIndex = (index: number, total: number) => {
    if (total <= 1) return PADDING.left + CHART_W / 2;
    return PADDING.left + (index / (total - 1)) * CHART_W;
  };

  const getYForPercent = (pct: number) => {
    const range = yDomainTrend.max - yDomainTrend.min || 1;
    const normalized = (pct - yDomainTrend.min) / range;
    return PADDING.top + CHART_H - normalized * CHART_H;
  };

  // Generate tick marks for Line Chart Y-axis
  const yTicksTrend = useMemo(() => {
    const ticks: number[] = [];
    const step = 0.2; // 0.20% increments
    for (let v = yDomainTrend.min; v <= yDomainTrend.max + 0.001; v += step) {
      ticks.push(Number(v.toFixed(2)));
    }
    return ticks;
  }, [yDomainTrend]);

  // Y-axis ticks for Bar Chart (Kg)
  const yTicksBar = useMemo(() => {
    const step = maxBarKg / 5;
    return [0, step * 1, step * 2, step * 3, step * 4, maxBarKg];
  }, [maxBarKg]);

  // X-axis sampled ticks for 'entri' mode to prevent label collisions
  const entryXAxisTicks = useMemo(() => {
    const count = chronologicalEntries.length;
    if (count === 0) return [];
    if (count <= 10) {
      return chronologicalEntries.map((e, idx) => ({
        idx,
        x: getXForEntryIndex(idx, count),
        label: formatTanggalPendek(e.tanggal)
      }));
    }
    const ticks: { idx: number; x: number; label: string }[] = [];
    const stepCount = 8;
    for (let i = 0; i < stepCount; i++) {
      const idx = Math.min(count - 1, Math.round((i * (count - 1)) / (stepCount - 1)));
      if (!ticks.some(t => t.idx === idx)) {
        ticks.push({
          idx,
          x: getXForEntryIndex(idx, count),
          label: formatTanggalPendek(chronologicalEntries[idx].tanggal)
        });
      }
    }
    return ticks;
  }, [chronologicalEntries]);

  // If user has no access to any BSPP commodities
  if (!currentData || bsppList.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8 sm:p-12 text-center max-w-2xl mx-auto my-6 animate-in fade-in">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center mx-auto mb-4">
          <Scale className="w-7 h-7" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
          Akses BSPP Dibatasi
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto mb-4">
          Akun Anda memiliki izin khusus bahan baku tertentu. Modul Bukti Selisih Persediaan (BSPP) saat ini hanya tersedia dan dikhususkan untuk komoditas <span className="font-semibold text-slate-800">Cengkeh</span> dan <span className="font-semibold text-slate-800">Tembakau &amp; Krosok (Rajang II)</span>.
        </p>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
          <Info className="w-3.5 h-3.5 text-slate-500" />
          <span>Hubungi Site Engineer / Lead Dev untuk penambahan wewenang audit BSPP</span>
        </div>
      </div>
    );
  }

  // Export PDF Handler
  const handleExportPdf = () => {
    const head = ['Tanggal', 'Jenis', 'Label Netto (Kg)', 'Timbang Ulang (Kg)', 'Selisih (Kg)', 'Selisih (%)', 'Status'];
    const body = tableEntries.map(e => [
      formatTanggalIndo(e.tanggal),
      e.jenis,
      formatNumber(e.labelNetto),
      formatNumber(e.timbangUlang),
      formatNumber(e.selisihKg),
      `${formatPercent(e.selisihPersen)}%`,
      e.status
    ]);

    exportToPdf({
      title: `Rekap BSPP (Bukti Selisih Persediaan) - ${currentData.nama}`,
      infoLines: [
        `Komoditas: ${currentData.nama} | Jenis: ${filterJenis === 'all' ? 'Semua Jenis' : filterJenis}`,
        `Periode: ${filterPeriod === 'bulan_berjalan' ? `Bulan Berjalan (${latestMonthLabel})` : filterFrom || filterTo ? `${filterFrom || 'Awal'} s/d ${filterTo || 'Sekarang'}` : 'Semua Periode'} | Granularitas: ${filterGranularity === 'bulan' ? 'Per Bulan' : 'Per Entri'}`,
        `Jumlah Data: ${stats.count} transaksi | Akumulasi Selisih: ${formatNumber(stats.totalSelisihKg)} Kg (${formatPercent(stats.totalSelisihPersen)}%)`,
        `Frekuensi Status: ${stats.lebih} Lebih / ${stats.kurang} Kurang / ${stats.tanpa} Tanpa Selisih`
      ],
      head,
      body,
      fileName: `BSPP_${currentData.nama.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
            <Scale className="w-4 h-4" />
            <span>Audit Bukti Selisih Persediaan</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            BSPP (Bukti Selisih Persediaan) — {currentData.nama}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporan komparasi berat karung vendor vs timbang ulang gudang penerimaan secara real-time
          </p>
        </div>

        <button
          onClick={handleExportPdf}
          disabled={tableEntries.length === 0}
          className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 transition-colors shrink-0 shadow-xs cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export PDF</span>
        </button>
      </div>

      {/* Control Filter Bar - Complete with Period & Date Range Selection */}
      <div className="px-4 py-3 sm:px-5 sm:py-3 bg-slate-50/70 border-b border-slate-200 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs">
          {/* Bahan Selector */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600 whitespace-nowrap text-[11px]">Bahan:</span>
            <select
              value={selectedBahanIndex}
              onChange={e => {
                setSelectedBahanIndex(Number(e.target.value));
                setFilterJenis('all');
              }}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 shadow-2xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
            >
              {bsppList.map((b, idx) => (
                <option key={b.nama} value={idx}>
                  {b.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Jenis Selector */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600 whitespace-nowrap text-[11px]">Jenis:</span>
            <select
              value={filterJenis}
              onChange={e => setFilterJenis(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 shadow-2xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden max-w-[180px] truncate"
            >
              <option value="all">Semua jenis</option>
              {currentData.jenisList.map(j => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>

          {/* Grafik Selector (Per Bulan / Per Entri) */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600 whitespace-nowrap text-[11px]">Grafik:</span>
            <select
              value={filterGranularity}
              onChange={e => setFilterGranularity(e.target.value as 'bulan' | 'entri')}
              className="bg-white border border-blue-300 font-bold text-blue-800 rounded-lg px-2.5 py-1.5 shadow-2xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
            >
              <option value="bulan">Per bulan</option>
              <option value="entri">Per entri</option>
            </select>
          </div>

          {/* Periode BSPP Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600 whitespace-nowrap text-[11px]">Periode:</span>
            <select
              value={filterPeriod}
              onChange={e => {
                const val = e.target.value as 'bulan_berjalan' | 'semua' | 'custom';
                setFilterPeriod(val);
                if (val !== 'custom') {
                  setFilterFrom('');
                  setFilterTo('');
                }
              }}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 shadow-2xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="bulan_berjalan">Bulan Berjalan {latestMonthLabel ? `(${latestMonthLabel})` : ''}</option>
              <option value="semua">Semua Periode</option>
              <option value="custom">Pilih Rentang Tanggal</option>
            </select>
          </div>

          {/* Dari Tanggal */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600 whitespace-nowrap text-[11px]">Dari:</span>
            <input
              type="date"
              value={filterFrom}
              onChange={e => {
                setFilterFrom(e.target.value);
                setFilterPeriod('custom');
              }}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-700 shadow-2xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden text-xs"
            />
          </div>

          {/* Sampai Tanggal */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600 whitespace-nowrap text-[11px]">Sampai:</span>
            <input
              type="date"
              value={filterTo}
              onChange={e => {
                setFilterTo(e.target.value);
                setFilterPeriod('custom');
              }}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-700 shadow-2xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden text-xs"
            />
          </div>

          {/* Tombol Cepat Kembali ke Bulan Berjalan */}
          {(filterPeriod !== 'bulan_berjalan' || filterFrom || filterTo || filterJenis !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setFilterPeriod('bulan_berjalan');
                setFilterFrom('');
                setFilterTo('');
                setFilterJenis('all');
              }}
              className="inline-flex items-center gap-1 text-[11px] text-blue-700 hover:text-blue-900 underline font-semibold cursor-pointer whitespace-nowrap py-1"
              title="Kembalikan ke tampilan data bulan berjalan"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Bulan Berjalan</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Bar Periode Aktif */}
      <div className="px-4 py-2 sm:px-5 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs select-none">
        <div className="flex items-center gap-2">
          {filterPeriod === 'bulan_berjalan' && latestMonthLabel ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200 font-semibold text-[11px]">
              <span>⚡ Menampilkan Data Bulan Berjalan:</span>
              <span className="font-bold">{latestMonthLabel}</span>
              <span className="font-mono text-blue-700">({filteredEntries.length} entri)</span>
            </span>
          ) : filterFrom || filterTo ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-900 border border-indigo-200 font-semibold text-[11px]">
              <span>📅 Rentang Tanggal:</span>
              <span className="font-bold">{filterFrom || 'Awal'} s/d {filterTo || 'Sekarang'}</span>
              <span className="font-mono text-indigo-700">({filteredEntries.length} entri)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white text-slate-800 border border-slate-200 font-semibold text-[11px]">
              <span>🌐 Menampilkan Semua Periode:</span>
              <span className="font-mono text-slate-700">({filteredEntries.length} entri)</span>
            </span>
          )}

          <span className="text-[10.5px] px-2 py-0.5 rounded bg-white border border-slate-200 font-medium text-slate-600 hidden md:inline">
            Mode Grafik: <span className="font-bold text-blue-700">{filterGranularity === 'bulan' ? 'Per Bulan' : 'Per Entri Transaksi'}</span>
          </span>
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          Tabel data: <span className="font-semibold text-slate-700">Tanggal Terbaru di Atas</span>
        </div>
      </div>

      {/* 4 Summary Stat Boxes */}
      <div className="px-4 py-2.5 sm:px-5 sm:py-3 bg-slate-50/40 border-b border-slate-200">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Card 1: Jumlah data */}
          <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[10.5px] font-semibold text-slate-600 block">
              Jumlah data
            </span>
            <span className="text-base sm:text-lg font-bold text-slate-900 font-mono tabular-nums leading-tight">
              {stats.count}
            </span>
          </div>

          {/* Card 2: Selisih Bobot (Kg) */}
          <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[10.5px] font-semibold text-slate-600 block">
              Selisih Bobot (Kg)
            </span>
            <span className="text-base sm:text-lg font-bold text-slate-900 font-mono tabular-nums leading-tight">
              {formatNumber(stats.totalSelisihKg)} <span className="text-[10px] font-normal text-slate-500">Kg</span>
            </span>
          </div>

          {/* Card 3: Selisih (%) */}
          <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[10.5px] font-semibold text-slate-600 block">
              Selisih (%)
            </span>
            <span className="text-base sm:text-lg font-bold text-slate-900 font-mono tabular-nums leading-tight">
              {formatPercent(stats.totalSelisihPersen)}%
            </span>
          </div>

          {/* Card 4: Selisih Lebih / Kurang / Tanpa */}
          <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[10.5px] font-semibold text-slate-600 block">
              Selisih Lebih / Kurang / Tanpa
            </span>
            <div className="text-base sm:text-lg font-bold text-slate-900 font-mono tabular-nums leading-tight">
              <span>{stats.lebih}</span>
              <span className="text-slate-400 font-light mx-1">/</span>
              <span>{stats.kurang}</span>
              <span className="text-slate-400 font-light mx-1">/</span>
              <span>{stats.tanpa}</span>
            </div>
          </div>
        </div>
      </div>

      {/* GRAFIK 1: Tren Selisih (%) (Dinamis: Per Bulan ATAU Per Entri) */}
      <div className="p-4 sm:p-6 border-b border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Tren Selisih (%) — {filterGranularity === 'bulan' ? 'rata-rata per bulan' : 'per entri transaksi'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {filterGranularity === 'bulan' 
                ? 'Titik grafik menghitung rata-rata tertimbang selisih bobot tiap bulan'
                : 'Titik grafik memetakan deviasi persentase tiap lembar bukti timbang'}
            </p>
          </div>

          {/* Legend Badges for varieties */}
          <div className="flex flex-wrap items-center gap-3">
            {presentJenisList.map((jenis, jIdx) => {
              const color = LINE_COLORS[jIdx % LINE_COLORS.length];
              return (
                <div key={jenis} className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                  <span
                    className="w-3 h-3 rounded-xs border-2"
                    style={{ borderColor: color, backgroundColor: 'white' }}
                  ></span>
                  <span className="truncate max-w-[160px]">{jenis}</span>
                </div>
              );
            })}
          </div>
        </div>

        {(filterGranularity === 'bulan' ? monthsKeys.length === 0 : chronologicalEntries.length === 0) ? (
          <div className="h-64 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            Tidak ada data tren untuk filter terpilih
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            <div className="min-w-[700px] select-none">
              <svg
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                className="w-full h-auto overflow-visible font-sans"
              >
                {/* Horizontal Grid lines and Y-axis Labels */}
                {yTicksTrend.map((tickVal) => {
                  const y = getYForPercent(tickVal);
                  const isZero = Math.abs(tickVal) < 0.001;
                  return (
                    <g key={tickVal}>
                      <line
                        x1={PADDING.left}
                        y1={y}
                        x2={SVG_WIDTH - PADDING.right}
                        y2={y}
                        stroke={isZero ? '#94a3b8' : '#e2e8f0'}
                        strokeWidth={isZero ? '1.5' : '1'}
                        strokeDasharray={isZero ? undefined : '2,2'}
                      />
                      <text
                        x={PADDING.left - 10}
                        y={y + 3.5}
                        textAnchor="end"
                        className="text-[10px] fill-slate-500 font-mono"
                      >
                        {formatPercent(tickVal)}%
                      </text>
                    </g>
                  );
                })}

                {/* Y-axis Title */}
                <text
                  transform={`rotate(-90)`}
                  x={-(PADDING.top + CHART_H / 2)}
                  y={14}
                  textAnchor="middle"
                  className="text-[11px] fill-slate-600 font-semibold"
                >
                  Selisih %
                </text>

                {/* Vertical Guidelines and X-axis Labels */}
                {filterGranularity === 'bulan' ? (
                  monthsKeys.map((mKey, idx) => {
                    const x = getXForMonthIndex(idx, monthsKeys.length);
                    const d = new Date(mKey + '-01');
                    const label = !isNaN(d.getTime())
                      ? d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
                      : mKey;

                    return (
                      <g key={mKey}>
                        <line
                          x1={x}
                          y1={PADDING.top}
                          x2={x}
                          y2={PADDING.top + CHART_H}
                          stroke="#f1f5f9"
                          strokeWidth="1"
                        />
                        <text
                          x={x}
                          y={PADDING.top + CHART_H + 20}
                          textAnchor="middle"
                          transform={`rotate(-45 ${x} ${PADDING.top + CHART_H + 20})`}
                          className="text-[9.5px] fill-slate-500 font-medium"
                        >
                          {label}
                        </text>
                      </g>
                    );
                  })
                ) : (
                  entryXAxisTicks.map((tick) => (
                    <g key={tick.idx}>
                      <line
                        x1={tick.x}
                        y1={PADDING.top}
                        x2={tick.x}
                        y2={PADDING.top + CHART_H}
                        stroke="#f1f5f9"
                        strokeWidth="1"
                      />
                      <text
                        x={tick.x}
                        y={PADDING.top + CHART_H + 20}
                        textAnchor="middle"
                        transform={`rotate(-45 ${tick.x} ${PADDING.top + CHART_H + 20})`}
                        className="text-[9.5px] fill-slate-500 font-medium font-mono"
                      >
                        {tick.label}
                      </text>
                    </g>
                  ))
                )}

                {/* Series Lines for Each Jenis */}
                {presentJenisList.map((jenis, jIdx) => {
                  const color = LINE_COLORS[jIdx % LINE_COLORS.length];

                  // Collect coordinates for this series
                  const points: { x: number; y: number; pct: number; label: string }[] = [];

                  if (filterGranularity === 'bulan') {
                    monthsKeys.forEach((mKey, idx) => {
                      const jData = lineChartMonthlyData[mKey]?.[jenis];
                      if (jData && jData.sumLabel > 0) {
                        const pct = (jData.sumSelisih / jData.sumLabel) * 100;
                        const x = getXForMonthIndex(idx, monthsKeys.length);
                        const y = getYForPercent(pct);
                        points.push({ x, y, pct, label: `${jenis} (${mKey}): ${formatPercent(pct)}%` });
                      }
                    });
                  } else {
                    chronologicalEntries.forEach((e, idx) => {
                      if (e.jenis === jenis) {
                        const x = getXForEntryIndex(idx, chronologicalEntries.length);
                        const y = getYForPercent(e.selisihPersen);
                        points.push({
                          x,
                          y,
                          pct: e.selisihPersen,
                          label: `${jenis} [${formatTanggalIndo(e.tanggal)}]: Netto ${formatNumber(e.labelNetto)} Kg -> Selisih ${formatPercent(e.selisihPersen)}%`
                        });
                      }
                    });
                  }

                  if (points.length === 0) return null;

                  // Build smooth curve path
                  let dPath = `M ${points[0].x} ${points[0].y}`;
                  if (points.length > 1) {
                    for (let i = 0; i < points.length - 1; i++) {
                      const p0 = points[i === 0 ? 0 : i - 1];
                      const p1 = points[i];
                      const p2 = points[i + 1];
                      const p3 = points[i + 2 < points.length ? i + 2 : points.length - 1];

                      const cp1x = p1.x + (p2.x - p0.x) / 6;
                      const cp1y = p1.y + (p2.y - p0.y) / 6;
                      const cp2x = p2.x - (p3.x - p1.x) / 6;
                      const cp2y = p2.y - (p3.y - p1.y) / 6;

                      dPath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
                    }
                  }

                  return (
                    <g key={jenis}>
                      {/* Line */}
                      {points.length > 1 && (
                        <path
                          d={dPath}
                          fill="none"
                          stroke={color}
                          strokeWidth={filterGranularity === 'bulan' ? '2.5' : '1.8'}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Circles on each point */}
                      {points.map((pt, pIdx) => (
                        <circle
                          key={pIdx}
                          cx={pt.x}
                          cy={pt.y}
                          r={filterGranularity === 'bulan' ? 4 : 3}
                          fill="#ffffff"
                          stroke={color}
                          strokeWidth={filterGranularity === 'bulan' ? 2.5 : 1.5}
                          className="cursor-pointer hover:r-6 transition-all"
                        >
                          <title>{pt.label}</title>
                        </circle>
                      ))}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* GRAFIK 2: Perbandingan Total BSPP Lebih vs Kurang (Dinamis: Per Bulan ATAU Per Entri) */}
      <div className="p-4 sm:p-6 border-b border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Perbandingan Total BSPP Lebih vs Kurang {filterGranularity === 'bulan' ? 'per Bulan (Kg)' : 'per Entri Transaksi (Kg)'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {filterGranularity === 'bulan' 
                ? 'Perbandingan akumulasi berat lebih (hijau) vs susut kurang (merah) per bulan'
                : 'Perbandingan bobot transaksi selisih lebih (hijau) vs susut kurang (merah) per entri'}
            </p>
          </div>

          {/* Bar Legend */}
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-3.5 h-3 rounded-xs bg-[#047857]"></span> BSPP Lebih (Kg)
            </span>
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-3.5 h-3 rounded-xs bg-[#b91c1c]"></span> BSPP Kurang (Kg)
            </span>
          </div>
        </div>

        {(filterGranularity === 'bulan' ? monthlyBarData.length === 0 : chronologicalEntries.length === 0) ? (
          <div className="h-64 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            Tidak ada data perbandingan untuk filter terpilih
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            <div className="min-w-[700px] select-none">
              <svg
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                className="w-full h-auto overflow-visible font-sans"
              >
                {/* Horizontal Grid lines and Y-axis Labels for Kg */}
                {yTicksBar.map((val) => {
                  const y = PADDING.top + CHART_H - (val / (maxBarKg || 1)) * CHART_H;
                  return (
                    <g key={val}>
                      <line
                        x1={PADDING.left}
                        y1={y}
                        x2={SVG_WIDTH - PADDING.right}
                        y2={y}
                        stroke="#e2e8f0"
                        strokeWidth="1"
                        strokeDasharray={val === 0 ? undefined : '2,2'}
                      />
                      <text
                        x={PADDING.left - 10}
                        y={y + 3.5}
                        textAnchor="end"
                        className="text-[10px] fill-slate-500 font-mono"
                      >
                        {formatNumber(val)}
                      </text>
                    </g>
                  );
                })}

                {/* Y-axis Title */}
                <text
                  transform={`rotate(-90)`}
                  x={-(PADDING.top + CHART_H / 2)}
                  y={16}
                  textAnchor="middle"
                  className="text-[11px] fill-slate-600 font-semibold"
                >
                  Kg
                </text>

                {/* Mode Per Bulan: Bars for Each Month */}
                {filterGranularity === 'bulan' ? (
                  monthlyBarData.map((m, idx) => {
                    const xCenter = getXForMonthIndex(idx, monthlyBarData.length);
                    const barWidth = Math.min(22, Math.max(10, (CHART_W / monthlyBarData.length) * 0.35));
                    const gap = 2;

                    const hLebih = (m.lebihKg / (maxBarKg || 1)) * CHART_H;
                    const hKurang = (m.kurangKg / (maxBarKg || 1)) * CHART_H;

                    const yLebih = PADDING.top + CHART_H - hLebih;
                    const yKurang = PADDING.top + CHART_H - hKurang;

                    const d = new Date(m.key + '-01');
                    const label = !isNaN(d.getTime())
                      ? d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
                      : m.label;

                    return (
                      <g key={m.key} className="group">
                        {/* Bar Lebih (Hijau Pekat) */}
                        {m.lebihKg > 0 && (
                          <rect
                            x={xCenter - barWidth - gap / 2}
                            y={yLebih}
                            width={barWidth}
                            height={Math.max(2, hLebih)}
                            fill="#047857"
                            className="transition-all hover:opacity-85 cursor-pointer"
                          >
                            <title>{`${label} - BSPP Lebih: ${formatNumber(m.lebihKg)} Kg`}</title>
                          </rect>
                        )}

                        {/* Bar Kurang (Merah Marun) */}
                        {m.kurangKg > 0 && (
                          <rect
                            x={xCenter + gap / 2}
                            y={yKurang}
                            width={barWidth}
                            height={Math.max(2, hKurang)}
                            fill="#b91c1c"
                            className="transition-all hover:opacity-85 cursor-pointer"
                          >
                            <title>{`${label} - BSPP Kurang: ${formatNumber(m.kurangKg)} Kg`}</title>
                          </rect>
                        )}

                        {/* X-axis Label */}
                        <text
                          x={xCenter}
                          y={PADDING.top + CHART_H + 20}
                          textAnchor="middle"
                          transform={`rotate(-45 ${xCenter} ${PADDING.top + CHART_H + 20})`}
                          className="text-[9.5px] fill-slate-500 font-medium"
                        >
                          {label}
                        </text>
                      </g>
                    );
                  })
                ) : (
                  /* Mode Per Entri: Bars for Each Entry */
                  chronologicalEntries.map((e, idx) => {
                    const xCenter = getXForEntryIndex(idx, chronologicalEntries.length);
                    const barWidth = Math.min(18, Math.max(3, (CHART_W / Math.max(1, chronologicalEntries.length)) * 0.7));
                    const isLebih = e.status.includes('Lebih');
                    const isKurang = e.status.includes('Kurang');
                    const kgVal = Math.abs(e.selisihKg || 0);

                    const h = (kgVal / (maxBarKg || 1)) * CHART_H;
                    const y = PADDING.top + CHART_H - h;

                    return (
                      <g key={idx} className="group">
                        {kgVal > 0 && (
                          <rect
                            x={xCenter - barWidth / 2}
                            y={y}
                            width={barWidth}
                            height={Math.max(2, h)}
                            fill={isLebih ? '#047857' : isKurang ? '#b91c1c' : '#94a3b8'}
                            className="transition-all hover:opacity-85 cursor-pointer"
                          >
                            <title>{`[${formatTanggalIndo(e.tanggal)}] ${e.jenis} - ${e.status}: ${formatNumber(kgVal)} Kg (${formatPercent(e.selisihPersen)}%)`}</title>
                          </rect>
                        )}
                      </g>
                    );
                  })
                )}

                {/* X-axis labels for Mode Per Entri */}
                {filterGranularity === 'entri' && entryXAxisTicks.map((tick) => (
                  <text
                    key={tick.idx}
                    x={tick.x}
                    y={PADDING.top + CHART_H + 20}
                    textAnchor="middle"
                    transform={`rotate(-45 ${tick.x} ${PADDING.top + CHART_H + 20})`}
                    className="text-[9.5px] fill-slate-500 font-medium font-mono"
                  >
                    {tick.label}
                  </text>
                ))}
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Table Data Section — Terurut Tanggal Terbaru di Paling Atas */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/90 border-b border-slate-200 text-[10.5px] font-semibold text-slate-600 uppercase tracking-wider select-none">
              <th className="py-2.5 px-3 sm:px-4">Tanggal (Terbaru di Atas)</th>
              <th className="py-2.5 px-3 sm:px-4">Jenis</th>
              <th className="py-2.5 px-3 sm:px-4 text-right">Label Netto (Kg)</th>
              <th className="py-2.5 px-3 sm:px-4 text-right">Timbang Ulang (Kg)</th>
              <th className="py-2.5 px-3 sm:px-4 text-right">Selisih (Kg)</th>
              <th className="py-2.5 px-3 sm:px-4 text-right">Selisih (%)</th>
              <th className="py-2.5 px-3 sm:px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {tableEntries.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  Tidak ada data BSPP yang cocok dengan filter atau periode terpilih.
                </td>
              </tr>
            ) : (
              tableEntries.map((e, index) => {
                const isLebih = e.status.includes('Lebih');
                const isKurang = e.status.includes('Kurang');

                return (
                  <tr key={index} className="hover:bg-slate-50/90 transition-colors">
                    <td className="py-2 px-3 sm:px-4 whitespace-nowrap text-slate-700 font-medium">
                      {formatTanggalIndo(e.tanggal)}
                    </td>
                    <td className="py-2 px-3 sm:px-4 whitespace-nowrap font-bold text-slate-900">
                      {e.jenis}
                    </td>
                    <td className="py-2 px-3 sm:px-4 whitespace-nowrap text-right font-mono tabular-nums text-slate-700">
                      {formatNumber(e.labelNetto)}
                    </td>
                    <td className="py-2 px-3 sm:px-4 whitespace-nowrap text-right font-mono tabular-nums text-slate-700">
                      {formatNumber(e.timbangUlang)}
                    </td>
                    <td className={`py-2 px-3 sm:px-4 whitespace-nowrap text-right font-mono tabular-nums font-bold ${
                      isLebih ? 'text-emerald-700' : (isKurang ? 'text-rose-700' : 'text-slate-600')
                    }`}>
                      {formatNumber(e.selisihKg)}
                    </td>
                    <td className={`py-2 px-3 sm:px-4 whitespace-nowrap text-right font-mono tabular-nums font-semibold ${
                      isLebih ? 'text-emerald-700' : (isKurang ? 'text-rose-700' : 'text-slate-600')
                    }`}>
                      {formatPercent(e.selisihPersen)}%
                    </td>
                    <td className="py-2 px-3 sm:px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                        isLebih 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                          : isKurang 
                            ? 'bg-rose-50 text-rose-800 border border-rose-200' 
                            : 'bg-slate-50 text-slate-700 border border-slate-200'
                      }`}>
                        {e.status}
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
  );
};
