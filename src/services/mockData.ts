import { KomoditasData, BSPPData } from '../types';

export const INITIAL_KOMODITAS_DATA: KomoditasData[] = [
  {
    komoditas: 'Tembakau Blend',
    satuan: 'Kg',
    saldoTotal: 48920.5,
    masukTotal: 185400.0,
    keluarTotal: 136479.5,
    entriTotal: 1420,
    entriTervalidasi: 98.4,
    jumlahKode: 14,
    kodeList: [
      { nama: 'Blend Super Premium BK-01', saldo: 8420.0, tanggalTerakhir: '2026-09-26T14:30:00Z' },
      { nama: 'Blend Ekstra Wangi BK-02', saldo: 6150.5, tanggalTerakhir: '2026-09-25T11:20:00Z' },
      { nama: 'Blend Reguler Gold BK-03', saldo: 5930.0, tanggalTerakhir: '2026-09-26T09:15:00Z' },
      { nama: 'Blend Madura Cengkeh BK-04', saldo: 4720.0, tanggalTerakhir: '2026-09-24T16:00:00Z' },
      { nama: 'Blend Temanggung Special BK-05', saldo: 4100.0, tanggalTerakhir: '2026-09-25T08:45:00Z' },
      { nama: 'Blend Mild Flavor BK-06', saldo: 3890.0, tanggalTerakhir: '2026-09-23T15:10:00Z' },
      { nama: 'Blend Kretek Heritage BK-07', saldo: 3450.0, tanggalTerakhir: '2026-09-26T10:00:00Z' },
      { nama: 'Blend Virginia Smooth BK-08', saldo: 2980.0, tanggalTerakhir: '2026-09-22T13:30:00Z' },
      { nama: 'Blend Besuki Aroma BK-09', saldo: 2640.0, tanggalTerakhir: '2026-09-24T11:40:00Z' },
      { nama: 'Blend Kasturi Pilihan BK-10', saldo: 2150.0, tanggalTerakhir: '2026-09-21T09:00:00Z' },
      { nama: 'Blend Kedu Rajang BK-11', saldo: 1870.0, tanggalTerakhir: '2026-09-25T14:15:00Z' },
      { nama: 'Blend Lumajang Kering BK-12', saldo: 1320.0, tanggalTerakhir: '2026-09-20T16:45:00Z' },
      { nama: 'Blend Probolinggo BK-13', saldo: 900.0, tanggalTerakhir: '2026-09-18T10:20:00Z' },
      { nama: 'Blend Afkir Sorting BK-14', saldo: 400.0, tanggalTerakhir: '2026-09-19T11:30:00Z' }
    ],
    mutasiTerbaru: [
      { id: 'tb-1', tanggal: '2026-09-26T14:30:00Z', kode: 'Blend Super Premium BK-01', jenisMutasi: 'Pemakaian Produksi SKT', masuk: 0, keluar: 850.0, saldo: 8420.0, cek: true },
      { id: 'tb-2', tanggal: '2026-09-26T10:00:00Z', kode: 'Blend Kretek Heritage BK-07', jenisMutasi: 'Penerimaan Mixing PP1', masuk: 1200.0, keluar: 0, saldo: 3450.0, cek: true },
      { id: 'tb-3', tanggal: '2026-09-26T09:15:00Z', kode: 'Blend Reguler Gold BK-03', jenisMutasi: 'Pemakaian Produksi SKM', masuk: 0, keluar: 620.0, saldo: 5930.0, cek: true },
      { id: 'tb-4', tanggal: '2026-09-25T14:15:00Z', kode: 'Blend Kedu Rajang BK-11', jenisMutasi: 'Pemakaian Casing Room', masuk: 0, keluar: 310.0, saldo: 1870.0, cek: true },
      { id: 'tb-5', tanggal: '2026-09-25T11:20:00Z', kode: 'Blend Ekstra Wangi BK-02', jenisMutasi: 'Penerimaan Silo A', masuk: 950.0, keluar: 0, saldo: 6150.5, cek: false },
      { id: 'tb-6', tanggal: '2026-09-25T08:45:00Z', kode: 'Blend Temanggung Special BK-05', jenisMutasi: 'Pemakaian Produksi SKT', masuk: 0, keluar: 450.0, saldo: 4100.0, cek: true },
      { id: 'tb-7', tanggal: '2026-09-24T16:00:00Z', kode: 'Blend Madura Cengkeh BK-04', jenisMutasi: 'Koreksi Timbang Masuk', masuk: 120.0, keluar: 0, saldo: 4720.0, cek: true },
      { id: 'tb-8', tanggal: '2026-09-24T11:40:00Z', kode: 'Blend Besuki Aroma BK-09', jenisMutasi: 'Pemakaian Flavouring', masuk: 0, keluar: 280.0, saldo: 2640.0, cek: true }
    ]
  },
  {
    komoditas: 'Cengkeh',
    satuan: 'Kg',
    saldoTotal: 62410.8,
    masukTotal: 241500.0,
    keluarTotal: 179089.2,
    entriTotal: 1890,
    entriTervalidasi: 99.1,
    jumlahKode: 12,
    kodeList: [
      { nama: 'Cengkeh Manado Super A', saldo: 14200.0, tanggalTerakhir: '2026-09-26T15:00:00Z' },
      { nama: 'Cengkeh Ambon Grade 1', saldo: 11850.0, tanggalTerakhir: '2026-09-26T11:10:00Z' },
      { nama: 'Cengkeh Madura Rajang Halus', saldo: 8940.5, tanggalTerakhir: '2026-09-25T16:30:00Z' },
      { nama: 'Cengkeh Bali Pilihan', saldo: 7650.0, tanggalTerakhir: '2026-09-24T13:45:00Z' },
      { nama: 'Cengkeh Toli-Toli Grade A', saldo: 6100.0, tanggalTerakhir: '2026-09-25T09:20:00Z' },
      { nama: 'Cengkeh Halmahera Super', saldo: 4520.3, tanggalTerakhir: '2026-09-23T14:10:00Z' },
      { nama: 'Cengkeh Trenggalek Wangi', saldo: 3200.0, tanggalTerakhir: '2026-09-22T10:00:00Z' },
      { nama: 'Cengkeh Aceh Gayo', saldo: 2850.0, tanggalTerakhir: '2026-09-21T15:40:00Z' },
      { nama: 'Cengkeh Gagang Rajang (Stem)', saldo: 1540.0, tanggalTerakhir: '2026-09-20T12:00:00Z' },
      { nama: 'Cengkeh Kepala Patah', saldo: 980.0, tanggalTerakhir: '2026-09-19T08:30:00Z' },
      { nama: 'Cengkeh Dust / Serbuk Filter', saldo: 580.0, tanggalTerakhir: '2026-09-18T14:20:00Z' },
      { nama: 'Cengkeh Afkir Sortir Kasar', saldo: 0.0, tanggalTerakhir: '2026-09-15T11:00:00Z' }
    ],
    mutasiTerbaru: [
      { id: 'ck-1', tanggal: '2026-09-26T15:00:00Z', kode: 'Cengkeh Manado Super A', jenisMutasi: 'Penerimaan Ekspedisi Vendor', masuk: 3500.0, keluar: 0, saldo: 14200.0, cek: true },
      { id: 'ck-2', tanggal: '2026-09-26T11:10:00Z', kode: 'Cengkeh Ambon Grade 1', jenisMutasi: 'Pemakaian Rajang Cengkeh PP1', masuk: 0, keluar: 1200.0, saldo: 11850.0, cek: true },
      { id: 'ck-3', tanggal: '2026-09-25T16:30:00Z', kode: 'Cengkeh Madura Rajang Halus', jenisMutasi: 'Pemakaian Casing & Mixing', masuk: 0, keluar: 980.0, saldo: 8940.5, cek: true },
      { id: 'ck-4', tanggal: '2026-09-25T09:20:00Z', kode: 'Cengkeh Toli-Toli Grade A', jenisMutasi: 'Transfer Gudang Pengeringan', masuk: 1400.0, keluar: 0, saldo: 6100.0, cek: false },
      { id: 'ck-5', tanggal: '2026-09-24T13:45:00Z', kode: 'Cengkeh Bali Pilihan', jenisMutasi: 'Pemakaian Rajang Cengkeh PP1', masuk: 0, keluar: 750.0, saldo: 7650.0, cek: true },
      { id: 'ck-6', tanggal: '2026-09-23T14:10:00Z', kode: 'Cengkeh Halmahera Super', jenisMutasi: 'Penerimaan Ekspedisi Vendor', masuk: 2000.0, keluar: 0, saldo: 4520.3, cek: true }
    ]
  },
  {
    komoditas: 'Tembakau & Krosok (Rajang II)',
    satuan: 'Kg',
    saldoTotal: 112540.2,
    masukTotal: 418200.0,
    keluarTotal: 305659.8,
    entriTotal: 3410,
    entriTervalidasi: 97.9,
    jumlahKode: 22,
    kodeList: [
      { nama: 'Madura Guluk-Guluk RJ-2', saldo: 16800.0, tanggalTerakhir: '2026-09-26T16:20:00Z' },
      { nama: 'Bojonegoro Baureno RJ-2', saldo: 14250.0, tanggalTerakhir: '2026-09-26T13:15:00Z' },
      { nama: 'Temanggung Parakan RJ-2', saldo: 12100.5, tanggalTerakhir: '2026-09-25T15:40:00Z' },
      { nama: 'Boyolali Selo RJ-2', saldo: 10400.0, tanggalTerakhir: '2026-09-26T10:30:00Z' },
      { nama: 'Muntilan Sleman RJ-2', saldo: 9550.0, tanggalTerakhir: '2026-09-24T14:00:00Z' },
      { nama: 'Krosok Jember Na-Oogst RJ-2', saldo: 8200.0, tanggalTerakhir: '2026-09-25T11:00:00Z' },
      { nama: 'Weleri Kendal RJ-2', saldo: 7420.0, tanggalTerakhir: '2026-09-23T16:10:00Z' },
      { nama: 'Krosok Vor-Oogst Besuki RJ-2', saldo: 6300.0, tanggalTerakhir: '2026-09-24T09:30:00Z' },
      { nama: 'Kedu Wonosobo RJ-2', saldo: 5890.0, tanggalTerakhir: '2026-09-25T13:20:00Z' },
      { nama: 'Krosok Lumajang Virginia RJ-2', saldo: 4950.0, tanggalTerakhir: '2026-09-22T15:00:00Z' },
      { nama: 'Jombang Ploso RJ-2', saldo: 4120.0, tanggalTerakhir: '2026-09-21T10:45:00Z' },
      { nama: 'Krosok Tuban RJ-2', saldo: 3680.0, tanggalTerakhir: '2026-09-20T14:15:00Z' },
      { nama: 'Pamekasan Waru RJ-2', saldo: 2950.0, tanggalTerakhir: '2026-09-19T11:20:00Z' },
      { nama: 'Sumenep Ganding RJ-2', saldo: 2450.0, tanggalTerakhir: '2026-09-18T09:00:00Z' },
      { nama: 'Krosok Blitar RJ-2', saldo: 1820.0, tanggalTerakhir: '2026-09-17T16:30:00Z' },
      { nama: 'Krosok Tulungagung RJ-2', saldo: 1140.0, tanggalTerakhir: '2026-09-16T13:00:00Z' },
      { nama: 'Pati Juwana RJ-2', saldo: 520.0, tanggalTerakhir: '2026-09-15T10:10:00Z' },
      { nama: 'Krosok Rembang RJ-2', saldo: 0.0, tanggalTerakhir: '2026-09-14T08:00:00Z' }
    ],
    mutasiTerbaru: [
      { id: 'rj2-1', tanggal: '2026-09-26T16:20:00Z', kode: 'Madura Guluk-Guluk RJ-2', jenisMutasi: 'Pemakaian SKM Line 1', masuk: 0, keluar: 1450.0, saldo: 16800.0, cek: true },
      { id: 'rj2-2', tanggal: '2026-09-26T13:15:00Z', kode: 'Bojonegoro Baureno RJ-2', jenisMutasi: 'Penerimaan Gudang Utama', masuk: 2800.0, keluar: 0, saldo: 14250.0, cek: true },
      { id: 'rj2-3', tanggal: '2026-09-26T10:30:00Z', kode: 'Boyolali Selo RJ-2', jenisMutasi: 'Pemakaian SKT Line 3', masuk: 0, keluar: 920.0, saldo: 10400.0, cek: true },
      { id: 'rj2-4', tanggal: '2026-09-25T15:40:00Z', kode: 'Temanggung Parakan RJ-2', jenisMutasi: 'Pemakaian SKT Line 1', masuk: 0, keluar: 1100.0, saldo: 12100.5, cek: true },
      { id: 'rj2-5', tanggal: '2026-09-25T13:20:00Z', kode: 'Kedu Wonosobo RJ-2', jenisMutasi: 'Transfer Antar Gudang', masuk: 800.0, keluar: 0, saldo: 5890.0, cek: false },
      { id: 'rj2-6', tanggal: '2026-09-25T11:00:00Z', kode: 'Krosok Jember Na-Oogst RJ-2', jenisMutasi: 'Pemakaian Threshing', masuk: 0, keluar: 750.0, saldo: 8200.0, cek: true }
    ]
  },
  {
    komoditas: 'Tembakau & Krosok (Rajang I)',
    satuan: 'Kg',
    saldoTotal: 78310.0,
    masukTotal: 312000.0,
    keluarTotal: 233690.0,
    entriTotal: 2150,
    entriTervalidasi: 98.7,
    jumlahKode: 16,
    kodeList: [
      { nama: 'Temanggung Garung RJ-1', saldo: 14500.0, tanggalTerakhir: '2026-09-26T12:00:00Z' },
      { nama: 'Madura Pragaan RJ-1', saldo: 12800.0, tanggalTerakhir: '2026-09-26T08:30:00Z' },
      { nama: 'Bojonegoro Malo RJ-1', saldo: 10950.0, tanggalTerakhir: '2026-09-25T14:45:00Z' },
      { nama: 'Krosok Na-Oogst Jember RJ-1', saldo: 9100.0, tanggalTerakhir: '2026-09-24T16:20:00Z' },
      { nama: 'Wonosobo Kertek RJ-1', saldo: 7600.0, tanggalTerakhir: '2026-09-25T10:15:00Z' },
      { nama: 'Krosok Besuki H3 RJ-1', saldo: 6420.0, tanggalTerakhir: '2026-09-23T13:50:00Z' },
      { nama: 'Boyolali Cepogo RJ-1', saldo: 5350.0, tanggalTerakhir: '2026-09-24T11:00:00Z' },
      { nama: 'Muntilan Dukun RJ-1', saldo: 4200.0, tanggalTerakhir: '2026-09-22T09:30:00Z' },
      { nama: 'Krosok Kasturi Mumbulsari RJ-1', saldo: 3180.0, tanggalTerakhir: '2026-09-21T14:10:00Z' },
      { nama: 'Jombang Ngoro RJ-1', saldo: 2400.0, tanggalTerakhir: '2026-09-20T10:00:00Z' },
      { nama: 'Tuban Merakurak RJ-1', saldo: 1810.0, tanggalTerakhir: '2026-09-19T15:20:00Z' },
      { nama: 'Afkir Sortir Rajang I', saldo: 0.0, tanggalTerakhir: '2026-09-15T08:00:00Z' }
    ],
    mutasiTerbaru: [
      { id: 'rj1-1', tanggal: '2026-09-26T12:00:00Z', kode: 'Temanggung Garung RJ-1', jenisMutasi: 'Pemakaian Produksi SKT', masuk: 0, keluar: 950.0, saldo: 14500.0, cek: true },
      { id: 'rj1-2', tanggal: '2026-09-26T08:30:00Z', kode: 'Madura Pragaan RJ-1', jenisMutasi: 'Penerimaan Truk Vendor', masuk: 2100.0, keluar: 0, saldo: 12800.0, cek: true },
      { id: 'rj1-3', tanggal: '2026-09-25T14:45:00Z', kode: 'Bojonegoro Malo RJ-1', jenisMutasi: 'Pemakaian Produksi SKT', masuk: 0, keluar: 820.0, saldo: 10950.0, cek: true },
      { id: 'rj1-4', tanggal: '2026-09-25T10:15:00Z', kode: 'Wonosobo Kertek RJ-1', jenisMutasi: 'Penerimaan Sortir Awal', masuk: 1500.0, keluar: 0, saldo: 7600.0, cek: true },
      { id: 'rj1-5', tanggal: '2026-09-24T16:20:00Z', kode: 'Krosok Na-Oogst Jember RJ-1', jenisMutasi: 'Pemakaian Threshing', masuk: 0, keluar: 640.0, saldo: 9100.0, cek: true }
    ]
  }
];

export const INITIAL_BSPP_DATA: BSPPData[] = [
  {
    nama: 'Cengkeh',
    jumlahEntri: 48,
    jenisList: ['Cengkeh Manado Super', 'Cengkeh Ambon Grade 1', 'Cengkeh Madura Rajang', 'Cengkeh Bali Pilihan', 'Cengkeh Toli-Toli'],
    totalLebih: 14,
    totalKurang: 31,
    totalTanpa: 3,
    rataRataAbsSelisihPersen: 0.48,
    entries: [
      { tanggal: '2026-09-25T08:00:00Z', jenis: 'Cengkeh Manado Super', labelNetto: 2500.0, timbangUlang: 2488.2, selisihKg: 11.8, selisihPersen: 0.47, status: 'BSPP Kurang' },
      { tanggal: '2026-09-24T10:15:00Z', jenis: 'Cengkeh Ambon Grade 1', labelNetto: 3200.0, timbangUlang: 3184.0, selisihKg: 16.0, selisihPersen: 0.50, status: 'BSPP Kurang' },
      { tanggal: '2026-09-23T14:30:00Z', jenis: 'Cengkeh Madura Rajang', labelNetto: 1800.0, timbangUlang: 1805.4, selisihKg: -5.4, selisihPersen: -0.30, status: 'BSPP Lebih' },
      { tanggal: '2026-09-22T09:00:00Z', jenis: 'Cengkeh Bali Pilihan', labelNetto: 2100.0, timbangUlang: 2091.6, selisihKg: 8.4, selisihPersen: 0.40, status: 'BSPP Kurang' },
      { tanggal: '2026-09-21T11:20:00Z', jenis: 'Cengkeh Toli-Toli', labelNetto: 2750.0, timbangUlang: 2736.25, selisihKg: 13.75, selisihPersen: 0.50, status: 'BSPP Kurang' },
      { tanggal: '2026-09-20T15:45:00Z', jenis: 'Cengkeh Manado Super', labelNetto: 1950.0, timbangUlang: 1950.0, selisihKg: 0.0, selisihPersen: 0.0, status: 'Tanpa Selisih' },
      { tanggal: '2026-09-18T08:30:00Z', jenis: 'Cengkeh Ambon Grade 1', labelNetto: 3000.0, timbangUlang: 2982.0, selisihKg: 18.0, selisihPersen: 0.60, status: 'BSPP Kurang' },
      { tanggal: '2026-09-17T13:10:00Z', jenis: 'Cengkeh Madura Rajang', labelNetto: 2200.0, timbangUlang: 2208.8, selisihKg: -8.8, selisihPersen: -0.40, status: 'BSPP Lebih' },
      { tanggal: '2026-09-15T10:00:00Z', jenis: 'Cengkeh Bali Pilihan', labelNetto: 1700.0, timbangUlang: 1691.5, selisihKg: 8.5, selisihPersen: 0.50, status: 'BSPP Kurang' },
      { tanggal: '2026-09-14T14:20:00Z', jenis: 'Cengkeh Manado Super', labelNetto: 2400.0, timbangUlang: 2390.4, selisihKg: 9.6, selisihPersen: 0.40, status: 'BSPP Kurang' },
      { tanggal: '2026-09-12T09:15:00Z', jenis: 'Cengkeh Toli-Toli', labelNetto: 3100.0, timbangUlang: 3112.4, selisihKg: -12.4, selisihPersen: -0.40, status: 'BSPP Lebih' },
      { tanggal: '2026-09-10T11:40:00Z', jenis: 'Cengkeh Ambon Grade 1', labelNetto: 2800.0, timbangUlang: 2786.0, selisihKg: 14.0, selisihPersen: 0.50, status: 'BSPP Kurang' },
      { tanggal: '2026-09-08T15:00:00Z', jenis: 'Cengkeh Madura Rajang', labelNetto: 1900.0, timbangUlang: 1890.5, selisihKg: 9.5, selisihPersen: 0.50, status: 'BSPP Kurang' },
      { tanggal: '2026-09-05T08:45:00Z', jenis: 'Cengkeh Bali Pilihan', labelNetto: 2250.0, timbangUlang: 2250.0, selisihKg: 0.0, selisihPersen: 0.0, status: 'Tanpa Selisih' },
      { tanggal: '2026-09-02T13:30:00Z', jenis: 'Cengkeh Manado Super', labelNetto: 2600.0, timbangUlang: 2587.0, selisihKg: 13.0, selisihPersen: 0.50, status: 'BSPP Kurang' }
    ]
  },
  {
    nama: 'Tembakau & Krosok (Rajang II)',
    jumlahEntri: 36,
    jenisList: ['Madura Guluk-Guluk', 'Bojonegoro Baureno', 'Temanggung Parakan', 'Boyolali Selo'],
    totalLebih: 9,
    totalKurang: 25,
    totalTanpa: 2,
    rataRataAbsSelisihPersen: 0.35,
    entries: [
      { tanggal: '2026-09-25T11:00:00Z', jenis: 'Madura Guluk-Guluk', labelNetto: 4500.0, timbangUlang: 4486.5, selisihKg: 13.5, selisihPersen: 0.30, status: 'BSPP Kurang' },
      { tanggal: '2026-09-24T14:30:00Z', jenis: 'Bojonegoro Baureno', labelNetto: 5200.0, timbangUlang: 5184.4, selisihKg: 15.6, selisihPersen: 0.30, status: 'BSPP Kurang' },
      { tanggal: '2026-09-22T08:15:00Z', jenis: 'Temanggung Parakan', labelNetto: 3800.0, timbangUlang: 3811.4, selisihKg: -11.4, selisihPersen: -0.30, status: 'BSPP Lebih' },
      { tanggal: '2026-09-20T10:00:00Z', jenis: 'Boyolali Selo', labelNetto: 4100.0, timbangUlang: 4083.6, selisihKg: 16.4, selisihPersen: 0.40, status: 'BSPP Kurang' },
      { tanggal: '2026-09-18T13:40:00Z', jenis: 'Madura Guluk-Guluk', labelNetto: 4800.0, timbangUlang: 4780.8, selisihKg: 19.2, selisihPersen: 0.40, status: 'BSPP Kurang' },
      { tanggal: '2026-09-15T09:20:00Z', jenis: 'Bojonegoro Baureno', labelNetto: 5000.0, timbangUlang: 5000.0, selisihKg: 0.0, selisihPersen: 0.0, status: 'Tanpa Selisih' }
    ]
  }
];

export const INITIAL_USER_CONFIGS: import('../types').UserAccessConfig[] = [
  {
    email: 'obeetools@gmail.com',
    nama: 'Web Developer (ObeeTools)',
    role: 'Web Developer',
    password: '123',
    hasDevAccess: true,
    allowedKomoditas: ['*'],
    canExportPdf: true,
    canManageUsers: true
  },
  {
    email: 'loehendra@gmail.com',
    nama: 'Lalu Mahendra (Site Enginer/PM)',
    role: 'Site Engineer / PM',
    password: '123',
    hasDevAccess: true,
    allowedKomoditas: ['*'],
    canExportPdf: true,
    canManageUsers: true
  },
  {
    email: 'appspengolahan@gmail.com',
    nama: 'Admin Pengolahan PP1',
    role: 'Admin Produksi',
    password: '123',
    hasDevAccess: false,
    allowedKomoditas: ['*'],
    canExportPdf: true,
    canManageUsers: false
  },
  {
    email: 'divisi1.bkr@gmail.com',
    nama: 'Admin Divisi I (BKR)',
    role: 'Admin Produksi',
    password: '123',
    hasDevAccess: false,
    allowedKomoditas: ['*'],
    canExportPdf: true,
    canManageUsers: false
  },
  {
    email: 'mandor.cengkeh@batukarang.com',
    nama: 'Mandor Gudang Cengkeh',
    role: 'Staff Operasional',
    password: '123',
    hasDevAccess: false,
    allowedKomoditas: ['Cengkeh'],
    canExportPdf: false,
    canManageUsers: false
  },
  {
    email: 'mandor.blend@batukarang.com',
    nama: 'Mandor Tembakau Blend',
    role: 'Staff Operasional',
    password: '123',
    hasDevAccess: false,
    allowedKomoditas: ['Tembakau Blend'],
    canExportPdf: false,
    canManageUsers: false
  }
];

export const MOCK_USERS = INITIAL_USER_CONFIGS;
