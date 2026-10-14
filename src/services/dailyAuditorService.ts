/**
 * dailyAuditorService.ts
 * Mesin Auditor Harian Otomatis (Daily Reconciliation Detective)
 * Divisi Produksi I - PT Batu Karang
 * 
 * Melakukan inspeksi otomatis, mendalam, dan proaktif terhadap seluruh transaksi fisik gudang
 * versus seluruh kertas kerja rekonsiliasi (DHP Krosok, DHP Tembakau, DHP Blend, Setoran, BSPP, Pengiriman).
 */

import { KomoditasData, BSPPData, MutasiItem } from '../types';
import { parseDateIndo, getTanggalKey, formatTanggalIndo } from '../utils/dateUtils';
import { GasService } from './gasService';

export interface AuditItemDetail {
  id: string;
  kode: string;
  komoditas: string;
  jenisMutasi: string;
  fisikKg: number;
  kertasKerjaKg: number;
  selisihKg: number;
  sumberKertasKerja: string;
  jalur?: string;
  status: 'MATCH' | 'SELISIH' | 'UNMATCHED';
  keterangan: string;
}

export interface DailyReconciliationAuditResult {
  tanggalIso: string;
  tanggalStr: string;
  availableDates: string[];
  overallStatus: 'CLEAN' | 'PERHATIAN' | 'KRITIS';
  overallScore: number; // 0 - 100%
  overallSummary: string;
  kpi: {
    totalTransaksiHariIni: number;
    totalMasukKg: number;
    totalKeluarKg: number;
    totalHasilProsesKg: number;
    totalVerifiedKg: number;
    totalSelisihKg: number;
    persentaseKesesuaian: number;
  };
  categories: {
    pemasukanHasilProses: {
      totalEntri: number;
      totalKg: number;
      matchedCount: number;
      selisihKg: number;
      items: AuditItemDetail[];
    };
    pemasukanHasilBlend: {
      totalEntri: number;
      totalKg: number;
      matchedCount: number;
      selisihKg: number;
      items: AuditItemDetail[];
    };
    pemasukanHasilDryer: {
      totalEntri: number;
      totalKg: number;
      matchedCount: number;
      selisihKg: number;
      items: AuditItemDetail[];
    };
    pengeluaranSetoran: {
      totalEntri: number;
      totalKg: number;
      matchedCount: number;
      selisihKg: number;
      items: AuditItemDetail[];
    };
    pengeluaranPengiriman: {
      totalEntri: number;
      totalKg: number;
      matchedCount: number;
      selisihKg: number;
      items: AuditItemDetail[];
    };
    bsppSelisih: {
      totalEntri: number;
      totalSelisihKg: number;
      items: Array<{
        id: string;
        komoditas: string;
        jenis: string;
        selisihKg: number;
        status: string;
      }>;
    };
  };
  detectiveFindings: string[];
  actionRecommendations: string[];
}

export class DailyAuditorService {
  /**
   * Kumpulkan seluruh tanggal unik yang memiliki transaksi mutasi di 4 komoditas
   */
  public static getAvailableAuditDates(komoditasList: KomoditasData[]): string[] {
    const dateSet = new Set<string>();
    komoditasList.forEach(k => {
      (k.mutasiTerbaru || []).forEach(m => {
        const key = getTanggalKey(m.tanggal);
        if (key && /^\d{4}-\d{2}-\d{2}$/.test(key)) {
          dateSet.add(key);
        }
      });
    });

    // Urutkan dari yang paling baru
    const dates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));
    // Jika kosong, sediakan tanggal default hari ini / baseline
    return dates.length > 0 ? dates : ['2026-10-14', '2026-10-13', '2026-10-12'];
  }

  /**
   * Eksekusi audit rekonsiliasi harian secara menyeluruh untuk tanggal tertentu
   */
  public static runDailyAudit(
    komoditasList: KomoditasData[],
    bsppList: BSPPData[],
    selectedDateIso?: string
  ): DailyReconciliationAuditResult {
    const availableDates = this.getAvailableAuditDates(komoditasList);
    const targetDate = selectedDateIso || availableDates[0] || '2026-10-14';
    const tanggalStr = formatTanggalIndo(targetDate);

    // Kumpulkan seluruh mutasi pada target date
    const targetMutasi: Array<{ komoditas: string; mutasi: MutasiItem }> = [];
    komoditasList.forEach(k => {
      (k.mutasiTerbaru || []).forEach(m => {
        const mKey = getTanggalKey(m.tanggal);
        if (mKey === targetDate) {
          targetMutasi.push({ komoditas: k.komoditas, mutasi: m });
        }
      });
    });

    // 1. Audit Pemasukan Hasil Proses (Rajang II vs DHP Krosok & DHP Tembakau)
    const hasilProsesItems: AuditItemDetail[] = [];
    let hasilProsesTotalKg = 0;
    let hasilProsesMatchedCount = 0;
    let hasilProsesSelisihKg = 0;

    targetMutasi
      .filter(t => t.komoditas.includes('Rajang II') && t.mutasi.jenisMutasi === 'Pemasukan Hasil Proses')
      .forEach((t, idx) => {
        const m = t.mutasi;
        const masukKg = Number(m.masuk) || 0;
        hasilProsesTotalKg += masukKg;

        const hasMatch = !!m.dhpMatch;
        const kertasKg = m.dhpMatch?.dhpNetto ?? 0;
        const selisih = m.dhpMatch ? (m.dhpMatch.selisih ?? Math.round((masukKg - kertasKg) * 10) / 10) : masukKg;
        const sumber = m.dhpMatch?.sumber || 'Kertas Kerja DHP (Belum Terhubung)';

        if (hasMatch && selisih === 0) {
          hasilProsesMatchedCount++;
        } else if (hasMatch) {
          hasilProsesSelisihKg += Math.abs(selisih);
        }

        hasilProsesItems.push({
          id: m.id || `hp-${idx}`,
          kode: m.kode || 'Tanpa Kode',
          komoditas: t.komoditas,
          jenisMutasi: m.jenisMutasi,
          fisikKg: masukKg,
          kertasKerjaKg: kertasKg,
          selisihKg: selisih,
          sumberKertasKerja: sumber,
          jalur: m.dhpMatch?.jalur || (m.masukSKT ? 'SKT' : m.masukSKM ? 'SKM' : 'SKT'),
          status: hasMatch ? (selisih === 0 ? 'MATCH' : 'SELISIH') : 'UNMATCHED',
          keterangan: hasMatch
            ? (selisih === 0 ? `Identik 100% dengan ${sumber} (${kertasKg.toLocaleString('id-ID')} Kg)` : `Selisih timbangan ${selisih > 0 ? '+' : ''}${selisih} Kg vs ${sumber}`)
            : 'Belum ada rujukan DHP pada tanggal ini'
        });
      });

    // 2. Audit Pemasukan Hasil Blend (Tembakau Blend vs DHP Blend)
    const hasilBlendItems: AuditItemDetail[] = [];
    let hasilBlendTotalKg = 0;
    let hasilBlendMatchedCount = 0;
    let hasilBlendSelisihKg = 0;

    targetMutasi
      .filter(t => t.komoditas.toLowerCase().includes('blend') && t.mutasi.jenisMutasi === 'Pemasukan Hasil Blend')
      .forEach((t, idx) => {
        const m = t.mutasi;
        const masukKg = Number(m.masuk) || 0;
        hasilBlendTotalKg += masukKg;

        const hasMatch = !!m.dhpMatch;
        const kertasKg = m.dhpMatch?.dhpNetto ?? 0;
        const selisih = m.dhpMatch ? (m.dhpMatch.selisih ?? 0) : masukKg;
        const sumber = m.dhpMatch?.sumber || 'Kertas Kerja DHP Blend';

        if (hasMatch && selisih === 0) {
          hasilBlendMatchedCount++;
        } else if (hasMatch) {
          hasilBlendSelisihKg += Math.abs(selisih);
        }

        hasilBlendItems.push({
          id: m.id || `blend-${idx}`,
          kode: m.kode || 'Blend',
          komoditas: t.komoditas,
          jenisMutasi: m.jenisMutasi,
          fisikKg: masukKg,
          kertasKerjaKg: kertasKg,
          selisihKg: selisih,
          sumberKertasKerja: sumber,
          status: hasMatch ? (selisih === 0 ? 'MATCH' : 'SELISIH') : 'UNMATCHED',
          keterangan: hasMatch
            ? (selisih === 0 ? `Identik 100% dengan ${sumber} (${kertasKg.toLocaleString('id-ID')} Kg)` : `Selisih ${selisih} Kg vs ${sumber}`)
            : 'Belum ada rujukan DHP Blend'
        });
      });

    // 3. Audit Pemasukan Hasil Dryer Cengkeh (Cengkeh vs SOURCE HASIL DRYER)
    const hasilDryerItems: AuditItemDetail[] = [];
    let hasilDryerTotalKg = 0;
    let hasilDryerMatchedCount = 0;
    let hasilDryerSelisihKg = 0;

    targetMutasi
      .filter(t => t.komoditas.toLowerCase().includes('cengkeh') && t.mutasi.jenisMutasi === 'Pemasukan Hasil Proses')
      .forEach((t, idx) => {
        const m = t.mutasi;
        const masukKg = Number(m.masuk) || 0;
        hasilDryerTotalKg += masukKg;

        const hasMatch = !!m.dhpMatch;
        const kertasKg = m.dhpMatch?.dhpNetto ?? 0;
        const selisih = m.dhpMatch ? (m.dhpMatch.selisih ?? 0) : masukKg;
        const sumber = m.dhpMatch?.sumber || 'SOURCE HASIL DRYER (Kolom F)';

        if (hasMatch && selisih === 0) {
          hasilDryerMatchedCount++;
        } else if (hasMatch) {
          hasilDryerSelisihKg += Math.abs(selisih);
        }

        hasilDryerItems.push({
          id: m.id || `dryer-${idx}`,
          kode: m.kode || 'Cengkeh',
          komoditas: t.komoditas,
          jenisMutasi: m.jenisMutasi,
          fisikKg: masukKg,
          kertasKerjaKg: kertasKg,
          selisihKg: selisih,
          sumberKertasKerja: sumber,
          status: hasMatch ? (selisih === 0 ? 'MATCH' : 'SELISIH') : 'UNMATCHED',
          keterangan: hasMatch
            ? `Identik dengan hasil timbang dryer (${kertasKg.toLocaleString('id-ID')} Kg)`
            : 'Belum ada rujukan data dryer'
        });
      });

    // 4. Audit Pengeluaran Setoran (Rajang II vs BSPP SETORAN)
    const setoranItems: AuditItemDetail[] = [];
    let setoranTotalKg = 0;
    let setoranMatchedCount = 0;
    let setoranSelisihKg = 0;

    targetMutasi
      .filter(t => t.mutasi.jenisMutasi === 'Pengeluaran Setoran' || !!t.mutasi.setoranMatch)
      .forEach((t, idx) => {
        const m = t.mutasi;
        const keluarKg = Number(m.keluar) || 0;
        setoranTotalKg += keluarKg;

        const hasMatch = !!m.setoranMatch;
        const labelKg = m.setoranMatch?.labelNetto ?? 0;
        const selisih = m.setoranMatch ? (m.setoranMatch.selisih ?? Math.round((keluarKg - labelKg) * 10) / 10) : keluarKg;
        const sumber = m.setoranMatch?.sumber || 'Kertas Kerja BSPP SETORAN (Kolom H)';

        if (hasMatch && selisih === 0) {
          setoranMatchedCount++;
        } else if (hasMatch) {
          setoranSelisihKg += Math.abs(selisih);
        }

        setoranItems.push({
          id: m.id || `setoran-${idx}`,
          kode: m.kode || 'Bahan Setoran',
          komoditas: t.komoditas,
          jenisMutasi: m.jenisMutasi,
          fisikKg: keluarKg,
          kertasKerjaKg: labelKg,
          selisihKg: selisih,
          sumberKertasKerja: sumber,
          status: hasMatch ? (selisih === 0 ? 'MATCH' : 'SELISIH') : 'UNMATCHED',
          keterangan: hasMatch
            ? (selisih === 0 ? `Tercocokkan 100% vs Label Netto Setoran (${labelKg.toLocaleString('id-ID')} Kg)` : `Selisih timbang setoran ${selisih} Kg`)
            : 'Belum terhubung ke baris BSPP Setoran'
        });
      });

    // 5. Audit Pengeluaran Pengiriman Tembakau Blend (Wagir 1/2/3, PSM)
    const pengirimanItems: AuditItemDetail[] = [];
    let pengirimanTotalKg = 0;
    let pengirimanMatchedCount = 0;
    let pengirimanSelisihKg = 0;

    targetMutasi
      .filter(t => (m => (m.jenisMutasi || '').startsWith('Pengiriman') || !!m.pengirimanMatch)(t.mutasi))
      .forEach((t, idx) => {
        const m = t.mutasi;
        const keluarKg = Number(m.keluar) || 0;
        pengirimanTotalKg += keluarKg;

        const hasMatch = !!m.pengirimanMatch;
        const bobotKirim = m.pengirimanMatch?.bobotKirim ?? 0;
        const selisih = m.pengirimanMatch ? (m.pengirimanMatch.selisih ?? 0) : keluarKg;
        const sumber = m.pengirimanMatch?.sumber || 'PENGIRIMAN TBK BLD (Kolom F & L)';

        if (hasMatch && selisih === 0) {
          pengirimanMatchedCount++;
        } else if (hasMatch) {
          pengirimanSelisihKg += Math.abs(selisih);
        }

        pengirimanItems.push({
          id: m.id || `pengiriman-${idx}`,
          kode: m.kode || 'Blend Kirim',
          komoditas: t.komoditas,
          jenisMutasi: m.jenisMutasi,
          fisikKg: keluarKg,
          kertasKerjaKg: bobotKirim,
          selisihKg: selisih,
          sumberKertasKerja: sumber,
          status: hasMatch ? (selisih === 0 ? 'MATCH' : 'SELISIH') : 'UNMATCHED',
          keterangan: hasMatch
            ? `Identik dengan surat jalan pengiriman (${bobotKirim.toLocaleString('id-ID')} Kg)`
            : 'Belum ada rujukan lembar pengiriman'
        });
      });

    // 6. Audit Bukti Selisih Persediaan (BSPP Lebih & Kurang)
    const bsppSelisihItems: Array<{
      id: string;
      komoditas: string;
      jenis: string;
      selisihKg: number;
      status: string;
    }> = [];
    let totalBsppSelisihKg = 0;

    targetMutasi
      .filter(t => (t.mutasi.jenisMutasi || '').includes('BSPP'))
      .forEach((t, idx) => {
        const m = t.mutasi;
        const val = Number(m.masuk || m.keluar || 0);
        totalBsppSelisihKg += val;
        bsppSelisihItems.push({
          id: m.id || `bspp-mutasi-${idx}`,
          komoditas: t.komoditas,
          jenis: m.jenisMutasi,
          selisihKg: val,
          status: m.jenisMutasi.includes('Lebih') ? 'BSPP Lebih (+)' : 'BSPP Kurang (-)'
        });
      });

    // Rekapitulasi KPI
    const totalMasukKg = targetMutasi.reduce((acc, t) => acc + (Number(t.mutasi.masuk) || 0), 0);
    const totalKeluarKg = targetMutasi.reduce((acc, t) => acc + (Number(t.mutasi.keluar) || 0), 0);
    const totalSemuaTransaksi = targetMutasi.length;

    const totalAuditedItems = hasilProsesItems.length + hasilBlendItems.length + hasilDryerItems.length + setoranItems.length + pengirimanItems.length;
    const totalCleanMatchedItems = hasilProsesMatchedCount + hasilBlendMatchedCount + hasilDryerMatchedCount + setoranMatchedCount + pengirimanMatchedCount;
    const totalSelisihKg = hasilProsesSelisihKg + hasilBlendSelisihKg + hasilDryerSelisihKg + setoranSelisihKg + pengirimanSelisihKg;

    const persentaseKesesuaian = totalAuditedItems > 0 
      ? Math.round((totalCleanMatchedItems / totalAuditedItems) * 1000) / 10 
      : 100;

    // Evaluasi Skor & Status Audit Harian
    let overallStatus: 'CLEAN' | 'PERHATIAN' | 'KRITIS' = 'CLEAN';
    let overallScore = 100;

    if (totalSelisihKg > 50 || persentaseKesesuaian < 80) {
      overallStatus = 'KRITIS';
      overallScore = Math.max(50, Math.round(persentaseKesesuaian - 20));
    } else if (totalSelisihKg > 0 || persentaseKesesuaian < 100) {
      overallStatus = 'PERHATIAN';
      overallScore = Math.round(persentaseKesesuaian);
    }

    // Temuan Detektif AI (Detective Findings)
    const detectiveFindings: string[] = [];
    const actionRecommendations: string[] = [];

    // Cross-check DHP Worksheet Coverage (Verifikasi 2 arah: Fisik Gudang <-> Kertas Kerja DHP)
    const cachedDhpList = typeof window !== 'undefined' ? GasService.getCachedDHP() : GasService.DEFAULT_DHP_ENTRIES;
    const targetDhpEntries = cachedDhpList.filter(d => {
      const dKey = getTanggalKey(d.tanggal);
      return dKey === targetDate;
    });

    if (hasilProsesItems.length > 0) {
      if (hasilProsesMatchedCount === hasilProsesItems.length && hasilProsesSelisihKg === 0) {
        detectiveFindings.push(
          `🛡️ Pemasukan Hasil Proses Rajang II (${hasilProsesTotalKg.toLocaleString('id-ID')} Kg, ${hasilProsesItems.length} entri) tervalidasi 100% IDENTIK dengan Kertas Kerja DHP Krosok & Tembakau tanpa selisih berat riil.`
        );
      } else {
        detectiveFindings.push(
          `⚠️ Ditemukan ${hasilProsesItems.length - hasilProsesMatchedCount} entri Hasil Proses dengan selisih total ${hasilProsesSelisihKg.toLocaleString('id-ID')} Kg terhadap Kertas Kerja DHP.`
        );
      }

      // Periksa apakah seluruh entri pada lembar kerja DHP tanggal ini sudah dicatat di gudang
      if (targetDhpEntries.length > 0) {
        const matchedCodes = new Set(hasilProsesItems.filter(it => it.status === 'MATCH').map(it => it.kode.toLowerCase().replace(/[^a-z0-9]/g, '')));
        const unrecordedDhp = targetDhpEntries.filter(d => {
          const cleanName = (d.nama || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          for (const mCode of matchedCodes) {
            if (mCode === cleanName || mCode.includes(cleanName) || cleanName.includes(mCode)) {
              return false;
            }
          }
          return true;
        });

        if (unrecordedDhp.length === 0) {
          detectiveFindings.push(
            `🎯 100% Lembar Kerja DHP Terpenuhi: Seluruh ${targetDhpEntries.length} entri kertas kerja DHP (${targetDhpEntries.reduce((a, b) => a + (b.nettoKg || 0), 0).toLocaleString('id-ID')} Kg) pada ${tanggalStr} telah tercatat lengkap di mutasi gudang tanpa ada yang tertinggal.`
          );
        } else {
          detectiveFindings.push(
            `⚠️ Terdapat ${unrecordedDhp.length} entri pada Lembar Kerja DHP yang belum tercatat di mutasi gudang: ${unrecordedDhp.map(u => `${u.nama} (${u.nettoKg} Kg)`).join(', ')}.`
          );
        }
      }
    } else {
      if (targetDhpEntries.length > 0) {
        detectiveFindings.push(
          `⚠️ Perhatian: Lembar Kerja DHP mencatat ${targetDhpEntries.length} entri hasil proses (${targetDhpEntries.reduce((a, b) => a + (b.nettoKg || 0), 0).toLocaleString('id-ID')} Kg), namun belum ada input mutasi fisik pada tanggal ${tanggalStr}.`
        );
      } else {
        detectiveFindings.push(`ℹ️ Tidak tercatat transaksi Hasil Proses baru pada tanggal ${tanggalStr}.`);
      }
    }

    if (setoranItems.length > 0) {
      if (setoranMatchedCount === setoranItems.length) {
        detectiveFindings.push(
          `📦 Seluruh ${setoranItems.length} transaksi Pengeluaran Setoran (${setoranTotalKg.toLocaleString('id-ID')} Kg) telah terverifikasi dengan Lembar BSPP Setoran (Kolom H).`
        );
      } else {
        detectiveFindings.push(
          `⚠️ Terdapat ${setoranItems.length - setoranMatchedCount} transaksi Pengeluaran Setoran yang belum memiliki bukti cocok pada lembar timbang setoran.`
        );
      }
    }

    if (bsppSelisihItems.length > 0) {
      detectiveFindings.push(
        `⚖️ Tercatat ${bsppSelisihItems.length} penyesuaian timbang ulang fisik (BSPP) dengan total deviasi akumulatif ${totalBsppSelisihKg.toFixed(1)} Kg.`
      );
    }

    // Rekomendasi Tindakan (Action Recommendations)
    if (overallStatus === 'CLEAN') {
      actionRecommendations.push('Kunci baseline laporan audit harian: Integritas data tanggal ini sudah 100% valid dan memenuhi standar audit akuntansi persediaan PP1.');
      actionRecommendations.push('Data siap digunakan sebagai dasar pelaporan produksi resmi ke Site Engineer dan Manajemen Pabrik.');
    } else if (overallStatus === 'PERHATIAN') {
      actionRecommendations.push('Lakukan konfirmasi ke tim penimbangan lantai produksi terkait entri setoran yang belum terverifikasi label netto.');
      actionRecommendations.push('Periksa lembar fisik BSPP untuk memastikan tidak ada keterlambatan pencatatan manual.');
    } else {
      actionRecommendations.push('SEGERA lakukan kalibrasi timbangan dan cek fisik di gudang: Selisih berat melampaui batas toleransi normal.');
      actionRecommendations.push('Bandingkan ulang nota timbang asal vendor terhadap penerimaan gudang.');
    }

    const overallSummary = overallStatus === 'CLEAN'
      ? `Audit rekonsiliasi harian tanggal ${tanggalStr} BERSIH (CLEAN). Sebanyak ${totalAuditedItems} entri transaksi fisik tervalidasi 100% klop dengan dokumen kertas kerja tanpa deviasi tonase.`
      : overallStatus === 'PERHATIAN'
      ? `Audit rekonsiliasi tanggal ${tanggalStr} menunjukkan tingkat kesesuaian ${persentaseKesesuaian}%. Ditemukan beberapa entri yang memerlukan verifikasi kelengkapan bukti timbang.`
      : `Audit rekonsiliasi tanggal ${tanggalStr} BERSTATUS KRITIS: Ditemukan selisih timbangan sebesar ${totalSelisihKg.toFixed(1)} Kg yang melampaui batas toleransi harian.`;

    return {
      tanggalIso: targetDate,
      tanggalStr,
      availableDates,
      overallStatus,
      overallScore,
      overallSummary,
      kpi: {
        totalTransaksiHariIni: totalSemuaTransaksi,
        totalMasukKg: Math.round(totalMasukKg * 10) / 10,
        totalKeluarKg: Math.round(totalKeluarKg * 10) / 10,
        totalHasilProsesKg: Math.round(hasilProsesTotalKg * 10) / 10,
        totalVerifiedKg: Math.round((hasilProsesTotalKg + hasilBlendTotalKg + hasilDryerTotalKg + setoranTotalKg + pengirimanTotalKg) * 10) / 10,
        totalSelisihKg: Math.round(totalSelisihKg * 10) / 10,
        persentaseKesesuaian
      },
      categories: {
        pemasukanHasilProses: {
          totalEntri: hasilProsesItems.length,
          totalKg: Math.round(hasilProsesTotalKg * 10) / 10,
          matchedCount: hasilProsesMatchedCount,
          selisihKg: Math.round(hasilProsesSelisihKg * 10) / 10,
          items: hasilProsesItems
        },
        pemasukanHasilBlend: {
          totalEntri: hasilBlendItems.length,
          totalKg: Math.round(hasilBlendTotalKg * 10) / 10,
          matchedCount: hasilBlendMatchedCount,
          selisihKg: Math.round(hasilBlendSelisihKg * 10) / 10,
          items: hasilBlendItems
        },
        pemasukanHasilDryer: {
          totalEntri: hasilDryerItems.length,
          totalKg: Math.round(hasilDryerTotalKg * 10) / 10,
          matchedCount: hasilDryerMatchedCount,
          selisihKg: Math.round(hasilDryerSelisihKg * 10) / 10,
          items: hasilDryerItems
        },
        pengeluaranSetoran: {
          totalEntri: setoranItems.length,
          totalKg: Math.round(setoranTotalKg * 10) / 10,
          matchedCount: setoranMatchedCount,
          selisihKg: Math.round(setoranSelisihKg * 10) / 10,
          items: setoranItems
        },
        pengeluaranPengiriman: {
          totalEntri: pengirimanItems.length,
          totalKg: Math.round(pengirimanTotalKg * 10) / 10,
          matchedCount: pengirimanMatchedCount,
          selisihKg: Math.round(pengirimanSelisihKg * 10) / 10,
          items: pengirimanItems
        },
        bsppSelisih: {
          totalEntri: bsppSelisihItems.length,
          totalSelisihKg: Math.round(totalBsppSelisihKg * 10) / 10,
          items: bsppSelisihItems
        }
      },
      detectiveFindings,
      actionRecommendations
    };
  }
}
