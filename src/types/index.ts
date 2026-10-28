export type UserRole = 
  | 'Web Developer'
  | 'Site Engineer / PM'
  | 'Project Manager'
  | 'Admin Produksi'
  | 'Staff Operasional';

export interface UserAccessConfig {
  email: string;
  nama: string;
  role: UserRole;
  password?: string;
  isDefaultPassword?: boolean; // true jika masih bawaan, false jika sudah diubah mandiri
  defaultPin?: string; // PIN bawaan standar (default: '123456')
  hasDevAccess: boolean; // Dapat melihat menu Headless GAS API & teknis backend
  allowedKomoditas: string[]; // List nama komoditas yang diizinkan, atau ['*'] / ['all'] untuk full akses
  canExportPdf: boolean;
  canManageUsers?: boolean;
}

export interface UserSession {
  nama: string;
  email: string;
  role: UserRole;
  hasDevAccess: boolean;
  isDefaultPassword?: boolean;
  allowedKomoditas: string[]; // ['*'] means full access to all
  canExportPdf: boolean;
  canManageUsers?: boolean;
  token?: string;
  isLoggedIn: boolean;
  loginTime?: string;
}

export type KategoriProduksi = 'Murni SKT' | 'Murni SKM' | 'Gabungan' | 'Nol';

export interface KodeItem {
  nama: string;
  saldo: number;
  saldoSKT?: number;
  saldoSKM?: number;
  kategoriProduksi?: KategoriProduksi;
  tanggalTerakhir?: string | null;
}

export interface MutasiItem {
  id?: string;
  tanggal: string | null;
  kode: string;
  jenisMutasi: string;
  masuk: number;
  keluar: number;
  masukSKT?: number;
  keluarSKT?: number;
  masukSKM?: number;
  keluarSKM?: number;
  saldo?: number;
  saldoSKT?: number;
  saldoSKM?: number;
  cek: boolean;
  dhpMatch?: {
    matched: boolean;
    dhpNetto: number;
    selisih: number;
    sumber: string;
    jalur?: string;
    molenList?: { no: number; namaMolen: string; nettoKg: number }[];
  };
  setoranMatch?: {
    matched: boolean;
    labelNetto: number;
    selisih: number;
    sumber: string;
    detailBlend?: { [key: string]: number };
    tujuan?: string;
  };
  bsppMatch?: {
    matched: boolean;
    selisihKg: number;
    selisih: number;
    sumber: string;
    status?: string;
  };
  pengirimanMatch?: {
    matched: boolean;
    bobotKirim: number;
    selisih: number;
    sumber: string;
    tujuan?: string;
  };
}

export interface DHPEntry {
  tanggal: string | null;
  nama: string;
  nettoKg: number;
  jalur: string;
  sumber: string;
  molenList?: { no: number; namaMolen: string; nettoKg: number }[];
}

export interface SetoranEntry {
  tanggal: string | null;
  nama: string;
  labelNettoKg: number;
  sumber: string;
}

export interface SetoranCengkehEntry {
  tanggal: string | null;
  nama: string;
  totalKg: number;
  detailBlend?: { [key: string]: number };
  sumber: string;
}

export interface PengirimanBlendEntry {
  tanggal: string | null;
  nama: string;
  tujuan: string;
  bobotKg: number;
  sumber: string;
}

export interface CengkehDryerEntry {
  tanggal: string | null;
  partai: string;
  nama: string;
  timbangUlangBasahKg: number;
  hasilDryerKg: number;
  susutKg: number;
  susutPersen: string;
  sumber: string;
}

export interface ReconciliationDisplayConfig {
  showDhpSummary: boolean;
  showSetoranSummary: boolean;
  showDhpBlendSummary?: boolean;
  showPengirimanBlendSummary?: boolean;
  showCengkehDryerSummary?: boolean;
  showSetoranCengkehSummary?: boolean;
}

export interface KomoditasData {
  komoditas: string;
  satuan: string;
  saldoTotal: number;
  saldoSKTTotal?: number;
  saldoSKMTotal?: number;
  masukTotal: number;
  keluarTotal: number;
  entriTotal?: number;
  entriTervalidasi?: number;
  jumlahKode: number;
  kodeList: KodeItem[];
  mutasiTerbaru: MutasiItem[];
  error?: string;
}

export interface BSPPRoomTemperature {
  hasData?: boolean;
  lokasiRuang?: string;
  suhuRataRata?: number; // Nilai suhu rata-rata
  suhuLt2?: number;       // Nilai suhu titik spesifik / Lt 2 / Batch max
  suhuSesiLanjutan?: number; // Nilai suhu lanjutan / sore / bulanan
  tanggal?: string;
  keterangan?: string;
  sumberSheet?: string;
}

export interface TelemetryData {
  temperature: number;
  relativeHumidity: number;
  apparentTemperature?: number;
  precipitation?: number;
  weatherCode?: number;
  surfacePressure?: number;
  vpdKpa?: number;
  timestamp: string;
  locationName: string;
  latitude: number;
  longitude: number;
  kondisiCuaca?: string;
}

export interface BSPPEntry {
  tanggal: string;
  jenis: string;
  labelNetto: number;
  timbangUlang: number;
  selisihKg: number;
  selisihPersen: number;
  status: string;
  suhuRuangan?: number;
  suhuLt2?: number;
  telemetrySnapshot?: {
    outdoorTemp: number;
    outdoorRh: number;
    vpdKpa?: number;
  };
}

export interface BSPPData {
  nama: string;
  jumlahEntri: number;
  jenisList: string[];
  totalLebih: number;
  totalKurang: number;
  totalTanpa: number;
  rataRataAbsSelisihPersen: number;
  entries: BSPPEntry[];
  roomTemperature?: BSPPRoomTemperature;
  error?: string;
}

export interface SnapshotResult {
  komoditas: string;
  satuan: string;
  tanggal: string;
  kodeList: { nama: string; saldo: number }[];
  error?: string;
}

export interface GasConfig {
  apiUrl: string;
  useLiveGas: boolean;
  lastSyncTime: string | null;
  cacheExpiryMs: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  role: UserRole;
  details: string;
}

export interface CustomJenisMutasiItem {
  id: string;
  nama: string;
  komoditas: string; // 'all' atau nama spesifik komoditas
  kategoriArus: 'masuk' | 'keluar' | 'netral';
  keterangan?: string;
  isCustom: true;
  createdAt: string;
}
