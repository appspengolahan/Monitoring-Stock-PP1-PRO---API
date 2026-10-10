/**
 * dateUtils.ts
 * Utilitas penanganan Tanggal & Waktu Berstandar Locale Indonesia (id-ID)
 * Mendukung Timezone Asia/Jakarta (WIB), parsing format Indonesia (DD/MM/YYYY, teks bulan Indonesia),
 * normalisasi tanggal kanonikal YYYY-MM-DD, dan penentuan Tanggal Terbaru presisi berbasis epoch time.
 */

// Peta nama bulan Indonesia (lengkap & singkatan) ke nomor bulan 1-12
const BULAN_INDO_MAP: Record<string, number> = {
  januari: 1, jan: 1,
  februari: 2, feb: 2,
  maret: 3, mar: 3,
  april: 4, apr: 4,
  mei: 5,
  juni: 6, jun: 6,
  juli: 7, jul: 7,
  agustus: 8, ags: 8, agu: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  oktober: 10, okt: 10, oct: 10,
  november: 11, nov: 11,
  desember: 12, des: 12, dec: 12
};

/**
 * Konversi nomor serial Excel/Google Sheets ke Date
 */
export function serialToDate(serial: number): Date {
  // Epoch Excel: 1899-12-30 UTC
  const epoch = Date.UTC(1899, 11, 30);
  return new Date(epoch + serial * 86400000);
}

/**
 * Parsing tanggal dari berbagai variasi format (ISO, DD/MM/YYYY, DD-MM-YYYY, teks Indonesia, serial)
 * Menjamin format Indonesia DD/MM/YYYY tidak terbalik menjadi MM/DD/YYYY.
 */
export function parseDateIndo(input: unknown): Date | null {
  if (input === null || input === undefined || input === '') {
    return null;
  }

  // 1. Jika sudah bertipe Date
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }

  // 2. Jika bertipe number (serial number spreadsheet)
  if (typeof input === 'number') {
    if (isNaN(input) || input <= 0) return null;
    const d = serialToDate(input);
    return isNaN(d.getTime()) ? null : d;
  }

  const str = String(input).trim();
  if (!str) return null;

  // 3. Serial number sebagai string numerik (mis. "46305" atau "46305.5")
  if (/^\d{5,6}(\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    if (!isNaN(num) && num > 30000 && num < 100000) {
      const d = serialToDate(num);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // 4. ISO 8601 Format (YYYY-MM-DD atau YYYY-MM-DDTHH:mm:ss...)
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    const hh = isoMatch[4] ? parseInt(isoMatch[4], 10) : 0;
    const mm = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0;
    const ss = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0;
    const dateObj = new Date(Date.UTC(y, m, d, hh, mm, ss));
    if (!isNaN(dateObj.getTime())) return dateObj;
  }

  // 5. Format Indonesia: DD/MM/YYYY atau DD-MM-YYYY (contoh: 09/10/2026, 24/04/2026, 9-10-2026)
  const slashMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[\sT](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (slashMatch) {
    const d = parseInt(slashMatch[1], 10);
    const m = parseInt(slashMatch[2], 10) - 1;
    const y = parseInt(slashMatch[3], 10);
    const hh = slashMatch[4] ? parseInt(slashMatch[4], 10) : 0;
    const mm = slashMatch[5] ? parseInt(slashMatch[5], 10) : 0;
    const ss = slashMatch[6] ? parseInt(slashMatch[6], 10) : 0;
    const dateObj = new Date(Date.UTC(y, m, d, hh, mm, ss));
    if (!isNaN(dateObj.getTime())) return dateObj;
  }

  // 6. Format Teks Indonesia: contoh "Jumat, 09 Oktober 2026", "9 Oktober 2026", "24 April 2026"
  // Buang nama hari opsional ("Senin, ", "Jumat, ", dst.)
  const cleanStr = str.replace(/^(minggu|senin|selasa|rabu|kamis|jumat|sabtu|ahad)[\s,]+/i, '').trim();
  const textMatch = cleanStr.match(/^(\d{1,2})[\s\-]+([a-zA-Z]+)[\s\-]+(\d{4})/);
  if (textMatch) {
    const d = parseInt(textMatch[1], 10);
    const bulanKey = textMatch[2].toLowerCase();
    const y = parseInt(textMatch[3], 10);
    const mNum = BULAN_INDO_MAP[bulanKey];
    if (mNum) {
      const dateObj = new Date(Date.UTC(y, mNum - 1, d));
      if (!isNaN(dateObj.getTime())) return dateObj;
    }
  }

  // 7. Fallback standar JS Date parse
  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) {
    return fallback;
  }

  return null;
}

/**
 * Normalisasi ke String Kunci Tanggal Kanonikal: 'YYYY-MM-DD'
 * Sangat presisi untuk pencarian, sorting, dan filter input type="date".
 */
export function getTanggalKey(input: unknown): string {
  const d = parseDateIndo(input);
  if (!d) {
    if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.slice(0, 10))) {
      return input.slice(0, 10);
    }
    return '';
  }
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Normalisasi ke ISO String standar (UTC): 'YYYY-MM-DDTHH:mm:ss.000Z'
 */
export function normalizeDateToIso(input: unknown, defaultFallback: string = ''): string {
  const d = parseDateIndo(input);
  if (d) {
    return d.toISOString();
  }
  return defaultFallback;
}

/**
 * Mendapatkan epoch millisecond untuk sorting chronologis presisi
 */
export function getEpochTime(input: unknown): number {
  const d = parseDateIndo(input);
  return d ? d.getTime() : 0;
}

/**
 * Mencari Tanggal Terbaru (Max Date) dari daftar entri mutasi
 * Menggunakan epoch time numerik (getTime) sehingga 100% presisi dan mustahil
 * terdistorsi oleh kesalahan perbandingan string (misal '24/04' vs '09/10').
 */
export function getLatestDateString(items: Array<{ tanggal?: unknown } | null | undefined>): string {
  let maxTime = -Infinity;
  let maxKey = '';

  for (const item of items) {
    if (!item) continue;
    const d = parseDateIndo(item.tanggal);
    if (d) {
      const time = d.getTime();
      if (time > maxTime) {
        maxTime = time;
        maxKey = getTanggalKey(d);
      }
    }
  }

  return maxKey;
}

/**
 * Format tanggal ramah pengguna Berstandar Locale Indonesia (id-ID)
 * Contoh: "Jum, 9 Okt 2026" atau "9 Oktober 2026"
 */
export function formatTanggalIndo(
  input: unknown,
  options?: {
    withWeekday?: boolean;
    monthFormat?: 'short' | 'long';
    withYear?: boolean;
    fallback?: string;
  }
): string {
  if (!input) return options?.fallback || '—';

  const d = parseDateIndo(input);
  if (!d) {
    return typeof input === 'string' ? input : (options?.fallback || '—');
  }

  const withWeekday = options?.withWeekday ?? true;
  const monthFormat = options?.monthFormat ?? 'short';
  const withYear = options?.withYear ?? true;

  try {
    return d.toLocaleDateString('id-ID', {
      timeZone: 'UTC', // Karena kita parsing sebagai Date UTC murni
      weekday: withWeekday ? 'short' : undefined,
      day: 'numeric',
      month: monthFormat,
      year: withYear ? 'numeric' : undefined
    });
  } catch {
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    return `${day}/${m}/${y}`;
  }
}

/**
 * Format Tanggal Lengkap dengan Waktu WIB:
 * Contoh: "09 Okt 2026, 14:30 WIB"
 */
export function formatDateTimeIndo(input: unknown): string {
  if (!input) return '—';
  const d = parseDateIndo(input);
  if (!d) return String(input);

  try {
    const datePart = d.toLocaleDateString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const timePart = d.toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit'
    });
    return `${datePart}, ${timePart} WIB`;
  } catch {
    return formatTanggalIndo(d);
  }
}

/**
 * Format Waktu Saja dalam WIB:
 * Contoh: "14:30 WIB"
 */
export function formatWaktuIndo(input: unknown): string {
  if (!input) return '—';
  const d = parseDateIndo(input);
  if (!d) return String(input);

  try {
    const timePart = d.toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit'
    });
    return `${timePart} WIB`;
  } catch {
    return '—';
  }
}
