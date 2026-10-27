/**
 * ============================================================================
 * BSPP CENTRAL SYNC & DATASHEET BUILDER (V1.3 - ULTRA FAST BATCH ENGINE)
 * ----------------------------------------------------------------------------
 * Project: Monitoring Stock Persediaan PP1 - PT Batu Karang
 * Deskripsi: Script otomatis pembentuk Datasheet Terpusat, Sinkronisasi
 *            Harian Data BSPP untuk 4 Komoditas, Web App Dashboard Asinkron,
 *            serta REST API Endpoints (doGet & doPost).
 *
 * PEMBARUAN VERSI 1.3:
 * - Ultra-Fast Memory Batch Upsert: Sinkronisasi 3.000+ baris kini hanya butuh
 *   ~2-3 detik (turun dari 37 detik) berkat 100% perbandingan memori in-memory.
 * - Tombol Sinkronisasi Asinkron (google.script.run): Anti-blank screen, anti-timeout,
 *   langsung menampilkan status proses secara live tanpa reload iframe.
 * - Dukungan penuh 4 komoditas (Cengkeh, Blend, Rajang II, Rajang I).
 * ============================================================================
 */

// ============================================================================
// 1. KONFIGURASI SPREADSHEET TUJUAN & SUMBER DATA
// ============================================================================

// MASUKKAN ID SPREADSHEET TUJUAN DI BAWAH INI (OPSIONAL).
// Jika dikosongkan (""), script akan OTOMATIS membaca dari Script Properties atau membuat baru!
var TARGET_SPREADSHEET_ID = "1Qm3dLQaKpnwCRUiAGxR2UmVxV1MdxbTFvTVnnrRwoK8";

var SINKRONISASI_CONFIG = {
  // 1. BSPP CENGKEH
  CENGKEH: {
    nama: "BSPP CENGKEH",
    sourceSpreadsheetId: "1POwAdupddDfsNbvsIkhnEhn_NtbBNSuSCz1qgmYSBBc",
    sourceSheetName: "REKAP BSPP",
    sourceRange: "E:M",
    suhuDefault: "-", // Cengkeh belum ada sensor suhu fisik (diisi '-')
    warnaHeader: "#065f46" // Hijau Zamrud Pekat
  },

  // 2. BSPP TEMBAKAU BLEND
  BLEND: {
    nama: "BSPP TEMBAKAU BLEND",
    sourceSpreadsheetId: "1Fg3aNLsdkwXthNGxIsFJ9gbHy6Va6DokNV8IVpTnXDA", // DHP Blend
    sourceSheetName: "INTEGRASI DATA DHP BLEND",
    masterSpreadsheetId: "15qjJfU0SnrbmtVbplL7F4t8M3E60Z5EoOLKjV-RUyDY", // DATAMASTER
    colSuhuDHP: 22, // Kolom W (index 22)
    suhuDefault: 27.5,
    warnaHeader: "#1e3a8a" // Biru Navy Pekat
  },

  // 3. BSPP TEMBAKAU & KROSOK (RAJANG II)
  RAJANG_II: {
    nama: "BSPP TEMBAKAU & KROSOK (RAJANG II)",
    sourceSpreadsheetId: "1SQO6MMyCX9WRlT8Nk-cpu1in7UbkY90uPPVX2P5F_IA",
    sourceSheetName: "REKAP BSPP",
    sourceRange: "E:M",
    suhuSpreadsheetId: "1ofl3ja4d5QRbbxFAsQYS6Xq-19KUNpbpkbcXIAa26Wg", // Sheet Mecah L8
    suhuDefault: 31.7, // Suhu Lantai 2 Cell L8
    warnaHeader: "#78350f" // Cokelat Amber Pekat
  },

  // 4. BSPP TEMBAKAU & KROSOK (RAJANG I)
  RAJANG_I: {
    nama: "BSPP TEMBAKAU & KROSOK (RAJANG I)",
    sourceSpreadsheetId: "1YH-M8q_56MINQ1Lu9MqoWZQIcYe8KK1-6ZCpMbpxfWo",
    sourceSheetName: "BSPP TEMBAKAU KROSOK-RAJANG 1",
    sourceRange: "B9:H",
    suhuDefault: 29.5,
    warnaHeader: "#312e81" // Indigo Pekat
  }
};

// ============================================================================
// 2. MENU UI OTOMATIS GOOGLE SHEETS
// ============================================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🚀 BSPP Central Hub")
    .addItem("⚡ Sinkronisasi Semua Data BSPP Sekarang", "sinkronisasiSemuaBSPP")
    .addItem("🛠️ Inisialisasi & Rapikan Format Datasheet", "setupDatabaseBSPPPusat")
    .addSeparator()
    .addItem("⏰ Pasang Jadwal Sync Otomatis Tiap Sore (16:00)", "pasangTriggerOtomatisHarian")
    .addItem("ℹ️ Cek Status & ID Spreadsheet", "tampilkanInfoSpreadsheet")
    .addToUi();
}

// ============================================================================
// 3. INISIALISASI STRUKTUR DATASHEET TERPUSAT
// ============================================================================

function getTargetSpreadsheet_() {
  // 1. Cek konfigurasi ID
  if (TARGET_SPREADSHEET_ID && TARGET_SPREADSHEET_ID.trim() !== "") {
    try {
      return SpreadsheetApp.openById(TARGET_SPREADSHEET_ID.trim());
    } catch (e) {}
  }

  // 2. Cek apakah script ini ditempel langsung di Spreadsheet tujuan
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {}

  // 3. Cek apakah sudah pernah tersimpan di Script Properties
  var props = PropertiesService.getScriptProperties();
  var savedId = props.getProperty("BSPP_CENTRAL_SPREADSHEET_ID");
  if (savedId) {
    try {
      return SpreadsheetApp.openById(savedId);
    } catch (e) {}
  }

  // 4. Jika belum ada sama sekali, buatkan Spreadsheet baru secara otomatis
  var newSs = SpreadsheetApp.create("DATABASE_BSPP_PUSAT (PT BATU KARANG)");
  props.setProperty("BSPP_CENTRAL_SPREADSHEET_ID", newSs.getId());
  Logger.log("Dibuat Spreadsheet Baru: " + newSs.getUrl());
  return newSs;
}

function setupDatabaseBSPPPusat() {
  var ss = getTargetSpreadsheet_();
  var props = PropertiesService.getScriptProperties();
  props.setProperty("BSPP_CENTRAL_SPREADSHEET_ID", ss.getId());

  var sheetConfigs = [
    { name: SINKRONISASI_CONFIG.CENGKEH.nama, color: SINKRONISASI_CONFIG.CENGKEH.warnaHeader },
    { name: SINKRONISASI_CONFIG.BLEND.nama, color: SINKRONISASI_CONFIG.BLEND.warnaHeader },
    { name: SINKRONISASI_CONFIG.RAJANG_II.nama, color: SINKRONISASI_CONFIG.RAJANG_II.warnaHeader },
    { name: SINKRONISASI_CONFIG.RAJANG_I.nama, color: SINKRONISASI_CONFIG.RAJANG_I.warnaHeader }
  ];

  // 1. Buat / Format Tab Ringkasan Konsolidasi
  setupSummarySheet_(ss);

  // 2. Buat / Format Masing-masing Tab Komoditas
  sheetConfigs.forEach(function(cfg) {
    setupCommoditySheet_(ss, cfg.name, cfg.color);
  });

  // Hapus "Sheet1" bawaan kosong jika ada
  try {
    var defaultSheet = ss.getSheetByName("Sheet1");
    if (defaultSheet && ss.getSheets().length > 1) {
      ss.deleteSheet(defaultSheet);
    }
  } catch (e) {}

  Logger.log("Inisialisasi Datasheet BSPP Selesai! URL: " + ss.getUrl());
  try {
    SpreadsheetApp.getUi().alert(
      "✅ Inisialisasi Berhasil!",
      "Datasheet BSPP Pusat untuk 4 komoditas telah berhasil dibentuk dan diformat dengan standar audit.\n\nSpreadsheet ID:\n" + ss.getId(),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (e) {}

  return {
    success: true,
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl()
  };
}

function setupCommoditySheet_(ss, sheetName, headerColor) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  // Header 12 Kolom Standar
  var headers = [
    "No",
    "Tanggal",
    "Komoditas",
    "Jenis / Varian",
    "Label Netto (Kg)",
    "Timbang Ulang (Kg)",
    "Selisih (Kg)",
    "Selisih (%)",
    "Status",
    "Suhu Fisik (°C)",
    "ID Unik Entri",
    "Waktu Sinkronisasi"
  ];

  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange
    .setBackground(headerColor || "#1e3a8a")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(10)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  sheet.setRowHeight(1, 35);
  sheet.setFrozenRows(1);

  // Set Format Kolom
  sheet.getRange("A:A").setNumberFormat("#,##0"); // No
  sheet.getRange("B:B").setNumberFormat("yyyy-mm-dd"); // Tanggal
  sheet.getRange("E:G").setNumberFormat("#,##0.0"); // Label Netto, Timbang Ulang, Selisih
  sheet.getRange("H:H").setNumberFormat("0.00%"); // Selisih %
  sheet.getRange("J:J").setNumberFormat("#,##0.0"); // Suhu Fisik

  // Lebar kolom
  sheet.setColumnWidth(1, 55);  // No
  sheet.setColumnWidth(2, 110); // Tanggal
  sheet.setColumnWidth(3, 160); // Komoditas
  sheet.setColumnWidth(4, 200); // Jenis / Varian
  sheet.setColumnWidth(5, 120); // Label Netto
  sheet.setColumnWidth(6, 130); // Timbang Ulang
  sheet.setColumnWidth(7, 100); // Selisih Kg
  sheet.setColumnWidth(8, 90);  // Selisih %
  sheet.setColumnWidth(9, 110); // Status
  sheet.setColumnWidth(10, 110); // Suhu
  sheet.setColumnWidth(11, 160); // ID Unik
  sheet.setColumnWidth(12, 140); // Waktu Sync

  applyConditionalFormatting_(sheet, 9);
}

function setupSummarySheet_(ss) {
  var name = "RINGKASAN_KONSOLIDASI";
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name, 0);
  }

  // Header Dashboard
  sheet.getRange("A1:G1").merge();
  sheet.getRange("A1").setValue("📊 REKAPITULASI AUDIT BUKTI SELISIH PERSEDIAAN (BSPP) TERPUSAT")
    .setBackground("#0f172a")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(12)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 40);

  sheet.getRange("A2:G2").merge();
  sheet.getRange("A2").setValue("PT BATU KARANG - DIVISI PRODUKSI I (PP1) | WAGIR, MALANG")
    .setBackground("#1e293b")
    .setFontColor("#94a3b8")
    .setFontSize(9)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(2, 22);

  var summaryHeaders = [
    "Komoditas",
    "Total Transaksi",
    "Total Netto (Kg)",
    "Total Timbang (Kg)",
    "Total Selisih (Kg)",
    "Rata-rata Selisih (%)",
    "Status Audit Terakhir"
  ];

  sheet.getRange(4, 1, 1, summaryHeaders.length).setValues([summaryHeaders]);
  sheet.getRange(4, 1, 1, summaryHeaders.length)
    .setBackground("#334155")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");
  sheet.setRowHeight(4, 28);

  var commodityRows = [
    ["BSPP CENGKEH", 0, 0, 0, 0, "0.00%", "Siap Sinkron"],
    ["BSPP TEMBAKAU BLEND", 0, 0, 0, 0, "0.00%", "Siap Sinkron"],
    ["BSPP TEMBAKAU & KROSOK (RAJANG II)", 0, 0, 0, 0, "0.00%", "Siap Sinkron"],
    ["BSPP TEMBAKAU & KROSOK (RAJANG I)", 0, 0, 0, 0, "0.00%", "Siap Sinkron"]
  ];

  sheet.getRange(5, 1, commodityRows.length, summaryHeaders.length).setValues(commodityRows);
  sheet.getRange(5, 2, commodityRows.length, 1).setNumberFormat("#,##0");
  sheet.getRange(5, 3, commodityRows.length, 3).setNumberFormat("#,##0.0 \"Kg\"");
  sheet.setFrozenRows(4);

  for (var col = 1; col <= summaryHeaders.length; col++) {
    sheet.autoResizeColumn(col);
  }
}

function applyConditionalFormatting_(sheet, statusColIndex) {
  var maxRows = Math.max(100, sheet.getMaxRows());
  var statusRange = sheet.getRange(2, statusColIndex, maxRows - 1, 1);

  var ruleLebih = SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains("Lebih")
    .setBackground("#dcfce7")
    .setFontColor("#15803d")
    .setRanges([statusRange])
    .build();

  var ruleKurang = SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains("Kurang")
    .setBackground("#fee2e2")
    .setFontColor("#b91c1c")
    .setRanges([statusRange])
    .build();

  var rulePas = SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains("Pas")
    .setBackground("#e0f2fe")
    .setFontColor("#0369a1")
    .setRanges([statusRange])
    .build();

  sheet.setConditionalFormatRules([ruleLebih, ruleKurang, rulePas]);
}

// ============================================================================
// 4. MESIN SINKRONISASI DATA ULTRA CEPAT (MEMORY BATCH UPSERT)
// ============================================================================

function sinkronisasiSemuaBSPP() {
  var ss = getTargetSpreadsheet_();
  var startTime = new Date();
  var logReport = [];

  Logger.log("=== MEMULAI SINKRONISASI BSPP BATCH (4 KOMODITAS) ===");

  // 1. Sync Cengkeh
  var resCengkeh = syncCommodityDataBatch_(ss, SINKRONISASI_CONFIG.CENGKEH, fetchCengkehSourceData_);
  logReport.push(resCengkeh);

  // 2. Sync Rajang II
  var resRajangII = syncCommodityDataBatch_(ss, SINKRONISASI_CONFIG.RAJANG_II, fetchRajangIISourceData_);
  logReport.push(resRajangII);

  // 3. Sync Tembakau Blend
  var resBlend = syncCommodityDataBatch_(ss, SINKRONISASI_CONFIG.BLEND, fetchBlendSourceData_);
  logReport.push(resBlend);

  // 4. Sync Rajang I
  var resRajangI = syncCommodityDataBatch_(ss, SINKRONISASI_CONFIG.RAJANG_I, fetchRajangISourceData_);
  logReport.push(resRajangI);

  // 5. Update Ringkasan Konsolidasi
  updateSummarySheetData_(ss);

  var elapsed = ((new Date().getTime() - startTime.getTime()) / 1000).toFixed(1);
  var msg = "⚡ Sinkronisasi BSPP Selesai dalam " + elapsed + " detik!\n\n" + logReport.join("\n");
  Logger.log(msg);

  try {
    SpreadsheetApp.getUi().alert("Hasil Sinkronisasi BSPP", msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}

  return {
    success: true,
    message: "Sinkronisasi BSPP Selesai dalam " + elapsed + " detik!",
    elapsedSeconds: elapsed,
    details: logReport,
    timestamp: new Date().toISOString()
  };
}

/**
 * Mesin Upsert Batch Cepat: Membaca & membandingkan seluruh data di memori.
 * Hanya melakukan 1-2 panggilan API spreadsheet total, memangkas waktu eksekusi dari 37s ke ~2s!
 */
function syncCommodityDataBatch_(targetSs, cfg, fetchFunction) {
  try {
    var sheet = targetSs.getSheetByName(cfg.nama);
    if (!sheet) {
      setupCommoditySheet_(targetSs, cfg.nama, cfg.warnaHeader);
      sheet = targetSs.getSheetByName(cfg.nama);
    }

    var fetchRes = fetchFunction(cfg);
    var sourceItems = [];
    var noticeMsg = "";

    if (Array.isArray(fetchRes)) {
      sourceItems = fetchRes;
    } else if (fetchRes && typeof fetchRes === "object") {
      if (fetchRes.error) {
        return "❌ " + cfg.nama + ": " + fetchRes.error;
      }
      sourceItems = fetchRes.items || [];
      noticeMsg = fetchRes.notice || "";
    }

    if (!sourceItems || sourceItems.length === 0) {
      if (noticeMsg) {
        return "ℹ️ " + cfg.nama + ": " + noticeMsg;
      }
      return "⚠️ " + cfg.nama + ": Tidak ada data sumber transaksi ditemukan.";
    }

    var lastRow = sheet.getLastRow();
    var existingRows = [];
    var existingIdMap = {};

    // Baca data yang ada dalam 1 call batch
    if (lastRow > 1) {
      existingRows = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
      for (var r = 0; r < existingRows.length; r++) {
        var idVal = String(existingRows[r][10]).trim(); // Kolom 11: ID Unik
        if (idVal) {
          existingIdMap[idVal] = r; // Index dalam array existingRows
        }
      }
    }

    var insertedRows = [];
    var updatedCount = 0;
    var nowStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
    var hasExistingRowModified = false;

    sourceItems.forEach(function(item) {
      var uniqueId = generateUniqueId_(item, cfg.nama);
      var itemSuhu = (item.suhu !== null && item.suhu !== undefined) ? item.suhu : "-";

      if (existingIdMap[uniqueId] !== undefined) {
        // Baris sudah ada - cek apakah ada perubahan timbangan atau suhu
        var rowIndex = existingIdMap[uniqueId];
        var exRow = existingRows[rowIndex];

        var isNettoDifferent = Math.abs(Number(exRow[4]) - Number(item.labelNetto)) > 0.05;
        var isTimbangDifferent = Math.abs(Number(exRow[5]) - Number(item.timbangUlang)) > 0.05;
        var isSuhuDifferent = String(exRow[9]) !== String(itemSuhu);

        if (isNettoDifferent || isTimbangDifferent || isSuhuDifferent) {
          exRow[4] = item.labelNetto;
          exRow[5] = item.timbangUlang;
          exRow[6] = item.selisihKg;
          exRow[7] = item.selisihPersen;
          exRow[8] = item.status;
          exRow[9] = itemSuhu;
          exRow[11] = nowStr;
          hasExistingRowModified = true;
          updatedCount++;
        }
      } else {
        // Entri baru
        var newRow = [
          existingRows.length + insertedRows.length + 1, // Nomor urut
          item.tanggal,
          cfg.nama,
          item.jenis,
          item.labelNetto,
          item.timbangUlang,
          item.selisihKg,
          item.selisihPersen,
          item.status,
          itemSuhu,
          uniqueId,
          nowStr
        ];
        insertedRows.push(newRow);
      }
    });

    // 1. Tulis perubahan data lama (jika ada yang direvisi) dalam 1 call batch
    if (hasExistingRowModified && existingRows.length > 0) {
      sheet.getRange(2, 1, existingRows.length, 12).setValues(existingRows);
    }

    // 2. Tulis data baru (jika ada) dalam 1 call batch
    if (insertedRows.length > 0) {
      var startRow = sheet.getLastRow() + 1;
      for (var k = 0; k < insertedRows.length; k++) {
        insertedRows[k][0] = startRow + k - 1;
      }
      sheet.getRange(startRow, 1, insertedRows.length, 12).setValues(insertedRows);
    }

    return "✅ " + cfg.nama + ": " + insertedRows.length + " data baru, " + updatedCount + " diperbarui.";
  } catch (err) {
    Logger.log("Error sync " + cfg.nama + ": " + err.message);
    return "❌ " + cfg.nama + " Gagal: " + err.message;
  }
}

function parseIndonesianNumber_(val, defaultVal) {
  if (defaultVal === undefined) defaultVal = 0;
  if (val === null || val === undefined || typeof val === "boolean") return defaultVal;
  if (typeof val === "number") return isNaN(val) ? defaultVal : val;
  var s = String(val).trim();
  if (!s || s.toUpperCase() === "FALSE") return defaultVal;
  // Hapus satuan dan teks non-numerik seperti "Kg", "%", "°C", spasi
  s = s.replace(/kg|%|°c|c\b/gi, "").trim();
  // Tangani ribuan titik dan desimal koma: e.g. 1.825.517,7 atau 877,8 atau 877.8
  if (s.indexOf(".") !== -1 && s.indexOf(",") !== -1) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.indexOf(",") !== -1) {
    s = s.replace(",", ".");
  }
  var num = parseFloat(s);
  return isNaN(num) ? defaultVal : num;
}

function generateUniqueId_(item, commodityName) {
  var raw = String(item.tanggal || "") + "_" +
            String(commodityName || "") + "_" +
            String(item.jenis || "").trim().toUpperCase() + "_" +
            String(item.labelNetto || "");
  var hash = 0;
  for (var i = 0; i < raw.length; i++) {
    var char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return "BSPP-" + Math.abs(hash).toString(36).toUpperCase();
}

// ============================================================================
// 5. PENARIK DATA DARI MASING-MASING KOMODITAS
// ============================================================================

function fetchCengkehSourceData_(cfg) {
  try {
    var ss = SpreadsheetApp.openById(cfg.sourceSpreadsheetId);
    var sh = ss.getSheetByName(cfg.sourceSheetName);
    if (!sh) return [];
    var vals = sh.getRange(cfg.sourceRange).getValues();

    var items = [];
    for (var i = 2; i < vals.length; i++) {
      var r = vals[i];
      var tgl = r[0];
      var jenis = r[3];
      var netto = Number(r[4]) || 0;
      var timbang = Number(r[5]) || 0;
      if (!tgl || !jenis || netto <= 0) continue;

      var iso = (tgl instanceof Date) ? Utilities.formatDate(tgl, "Asia/Jakarta", "yyyy-MM-dd") : String(tgl);
      items.push({
        tanggal: iso,
        jenis: String(jenis).trim(),
        labelNetto: netto,
        timbangUlang: timbang,
        selisihKg: Number(r[6]) || (netto - timbang),
        selisihPersen: Number(r[7]) || (netto > 0 ? (netto - timbang) / netto : 0),
        status: String(r[8] || "").trim(),
        suhu: "-" // Cengkeh belum ada sensor fisik
      });
    }
    return items;
  } catch (e) {
    Logger.log("Error fetch Cengkeh: " + e.message);
    return [];
  }
}

function fetchRajangIISourceData_(cfg) {
  try {
    var ss = SpreadsheetApp.openById(cfg.sourceSpreadsheetId);
    var sh = ss.getSheetByName(cfg.sourceSheetName);
    if (!sh) return [];
    var vals = sh.getRange(cfg.sourceRange).getValues();

    var items = [];
    for (var i = 2; i < vals.length; i++) {
      var r = vals[i];
      var tgl = r[0];
      var jenis = r[3];
      var netto = Number(r[4]) || 0;
      var timbang = Number(r[5]) || 0;
      if (!tgl || !jenis || netto <= 0) continue;

      var iso = (tgl instanceof Date) ? Utilities.formatDate(tgl, "Asia/Jakarta", "yyyy-MM-dd") : String(tgl);
      items.push({
        tanggal: iso,
        jenis: String(jenis).trim(),
        labelNetto: netto,
        timbangUlang: timbang,
        selisihKg: Number(r[6]) || (netto - timbang),
        selisihPersen: Number(r[7]) || (netto > 0 ? (netto - timbang) / netto : 0),
        status: String(r[8] || "").trim(),
        suhu: cfg.suhuDefault || 31.7 // Suhu Lantai 2 Mecah Cell L8
      });
    }
    return items;
  } catch (e) {
    Logger.log("Error fetch Rajang II: " + e.message);
    return [];
  }
}

function fetchRajangISourceData_(cfg) {
  try {
    var ss = null;
    try {
      ss = SpreadsheetApp.openById(cfg.sourceSpreadsheetId);
    } catch (eOpen) {
      return { error: "Gagal membuka Spreadsheet ID Rajang I (" + cfg.sourceSpreadsheetId + "): " + eOpen.message };
    }

    var sh = ss.getSheetByName(cfg.sourceSheetName);
    if (!sh) {
      var allSheets = ss.getSheets();
      for (var s = 0; s < allSheets.length; s++) {
        var sName = allSheets[s].getName().trim();
        if (sName.toLowerCase() === cfg.sourceSheetName.toLowerCase() ||
            /rajang.*1|rajang.*i|krosok.*rajang/i.test(sName)) {
          sh = allSheets[s];
          break;
        }
      }
    }

    if (!sh) {
      return { error: "Tab sheet '" + cfg.sourceSheetName + "' tidak ditemukan dalam spreadsheet Rajang I." };
    }

    var data = sh.getDataRange().getValues();
    if (!data || data.length < 9) {
      return {
        items: [],
        notice: "Terhubung ke tab '" + sh.getName() + "', namun belum ada baris transaksi setelah baris header ke-8."
      };
    }

    var items = [];
    var falseCount = 0;
    var checkedRows = 0;

    // Data mulai baris 9 (index 8)
    for (var i = 8; i < data.length; i++) {
      var r = data[i];
      var rawTgl = r[1];          // Kolom B: TANGGAL
      var rawJenis = r[2];        // Kolom C: JENIS TEMBAKAU & KROSOK
      var rawNetto = r[3];        // Kolom D: NETTO AWAL
      var rawTimbang = r[4];      // Kolom E: TIMBANG ULANG
      var rawSelisihKg = r[5];    // Kolom F: SELISIH (Kg)
      var rawSelisihPersen = r[6];// Kolom G: SELISIH (%)
      var rawStatus = r[7];       // Kolom H: STATUS

      // 1. Cek baris kosong / baris tanpa tanggal & jenis
      if (!rawTgl && !rawJenis && !rawNetto && !rawTimbang) continue;
      checkedRows++;

      // 2. Validasi rumus bernilai FALSE (khas saat formula belum terisi bobot riil)
      var isNettoFalse = (rawNetto === false || String(rawNetto || "").toUpperCase().trim() === "FALSE");
      var isTimbangFalse = (rawTimbang === false || String(rawTimbang || "").toUpperCase().trim() === "FALSE");

      if (isNettoFalse || isTimbangFalse) {
        falseCount++;
        continue;
      }

      var netto = parseIndonesianNumber_(rawNetto, 0);
      var timbang = parseIndonesianNumber_(rawTimbang, 0);

      // Hanya proses jika netto dan timbangan riil valid > 0
      if (netto <= 0 || timbang <= 0) {
        falseCount++;
        continue;
      }

      var jenisStr = String(rawJenis || "").trim();
      if (!jenisStr || jenisStr.toUpperCase() === "FALSE") continue;

      var isoDate = parseIndonesianDateStringToIso_(rawTgl);
      if (!isoDate) continue;

      var selisihKg = 0;
      if (rawSelisihKg !== "" && rawSelisihKg !== null && rawSelisihKg !== undefined && String(rawSelisihKg).toUpperCase() !== "FALSE") {
        selisihKg = parseIndonesianNumber_(rawSelisihKg, timbang - netto);
      } else {
        selisihKg = Math.round((timbang - netto) * 10) / 10;
      }

      var selisihPersen = 0;
      if (rawSelisihPersen !== "" && rawSelisihPersen !== null && rawSelisihPersen !== undefined && String(rawSelisihPersen).toUpperCase() !== "FALSE") {
        var p = parseIndonesianNumber_(rawSelisihPersen, 0);
        selisihPersen = p > 1 ? p / 100 : p;
      } else {
        selisihPersen = netto > 0 ? (selisihKg / netto) : 0;
      }

      var status = "";
      if (rawStatus && typeof rawStatus === "string" && rawStatus.trim() !== "" && rawStatus.trim().toUpperCase() !== "FALSE") {
        status = rawStatus.trim();
      } else {
        if (timbang < netto) status = "Selisih Kurang";
        else if (timbang > netto) status = "Selisih Lebih";
        else status = "Tanpa Selisih";
      }

      items.push({
        tanggal: isoDate,
        jenis: jenisStr,
        labelNetto: netto,
        timbangUlang: timbang,
        selisihKg: selisihKg,
        selisihPersen: selisihPersen,
        status: status,
        suhu: cfg.suhuDefault || 29.5
      });
    }

    if (items.length > 0) {
      return { items: items };
    }

    return {
      items: [],
      notice: "Terhubung ke tab '" + sh.getName() + "' (" + (falseCount > 0 ? falseCount + " baris formula bernilai FALSE / belum ada timbangan riil" : "belum ada transaksi timbangan") + "). Wajar karena Rajang I terjadi secara berkala."
    };
  } catch (e) {
    Logger.log("Error fetch Rajang I: " + e.message);
    return { error: e.message };
  }
}

function parseIndonesianDateStringToIso_(str) {
  if (!str) return "";
  if (str instanceof Date) {
    return Utilities.formatDate(str, "Asia/Jakarta", "yyyy-MM-dd");
  }
  var s = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.substring(0, 10);
  }
  // Bersihkan nama hari (misal "Rabu, 21 Oktober 2026" -> "21 Oktober 2026")
  var clean = s.replace(/^[a-zA-Z]+,\s*/, "");
  var parts = clean.split(/[\s\-\/]+/);
  if (parts.length >= 3) {
    var day = parseInt(parts[0], 10);
    var monthStr = parts[1].toLowerCase();
    var year = parseInt(parts[2], 10);
    var months = {
      jan: 1, januari: 1,
      feb: 2, februari: 2,
      mar: 3, maret: 3,
      apr: 4, april: 4,
      mei: 5, may: 5,
      jun: 6, juni: 6,
      jul: 7, juli: 7,
      agu: 8, agust: 8, agustus: 8, aug: 8,
      sep: 9, sept: 9, september: 9,
      okt: 10, oktober: 10, oct: 10,
      nop: 11, nov: 11, november: 11,
      des: 12, desember: 12, dec: 12
    };
    var month = months[monthStr];
    if (day > 0 && month > 0 && year > 2000) {
      var mm = month < 10 ? "0" + month : "" + month;
      var dd = day < 10 ? "0" + day : "" + day;
      return year + "-" + mm + "-" + dd;
    }
  }
  return s;
}

function fetchBlendSourceData_(cfg) {
  try {
    var items = [];
    var ssBlend = null;
    try {
      ssBlend = SpreadsheetApp.openById(cfg.sourceSpreadsheetId);
    } catch (e) {
      Logger.log("Tidak dapat membuka spreadsheet DHP Blend ID: " + cfg.sourceSpreadsheetId + " - " + e.message);
    }

    // 1. Coba baca dari tab INTEGRASI DATA DHP BLEND
    if (ssBlend) {
      var sh = ssBlend.getSheetByName(cfg.sourceSheetName);
      if (!sh) {
        var allSheets = ssBlend.getSheets();
        for (var s = 0; s < allSheets.length; s++) {
          var name = allSheets[s].getName().trim();
          if (name.toLowerCase() === cfg.sourceSheetName.toLowerCase() ||
              /integrasi.*dhp|dhp.*blend|hasil.*proses.*blend/i.test(name)) {
            sh = allSheets[s];
            break;
          }
        }
      }

      if (sh) {
        var data = sh.getDataRange().getValues();
        if (data && data.length > 10) {
          // Cari baris header dinamis (yang berisi TANGGAL, NOMER, BOBOT BAKU, HASIL PROSES, dll)
          var headerRowIdx = -1;
          var colTgl = 2;        // Default Col C
          var colNomer = 0;      // Default Col A
          var colMerk = 4;       // Default Col E
          var colBobotBaku = 5;  // Default Col F
          var colTimbang = 6;    // Default Col G (HASIL PROSES)
          var colSusutKg = 9;    // Default Col J
          var colSusutPct = 10;  // Default Col K

          for (var rIdx = 0; rIdx < Math.min(20, data.length); rIdx++) {
            var rowVals = data[rIdx].map(function(c) { return String(c || "").trim().toUpperCase(); });
            var hasHeader = rowVals.some(function(v) { return v.indexOf("BOBOT BAKU") !== -1 || v.indexOf("HASIL PROSES") !== -1; });
            if (hasHeader) {
              headerRowIdx = rIdx;
              for (var cIdx = 0; cIdx < rowVals.length; cIdx++) {
                var v = rowVals[cIdx];
                if (v.indexOf("TANGGAL") !== -1 && v.indexOf("PROSES") !== -1) colTgl = cIdx;
                else if (v.indexOf("TANGGAL") !== -1 && colTgl === 2) colTgl = cIdx;
                if (v === "NOMER" || v === "NO" || v.indexOf("NOMOR") !== -1) colNomer = cIdx;
                if (v === "MERK" || v.indexOf("JENIS") !== -1) colMerk = cIdx;
                if (v.indexOf("BOBOT BAKU") !== -1) colBobotBaku = cIdx;
                if (v.indexOf("HASIL PROSES") !== -1 && colTimbang === 6) colTimbang = cIdx;
                if (v.indexOf("TIMBANG ULANG") !== -1) colTimbang = cIdx;
                if (v.indexOf("SUSUT") !== -1 && v.indexOf("KG") !== -1) colSusutKg = cIdx;
                if (v.indexOf("SUSUT") !== -1 && v.indexOf("%") !== -1) colSusutPct = cIdx;
              }
              break;
            }
          }

          var startDataRow = headerRowIdx !== -1 ? headerRowIdx + 1 : 13;
          for (var i = startDataRow; i < data.length; i++) {
            var r = data[i];
            var rawTgl = r[colTgl];
            var rawMerk = r[colMerk];
            var rawNetto = r[colBobotBaku];
            var rawTimbang = r[colTimbang];
            var rawSusutKg = r[colSusutKg];
            var rawSusutPct = r[colSusutPct];

            var netto = parseIndonesianNumber_(rawNetto, 0);
            var timbang = parseIndonesianNumber_(rawTimbang, 0);
            if (!rawTgl || !rawMerk || netto <= 0) continue;

            var jenisStr = String(rawMerk).trim();
            if (!jenisStr || jenisStr === "-" || jenisStr.toUpperCase() === "FALSE") continue;

            var isoDate = parseIndonesianDateStringToIso_(rawTgl);
            if (!isoDate) continue;

            var selisihKg = parseIndonesianNumber_(rawSusutKg, netto - timbang);
            var selisihPersen = parseIndonesianNumber_(rawSusutPct, netto > 0 ? (selisihKg / netto) * 100 : 0);
            if (selisihPersen > 1) selisihPersen = selisihPersen / 100;

            var status = selisihKg > 0.05 ? "Selisih Kurang" : (selisihKg < -0.05 ? "Selisih Lebih" : "Tanpa Selisih");

            items.push({
              tanggal: isoDate,
              jenis: jenisStr,
              labelNetto: netto,
              timbangUlang: timbang > 0 ? timbang : (netto - selisihKg),
              selisihKg: selisihKg,
              selisihPersen: selisihPersen,
              status: status,
              suhu: cfg.suhuDefault || 27.5
            });
          }
        }
      }
    }

    // 2. Jika dari INTEGRASI DATA DHP BLEND kosong, fallback ke DATAMASTER (masterSpreadsheetId)
    if (items.length === 0 && cfg.masterSpreadsheetId) {
      try {
        var ssMaster = SpreadsheetApp.openById(cfg.masterSpreadsheetId);
        var shMaster = ssMaster.getSheetByName("DATAMASTER") || ssMaster.getSheetByName("Data Master");
        if (shMaster) {
          var mData = shMaster.getDataRange().getValues();
          // Header biasanya baris 13 (index 12)
          var mStartRow = 13;
          for (var mi = 0; mi < Math.min(25, mData.length); mi++) {
            var mRow = mData[mi].map(function(c) { return String(c || "").trim().toUpperCase(); });
            if (mRow.indexOf("BOBOT BAKU") !== -1 && mRow.indexOf("HASIL PROSES") !== -1) {
              mStartRow = mi + 1;
              break;
            }
          }

          for (var k = mStartRow; k < mData.length; k++) {
            var mr = mData[k];
            var mTgl = mr[1];      // Kolom B: TANGGAL
            var mJenis = mr[5];    // Kolom F: JENIS TBK BLEND
            var mNetto = parseIndonesianNumber_(mr[8], 0);  // Kolom I: BOBOT BAKU
            var mTimbang = parseIndonesianNumber_(mr[9], 0); // Kolom J: HASIL PROSES
            var mSusutKg = parseIndonesianNumber_(mr[10], mNetto - mTimbang); // Kolom K: SUSUT
            var mSusutPct = parseIndonesianNumber_(mr[11], 0); // Kolom L: SUSUT %
            var mSuhu = parseIndonesianNumber_(mr[13], cfg.suhuDefault || 27.5); // Kolom N: SUHU

            if (!mTgl || !mJenis || mNetto <= 0) continue;
            var jenisClean = String(mJenis).trim();
            if (!jenisClean || jenisClean === "-" || jenisClean.toUpperCase() === "FALSE") continue;

            var iso = parseIndonesianDateStringToIso_(mTgl);
            if (!iso) continue;

            if (mSusutPct > 1) mSusutPct = mSusutPct / 100;
            var mStatus = mSusutKg > 0.05 ? "Selisih Kurang" : (mSusutKg < -0.05 ? "Selisih Lebih" : "Tanpa Selisih");

            items.push({
              tanggal: iso,
              jenis: jenisClean,
              labelNetto: mNetto,
              timbangUlang: mTimbang > 0 ? mTimbang : (mNetto - mSusutKg),
              selisihKg: mSusutKg,
              selisihPersen: mSusutPct,
              status: mStatus,
              suhu: mSuhu > 0 ? mSuhu : (cfg.suhuDefault || 27.5)
            });
          }
        }
      } catch (errM) {
        Logger.log("Fallback DATAMASTER error: " + errM.message);
      }
    }

    if (items.length > 0) {
      return { items: items };
    }
    return {
      items: [],
      notice: "Sheet terhubung, namun belum ditemukan baris transaksi berbobot baku > 0 pada sheet DHP Blend / DATAMASTER."
    };
  } catch (e) {
    Logger.log("Error fetch Blend: " + e.message);
    return { error: e.message };
  }
}



function updateSummarySheetData_(targetSs) {
  var sumSheet = targetSs.getSheetByName("RINGKASAN_KONSOLIDASI");
  if (!sumSheet) return;

  var sheetNames = [
    SINKRONISASI_CONFIG.CENGKEH.nama,
    SINKRONISASI_CONFIG.BLEND.nama,
    SINKRONISASI_CONFIG.RAJANG_II.nama,
    SINKRONISASI_CONFIG.RAJANG_I.nama
  ];

  var summaryRows = [];
  var nowStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm");

  sheetNames.forEach(function(sName) {
    var sh = targetSs.getSheetByName(sName);
    if (!sh || sh.getLastRow() < 2) {
      summaryRows.push([sName, 0, 0, 0, 0, "0.00%", "Data Belum Tersedia"]);
      return;
    }

    var totalRows = sh.getLastRow() - 1;
    var values = sh.getRange(2, 5, totalRows, 3).getValues(); // Netto, Timbang, Selisih
    var sumNetto = 0, sumTimbang = 0, sumSelisih = 0;

    for (var i = 0; i < values.length; i++) {
      sumNetto += Number(values[i][0]) || 0;
      sumTimbang += Number(values[i][1]) || 0;
      sumSelisih += Number(values[i][2]) || 0;
    }

    var avgPct = sumNetto > 0 ? (sumSelisih / sumNetto) * 100 : 0;
    summaryRows.push([
      sName,
      totalRows,
      Math.round(sumNetto * 10) / 10,
      Math.round(sumTimbang * 10) / 10,
      Math.round(sumSelisih * 10) / 10,
      avgPct.toFixed(2) + "%",
      "Tersinkron (" + nowStr + ")"
    ]);
  });

  sumSheet.getRange(5, 1, summaryRows.length, summaryRows[0].length).setValues(summaryRows);
}

// ============================================================================
// 6. PENJADWAL OTOMATIS & DIAGNOSTIK
// ============================================================================

function pasangTriggerOtomatisHarian() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "sinkronisasiSemuaBSPP") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Buat trigger harian pukul 16:00 - 17:00 (WIB)
  ScriptApp.newTrigger("sinkronisasiSemuaBSPP")
    .timeBased()
    .everyDays(1)
    .atHour(16)
    .inTimezone("Asia/Jakarta")
    .create();

  try {
    SpreadsheetApp.getUi().alert(
      "⏰ Penjadwal Otomatis Aktif",
      "Sinkronisasi data BSPP akan dijalankan secara otomatis setiap hari pada pukul 16:00 WIB (setelah selesai penimbangan harian).",
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (e) {}
}

function tampilkanInfoSpreadsheet() {
  var ss = getTargetSpreadsheet_();
  var msg = "📊 Status BSPP Central Database:\n\n" +
            "Nama: " + ss.getName() + "\n" +
            "ID: " + ss.getId() + "\n" +
            "URL: " + ss.getUrl();
  try {
    SpreadsheetApp.getUi().alert("Informasi Database BSPP", msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    Logger.log(msg);
  }
}

// ============================================================================
// 7. WEB APP HTTP ENDPOINTS (doGet & doPost)
// ============================================================================

function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = (params.action || "").toLowerCase().trim();
    var format = (params.format || "").toLowerCase().trim();

    // 1. Healthcheck / Ping
    if (action === "ping") {
      return jsonResponse_({
        status: "ok",
        app: "BSPP Central Hub & Sync Engine",
        version: "1.3",
        author: "PT Batu Karang - Divisi PP1",
        timestamp: new Date().toISOString()
      });
    }

    // 2. Setup Database Datasheet
    if (action === "setup") {
      var setupRes = setupDatabaseBSPPPusat();
      var ss = getTargetSpreadsheet_();
      if (format === "json") {
        return jsonResponse_({
          success: true,
          message: "Setup database BSPP berhasil",
          spreadsheetId: ss.getId(),
          spreadsheetUrl: ss.getUrl()
        });
      }
      return htmlResponse_(renderActionResultHtml_(
        "Setup Database Berhasil",
        "Tab untuk 4 komoditas dan tab ringkasan konsolidasi telah berhasil disiapkan dan diformat dengan standar audit.",
        ss.getUrl(),
        ["Spreadsheet ID: " + ss.getId(), "Spreadsheet Nama: " + ss.getName()]
      ));
    }

    // 3. Sinkronisasi Data Manual via Web / API
    if (action === "sync") {
      var syncRes = sinkronisasiSemuaBSPP();
      if (format === "json") {
        return jsonResponse_(syncRes);
      }
      var ss = getTargetSpreadsheet_();
      return htmlResponse_(renderActionResultHtml_(
        "Sinkronisasi Berhasil Selesai!",
        syncRes.message,
        ss.getUrl(),
        syncRes.details
      ));
    }

    // 4. API Summary / Ringkasan Konsolidasi
    if (action === "getsummary" || action === "summary") {
      var summaryData = getSummaryDataApi_();
      return jsonResponse_({
        success: true,
        summary: summaryData,
        timestamp: new Date().toISOString()
      });
    }

    // 5. API Data Per Komoditas
    if (action === "getdata" || action === "data") {
      var commodityKey = (params.commodity || params.sheet || "cengkeh").toUpperCase();
      var limit = parseInt(params.limit || "200", 10);
      var records = getCommodityRecordsApi_(commodityKey, limit);
      return jsonResponse_({
        success: true,
        commodity: commodityKey,
        count: records.length,
        records: records
      });
    }

    // 6. Default: Render Web App Dashboard Elegan
    return htmlResponse_(renderDashboardHtml_());
  } catch (err) {
    Logger.log("Error in doGet: " + err.stack);
    if (e && e.parameter && e.parameter.format === "json") {
      return jsonResponse_({
        success: false,
        error: err.message || String(err)
      });
    }
    return htmlResponse_(renderErrorHtml_(err.message || String(err)));
  }
}

function doPost(e) {
  try {
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (err) {
        payload = { raw: e.postData.contents };
      }
    }
    var action = (payload.action || (e && e.parameter && e.parameter.action) || "sync").toLowerCase();

    if (action === "sync") {
      var res = sinkronisasiSemuaBSPP();
      return jsonResponse_(res);
    }

    if (action === "ping") {
      return jsonResponse_({ status: "ok", timestamp: new Date().toISOString() });
    }

    return jsonResponse_({ success: false, message: "Aksi tidak dikenali: " + action });
  } catch (err) {
    return jsonResponse_({ success: false, error: err.message || String(err) });
  }
}

// ============================================================================
// 8. RESPONSE FORMATTERS & API HELPERS
// ============================================================================

function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

function htmlResponse_(htmlContent) {
  return HtmlService.createHtmlOutput(htmlContent)
    .setTitle("BSPP Central Hub - PT Batu Karang")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function getSummaryDataApi_() {
  try {
    var ss = getTargetSpreadsheet_();
    var sumSheet = ss.getSheetByName("RINGKASAN_KONSOLIDASI");
    if (!sumSheet) {
      updateSummarySheetData_(ss);
      sumSheet = ss.getSheetByName("RINGKASAN_KONSOLIDASI");
    }
    if (!sumSheet || sumSheet.getLastRow() < 5) return [];

    var numRows = sumSheet.getLastRow() - 4;
    var data = sumSheet.getRange(5, 1, numRows, 7).getValues();
    var result = [];
    for (var i = 0; i < data.length; i++) {
      result.push({
        komoditas: data[i][0],
        totalTransaksi: data[i][1],
        totalNetto: data[i][2],
        totalTimbang: data[i][3],
        totalSelisih: data[i][4],
        rataRataSelisihPersen: data[i][5],
        statusAudit: data[i][6]
      });
    }
    return result;
  } catch (e) {
    return [{ error: e.message }];
  }
}

function getCommodityRecordsApi_(key, limit) {
  try {
    var ss = getTargetSpreadsheet_();
    var cfg = SINKRONISASI_CONFIG[key] || SINKRONISASI_CONFIG.CENGKEH;
    var sh = ss.getSheetByName(cfg.nama);
    if (!sh || sh.getLastRow() < 2) return [];

    var lastRow = sh.getLastRow();
    var rowsToFetch = Math.min(limit || 200, lastRow - 1);
    var vals = sh.getRange(2, 1, rowsToFetch, 12).getValues();

    var records = [];
    for (var i = 0; i < vals.length; i++) {
      var r = vals[i];
      records.push({
        no: r[0],
        tanggal: r[1],
        komoditas: r[2],
        jenis: r[3],
        labelNetto: r[4],
        timbangUlang: r[5],
        selisihKg: r[6],
        selisihPersen: r[7],
        status: r[8],
        suhu: r[9],
        idUnik: r[10],
        waktuSync: r[11]
      });
    }
    return records;
  } catch (e) {
    return [];
  }
}

// ============================================================================
// 9. TEMPLATE TAMPILAN DASHBOARD HTML INTERAKTIF (ASINKRON)
// ============================================================================

function renderDashboardHtml_() {
  var ss = getTargetSpreadsheet_();
  var ssName = ss.getName();
  var ssId = ss.getId();
  var ssUrl = ss.getUrl();
  var nowStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd MMMM yyyy HH:mm:ss") + " WIB";

  var summaryRows = getSummaryDataApi_();

  var rowsHtml = "";
  if (summaryRows && summaryRows.length > 0 && !summaryRows[0].error) {
    summaryRows.forEach(function(row) {
      rowsHtml += "<tr>" +
        "<td style='padding: 12px 16px; font-weight: 600; color: #0f172a;'>" + row.komoditas + "</td>" +
        "<td style='padding: 12px 16px; text-align: center; font-weight: 600;'>" + Number(row.totalTransaksi).toLocaleString("id-ID") + "</td>" +
        "<td style='padding: 12px 16px; text-align: right;'>" + Number(row.totalNetto).toLocaleString("id-ID") + " Kg</td>" +
        "<td style='padding: 12px 16px; text-align: right;'>" + Number(row.totalTimbang).toLocaleString("id-ID") + " Kg</td>" +
        "<td style='padding: 12px 16px; text-align: right; font-weight: 600; color: " + (row.totalSelisih < 0 ? "#dc2626" : "#16a34a") + ";'>" + (row.totalSelisih > 0 ? "+" : "") + Number(row.totalSelisih).toLocaleString("id-ID") + " Kg</td>" +
        "<td style='padding: 12px 16px; text-align: center;'><span style='background: #e2e8f0; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600;'>" + row.rataRataSelisihPersen + "</span></td>" +
        "<td style='padding: 12px 16px; font-size: 12px; color: #475569;'>" + row.statusAudit + "</td>" +
      "</tr>";
    });
  } else {
    rowsHtml = "<tr><td colspan='7' style='padding: 24px; text-align: center; color: #64748b;'>Belum ada data tersinkron. Klik tombol <strong>'Sinkronkan Sekarang'</strong> di atas untuk memuat data.</td></tr>";
  }

  return "<!DOCTYPE html>" +
  "<html lang='id'>" +
  "<head>" +
    "<meta charset='UTF-8'>" +
    "<title>BSPP Central Hub - PT Batu Karang</title>" +
    "<style>" +
      "* { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }" +
      "body { background: #0b1120; color: #e2e8f0; padding: 24px 16px; line-height: 1.5; }" +
      ".container { max-width: 1040px; margin: 0 auto; }" +
      ".header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border: 1px solid #334155; border-radius: 16px; padding: 24px; margin-bottom: 24px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); }" +
      ".badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.3); padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }" +
      ".dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981; animation: pulse 2s infinite; }" +
      "@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }" +
      "h1 { font-size: 22px; font-weight: 700; color: #f8fafc; margin-top: 6px; }" +
      "p.subtitle { color: #94a3b8; font-size: 13px; margin-top: 2px; }" +
      ".btn-group { display: flex; gap: 10px; flex-wrap: wrap; }" +
      ".btn { padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; border: none; transition: all 0.15s ease; }" +
      ".btn-primary { background: #2563eb; color: #ffffff; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }" +
      ".btn-primary:hover { background: #1d4ed8; transform: translateY(-1px); }" +
      ".btn-sheet { background: #059669; color: #ffffff; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3); }" +
      ".btn-sheet:hover { background: #047857; transform: translateY(-1px); }" +
      ".status-alert { display: none; margin-bottom: 20px; padding: 14px 18px; border-radius: 12px; font-size: 13px; line-height: 1.6; animation: fadeIn 0.3s ease; }" +
      "@keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }" +
      ".card { background: #ffffff; color: #1e293b; border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }" +
      ".card-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; }" +
      "table { width: 100%; border-collapse: collapse; font-size: 13px; }" +
      "th { background: #f8fafc; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; padding: 12px 16px; text-align: left; border-bottom: 2px solid #e2e8f0; }" +
      "td { border-bottom: 1px solid #f1f5f9; }" +
      "tr:hover td { background: #f8fafc; }" +
      ".grid-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 24px; }" +
      ".info-box { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 16px; }" +
      ".info-label { font-size: 11px; text-transform: uppercase; font-weight: 600; color: #94a3b8; }" +
      ".info-val { font-size: 14px; font-weight: 600; color: #f8fafc; margin-top: 4px; word-break: break-all; }" +
      ".api-box { background: #020617; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; font-family: monospace; font-size: 12px; color: #38bdf8; overflow-x: auto; }" +
      ".api-item { margin-bottom: 8px; }" +
      ".api-badge { background: #1e293b; color: #a5f3fc; padding: 2px 6px; border-radius: 4px; margin-right: 8px; font-weight: bold; }" +
      ".footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 32px; }" +
    "</style>" +
  "</head>" +
  "<body>" +
    "<div class='container'>" +
      "<div class='header'>" +
        "<div>" +
          "<div class='badge'><span class='dot'></span> GAS Web App Online &amp; Terhubung</div>" +
          "<h1>BSPP Central Hub &amp; Data Pipeline</h1>" +
          "<p class='subtitle'>PT Batu Karang - Divisi Produksi I (PP1) | Datasheet Terpusat &amp; Audit Rekapitulasi</p>" +
        "</div>" +
        "<div class='btn-group'>" +
          "<button id='btnSync' onclick='jalankanSinkronisasiAsync()' class='btn btn-primary'>⚡ Sinkronkan Sekarang</button>" +
          "<a href='" + ssUrl + "' target='_blank' rel='noopener noreferrer' class='btn btn-sheet'>📊 Buka Google Spreadsheet ↗</a>" +
        "</div>" +
      "</div>" +

      "<div id='statusBox' class='status-alert'></div>" +

      "<div class='grid-info'>" +
        "<div class='info-box'>" +
          "<div class='info-label'>Spreadsheet Target</div>" +
          "<div class='info-val'>" + ssName + "</div>" +
        "</div>" +
        "<div class='info-box'>" +
          "<div class='info-label'>Spreadsheet ID</div>" +
          "<div class='info-val' style='font-family: monospace; font-size: 12px;'>" + ssId + "</div>" +
        "</div>" +
        "<div class='info-box'>" +
          "<div class='info-label'>Waktu Server</div>" +
          "<div class='info-val'>" + nowStr + "</div>" +
        "</div>" +
        "<div class='info-box'>" +
          "<div class='info-label'>Otomatisasi Harian</div>" +
          "<div class='info-val' style='color: #34d399;'>⏰ Tiap Sore (16:00 WIB)</div>" +
        "</div>" +
      "</div>" +

      "<div class='card'>" +
        "<div class='card-title'>" +
          "<span>📊 Ringkasan Audit Konsolidasi 4 Komoditas</span>" +
          "<a href='?action=getsummary&format=json' target='_blank' rel='noopener noreferrer' style='font-size: 12px; color: #2563eb; text-decoration: none;'>Lihat Format JSON ↗</a>" +
        "</div>" +
        "<table>" +
          "<thead>" +
            "<tr>" +
              "<th>Komoditas</th>" +
              "<th style='text-align: center;'>Total Baris</th>" +
              "<th style='text-align: right;'>Netto (Kg)</th>" +
              "<th style='text-align: right;'>Timbang (Kg)</th>" +
              "<th style='text-align: right;'>Selisih (Kg)</th>" +
              "<th style='text-align: center;'>Selisih %</th>" +
              "<th>Status Sinkronisasi</th>" +
            "</tr>" +
          "</thead>" +
          "<tbody>" +
            rowsHtml +
          "</tbody>" +
        "</table>" +
      "</div>" +

      "<div class='card' style='background: #0f172a; color: #e2e8f0; border: 1px solid #1e293b;'>" +
        "<div class='card-title' style='color: #f8fafc;'>" +
          "<span>⚡ REST API Endpoints Siap Pakai</span>" +
          "<span style='font-size: 11px; background: #1e293b; padding: 4px 8px; border-radius: 6px; color: #38bdf8;'>JSON Format Ready</span>" +
        "</div>" +
        "<div class='api-box'>" +
          "<div class='api-item'><span class='api-badge'>GET</span><code>?action=ping</code> - Cek status kesehatan server GAS</div>" +
          "<div class='api-item'><span class='api-badge'>GET</span><code>?action=getSummary</code> - Ambil data ringkasan konsolidasi 4 komoditas</div>" +
          "<div class='api-item'><span class='api-badge'>GET</span><code>?action=sync&amp;format=json</code> - Trigger sinkronisasi data via HTTP &amp; terima log hasil</div>" +
          "<div class='api-item'><span class='api-badge'>GET</span><code>?action=getData&amp;sheet=CENGKEH</code> - Ambil entri data komoditas tertentu</div>" +
          "<div class='api-item'><span class='api-badge'>GET</span><code>?action=setup</code> - Bentuk ulang template tabel datasheet jika diperlukan</div>" +
        "</div>" +
      "</div>" +

      "<div class='footer'>" +
        "<p>PT Batu Karang - Divisi Produksi I (PP1) &bull; Sistem Monitoring Persediaan Terpadu</p>" +
      "</div>" +
    "</div>" +

    "<script>" +
      "function jalankanSinkronisasiAsync() {" +
        "var btn = document.getElementById('btnSync');" +
        "var box = document.getElementById('statusBox');" +
        "btn.disabled = true;" +
        "btn.innerHTML = '⏳ Sedang Menyinkronkan 4 Komoditas...';" +
        "btn.style.opacity = '0.65';" +
        "box.style.display = 'block';" +
        "box.style.background = '#1e293b';" +
        "box.style.border = '1px solid #3b82f6';" +
        "box.style.color = '#bfdbfe';" +
        "box.innerHTML = '<strong>🔄 Proses Sedang Berjalan:</strong> Menarik dan memperbarui data dari 4 komoditas (Cengkeh, DHP Blend, Rajang II, Rajang I)... Mohon tunggu beberapa detik.';" +
        "" +
        "if (typeof google !== 'undefined' && google.script && google.script.run) {" +
          "google.script.run" +
            ".withSuccessHandler(function(res) {" +
              "btn.disabled = false;" +
              "btn.innerHTML = '⚡ Sinkronkan Lagi';" +
              "btn.style.opacity = '1';" +
              "box.style.background = '#064e3b';" +
              "box.style.border = '1px solid #10b981';" +
              "box.style.color = '#a7f3d0';" +
              "var detailStr = (res && res.details) ? '<br><small>' + res.details.join('<br>') + '</small>' : '';" +
              "box.innerHTML = '<strong>✅ ' + (res.message || 'Sinkronisasi Berhasil Selesai!') + '</strong>' + detailStr + '<br><br><em>Memuat ulang tampilan dalam 2 detik...</em>';" +
              "setTimeout(function() { window.location.reload(); }, 2000);" +
            "})" +
            ".withFailureHandler(function(err) {" +
              "btn.disabled = false;" +
              "btn.innerHTML = '⚡ Coba Sinkronkan Lagi';" +
              "btn.style.opacity = '1';" +
              "box.style.background = '#7f1d1d';" +
              "box.style.border = '1px solid #ef4444';" +
              "box.style.color = '#fecaca';" +
              "box.innerHTML = '<strong>❌ Terjadi Kendala:</strong> ' + (err.message || String(err));" +
            "})" +
            ".sinkronisasiSemuaBSPP();" +
        "} else {" +
          "window.top.location.href = '?action=sync';" +
        "}" +
      "}" +
    "</script>" +
  "</body>" +
  "</html>";
}

function renderActionResultHtml_(title, msg, sheetUrl, details) {
  var detailsHtml = "";
  if (details && details.length > 0) {
    detailsHtml = "<div style='background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin: 16px 0; text-align: left; font-family: monospace; font-size: 12px; color: #334155; max-height: 200px; overflow-y: auto;'>";
    details.forEach(function(d) {
      detailsHtml += "<div>" + d + "</div>";
    });
    detailsHtml += "</div>";
  }

  return "<!DOCTYPE html>" +
  "<html lang='id'>" +
  "<head>" +
    "<meta charset='UTF-8'>" +
    "<title>" + title + " - BSPP Central Hub</title>" +
    "<style>" +
      "body { background: #0b1120; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }" +
      ".box { background: #ffffff; border-radius: 20px; max-width: 540px; width: 100%; padding: 32px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }" +
      ".icon { width: 64px; height: 64px; border-radius: 50%; background: #dcfce7; color: #16a34a; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 16px; }" +
      "h2 { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }" +
      "p { color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px; }" +
      ".btn-group { display: flex; gap: 10px; justify-content: center; margin-top: 24px; flex-wrap: wrap; }" +
      ".btn { padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer; transition: all 0.15s; }" +
      ".btn-primary { background: #2563eb; color: #ffffff; }" +
      ".btn-primary:hover { background: #1d4ed8; }" +
      ".btn-sheet { background: #059669; color: #ffffff; }" +
      ".btn-sheet:hover { background: #047857; }" +
    "</style>" +
  "</head>" +
  "<body>" +
    "<div class='box'>" +
      "<div class='icon'>✓</div>" +
      "<h2>" + title + "</h2>" +
      "<p>" + msg + "</p>" +
      detailsHtml +
      "<div class='btn-group'>" +
        "<a href='?' target='_top' class='btn btn-primary'>← Kembali ke Dashboard</a>" +
        (sheetUrl ? "<a href='" + sheetUrl + "' target='_blank' rel='noopener noreferrer' class='btn btn-sheet'>Buka Google Spreadsheet ↗</a>" : "") +
      "</div>" +
    "</div>" +
  "</body>" +
  "</html>";
}

function renderErrorHtml_(errorMsg) {
  return "<!DOCTYPE html>" +
  "<html lang='id'>" +
  "<head>" +
    "<meta charset='UTF-8'>" +
    "<title>Error - BSPP Central Hub</title>" +
    "<style>" +
      "body { background: #0b1120; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }" +
      ".box { background: #ffffff; border-radius: 20px; max-width: 500px; width: 100%; padding: 32px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }" +
      ".icon { width: 64px; height: 64px; border-radius: 50%; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 16px; }" +
      "h2 { font-size: 20px; font-weight: 700; color: #991b1b; margin-bottom: 8px; }" +
      "p { color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 20px; word-break: break-all; }" +
      ".btn { padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 600; text-decoration: none; background: #334155; color: #ffffff; display: inline-block; }" +
    "</style>" +
  "</head>" +
  "<body>" +
    "<div class='box'>" +
      "<div class='icon'>!</div>" +
      "<h2>Terjadi Kendala</h2>" +
      "<p>" + errorMsg + "</p>" +
      "<a href='?' target='_top' class='btn'>Coba Muat Ulang Dashboard</a>" +
    "</div>" +
  "</body>" +
  "</html>";
}
