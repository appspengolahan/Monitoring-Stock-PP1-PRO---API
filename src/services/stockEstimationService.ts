import { 
  DatabasePrufData, 
  CalculatedStockItem, 
  EstimationConfig, 
  EstimationSummary, 
  PrufItem,
  BatchPlanInfo,
  CommodityCategory,
  WeeklyBlendPlanData,
  DailyBlendScheduleItem,
  DayOfWeek
} from '../types/stockEstimation';
import { KomoditasData } from '../types';
import databasePrufBaseline from '../data/databasePrufBaseline.json';
import { GasService } from './gasService';

const SPREADSHEET_ID = '1qnTh5PL0oitFtH7tx7pI1r4jBnWk9vgVuUVJnWUAvk4';
const STORAGE_KEY_PRUF_DATA = 'stockpp1_database_pruf_cache_v3';
const STORAGE_KEY_ESTIMATION_CONFIG = 'stockpp1_estimation_config_v1';

export const SUBSTITUTION_RULES: Record<string, string> = {
  'Besuki 2024 (ZN)': 'Catatan 1: Jika stok Besuki 2024 (ZN) habis, beralih ke Besuki 2025 (ZN).',
  'Janturan Grade B (2020)': 'Catatan 2: Jika stok Janturan Grade B (2020) habis, beralih ke Krs. Garut 2024 (MYN).',
  'Madura 2024 (BAT) R': 'Panduan: Jika Madura 2024 (BAT) menipis, konfirmasi ke QC untuk penggunaan Madura 2024 (HL) atau 2023.',
  'Hang Madura 2024 (BAT)': 'Panduan: Substitusi bertahap ke Hang Madura Grade B (2021) jika stok habis.',
  'Paiton 2024 (VJI)': 'Panduan: Jika Paiton 2024 habis, beralih ke Paiton 2023 (DM) sesuai tabel SKM.'
};

export class StockEstimationService {
  public static getDefaultConfig(): EstimationConfig {
    return {
      usageBasis: 'target_batch_per_day',
      targetBatchPerDay: 10, // 10 Molen / hari (Standar kapasitas harian pabrik)
      targetWorkDays: 5,     // 5 Hari kerja per minggu
      trackingMode: 'plan_awal',
      completedDays: []
    };
  }

  public static getConfig(): EstimationConfig {
    if (typeof localStorage === 'undefined') return this.getDefaultConfig();
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ESTIMATION_CONFIG);
      if (stored) {
        return { ...this.getDefaultConfig(), ...JSON.parse(stored) };
      }
    } catch {}
    return this.getDefaultConfig();
  }

  public static saveConfig(config: Partial<EstimationConfig>): EstimationConfig {
    const current = this.getConfig();
    const updated = { ...current, ...config };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_ESTIMATION_CONFIG, JSON.stringify(updated));
    }
    return updated;
  }

  public static getPrufData(): DatabasePrufData {
    if (typeof localStorage !== 'undefined') {
      try {
        // Hapus cache lama versi 1 dan 2 agar bersih
        localStorage.removeItem('stockpp1_database_pruf_cache_v1');
        localStorage.removeItem('stockpp1_database_pruf_cache_v2');
        const stored = localStorage.getItem(STORAGE_KEY_PRUF_DATA);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && Array.isArray(parsed.tembakauItems) && parsed.tembakauItems.length > 0) {
            return parsed;
          }
        }
      } catch {}
    }
    return databasePrufBaseline as unknown as DatabasePrufData;
  }

  public static savePrufData(data: DatabasePrufData): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_PRUF_DATA, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('stockpp1_pruf_data_updated'));
    }
  }

  /**
   * Mengambil data terbaru dari Google Sheets DATABASEPRUF secara online
   */
  public static async refreshFromGoogleSheets(): Promise<{ ok: boolean; data?: DatabasePrufData; message: string }> {
    try {
      const fetchTab = async (sheetName: string): Promise<string> => {
        const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status} gagal memuat tab ${sheetName}`);
        return await res.text();
      };

      const [tbkCsv, cgkCsv, planCsv] = await Promise.all([
        fetchTab('DATABASEPRUF TEMBAKAU & KROSOK'),
        fetchTab('DATABASEPRUF CENGKEH'),
        fetchTab('PLANING BLEND MINGGUAN').catch(e => {
          console.warn('Tab PLANING BLEND MINGGUAN belum dapat diakses:', e);
          return '';
        })
      ]);

      const parseCsvRow = (text: string): string[] => {
        const result: string[] = [];
        let cur = '', inQuotes = false;
        for (let i = 0; i < text.length; i++) {
          const c = text[i];
          if (c === '"') {
            if (inQuotes && text[i + 1] === '"') { cur += '"'; i++; }
            else { inQuotes = !inQuotes; }
          } else if (c === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
          } else {
            cur += c;
          }
        }
        result.push(cur.trim());
        return result;
      };

      const parseNum = (val: unknown): number => {
        if (!val) return 0;
        let s = String(val).replace(/kg|%|\s/gi, '').trim();
        if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
        else if (s.includes(',')) s = s.replace(',', '.');
        const n = parseFloat(s);
        return isNaN(n) ? 0 : n;
      };

      const processSheet = (csv: string, commodityType: 'Tembakau & Krosok (Rajang II)' | 'Cengkeh') => {
        const lines = csv.split('\n').filter(l => l.trim().length > 0);
        const row1 = parseCsvRow(lines[1] || '');
        const planInfo: BatchPlanInfo = {
          campur153: parseNum(row1[15]),
          campurKarang: parseNum(row1[16]),
          campurSP: parseNum(row1[17]),
          campurTIS: parseNum(row1[18]),
          campurTotalSKT: parseNum(row1[19]),
          campurFReguler: parseNum(row1[20]),
          campurFRLABold: parseNum(row1[21]),
          campurTotalSKM: parseNum(row1[22]),
          campurTotalSemua: parseNum(row1[23])
        };

        const items: PrufItem[] = [];
        for (let i = 3; i < lines.length; i++) {
          const r = parseCsvRow(lines[i]);
          const kodeIntern = r[2] || '';
          const nama = r[3] || '';
          if (!nama || nama.toUpperCase() === 'TOTAL' || nama.includes('MERK') || nama === '0,0 Kg') continue;

          const totalSKT = parseNum(r[19]);
          const totalSKM = parseNum(r[22]);
          const totalSemua = parseNum(r[23]); // Kolom X (Acuan Utama)

          items.push({
            id: (commodityType + '_' + (kodeIntern || nama)).toLowerCase().replace(/[^a-z0-9]/g, '_'),
            kategori: commodityType,
            kodeIntern: kodeIntern.trim(),
            nama: nama.trim(),
            resep: {
              pct153: parseNum(r[4]),
              kg153: parseNum(r[5]),
              pctSP: parseNum(r[6]),
              kgSP: parseNum(r[7]),
              pctFReguler: parseNum(r[8]),
              kgFReguler: parseNum(r[9]),
              pctTIS: parseNum(r[10]),
              kgTIS: parseNum(r[11]),
              pctKarang: parseNum(r[12]),
              kgKarang: parseNum(r[13])
            },
            kebutuhanPlan: {
              req153: parseNum(r[15]),
              reqKarang: parseNum(r[16]),
              reqSP: parseNum(r[17]),
              reqTIS: parseNum(r[18]),
              totalSKT: totalSKT,    // Kolom T
              reqFReguler: parseNum(r[20]),
              reqFRLABold: parseNum(r[21]),
              totalSKM: totalSKM,    // Kolom W
              totalSemua: totalSemua // Kolom X
            }
          });
        }
        return { planInfo, items };
      };

      const tbk = processSheet(tbkCsv, 'Tembakau & Krosok (Rajang II)');
      const cgk = processSheet(cgkCsv, 'Cengkeh');

      // Parsing PLANING BLEND MINGGUAN jika ada
      let weeklyPlan: WeeklyBlendPlanData | undefined = undefined;
      if (planCsv && planCsv.trim().length > 0) {
        const planLines = planCsv.split('\n').filter(l => l.trim().length > 0);
        if (planLines.length >= 2) {
          const dateRow = parseCsvRow(planLines[1]);
          const dates = {
            senin: dateRow[3] || 'Senin',
            selasa: dateRow[4] || 'Selasa',
            rabu: dateRow[5] || 'Rabu',
            kamis: dateRow[6] || 'Kamis',
            jumat: dateRow[7] || 'Jumat',
            sabtu: dateRow[8] || 'Sabtu',
            minggu: dateRow[9] || 'Minggu'
          };

          const schedules: DailyBlendScheduleItem[] = [];
          let dailyTotals = {
            senin: 0,
            selasa: 0,
            rabu: 0,
            kamis: 0,
            jumat: 0,
            sabtu: 0,
            minggu: 0,
            total: 0
          };

          for (let i = 2; i < planLines.length; i++) {
            const r = parseCsvRow(planLines[i]);
            const blendName = (r[1] || '').trim();
            if (!blendName) continue;
            if (blendName.toUpperCase() === 'TOTAL') {
              dailyTotals = {
                senin: parseNum(r[3]),
                selasa: parseNum(r[4]),
                rabu: parseNum(r[5]),
                kamis: parseNum(r[6]),
                jumat: parseNum(r[7]),
                sabtu: parseNum(r[8]),
                minggu: parseNum(r[9]),
                total: parseNum(r[10])
              };
            } else {
              schedules.push({
                blendName,
                kapasitas: (r[2] || '').trim(),
                senin: parseNum(r[3]),
                selasa: parseNum(r[4]),
                rabu: parseNum(r[5]),
                kamis: parseNum(r[6]),
                jumat: parseNum(r[7]),
                sabtu: parseNum(r[8]),
                minggu: parseNum(r[9]),
                totalCampuran: parseNum(r[10])
              });
            }
          }

          weeklyPlan = { dates, schedules, dailyTotals };
        }
      }

      const combined: DatabasePrufData = {
        spreadsheetId: SPREADSHEET_ID,
        lastUpdated: new Date().toISOString(),
        planInfo: tbk.planInfo,
        weeklyPlan,
        cengkehItems: cgk.items,
        tembakauItems: tbk.items
      };

      this.savePrufData(combined);
      return { ok: true, data: combined, message: 'Berhasil menyinkronkan data pruf terbaru langsung dari Google Sheets!' };
    } catch (err: any) {
      console.warn('Gagal refresh DATABASEPRUF dari Google Sheets, menggunakan baseline tersimpan:', err);
      return { ok: false, message: `Gagal menyinkronkan data: ${err.message || String(err)}. Menggunakan data tersimpan.` };
    }
  }

  /**
   * Menghubungkan bahan Pruf dengan Saldo Riil Gudang di Web App:
   * - Tembakau ditarik dari "Tembakau & Krosok (Rajang II)"
   * - Cengkeh ditarik dari "Cengkeh"
   */
  public static calculateStockEstimations(
    komoditasList: KomoditasData[],
    config: EstimationConfig,
    prufData?: DatabasePrufData
  ): { items: CalculatedStockItem[]; summary: EstimationSummary } {
    const data = prufData || this.getPrufData();
    const activeConfig = { ...this.getDefaultConfig(), ...config };

    // 1. Ambil list kode stok gudang PP1 untuk Rajang II & Cengkeh
    const rajangIICommodity = komoditasList.find(k => 
      k.komoditas.toLowerCase().includes('rajang ii') || 
      k.komoditas.toLowerCase().includes('rajang 2')
    );
    const cengkehCommodity = komoditasList.find(k => 
      k.komoditas.toLowerCase().includes('cengkeh')
    );

    const rajangIIKodeList = rajangIICommodity?.kodeList || [];
    const cengkehKodeList = cengkehCommodity?.kodeList || [];

    // Helper pencocokan saldo stok
    const findStockBalance = (
      itemName: string, 
      kodeIntern: string, 
      category: 'Tembakau & Krosok (Rajang II)' | 'Cengkeh'
    ): { saldo: number; matchedName: string } => {
      const targetKodeList = category === 'Cengkeh' ? cengkehKodeList : rajangIIKodeList;
      if (!targetKodeList || targetKodeList.length === 0) {
        return { saldo: 0, matchedName: '' };
      }

      // Prioritas 1: Pencocokan eksak nama
      const exact = targetKodeList.find(k => k.nama.toLowerCase().trim() === itemName.toLowerCase().trim());
      if (exact) return { saldo: exact.saldo, matchedName: exact.nama };

      // Prioritas 2: Pencocokan cerdas bahan (via GasService matcher)
      if (category === 'Cengkeh') {
        const cengkehMatch = targetKodeList.find(k => GasService.isCengkehMaterialMatch(itemName, k.nama));
        if (cengkehMatch) return { saldo: cengkehMatch.saldo, matchedName: cengkehMatch.nama };
      } else {
        const tbkMatch = targetKodeList.find(k => GasService.isRajangMaterialMatch(itemName, k.nama));
        if (tbkMatch) return { saldo: tbkMatch.saldo, matchedName: tbkMatch.nama };
      }

      // Prioritas 3: Pencocokan kode intern jika ada
      if (kodeIntern) {
        const cleanKode = kodeIntern.toLowerCase().trim();
        const kodeMatch = targetKodeList.find(k => k.nama.toLowerCase().includes(cleanKode));
        if (kodeMatch) return { saldo: kodeMatch.saldo, matchedName: kodeMatch.nama };
      }

      return { saldo: 0, matchedName: '' };
    };

    // Helper verifikasi jenis bahan
    const isCloveName = (name: string): boolean => {
      const n = name.toUpperCase();
      return n.includes('CENGKEH') || n.includes('MANADO') || n.includes('GAGANG') || n.includes('PELURU') || n.includes('ANGKUP') || n.includes('JAWA/LOKAL');
    };

    // 2. Isolasi ketat Cengkeh dan Tembakau agar tidak pernah tertukar
    const cleanCengkeh: PrufItem[] = (data.cengkehItems || [])
      .filter(item => {
        if (!item || !item.nama) return false;
        // Pastikan tidak ada bahan tembakau di cengkeh
        const isTbk = item.nama.toLowerCase().includes('boyolali') || 
                      item.nama.toLowerCase().includes('lombok') || 
                      item.nama.toLowerCase().includes('madura') ||
                      item.nama.toLowerCase().includes('besuki') ||
                      item.nama.toLowerCase().includes('amerika');
        return !isTbk && (item.kategori === 'Cengkeh' || isCloveName(item.nama));
      })
      .map((item, idx) => ({
        ...item,
        id: `cgk_${idx}_${item.nama.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        kategori: 'Cengkeh' as CommodityCategory
      }));

    const cleanTembakau: PrufItem[] = (data.tembakauItems || [])
      .filter(item => item && item.nama && item.kategori !== 'Cengkeh' && !isCloveName(item.nama))
      .map((item, idx) => ({
        ...item,
        id: `tbk_${idx}_${item.nama.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        kategori: 'Tembakau & Krosok (Rajang II)' as CommodityCategory
      }));

    // Gabungkan bahan tembakau dan cengkeh yang sudah terisolasi murni
    const allPrufItems: PrufItem[] = [
      ...cleanTembakau,
      ...cleanCengkeh
    ];

    const basePlan = { ...data.planInfo };
    const totalWeeklyPlanBatches = basePlan.campurTotalSemua || 47;

    const isTrackingActive = activeConfig.trackingMode === 'realisasi_berjalan';
    const completedDays = isTrackingActive ? (activeConfig.completedDays || []) : [];

    // 1. Hitung batch yang sudah terealisasi berdasarkan hari kerja yang dipilih
    const completedBatches = {
      campur153: 0,
      campurKarang: 0,
      campurSP: 0,
      campurTIS: 0,
      campurFReguler: 0,
      campurFRLABold: 0,
      total: 0
    };

    if (completedDays.length > 0 && data.weeklyPlan?.schedules) {
      for (const schedule of data.weeklyPlan.schedules) {
        const name = schedule.blendName.toUpperCase();
        let daySum = 0;
        for (const day of completedDays) {
          daySum += Number(schedule[day] || 0);
        }

        if (name.includes('SP 153')) {
          completedBatches.campurSP += daySum;
        } else if (name.includes('153')) {
          completedBatches.campur153 += daySum;
        } else if (name.includes('KARANG')) {
          completedBatches.campurKarang += daySum;
        } else if (name.includes('TIS')) {
          completedBatches.campurTIS += daySum;
        } else if (name.includes('LA BOLD')) {
          completedBatches.campurFRLABold += daySum;
        } else if (name.includes('F REGULER') || name.includes('AVE')) {
          completedBatches.campurFReguler += daySum;
        }
        completedBatches.total += daySum;
      }
    }

    // 2. Hitung sisa batch campuran yang belum dikerjakan
    const remainingBatches = {
      campur153: Math.max(0, (basePlan.campur153 || 0) - completedBatches.campur153),
      campurKarang: Math.max(0, (basePlan.campurKarang || 0) - completedBatches.campurKarang),
      campurSP: Math.max(0, (basePlan.campurSP || 0) - completedBatches.campurSP),
      campurTIS: Math.max(0, (basePlan.campurTIS || 0) - completedBatches.campurTIS),
      campurFReguler: Math.max(0, (basePlan.campurFReguler || 0) - completedBatches.campurFReguler),
      campurFRLABold: Math.max(0, (basePlan.campurFRLABold || 0) - completedBatches.campurFRLABold),
      total: 0
    };
    remainingBatches.total = 
      remainingBatches.campur153 + 
      remainingBatches.campurKarang + 
      remainingBatches.campurSP + 
      remainingBatches.campurTIS + 
      remainingBatches.campurFReguler + 
      remainingBatches.campurFRLABold;

    // Tentukan batch yang aktif dihitung saat ini
    const activeBatchPlan = (isTrackingActive && completedDays.length > 0)
      ? remainingBatches.total
      : totalWeeklyPlanBatches;

    const calculatedItems: CalculatedStockItem[] = allPrufItems.map(pruf => {
      const { saldo, matchedName } = findStockBalance(pruf.nama, pruf.kodeIntern, pruf.kategori);
      
      let kebutuhanSKT = pruf.kebutuhanPlan.totalSKT;     // Kolom T
      let kebutuhanSKM = pruf.kebutuhanPlan.totalSKM;     // Kolom W
      let totalKebutuhan = pruf.kebutuhanPlan.totalSemua; // Kolom X (Acuan Utama)

      // Jika mode realisasi berjalan aktif dan ada hari yang sudah diselesaikan:
      // Hitung ulang secara dinamis kebutuhan bahan berdasarkan sisa batch masing-masing blend
      if (isTrackingActive && completedDays.length > 0) {
        const dynReq153 = (pruf.resep.kg153 || 0) * remainingBatches.campur153;
        const dynReqKarang = (pruf.resep.kgKarang || 0) * remainingBatches.campurKarang;
        const dynReqSP = (pruf.resep.kgSP || 0) * remainingBatches.campurSP;
        const dynReqTIS = (pruf.resep.kgTIS || 0) * remainingBatches.campurTIS;
        kebutuhanSKT = Math.round((dynReq153 + dynReqKarang + dynReqSP + dynReqTIS) * 10) / 10;

        const dynReqFReguler = (pruf.resep.kgFReguler || 0) * remainingBatches.campurFReguler;
        const dynReqFRLABold = (basePlan.campurFRLABold > 0 && pruf.kebutuhanPlan.reqFRLABold) 
          ? (pruf.kebutuhanPlan.reqFRLABold / basePlan.campurFRLABold) * remainingBatches.campurFRLABold 
          : 0;
        kebutuhanSKM = Math.round((dynReqFReguler + dynReqFRLABold) * 10) / 10;

        totalKebutuhan = Math.round((kebutuhanSKT + kebutuhanSKM) * 10) / 10;
      }

      const sisaSaldo = Math.round((saldo - totalKebutuhan) * 10) / 10;

      // Hitung Pemakaian per Batch (Kg)
      const pemakaianPerBatch = activeBatchPlan > 0 
        ? Math.round((totalKebutuhan / activeBatchPlan) * 100) / 100 
        : 0;

      // Hitung Pemakaian Harian (Kg/Hari) berdasarkan acuan user:
      // Opsi 1 (target_batch_per_day): pemakaianPerBatch * targetBatchPerDay
      // Opsi 2 (target_work_days): totalKebutuhan / sisa hari kerja
      let pemakaianPerHari = 0;
      if (activeConfig.usageBasis === 'target_batch_per_day') {
        const batchRate = activeConfig.targetBatchPerDay || 10;
        pemakaianPerHari = Math.round(pemakaianPerBatch * batchRate * 10) / 10;
      } else {
        const baseWorkDays = activeConfig.targetWorkDays || 5;
        const remainingWorkDays = Math.max(1, baseWorkDays - completedDays.length);
        pemakaianPerHari = remainingWorkDays > 0 ? Math.round((totalKebutuhan / remainingWorkDays) * 10) / 10 : 0;
      }

      // Hitung Ketahanan
      let ketahananBatch = 0;
      if (pemakaianPerBatch > 0) {
        ketahananBatch = Math.round((saldo / pemakaianPerBatch) * 10) / 10;
      } else if (saldo > 0) {
        ketahananBatch = 999;
      }

      let ketahananHari = 0;
      if (pemakaianPerHari > 0) {
        ketahananHari = Math.round((saldo / pemakaianPerHari) * 10) / 10;
      } else if (saldo > 0) {
        ketahananHari = 999;
      }

      // Evaluasi Status
      let status: 'Aman' | 'Menipis' | 'Defisit' = 'Aman';
      if (totalKebutuhan > 0) {
        if (sisaSaldo < -0.05) {
          status = 'Defisit';
        } else if (ketahananHari <= 2.0 || sisaSaldo < (pemakaianPerHari * 0.5)) {
          status = 'Menipis';
        } else {
          status = 'Aman';
        }
      }

      const catatanSubstitusi = SUBSTITUTION_RULES[pruf.nama] || undefined;

      return {
        id: pruf.id,
        kategori: pruf.kategori,
        kodeIntern: pruf.kodeIntern,
        nama: pruf.nama,
        matchedStockGradeName: matchedName || pruf.nama,
        kebutuhanSKT,
        kebutuhanSKM,
        totalKebutuhan,
        saldoRiilGudang: saldo,
        sisaSaldo,
        pemakaianPerBatch,
        pemakaianPerHari,
        ketahananBatch,
        ketahananHari,
        status,
        catatanSubstitusi
      };
    });

    // Urutkan: Alphabet Nama Bahan & Grade A - Z agar rapi dan mudah dicari
    calculatedItems.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));

    // Hitung Ringkasan KPI
    let totalKebutuhanSemuaKg = 0;
    let totalKebutuhanTbkKg = 0;
    let totalKebutuhanCgkKg = 0;
    let defisitCount = 0;
    let menipisCount = 0;
    let amanCount = 0;

    calculatedItems.forEach(item => {
      totalKebutuhanSemuaKg += item.totalKebutuhan;
      if (item.kategori === 'Cengkeh') {
        totalKebutuhanCgkKg += item.totalKebutuhan;
      } else {
        totalKebutuhanTbkKg += item.totalKebutuhan;
      }

      if (item.totalKebutuhan > 0) {
        if (item.status === 'Defisit') defisitCount++;
        else if (item.status === 'Menipis') menipisCount++;
        else amanCount++;
      }
    });

    // Cari 3-5 Bahan Bottleneck (Paling Kritis)
    const bottleneckItems = calculatedItems
      .filter(i => i.totalKebutuhan > 0)
      .slice(0, 4);

    const summary: EstimationSummary = {
      totalBatchPlan: totalWeeklyPlanBatches,
      totalBatchRealisasi: completedBatches.total,
      totalBatchSisa: remainingBatches.total,
      activeBatchCount: activeBatchPlan,
      totalKebutuhanSemuaKg: Math.round(totalKebutuhanSemuaKg * 10) / 10,
      totalKebutuhanTembakauKg: Math.round(totalKebutuhanTbkKg * 10) / 10,
      totalKebutuhanCengkehKg: Math.round(totalKebutuhanCgkKg * 10) / 10,
      totalDefisitItemsCount: defisitCount,
      totalMenipisItemsCount: menipisCount,
      totalAmanItemsCount: amanCount,
      bottleneckItems
    };

    return { items: calculatedItems, summary };
  }
}
