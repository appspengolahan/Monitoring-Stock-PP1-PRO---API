import { TelemetryData, BSPPRoomTemperature } from '../types';

export const WAGIR_LOCATION = {
  name: 'PT BATU KARANG, Wagir, Malang',
  address: 'Jl. Parangargo No.153, Genengan, Parangargo, Kec. Wagir, Kab. Malang, Jawa Timur 65158',
  latitude: -8.0288,
  longitude: 112.5985,
  elevation: 460 // meter di atas permukaan laut (mdpl)
};

const STORAGE_KEYS = {
  LIVE_TELEMETRY: 'stockpp1_telemetry_live_v1',
  HISTORY_PREFIX: 'stockpp1_telemetry_hist_'
};

export class TelemetryService {
  /**
   * Mengembalikan deskripsi kondisi cuaca bahasa Indonesia berdasarkan WMO Weather Code
   */
  public static getWeatherDescription(code?: number): string {
    if (code === undefined || code === null) return 'Cerah Berawan';
    switch (code) {
      case 0: return 'Cerah';
      case 1: return 'Sebagian Besar Cerah';
      case 2: return 'Sebagian Berawan';
      case 3: return 'Berawan Tebal';
      case 45:
      case 48: return 'Berkabut';
      case 51:
      case 53:
      case 55: return 'Gerimis Ringan';
      case 61: return 'Hujan Ringan';
      case 63: return 'Hujan Sedang';
      case 65: return 'Hujan Lebat';
      case 80:
      case 81: return 'Hujan Sesaat';
      case 82: return 'Hujan Deras Lokal';
      case 95:
      case 96:
      case 99: return 'Hujan Disertai Petir';
      default: return 'Cerah Berawan';
    }
  }

  /**
   * Menghitung Vapor Pressure Deficit (VPD) dalam satuan kiloPascal (kPa)
   * Berdasarkan persamaan Tetens untuk saturated vapor pressure (SVP)
   */
  public static calculateVPD(tempC: number, rhPercent: number): number {
    if (isNaN(tempC) || isNaN(rhPercent)) return 0.8;
    const clampedRh = Math.max(0, Math.min(100, rhPercent));
    // Saturated Vapor Pressure (kPa)
    const svp = 0.61078 * Math.exp((17.27 * tempC) / (tempC + 237.3));
    // Actual Vapor Pressure (kPa)
    const avp = svp * (clampedRh / 100);
    const vpd = svp - avp;
    return Math.round(vpd * 100) / 100;
  }

  /**
   * Memberikan interpretasi saintifik potensi susut uap air pada tembakau berdasarkan VPD
   */
  public static interpretVPD(vpdKpa: number): {
    kategori: 'Sangat Rendah' | 'Normal' | 'Sedang' | 'Tinggi' | 'Kritis';
    dampakSusut: string;
    warnaBadge: string;
  } {
    if (vpdKpa < 0.5) {
      return {
        kategori: 'Sangat Rendah',
        dampakSusut: 'Udara sangat jenuh/lembab. Daun tembakau berpotensi menyerap uap air (+BSPP Lebih).',
        warnaBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300'
      };
    } else if (vpdKpa <= 0.95) {
      return {
        kategori: 'Normal',
        dampakSusut: 'Keseimbangan kelembapan ideal. Susut alami berada di batas toleransi minimal.',
        warnaBadge: 'bg-blue-100 text-blue-800 border-blue-300'
      };
    } else if (vpdKpa <= 1.35) {
      return {
        kategori: 'Sedang',
        dampakSusut: 'Udara mulai kering. Penguapan air berlangsung wajar memicu selisih susut bobot alami.',
        warnaBadge: 'bg-amber-100 text-amber-800 border-amber-300'
      };
    } else if (vpdKpa <= 1.7) {
      return {
        kategori: 'Tinggi',
        dampakSusut: 'Laju pelepasan uap air tinggi (kering). Susut bobot pada BSPP dipicu faktor iklim ruangan.',
        warnaBadge: 'bg-orange-100 text-orange-800 border-orange-300'
      };
    } else {
      return {
        kategori: 'Kritis',
        dampakSusut: 'Udara ruangan sangat kering & panas. Terjadi penguapan agresif pada daun tembakau.',
        warnaBadge: 'bg-red-100 text-red-800 border-red-300'
      };
    }
  }

  /**
   * Menghitung Equilibrium Moisture Content (EMC / Kadar Air Keseimbangan Teoritis) tembakau (%)
   * Model aproksimasi Henderson termodifikasi untuk tembakau curah
   */
  public static calculateTheoreticalEMC(tempC: number, rhPercent: number): number {
    const rh = Math.max(10, Math.min(95, rhPercent)) / 100;
    const tempK = tempC + 273.15;
    // Nilai konstanta tipikal tembakau virginia / burley
    const emc = Math.pow(-Math.log(1 - rh) / (0.00018 * tempK), 1 / 1.75);
    return Math.round(emc * 10) / 10;
  }

  /**
   * Mengambil data cuaca live untuk Wagir, Malang dari Open-Meteo REST API
   * Menggunakan caching lokal (15 menit) dan fallback tangguh
   */
  public static async fetchLiveTelemetry(): Promise<TelemetryData> {
    // 1. Cek cache lokal
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(STORAGE_KEYS.LIVE_TELEMETRY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const age = Date.now() - new Date(parsed.timestamp).getTime();
          // Cache valid selama 15 menit
          if (age < 15 * 60 * 1000) {
            return parsed;
          }
        } catch (e) {}
      }
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${WAGIR_LOCATION.latitude}&longitude=${WAGIR_LOCATION.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,surface_pressure&timezone=Asia%2FJakarta`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      const current = json.current || {};
      const temp = current.temperature_2m !== undefined ? current.temperature_2m : 26.5;
      const rh = current.relative_humidity_2m !== undefined ? current.relative_humidity_2m : 74;
      const vpd = this.calculateVPD(temp, rh);

      const telemetry: TelemetryData = {
        temperature: Math.round(temp * 10) / 10,
        relativeHumidity: Math.round(rh),
        apparentTemperature: current.apparent_temperature ? Math.round(current.apparent_temperature * 10) / 10 : temp,
        precipitation: current.precipitation || 0,
        weatherCode: current.weather_code || 1,
        surfacePressure: current.surface_pressure || 960,
        vpdKpa: vpd,
        timestamp: current.time ? new Date(current.time).toISOString() : new Date().toISOString(),
        locationName: WAGIR_LOCATION.name,
        latitude: WAGIR_LOCATION.latitude,
        longitude: WAGIR_LOCATION.longitude,
        kondisiCuaca: this.getWeatherDescription(current.weather_code)
      };

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.LIVE_TELEMETRY, JSON.stringify(telemetry));
      }

      return telemetry;
    } catch (err) {
      console.warn('Live telemetry fetch fallback to local baseline:', err);
      // Fallback ke profil tipikal Wagir jam operasional
      return this.getDefaultWagirBaseline();
    }
  }

  /**
   * Mengambil estimasi telemetri historis untuk tanggal tertentu (YYYY-MM-DD)
   */
  public static async fetchHistoricalTelemetry(dateIsoOrYmd: string): Promise<TelemetryData> {
    const ymd = (dateIsoOrYmd || '').slice(0, 10);
    if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
      return this.getDefaultWagirBaseline();
    }

    const cacheKey = `${STORAGE_KEYS.HISTORY_PREFIX}${ymd}`;
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {}
      }
    }

    try {
      const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${WAGIR_LOCATION.latitude}&longitude=${WAGIR_LOCATION.longitude}&start_date=${ymd}&end_date=${ymd}&hourly=temperature_2m,relative_humidity_2m,surface_pressure&timezone=Asia%2FJakarta`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      const temps: number[] = json.hourly?.temperature_2m || [];
      const rhs: number[] = json.hourly?.relative_humidity_2m || [];

      // Ambil jam operasional pabrik (08:00 - 16:00, index 8 s.d 16)
      const workHoursTemps = temps.slice(8, 17);
      const workHoursRhs = rhs.slice(8, 17);

      const avgTemp = workHoursTemps.length > 0 
        ? workHoursTemps.reduce((a, b) => a + b, 0) / workHoursTemps.length 
        : (temps[12] || 27.2);

      const avgRh = workHoursRhs.length > 0 
        ? workHoursRhs.reduce((a, b) => a + b, 0) / workHoursRhs.length 
        : (rhs[12] || 71);

      const vpd = this.calculateVPD(avgTemp, avgRh);

      const histTelemetry: TelemetryData = {
        temperature: Math.round(avgTemp * 10) / 10,
        relativeHumidity: Math.round(avgRh),
        apparentTemperature: Math.round(avgTemp * 10) / 10,
        precipitation: 0,
        weatherCode: 2,
        surfacePressure: 960,
        vpdKpa: vpd,
        timestamp: `${ymd}T12:00:00.000Z`,
        locationName: WAGIR_LOCATION.name,
        latitude: WAGIR_LOCATION.latitude,
        longitude: WAGIR_LOCATION.longitude,
        kondisiCuaca: 'Berawan Tipis'
      };

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(cacheKey, JSON.stringify(histTelemetry));
      }

      return histTelemetry;
    } catch (e) {
      // Fallback deterministik berbasis musim
      const month = parseInt(ymd.slice(5, 7), 10);
      const isRainySeason = month >= 10 || month <= 4;
      const baseTemp = isRainySeason ? 26.2 : 27.8;
      const baseRh = isRainySeason ? 78 : 68;

      const fallback: TelemetryData = {
        temperature: baseTemp,
        relativeHumidity: baseRh,
        vpdKpa: this.calculateVPD(baseTemp, baseRh),
        timestamp: `${ymd}T12:00:00.000Z`,
        locationName: WAGIR_LOCATION.name,
        latitude: WAGIR_LOCATION.latitude,
        longitude: WAGIR_LOCATION.longitude,
        kondisiCuaca: isRainySeason ? 'Sebagian Berawan' : 'Cerah'
      };
      return fallback;
    }
  }

  /**
   * Profil default Wagir di jam kerja (elevasi ~460 mdpl lereng Gunung Kawi)
   */
  public static getDefaultWagirBaseline(): TelemetryData {
    return {
      temperature: 26.8,
      relativeHumidity: 73,
      apparentTemperature: 28.2,
      precipitation: 0,
      weatherCode: 2,
      surfacePressure: 962,
      vpdKpa: 0.94,
      timestamp: new Date().toISOString(),
      locationName: WAGIR_LOCATION.name,
      latitude: WAGIR_LOCATION.latitude,
      longitude: WAGIR_LOCATION.longitude,
      kondisiCuaca: 'Sebagian Berawan'
    };
  }

  /**
   * Data suhu ruangan dari Kertas Kerja BSPP MECAH - TEMBAKAU (Sheet 1ofl3ja4d5QRbbxFAsQYS6Xq-19KUNpbpkbcXIAa26Wg)
   * Cell L7 = Suhu Rata2 : 29.6 °C
   * Cell L8 = Suhu Lt 2 : 31.7 °C
   * Cell L58 = Suhu Sesi Lanjutan : 30.4 °C
   */
  public static getDefaultTobaccoRoomTemperature(): BSPPRoomTemperature {
    return {
      hasData: true,
      lokasiRuang: 'Gudang Tembakau Mecah (Lt 2)',
      suhuRataRata: 29.6,
      suhuLt2: 31.7,
      suhuSesiLanjutan: 30.4,
      tanggal: '2026-10-26T00:00:00.000Z',
      keterangan: 'Kertas Kerja BSPP Mecah Tembakau (Cell L7, L8, L58)',
      sumberSheet: '1ofl3ja4d5QRbbxFAsQYS6Xq-19KUNpbpkbcXIAa26Wg (Tab BSPP MECAH - TEMBAKAU)'
    };
  }

  /**
   * Data suhu ruangan dari Kertas Kerja DHP Blend & DATAMASTER
   * - Harian: Sheet 1Fg3aNLsdkwXthNGxIsFJ9gbHy6Va6DokNV8IVpTnXDA (Tab INTEGRASI DATA DHP BLEND Kolom W)
   * - Historis/Bulanan: Sheet 15qjJfU0SnrbmtVbplL7F4t8M3E60Z5EoOLKjV-RUyDY (Tab DATAMASTER Kolom N)
   */
  public static getBlendRoomTemperature(): BSPPRoomTemperature {
    return {
      hasData: true,
      lokasiRuang: 'Ruang Proses Mixing / Molen Blend',
      suhuRataRata: 27.5,
      suhuLt2: 28.0,
      suhuSesiLanjutan: 29.7,
      tanggal: '2026-10-26T00:00:00.000Z',
      keterangan: 'Batch Molen Blend (Kolom W) & DATAMASTER (Kolom N)',
      sumberSheet: '1Fg3aNLsdkwXthNGxIsFJ9gbHy6Va6DokNV8IVpTnXDA & 15qjJfU0SnrbmtVbplL7F4t8M3E60Z5EoOLKjV-RUyDY'
    };
  }

  /**
   * Resolver dinamis data suhu ruangan berdasarkan komoditas aktif
   */
  public static getRoomTemperatureForKomoditas(komoditasName?: string): BSPPRoomTemperature {
    const name = (komoditasName || '').toLowerCase().trim();
    if (name.includes('blend')) {
      return this.getBlendRoomTemperature();
    }
    if (name.includes('rajang ii') || (name.includes('tembakau') && !name.includes('rajang i'))) {
      return this.getDefaultTobaccoRoomTemperature();
    }
    // Untuk Cengkeh dan komoditas yang belum memiliki sensor suhu fisik
    return {
      hasData: false,
      lokasiRuang: komoditasName ? `Gudang ${komoditasName}` : 'Gudang Penyimpanan',
      keterangan: 'Pencatatan suhu fisik belum diaktifkan untuk komoditas ini.',
      sumberSheet: 'Belum terintegrasi'
    };
  }
}
