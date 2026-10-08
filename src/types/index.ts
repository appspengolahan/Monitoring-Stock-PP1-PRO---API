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
  };
  setoranMatch?: {
    matched: boolean;
    labelNetto: number;
    selisih: number;
    sumber: string;
  };
}

export interface DHPEntry {
  tanggal: string | null;
  nama: string;
  nettoKg: number;
  jalur: string;
  sumber: string;
}

export interface SetoranEntry {
  tanggal: string | null;
  nama: string;
  labelNettoKg: number;
  sumber: string;
}

export interface ReconciliationDisplayConfig {
  showDhpSummary: boolean;
  showSetoranSummary: boolean;
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

export interface BSPPEntry {
  tanggal: string;
  jenis: string;
  labelNetto: number;
  timbangUlang: number;
  selisihKg: number;
  selisihPersen: number;
  status: string;
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
