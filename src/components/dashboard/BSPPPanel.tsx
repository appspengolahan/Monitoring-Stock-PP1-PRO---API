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
  Info
} from 'lucide-react';

interface BSPPPanelProps {
  bsppList: BSPPData[];
}

export const BSPPPanel: React.FC<BSPPPanelProps> = ({ bsppList }) => {
  const [selectedBahanIndex, setSelectedBahanIndex] = useState<number>(0);
  const [filterJenis, setFilterJenis] = useState<string>('all');
  const [filterFrom, setFilterFrom] = useState<string>('');
  const [filterTo, setFilterTo] = useState<string>('');
  const [filterGranularity, setFilterGranularity] = useState<'bulan' | 'entri'>('bulan');

  // Hover state for interactive tooltips
  const [activeTrendTooltip, setActiveTrendTooltip] = useState<{
    x: number;
    y: number;
    month: string;
    items: { jenis: string; pct: number; color: string }[];
  } | null>(null);

  const [activeBarTooltip, setActiveBarTooltip] = useState<{
    x: number;
    y: number;
    month: string;
    lebihKg: number;
    kurangKg: number;
  } | null>(null);

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

  // Filter entries based on controls
  const filteredEntries = useMemo(() => {
    if (!currentData || !currentData.entries) return [];
    return currentData.entries.filter(e => {
      if (filterJenis !== 'all' && e.jenis !== filterJenis) return false;
      if (filterFrom && new Date(e.tanggal).getTime() < new Date(filterFrom).getTime()) return false;
      if (filterTo && new Date(e.tanggal).getTime() > new Date(filterTo + 'T23:59:59Z').getTime()) return false;
      return true;
    });
  }, [currentData, filterJenis, filterFrom, filterTo]);

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

  // Palette colors for distinct varieties (matching the user's legacy chart)
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

  // Chronological ordered months
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

  // Multi-line chart data: for each month, calculate weighted selisih% per jenis
  const lineChartData = useMemo(() => {
    // Map: [monthKey][jenis] -> { sumLabel, sumSelisih }
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

  // Max value for Bar Chart scaling
  const maxBarKg = useMemo(() => {
    let max = 50;
    monthlyBarData.forEach(m => {
      if (m.lebihKg > max) max = m.lebihKg;
      if (m.kurangKg > max) max = m.kurangKg;
    });
    return Math.ceil(max * 1.15 / 50) * 50;
  }, [monthlyBarData]);

  // SVG Chart Geometry Constants
  const SVG_WIDTH = 1000;
  const SVG_HEIGHT = 280;
  const PADDING = { top: 25, right: 30, bottom: 45, left: 60 };
  const CHART_W = SVG_WIDTH - PADDING.left - PADDING.right;
  const CHART_H = SVG_HEIGHT - PADDING.top - PADDING.bottom;

  // Y-axis range for Trend Selisih % Line Chart
  // Standard range around -1.4% to +0.6% or dynamic
  const yDomainTrend = useMemo(() => {
    let min = -0.5;
    let max = 0.5;
    monthsKeys.forEach(mKey => {
      const jMap = lineChartData[mKey];
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
    // Add margin and round to nearest 0.2%
    const yMin = Math.floor((min - 0.2) * 5) / 5;
    const yMax = Math.ceil((max + 0.2) * 5) / 5;
    return { min: yMin, max: yMax };
  }, [monthsKeys, lineChartData]);

  // Helpers to get (x, y) coordinates for line chart
  const getXForMonthIndex = (index: number, total: number) => {
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

  // Export PDF Handler
  const handleExportPdf = () => {
    const head = ['Tanggal', 'Jenis', 'Label Netto (Kg)', 'Timbang Ulang (Kg)', 'Selisih (Kg)', 'Selisih (%)', 'Status'];
    const body = filteredEntries.map(e => [
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
        `Periode: ${filterFrom || 'Awal'} s/d ${filterTo || 'Sekarang'} | Granularitas: ${filterGranularity === 'bulan' ? 'Per Bulan' : 'Per Entri'}`,
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
      {/* Header bar matching the reference */}
      <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
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
          disabled={filteredEntries.length === 0}
          className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 transition-colors shrink-0 shadow-xs"
        >
          <Download className="w-4 h-4" />
          <span>Export PDF</span>
        </button>
      </div>

      {/* Control Filter Bar (Identical to User Reference) */}
      <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
          {/* Bahan Selector */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 whitespace-nowrap">Bahan:</span>
            <select
              value={selectedBahanIndex}
              onChange={e => {
                setSelectedBahanIndex(Number(e.target.value));
                setFilterJenis('all');
              }}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-slate-800 shadow-2xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              {bsppList.map((b, idx) => (
                <option key={b.nama} value={idx}>
                  {b.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Jenis Selector */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 whitespace-nowrap">Jenis:</span>
            <select
              value={filterJenis}
              onChange={e => setFilterJenis(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-slate-800 shadow-2xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden max-w-[200px] truncate"
            >
              <option value="all">Semua jenis</option>
              {currentData.jenisList.map(j => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>

          {/* Dari Tanggal */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 whitespace-nowrap">Dari:</span>
            <input
              type="date"
              value={filterFrom}
              onChange={e => setFilterFrom(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 shadow-2xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Sampai Tanggal */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 whitespace-nowrap">Sampai:</span>
            <input
              type="date"
              value={filterTo}
              onChange={e => setFilterTo(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 shadow-2xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Grafik Selector */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 whitespace-nowrap">Grafik:</span>
            <select
              value={filterGranularity}
              onChange={e => setFilterGranularity(e.target.value as 'bulan' | 'entri')}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-slate-800 shadow-2xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="bulan">Per bulan</option>
              <option value="entri">Per entri</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4 Summary Stat Boxes (Exact style from reference screenshot) */}
      <div className="p-4 sm:p-6 bg-slate-50/40 border-b border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Jumlah data */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-700 block mb-1">
              Jumlah data
            </span>
            <span className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {stats.count}
            </span>
          </div>

          {/* Card 2: Selisih Bobot (Kg) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-700 block mb-1">
              Selisih Bobot (Kg)
            </span>
            <span className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {formatNumber(stats.totalSelisihKg)} Kg
            </span>
          </div>

          {/* Card 3: Selisih (%) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-700 block mb-1">
              Selisih (%)
            </span>
            <span className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {formatPercent(stats.totalSelisihPersen)}%
            </span>
          </div>

          {/* Card 4: Selisih Lebih / Kurang / Tanpa */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-700 block mb-1">
              Selisih Lebih / Kurang / Tanpa
            </span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums">
              <span>{stats.lebih}</span>
              <span className="text-slate-400 font-light mx-1">/</span>
              <span>{stats.kurang}</span>
              <span className="text-slate-400 font-light mx-1">/</span>
              <span>{stats.tanpa}</span>
            </div>
          </div>
        </div>
      </div>

      {/* GRAFIK 1: Tren Selisih (%) — rata-rata per bulan (Multi-Line Chart with Spline and Points) */}
      <div className="p-4 sm:p-6 border-b border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-bold text-slate-800">
            Tren Selisih (%) — {filterGranularity === 'bulan' ? 'rata-rata per bulan' : 'per entri'}
          </h3>

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

        {monthsKeys.length === 0 ? (
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
                {monthsKeys.map((mKey, idx) => {
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
                })}

                {/* Series Lines for Each Jenis */}
                {presentJenisList.map((jenis, jIdx) => {
                  const color = LINE_COLORS[jIdx % LINE_COLORS.length];

                  // Collect valid coordinates for this series
                  const points: { x: number; y: number; pct: number; monthKey: string }[] = [];
                  monthsKeys.forEach((mKey, idx) => {
                    const jData = lineChartData[mKey]?.[jenis];
                    if (jData && jData.sumLabel > 0) {
                      const pct = (jData.sumSelisih / jData.sumLabel) * 100;
                      const x = getXForMonthIndex(idx, monthsKeys.length);
                      const y = getYForPercent(pct);
                      points.push({ x, y, pct, monthKey: mKey });
                    }
                  });

                  if (points.length === 0) return null;

                  // Build smooth curve path (Bézier / Catmull-Rom style)
                  let dPath = `M ${points[0].x} ${points[0].y}`;
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

                  return (
                    <g key={jenis}>
                      {/* Smooth Line */}
                      <path
                        d={dPath}
                        fill="none"
                        stroke={color}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Circles for each data point */}
                      {points.map((pt, pIdx) => (
                        <circle
                          key={pIdx}
                          cx={pt.x}
                          cy={pt.y}
                          r="4"
                          fill="#ffffff"
                          stroke={color}
                          strokeWidth="2.5"
                          className="cursor-pointer hover:r-6 transition-all"
                        >
                          <title>{`${jenis} (${pt.monthKey}): ${formatPercent(pt.pct)}%`}</title>
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

      {/* GRAFIK 2: Perbandingan Total BSPP Lebih vs Kurang per Bulan (Kg) (Exact Bar Chart from screenshot) */}
      <div className="p-4 sm:p-6 border-b border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-bold text-slate-800">
            Perbandingan Total BSPP Lebih vs Kurang per Bulan (Kg)
          </h3>

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

        {monthlyBarData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            Tidak ada data perbandingan bulanan untuk filter terpilih
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

                {/* Bars for Each Month */}
                {monthlyBarData.map((m, idx) => {
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
                })}
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Table Data Section */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-[11.5px] font-semibold text-slate-600 uppercase tracking-wider">
              <th className="py-3 px-4">Tanggal</th>
              <th className="py-3 px-4">Jenis</th>
              <th className="py-3 px-4 text-right">Label Netto (Kg)</th>
              <th className="py-3 px-4 text-right">Timbang Ulang (Kg)</th>
              <th className="py-3 px-4 text-right">Selisih (Kg)</th>
              <th className="py-3 px-4 text-right">Selisih (%)</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  Tidak ada data BSPP yang cocok dengan filter.
                </td>
              </tr>
            ) : (
              filteredEntries.map((e, index) => {
                const isLebih = e.status.includes('Lebih');
                const isKurang = e.status.includes('Kurang');

                return (
                  <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-700 font-medium">
                      {formatTanggalIndo(e.tanggal)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-900">
                      {e.jenis}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right font-mono tabular-nums text-slate-700">
                      {formatNumber(e.labelNetto)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right font-mono tabular-nums text-slate-700">
                      {formatNumber(e.timbangUlang)}
                    </td>
                    <td className={`py-3 px-4 whitespace-nowrap text-right font-mono tabular-nums font-bold ${
                      isLebih ? 'text-emerald-700' : (isKurang ? 'text-rose-700' : 'text-slate-600')
                    }`}>
                      {formatNumber(e.selisihKg)}
                    </td>
                    <td className={`py-3 px-4 whitespace-nowrap text-right font-mono tabular-nums font-semibold ${
                      isLebih ? 'text-emerald-700' : (isKurang ? 'text-rose-700' : 'text-slate-600')
                    }`}>
                      {formatPercent(e.selisihPersen)}%
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center text-xs font-semibold ${
                        isLebih ? 'text-emerald-700' : (isKurang ? 'text-rose-700' : 'text-slate-600')
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
