export type CommodityCategory = 'Tembakau & Krosok (Rajang II)' | 'Cengkeh';

export type DailyUsageBasis = 'target_batch_per_day' | 'target_work_days';

export interface PrufRecipeDetail {
  pct153: number;
  kg153: number;
  pctSP: number;
  kgSP: number;
  pctFReguler: number;
  kgFReguler: number;
  pctTIS: number;
  kgTIS: number;
  pctKarang: number;
  kgKarang: number;
}

export interface PrufKebutuhanPlan {
  req153: number;
  reqKarang: number;
  reqSP: number;
  reqTIS: number;
  totalSKT: number; // Kolom T
  reqFReguler: number;
  reqFRLABold: number;
  totalSKM: number; // Kolom W
  totalSemua: number; // Kolom X (Acuan Utama)
}

export interface PrufItem {
  id: string;
  kategori: CommodityCategory;
  kodeIntern: string;
  nama: string;
  resep: PrufRecipeDetail;
  kebutuhanPlan: PrufKebutuhanPlan;
}

export interface BatchPlanInfo {
  campur153: number;
  campurKarang: number;
  campurSP: number;
  campurTIS: number;
  campurTotalSKT: number;
  campurFReguler: number;
  campurFRLABold: number;
  campurTotalSKM: number;
  campurTotalSemua: number;
}

export interface DailyBlendScheduleItem {
  blendName: string;
  kapasitas: string;
  senin: number;
  selasa: number;
  rabu: number;
  kamis: number;
  jumat: number;
  sabtu: number;
  minggu: number;
  totalCampuran: number;
}

export interface WeeklyBlendPlanData {
  dates: {
    senin: string;
    selasa: string;
    rabu: string;
    kamis: string;
    jumat: string;
    sabtu: string;
    minggu: string;
  };
  schedules: DailyBlendScheduleItem[];
  dailyTotals: {
    senin: number;
    selasa: number;
    rabu: number;
    kamis: number;
    jumat: number;
    sabtu: number;
    minggu: number;
    total: number;
  };
}

export interface DatabasePrufData {
  spreadsheetId: string;
  lastUpdated: string;
  planInfo: BatchPlanInfo;
  weeklyPlan?: WeeklyBlendPlanData;
  cengkehItems: PrufItem[];
  tembakauItems: PrufItem[];
}

export type DayOfWeek = 'senin' | 'selasa' | 'rabu' | 'kamis' | 'jumat' | 'sabtu' | 'minggu';

export interface EstimationConfig {
  usageBasis: DailyUsageBasis;
  targetBatchPerDay: number; // Default misal: 10 batch/hari
  targetWorkDays: number; // Default misal: 5 hari/minggu
  customBatchPlan?: Partial<BatchPlanInfo>; // Opsi jika user ingin simulasi custom jumlah campur
  trackingMode?: 'plan_awal' | 'realisasi_berjalan';
  completedDays?: DayOfWeek[];
}

export interface CalculatedStockItem {
  id: string;
  kategori: CommodityCategory;
  kodeIntern: string;
  nama: string;
  matchedStockGradeName: string;
  kebutuhanSKT: number; // Kolom T (Kg)
  kebutuhanSKM: number; // Kolom W (Kg)
  totalKebutuhan: number; // Kolom X (Kg) - Acuan Utama (menyesuaikan sisa rencana jika hari terealisasi)
  saldoRiilGudang: number; // Dari Rajang II atau Cengkeh
  sisaSaldo: number; // Saldo - Kolom X
  pemakaianPerBatch: number; // Total Kebutuhan / Total Batch Plan
  pemakaianPerHari: number; // Kg/hari berdasarkan acuan yang dipilih
  ketahananBatch: number; // Saldo / Pemakaian per Batch
  ketahananHari: number; // Saldo / Pemakaian per Hari
  status: 'Aman' | 'Menipis' | 'Defisit';
  catatanSubstitusi?: string;
}

export interface EstimationSummary {
  totalBatchPlan: number; // Total awal mingguan (misal 47)
  totalBatchRealisasi: number; // Total batch hari yang sudah selesai (misal 9)
  totalBatchSisa: number; // Sisa batch yang belum dikerjakan (misal 38)
  activeBatchCount: number; // Batch yang aktif dihitung sekarang
  totalKebutuhanSemuaKg: number;
  totalKebutuhanTembakauKg: number;
  totalKebutuhanCengkehKg: number;
  totalDefisitItemsCount: number;
  totalMenipisItemsCount: number;
  totalAmanItemsCount: number;
  bottleneckItems: CalculatedStockItem[];
}
