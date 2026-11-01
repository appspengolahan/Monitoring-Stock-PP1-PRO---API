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

export interface DatabasePrufData {
  spreadsheetId: string;
  lastUpdated: string;
  planInfo: BatchPlanInfo;
  cengkehItems: PrufItem[];
  tembakauItems: PrufItem[];
}

export interface EstimationConfig {
  usageBasis: DailyUsageBasis;
  targetBatchPerDay: number; // Default misal: 10 batch/hari
  targetWorkDays: number; // Default misal: 5 hari/minggu
  customBatchPlan?: Partial<BatchPlanInfo>; // Opsi jika user ingin simulasi custom jumlah campur
}

export interface CalculatedStockItem {
  id: string;
  kategori: CommodityCategory;
  kodeIntern: string;
  nama: string;
  matchedStockGradeName: string;
  kebutuhanSKT: number; // Kolom T (Kg)
  kebutuhanSKM: number; // Kolom W (Kg)
  totalKebutuhan: number; // Kolom X (Kg) - Acuan Utama
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
  totalBatchPlan: number;
  totalKebutuhanSemuaKg: number;
  totalKebutuhanTembakauKg: number;
  totalKebutuhanCengkehKg: number;
  totalDefisitItemsCount: number;
  totalMenipisItemsCount: number;
  totalAmanItemsCount: number;
  bottleneckItems: CalculatedStockItem[];
}
