import React, { useState, useEffect } from 'react';
import { TelemetryData, BSPPRoomTemperature } from '../../types';
import { TelemetryService, WAGIR_LOCATION } from '../../services/telemetryService';
import { 
  Thermometer, 
  CloudSun, 
  Droplets, 
  Wind, 
  RefreshCw, 
  AlertTriangle, 
  Activity, 
  MapPin, 
  Building2, 
  Flame, 
  CheckCircle2, 
  Info,
  Layers
} from 'lucide-react';

interface BSPPTelemetryWidgetProps {
  currentKomoditas: string;
  roomTemperature?: BSPPRoomTemperature;
}

export const BSPPTelemetryWidget: React.FC<BSPPTelemetryWidgetProps> = ({
  currentKomoditas,
  roomTemperature
}) => {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await TelemetryService.fetchLiveTelemetry();
      setTelemetry(data);
      setLastRefreshed(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      console.warn('Gagal memuat telemetri live:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Pastikan data suhu ruangan tersedia (dari Sheet Mecah Cell L7, L8, L58 atau baseline)
  const roomData: BSPPRoomTemperature = roomTemperature || (
    currentKomoditas.includes('Tembakau') || currentKomoditas.includes('Rajang II')
      ? TelemetryService.getDefaultTobaccoRoomTemperature()
      : { suhuRataRata: 28.5, suhuLt2: 29.8, keterangan: 'Estimasi suhu standar gudang' }
  );

  const tOutdoor = telemetry?.temperature ?? 26.5;
  const rhOutdoor = telemetry?.relativeHumidity ?? 73;
  const vpdOutdoor = telemetry?.vpdKpa ?? TelemetryService.calculateVPD(tOutdoor, rhOutdoor);

  // Suhu ruangan internal
  const tRataRata = roomData.suhuRataRata ?? 29.6;
  const tLt2 = roomData.suhuLt2 ?? 31.7;
  const tSesiLanjutan = roomData.suhuSesiLanjutan ?? 30.4;

  // Delta Termal antara Lantai 2 dan Luar Ruangan
  const deltaT = Math.round((tLt2 - tOutdoor) * 10) / 10;

  // Estimasi Kelembapan Relatif di Ruangan Lantai 2 (Suhu lebih tinggi menurunkan RH)
  const estimatedIndoorRh = Math.max(35, Math.min(85, Math.round(rhOutdoor - deltaT * 2.2)));
  const indoorVpd = TelemetryService.calculateVPD(tLt2, estimatedIndoorRh);
  const vpdInterpretation = TelemetryService.interpretVPD(indoorVpd);

  const isTobacco = currentKomoditas.includes('Tembakau') || currentKomoditas.includes('Rajang II');

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-slate-700/80 mb-4 transition-all">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-red-400" />
                <span>Stasiun Telemetri Wagir &amp; Suhu Fisik Gudang</span>
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Live
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>{WAGIR_LOCATION.name}</span>
              <span className="text-slate-400 text-xs font-normal font-mono hidden md:inline">
                (-8.0288° LS, 112.5985° BT • Elevasi {WAGIR_LOCATION.elevation}m)
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {lastRefreshed && (
            <span className="text-[11px] text-slate-400 font-mono">
              Update {lastRefreshed}
            </span>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600/60 transition-colors cursor-pointer disabled:opacity-50"
            title="Muat ulang telemetri cuaca live Open-Meteo"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid: 2 Kolom Besar (Indoor Gudang vs Outdoor Wagir) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 mt-3.5">
        
        {/* SISI KIRI: DATA SUHU RUANGAN INTERNAL (Sheet BSPP MECAH Cell L7, L8, L58) */}
        <div className="lg:col-span-7 bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>Suhu Fisik Ruangan ({isTobacco ? 'Gudang Tembakau Mecah' : currentKomoditas})</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700">
              Sheet: Cell L7, L8, L58
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Cell L7: Suhu Rata2 */}
            <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-700/80">
              <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-0.5">
                <Thermometer className="w-3 h-3 text-blue-400" />
                <span className="truncate">Suhu Rata2 (L7)</span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-white">
                {tRataRata.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                <span className="text-xs font-normal text-slate-400 ml-0.5">°C</span>
              </div>
              <span className="text-[9.5px] text-slate-400 block mt-0.5 leading-tight">
                Rata-rata 3 sesi harian
              </span>
            </div>

            {/* Cell L8: Suhu Lt 2 */}
            <div className="bg-gradient-to-br from-amber-950/40 to-slate-900/80 p-2.5 rounded-lg border border-amber-600/40">
              <div className="text-[10px] text-amber-300 flex items-center gap-1 mb-0.5 font-semibold">
                <Flame className="w-3 h-3 text-amber-400" />
                <span className="truncate">Suhu Lt 2 (L8)</span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-amber-300">
                {tLt2.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                <span className="text-xs font-normal text-amber-400/80 ml-0.5">°C</span>
              </div>
              <span className="text-[9.5px] text-amber-200/70 block mt-0.5 leading-tight">
                Titik paling hangat gudang
              </span>
            </div>

            {/* Cell L58: Sesi Lanjutan */}
            <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-700/80">
              <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-0.5">
                <Thermometer className="w-3 h-3 text-cyan-400" />
                <span className="truncate">Sesi Sore (L58)</span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-white">
                {tSesiLanjutan.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                <span className="text-xs font-normal text-slate-400 ml-0.5">°C</span>
              </div>
              <span className="text-[9.5px] text-slate-400 block mt-0.5 leading-tight">
                Observasi lanjutan shift
              </span>
            </div>
          </div>

          {/* Delta Termal Bar */}
          <div className="flex items-center justify-between text-[11px] bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-700">
            <span className="text-slate-300 flex items-center gap-1.5">
              <span>Delta Termal (Lt 2 vs Luar):</span>
              <strong className={deltaT > 0 ? 'text-amber-400 font-mono' : 'text-cyan-400 font-mono'}>
                {deltaT > 0 ? `+${deltaT}` : deltaT} °C
              </strong>
            </span>
            <span className="text-slate-400 text-[10.5px]">
              {deltaT >= 3 
                ? '⚠️ Lantai 2 jauh lebih hangat' 
                : '✅ Sirkulasi termal stabil'}
            </span>
          </div>
        </div>

        {/* SISI KANAN: DATA TELEMETRI LINGKUNGAN OUTDOOR (Open-Meteo Wagir) */}
        <div className="lg:col-span-5 bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5 uppercase tracking-wide">
              <CloudSun className="w-4 h-4 text-blue-400" />
              <span>Cuaca Luar (Ambient Wagir)</span>
            </span>
            <span className="text-[10px] text-slate-300 bg-blue-900/50 px-2 py-0.5 rounded border border-blue-700 font-medium">
              {telemetry?.kondisiCuaca || 'Cerah Berawan'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {/* Suhu Outdoor */}
            <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-700/80">
              <span className="text-[10px] text-slate-400 block">Suhu Udara</span>
              <span className="text-base sm:text-lg font-bold font-mono text-blue-300">
                {tOutdoor}
                <span className="text-xs font-normal text-slate-400 ml-0.5">°C</span>
              </span>
              <span className="text-[9px] text-slate-500 block">Permukaan 2m</span>
            </div>

            {/* Kelembapan Relatif (RH) */}
            <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-700/80">
              <span className="text-[10px] text-slate-400 block">Kelembapan</span>
              <span className="text-base sm:text-lg font-bold font-mono text-cyan-300">
                {rhOutdoor}
                <span className="text-xs font-normal text-slate-400 ml-0.5">%</span>
              </span>
              <span className="text-[9px] text-slate-500 block">RH Relatif</span>
            </div>

            {/* VPD Luar */}
            <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-700/80">
              <span className="text-[10px] text-slate-400 block">VPD Defisit</span>
              <span className="text-base sm:text-lg font-bold font-mono text-emerald-300">
                {vpdOutdoor}
                <span className="text-xs font-normal text-slate-400 ml-0.5">kPa</span>
              </span>
              <span className="text-[9px] text-slate-500 block">Tekanan Uap</span>
            </div>
          </div>

          {/* Indikator Laju Penguapan */}
          <div className="flex items-center justify-between text-[11px] bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-700">
            <span className="text-slate-300">Potensi Laju Susut:</span>
            <span className="text-xs font-bold font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Terkontrol ({vpdInterpretation.kategori})</span>
            </span>
          </div>
        </div>

      </div>

      {/* Early Warning Banner (Scientific Interpretation) */}
      <div className="mt-3 p-3 rounded-xl bg-blue-950/80 border border-blue-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
              <span>Early Warning Diagnosis BSPP Lingkungan:</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Suhu Ruang {tLt2}°C vs Ambient {tOutdoor}°C
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
              {vpdInterpretation.dampakSusut} Jika terjadi selisih minus pada penimbangan tembakau di Lantai 2, sistem menandai sebagai <strong className="text-amber-300">susut evaporasi termal wajar</strong>, bukan kehilangan fisik.
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700 text-[10.5px] text-slate-400">
          <Info className="w-3 h-3 text-blue-400" />
          <span>Rumus: Tetens VPD &amp; Henderson EMC</span>
        </div>
      </div>
    </div>
  );
};
