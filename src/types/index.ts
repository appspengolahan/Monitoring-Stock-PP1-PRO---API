export type UserRole = 
  | 'Project Manager' 
  | 'Site Engineer' 
  | 'Vendor Lapangan' 
  | 'Client / Owner' 
  | 'Admin Produksi';

export interface UserSession {
  nama: string;
  role: UserRole;
  token?: string;
  isLoggedIn: boolean;
  loginTime?: string;
}

export interface KodeItem {
  nama: string;
  saldo: number;
  tanggalTerakhir?: string | null;
}

export interface MutasiItem {
  id?: string;
  tanggal: string | null;
  kode: string;
  jenisMutasi: string;
  masuk: number;
  keluar: number;
  saldo?: number;
  cek: boolean;
}

export interface KomoditasData {
  komoditas: string;
  satuan: string;
  saldoTotal: number;
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
