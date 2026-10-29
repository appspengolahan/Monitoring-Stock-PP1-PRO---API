# 🛡️ GOLDEN BASELINE RELEASE RECORD (v2.4.0 - LOCKED)
**Tanggal Penguncian:** Kamis, 29 Oktober 2026  
**Divisi:** Produksi I (PP1) — PT Batu Karang  
**Arsitektur:** Hybrid Headless Google Apps Script (GAS) + React 19 + TypeScript + Tailwind CSS  
**Status:** 🔒 **LOCKED & PRODUCTION-READY**

---

## 📌 Ringkasan Status & Komitmen Stabilitas

Versi ini secara resmi dikunci sebagai **Baseline Emas (Golden Baseline)**. Seluruh logika kalkulasi matematis, parser rekonsiliasi, serta integrasi multi-spreadsheet telah terverifikasi presisi 100% dan sinkron dengan data fisik lapangan.

---

## 📋 Modul yang Dikunci (Frozen Architecture)

### 1. Parser Mutasi Stock Persediaan
- **Format Ganda (SKT / SKM):** Kolom T Masuk, T Keluar, T Saldo (F), M Masuk, M Keluar, M Saldo (I), dan Total Saldo (J).
- **Format Tunggal (Tembakau Blend & Umum):** Kolom Masuk, Keluar, Saldo.
- **Deteksi Baris Valid:** Mengabaikan baris kosong, baris formula tanpa mutasi, serta teks non-mutasi.

### 2. Rekonsiliasi DHP Krosok (Rajang II)
- **Sumber DHP:** `INTEGRASI DATA` (ID: `1tyE6QWZ...`)
- **Target Rekap:** `REKAP SUSUT KROSOK` (ID: `1A9gGHi...`)
- **Audit Badge:** Otomatis mendeteksi kecocokan batch fisik (4 Batch terverifikasi).
- **Jalur:** SKT / SKM terisolasi presisi.

### 3. Rekonsiliasi DHP Blend
- **Sumber DHP:** `INTEGRASI DATA DHP BLEND` (ID: `1Q-k-iX...`)
- **Target Rekap:** `DATASHEET REKAP SUSUT BLEND` (DATAMASTER)
- **Anti Double-Counting:** Proteksi de-duplikasi baris DHP berdasarkan Nomor Laporan, Tanggal, dan Nomor Batch.
- **Audit Badge:** Terverifikasi 3/3 batch cocok.

### 4. Integrasi Setoran & Dryer Cengkeh
- **Tab Cengkeh Terstandarisasi:** `MANADO GRADE A (2024)`
- **Verifikasi Saldo 29 Oktober 2026:**
  - Baris 298: BSPP Kurang `-0,2 Kg` $\rightarrow$ `21.880,2 Kg`
  - Baris 299: Selisih Lebih Penyiapan `+0,1 Kg` $\rightarrow$ `21.880,3 Kg`
  - Baris 300: Pengeluaran Setoran `-216,0 Kg` $\rightarrow$ **`21.664,3 Kg`** (Cocok 100% dengan kolom J).

### 5. Snapshot Historis & Manajemen Cache
- Cache snapshot historis diisolasi per nama komoditas dan tanggal.
- Mekanisme `clearSnapshotCache()` otomatis membersihkan snapshot basi saat sinkronisasi data baru terjadi.
- Baseline recovery murni via `restoreCleanBaseline()`.

### 6. Hak Akses Staf Dinamis (Extensible RBAC)
- Penambahan peran pengguna kustom (misal: *Accounting*, *QC / Lab*, *Supervisor Gudang*, dsb.) secara modular dan dinamis.
- Peran baru otomatis tersimpan di whitelist RBAC dan muncul di dropdown switcher peran tanpa menyentuh modul inti lainnya.

### 7. Keamanan Akses Perangkat & Sesi Permanen (Persistent Authentication Gate)
- Perangkat baru yang belum diautentikasi otomatis terkunci pada layar login dan wajib memasukkan email & PIN yang terdaftar di whitelist server.
- Setelah 1x login berhasil, sesi disimpan permanen di perangkat tersebut (*Remember Me*) sehingga staf tidak perlu login berulang kali setiap hari.
- Tersedia jalur pintas cepat (*emergency bypass*) untuk Site Engineer / PM via parameter `?access=pm-master`.

---

## 🔒 Kebijakan Perubahan di Masa Mendatang (Change Management Protocol)

1. **Dilarang Mengubah Logika Parser Inti:** Parser yang membaca baris mutasi dan rekonsiliasi tidak boleh diubah jika struktur kolom Google Sheet tidak berubah.
2. **Perubahan Format Sheet:** Jika ada staf operasional yang ingin mengubah nama tab atau posisi kolom di Google Sheet, perubahan harus dikoordinasikan terlebih dahulu.
3. **Ekstensi Modular:** Fitur analitik atau laporan baru wajib ditambahkan sebagai modul terpisah (non-destructive) tanpa mengedit file parsing inti.

---
*Dokumentasi ini dibuat otomatis sebagai komitmen keandalan sistem persediaan PP1.*
