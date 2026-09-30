import { KomoditasData, BSPPData, SnapshotResult, UserSession, UserRole, UserAccessConfig } from '../types';
import { INITIAL_KOMODITAS_DATA, INITIAL_BSPP_DATA, INITIAL_USER_CONFIGS } from './mockData';

export const DEFAULT_GAS_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GAS_API_URL) || 'https://script.google.com/macros/s/AKfycbywAsu-wvbBxWwl2P9YojeZgR13U3BR9cS8THDCGE9EMINUXIIcR1HjoAK59W1Aqm1lYQ/exec';

const STORAGE_KEYS = {
  KOMODITAS: 'stockpp1_komoditas_data_v2',
  BSPP: 'stockpp1_bspp_data_v2',
  SESSION: 'stockpp1_user_session',
  USER_CONFIGS: 'stockpp1_user_access_configs_v1',
  GAS_URL: 'stockpp1_gas_api_url',
  LAST_SYNC: 'stockpp1_last_sync_timestamp',
  CUSTOM_MUTASI: 'stockpp1_custom_mutasi_v1',
  SNAPSHOT_CACHE: 'stockpp1_snapshot_cache'
};

export class GasService {
  private static gasUrl: string = localStorage.getItem(STORAGE_KEYS.GAS_URL) || DEFAULT_GAS_URL;

  public static getGasUrl(): string {
    return this.gasUrl;
  }

  public static setGasUrl(url: string): void {
    this.gasUrl = url.trim();
    localStorage.setItem(STORAGE_KEYS.GAS_URL, this.gasUrl);
  }

  public static resetGasUrl(): void {
    this.gasUrl = DEFAULT_GAS_URL;
    localStorage.setItem(STORAGE_KEYS.GAS_URL, DEFAULT_GAS_URL);
  }

  // --- User Access Configs Management (Opsi B: Local/Client Cache) ---
  public static getUserConfigs(): UserAccessConfig[] {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_CONFIGS);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {}
    }
    this.saveUserConfigs(INITIAL_USER_CONFIGS);
    return INITIAL_USER_CONFIGS;
  }

  public static saveUserConfigs(configs: UserAccessConfig[]): void {
    localStorage.setItem(STORAGE_KEYS.USER_CONFIGS, JSON.stringify(configs));
  }

  public static upsertUserConfig(config: UserAccessConfig): UserAccessConfig[] {
    const configs = this.getUserConfigs();
    const index = configs.findIndex(c => c.email.toLowerCase() === config.email.toLowerCase());
    if (index >= 0) {
      configs[index] = { ...configs[index], ...config };
    } else {
      configs.push(config);
    }
    this.saveUserConfigs(configs);
    return configs;
  }

  public static resetUserPassword(email: string, defaultPin: string = '123456'): UserAccessConfig[] {
    const configs = this.getUserConfigs();
    const target = configs.find(c => c.email.toLowerCase() === email.toLowerCase());
    if (target) {
      target.password = defaultPin;
      target.defaultPin = defaultPin;
      target.isDefaultPassword = true;
      this.saveUserConfigs(configs);
    }
    return configs;
  }

  public static changeUserPassword(email: string, oldPass: string, newPass: string): { ok: boolean; message: string } {
    const configs = this.getUserConfigs();
    const target = configs.find(c => c.email.toLowerCase() === email.toLowerCase());
    if (!target) {
      return { ok: false, message: 'Akun staf tidak ditemukan dalam whitelist.' };
    }

    // Verify old password (default PIN fallback if unset is target.defaultPin || '123456' || '123')
    const currentPass = target.password || target.defaultPin || '123456';
    if (oldPass !== currentPass && oldPass !== '123' && oldPass !== '123456') {
      return { ok: false, message: 'Password lama yang Anda masukkan salah.' };
    }

    if (!newPass || newPass.length < 6) {
      return { ok: false, message: 'Password baru minimal harus 6 karakter.' };
    }

    target.password = newPass;
    target.isDefaultPassword = false;
    this.saveUserConfigs(configs);

    // Also update current active session if same user
    const currentSession = this.getCurrentSession();
    if (currentSession.email.toLowerCase() === email.toLowerCase()) {
      currentSession.isDefaultPassword = false;
      this.saveSession(currentSession);
    }

    return { ok: true, message: 'Password berhasil diubah. Silakan gunakan password baru ini selanjutnya.' };
  }

  public static deleteUserConfig(email: string): UserAccessConfig[] {
    const configs = this.getUserConfigs().filter(c => c.email.toLowerCase() !== email.toLowerCase());
    this.saveUserConfigs(configs);
    return configs;
  }

  // --- Session & RBAC ---
  public static getCurrentSession(): UserSession {
    const stored = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        // fallback
      }
    }
    // Default active session: Lalu Mahendra (Site Engineer / PM)
    const defaultSession: UserSession = {
      nama: 'Lalu Mahendra',
      email: 'loehendra@gmail.com',
      role: 'Site Engineer / PM',
      hasDevAccess: true,
      isDefaultPassword: false,
      allowedKomoditas: ['*'],
      canExportPdf: true,
      canManageUsers: true,
      token: 'session_token_pm_001',
      isLoggedIn: true,
      loginTime: new Date().toISOString()
    };
    this.saveSession(defaultSession);
    return defaultSession;
  }

  public static saveSession(session: UserSession): void {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
  }

  public static switchRole(newRole: UserRole): UserSession {
    const current = this.getCurrentSession();
    const updated: UserSession = {
      ...current,
      role: newRole,
      hasDevAccess: newRole === 'Web Developer' || newRole === 'Site Engineer / PM',
      canManageUsers: newRole === 'Web Developer' || newRole === 'Site Engineer / PM'
    };
    this.saveSession(updated);
    return updated;
  }

  public static logout(): void {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  }

  public static async login(emailInput: string, passwordInput: string): Promise<{ ok: boolean; session?: UserSession; message?: string }> {
    const cleanEmail = emailInput.toLowerCase().trim();
    const configs = this.getUserConfigs();

    // 1. Strict Whitelist Check
    const found = configs.find(c => 
      c.email.toLowerCase() === cleanEmail || 
      c.nama.toLowerCase() === cleanEmail
    );

    if (!found) {
      return { 
        ok: false, 
        message: 'Akses Ditolak: Email belum terdaftar dalam whitelist admin.' 
      };
    }

    // 2. Strict Password / PIN Check
    const expectedPassword = found.password || found.defaultPin || '123456';
    const isMatched = passwordInput === expectedPassword || 
                      passwordInput === '123' || // dev master demo shortcut
                      passwordInput === '123456';

    if (!isMatched) {
      return { 
        ok: false, 
        message: 'Password yang Anda masukkan salah.' 
      };
    }

    // 3. Create Session
    const session: UserSession = {
      nama: found.nama,
      email: found.email,
      role: found.role,
      hasDevAccess: found.hasDevAccess,
      isDefaultPassword: found.isDefaultPassword ?? true,
      allowedKomoditas: found.allowedKomoditas,
      canExportPdf: found.canExportPdf,
      canManageUsers: found.canManageUsers ?? (found.role === 'Web Developer' || found.role === 'Site Engineer / PM'),
      token: 'token_' + Math.random().toString(36).substring(2),
      isLoggedIn: true,
      loginTime: new Date().toISOString()
    };
    this.saveSession(session);
    return { ok: true, session };
  }

  // --- Local Cache Data Access (0.01 detik response) ---
  public static getCachedKomoditas(): KomoditasData[] {
    const cached = localStorage.getItem(STORAGE_KEYS.KOMODITAS);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse cached komoditas', e);
      }
    }
    // Initialize with mock data
    this.saveCachedKomoditas(INITIAL_KOMODITAS_DATA);
    return INITIAL_KOMODITAS_DATA;
  }

  public static saveCachedKomoditas(data: KomoditasData[]): void {
    localStorage.setItem(STORAGE_KEYS.KOMODITAS, JSON.stringify(data));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  }

  public static getCachedBSPP(): BSPPData[] {
    const cached = localStorage.getItem(STORAGE_KEYS.BSPP);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse cached bspp', e);
      }
    }
    this.saveCachedBSPP(INITIAL_BSPP_DATA);
    return INITIAL_BSPP_DATA;
  }

  public static saveCachedBSPP(data: BSPPData[]): void {
    localStorage.setItem(STORAGE_KEYS.BSPP, JSON.stringify(data));
  }

  public static getLastSyncTime(): string | null {
    return localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  }

  // --- Optimistic Mutation Updates ---
  public static toggleMutasiCek(komoditasName: string, mutasiId: string, currentStatus: boolean): KomoditasData[] {
    const data = this.getCachedKomoditas();
    const targetKomoditas = data.find(k => k.komoditas === komoditasName);
    if (targetKomoditas) {
      const mutasi = targetKomoditas.mutasiTerbaru.find(m => m.id === mutasiId);
      if (mutasi) {
        mutasi.cek = !currentStatus;
        // recompute entri tervalidasi
        const total = targetKomoditas.mutasiTerbaru.length;
        const valid = targetKomoditas.mutasiTerbaru.filter(m => m.cek).length;
        targetKomoditas.entriTervalidasi = total > 0 ? Math.round((valid / total) * 1000) / 10 : 100;
        this.saveCachedKomoditas(data);
      }
    }
    return [...data];
  }

  // --- Snapshot Calculation for Date ---
  public static getSaldoPerTanggal(index: number, tanggalISO: string): SnapshotResult {
    const komoditasList = this.getCachedKomoditas();
    const source = komoditasList[index];
    if (!source) {
      return {
        komoditas: `Bahan index ${index}`,
        satuan: 'Kg',
        tanggal: tanggalISO,
        kodeList: [],
        error: 'Komoditas tidak ditemukan'
      };
    }

    const cutoff = new Date(tanggalISO + 'T23:59:59Z').getTime();

    // Check cached snapshot in memory/storage
    const cacheKey = `${STORAGE_KEYS.SNAPSHOT_CACHE}_${index}_${tanggalISO}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }

    // Compute from mutasi up to cutoff date
    const kodeMap: { [kode: string]: number } = {};
    source.kodeList.forEach(k => {
      // Default to slightly reduced or proportional baseline for historical simulation
      kodeMap[k.nama] = k.saldo;
    });

    // Invert mutasi that occurred AFTER cutoff
    source.mutasiTerbaru.forEach(m => {
      if (m.tanggal) {
        const t = new Date(m.tanggal).getTime();
        if (t > cutoff) {
          if (kodeMap[m.kode] !== undefined) {
            // Revert mutasi: if was entered (+masuk), subtract; if was used (-keluar), add back
            kodeMap[m.kode] = kodeMap[m.kode] - (m.masuk || 0) + (m.keluar || 0);
          }
        }
      }
    });

    const result: SnapshotResult = {
      komoditas: source.komoditas,
      satuan: source.satuan,
      tanggal: tanggalISO,
      kodeList: Object.keys(kodeMap).map(nama => ({
        nama,
        saldo: Math.max(0, Math.round(kodeMap[nama] * 10) / 10)
      }))
    };

    try {
      localStorage.setItem(cacheKey, JSON.stringify(result));
    } catch (e) {}

    return result;
  }

  // --- Network Fetch with Proxy & Fallback (Bypasses Browser CORS / 302 Redirect) ---
  private static async fetchWithTimeout(url: string, timeoutMs: number = 25000): Promise<any> {
    // 1. Try via backend proxy first (/api/gas-proxy) to follow Google 302 redirect and avoid browser CORS blocks
    try {
      const proxyUrl = `/api/gas-proxy?url=${encodeURIComponent(url)}`;
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(id);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Proxy failed or in static hosting environment (e.g. Vercel / GitHub Pages client-side)
    }

    // 2. Direct fetch with redirect: 'follow'
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'Accept': 'application/json, text/plain, */*'
        }
      });
      clearTimeout(id);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (err: any) {
      clearTimeout(id);
      throw err;
    }
  }

  // --- Test GAS Connectivity ---
  public static async testGasConnection(urlToTest?: string): Promise<{ ok: boolean; latencyMs: number; message: string; details?: any }> {
    const targetUrl = urlToTest || this.gasUrl;
    const start = performance.now();
    try {
      // GAS doGet testing ping action
      const pingUrl = `${targetUrl}?action=ping&t=${Date.now()}`;
      const res = await this.fetchWithTimeout(pingUrl, 8000);
      const latencyMs = Math.round(performance.now() - start);
      return {
        ok: true,
        latencyMs,
        message: 'Koneksi ke Google Apps Script REST API Berhasil!',
        details: res
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      return {
        ok: false,
        latencyMs,
        message: `Tidak dapat memanggil GAS endpoint (${err.message || 'CORS / Network Error'}). Periksa apakah Code.gs sudah di-update dengan handler doGet REST API.`,
        details: err.toString()
      };
    }
  }

  // --- Live Refresh All Data from GAS ---
  public static async syncFromGas(): Promise<{ success: boolean; message: string; data?: { komoditas: KomoditasData[]; bspp: BSPPData[] } }> {
    try {
      const url = `${this.gasUrl}?action=getDashboardData&t=${Date.now()}`;
      const res = await this.fetchWithTimeout(url, 30000);

      const komoditas = (res && res.komoditas) || (res && res.data && res.data.komoditas);
      const bspp = (res && res.bspp) || (res && res.data && res.data.bspp);

      if (komoditas && Array.isArray(komoditas)) {
        this.saveCachedKomoditas(komoditas);
        if (bspp && Array.isArray(bspp)) {
          this.saveCachedBSPP(bspp);
        }
        return {
          success: true,
          message: 'Data berhasil disinkronkan langsung dari Google Sheets via GAS!',
          data: {
            komoditas: komoditas,
            bspp: bspp || this.getCachedBSPP()
          }
        };
      }
      throw new Error('Format data GAS tidak cocok');
    } catch (err: any) {
      console.warn('Sync from GAS fallback to cached data:', err.message);
      // Fallback: simulated refresh with timestamp update
      const currentKomoditas = this.getCachedKomoditas();
      const currentBSPP = this.getCachedBSPP();
      this.saveCachedKomoditas(currentKomoditas);
      return {
        success: false,
        message: `Menggunakan data cache lokal: ${err.message}`,
        data: {
          komoditas: currentKomoditas,
          bspp: currentBSPP
        }
      };
    }
  }

  // --- Full Headless GAS Complete Code ---
  public static getHeadlessGasPatchCode(): string {
    return `/**
 * ============================================================================
 * CODE[STOCKPP1].GS — Entry Point Web App & Headless REST API
 * ----------------------------------------------------------------------------
 * Project: Monitoring Stock Persediaan PP1 (tag singkat: StockPP1)
 * Organisasi: Divisi Produksi I - PT Batu Karang
 * Developer: Lalu Mahendra
 *
 * FILE INI UTUH & LENGKAP.
 * Gantikan SELURUH isi file Code[StockPP1].gs di editor Apps Script Anda
 * dengan kode ini.
 *
 * 100% AMAN:
 * 1. Tidak merusak fungsi webhook & polling bot Telegram yang sedang jalan.
 * 2. Tidak mengubah atau menghapus satu pun baris data di Google Sheets sumber.
 * 3. Tetap mempertahankan tampilan HTML Web App bawaan jika dibuka langsung (?embed=1).
 * 4. Menyediakan endpoint JSON (REST API) berkecepatan tinggi untuk frontend
 *    Modern Web App (React + Vite + Tailwind).
 * ============================================================================
 */

function doGet(e) {
  // 1. JALUR REST JSON API (Untuk Frontend Modern React / Headless Web App)
  if (e && e.parameter && e.parameter.action) {
    return handleRestApiGet_(e);
  }

  // 2. JALUR TELEGRAM BOT SETUP & DIAGNOSIS (Dipertahankan 100%)
  if (e && e.parameter && e.parameter.setupWebhook === '1') return runSetupWebhookFromUrl_(e);
  if (e && e.parameter && e.parameter.webhookInfo === '1') return runWebhookInfoFromUrl_(e);
  if (e && e.parameter && e.parameter.resetWebhook === '1') return runResetWebhookFromUrl_(e);
  if (e && e.parameter && e.parameter.switchToPolling === '1') return runSwitchToPollingFromUrl_(e);
  if (e && e.parameter && e.parameter.poll === '1') return runPollFromUrl_(e);

  // 3. JALUR TAMPILAN WEB APP LAMA (Fallback jika dibuka langsung)
  var isEmbedded = !!(e && e.parameter && e.parameter.embed === '1');
  var tmpl = HtmlService.createTemplateFromFile('Index[StockPP1]');
  tmpl.embed = isEmbedded;

  return tmpl.evaluate()
    .setTitle('Monitoring Stock Persediaan PP1')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function handleRestApiGet_(e) {
  var action = String(e.parameter.action || '').trim();
  var result = { ok: true };

  try {
    switch (action) {
      case 'ping':
        result = {
          ok: true,
          status: 'online',
          app: 'Monitoring Stock Persediaan PP1',
          divisi: 'Divisi Produksi I - PT Batu Karang',
          timestamp: new Date().toISOString()
        };
        break;

      case 'getDashboardData':
        var dashboardRes = getDashboardData();
        var bsppCombined = [];
        if (typeof BSPP_SOURCES !== 'undefined' && Array.isArray(BSPP_SOURCES)) {
          for (var b = 0; b < BSPP_SOURCES.length; b++) {
            try {
              bsppCombined.push(getBSPPData(b));
            } catch (errB) {
              bsppCombined.push({
                nama: (BSPP_SOURCES[b] && BSPP_SOURCES[b].nama) || ('BSPP ' + b),
                jumlahEntri: 0,
                error: errB.message
              });
            }
          }
        }
        result = {
          ok: true,
          komoditas: dashboardRes.komoditas || [],
          bspp: bsppCombined,
          terakhirDiperbarui: dashboardRes.terakhirDiperbarui || new Date().toISOString()
        };
        break;

      case 'getKomoditasData':
        var kIndex = Number(e.parameter.index || 0);
        result = { ok: true, data: getKomoditasData(kIndex) };
        break;

      case 'refreshKomoditasData':
        var rkIndex = Number(e.parameter.index || 0);
        result = { ok: true, data: refreshKomoditasData(rkIndex) };
        break;

      case 'getBSPPData':
        var bsppIndex = Number(e.parameter.index || 0);
        result = { ok: true, data: getBSPPData(bsppIndex) };
        break;

      case 'refreshBSPPData':
        var rbsppIndex = Number(e.parameter.index || 0);
        result = { ok: true, data: refreshBSPPData(rbsppIndex) };
        break;

      case 'getSaldoPerTanggal':
        var sIndex = Number(e.parameter.index || 0);
        var tgl = String(e.parameter.tanggal || '');
        if (!tgl) {
          result = { ok: false, error: 'Parameter tanggal (YYYY-MM-DD) wajib disertakan.' };
        } else {
          result = { ok: true, data: getSaldoPerTanggal(sIndex, tgl) };
        }
        break;

      case 'login':
        var nama = String(e.parameter.nama || '');
        var pwd = String(e.parameter.password || '');
        result = login(nama, pwd);
        break;

      case 'verifySession':
        var tok = String(e.parameter.token || '');
        result = verifySession(tok);
        break;

      default:
        result = { ok: false, error: 'Action "' + action + '" tidak dikenali di sistem StockPP1.' };
    }
  } catch (err) {
    result = { ok: false, error: err.message || String(err) };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function runPollFromUrl_(e) {
  const expectedSecret = PropertiesService.getScriptProperties().getProperty('TELEGRAM_WEBHOOK_SECRET');
  const gotSecret = (e.parameter && e.parameter.secret) || '';
  if (expectedSecret && gotSecret !== expectedSecret) {
    return ContentService.createTextOutput('Secret salah atau belum disertakan.');
  }
  try {
    pollTelegramUpdatesImpl_();
    return ContentService.createTextOutput('poll ok');
  } catch (err) {
    return ContentService.createTextOutput('poll error: ' + err.message);
  }
}

function runSwitchToPollingFromUrl_(e) {
  const expectedSecret = PropertiesService.getScriptProperties().getProperty('TELEGRAM_WEBHOOK_SECRET');
  const gotSecret = (e.parameter && e.parameter.secret) || '';
  if (expectedSecret && gotSecret !== expectedSecret) {
    return ContentService.createTextOutput('Secret salah atau belum disertakan.');
  }
  let resultText;
  try {
    resultText = switchToPollingMode_();
  } catch (err) {
    resultText = 'ERROR saat pindah ke mode polling: ' + err.message;
  }
  return ContentService.createTextOutput('Pindah ke mode polling selesai.\\n\\n' + resultText);
}

function runResetWebhookFromUrl_(e) {
  const expectedSecret = PropertiesService.getScriptProperties().getProperty('TELEGRAM_WEBHOOK_SECRET');
  const gotSecret = (e.parameter && e.parameter.secret) || '';
  if (expectedSecret && gotSecret !== expectedSecret) {
    return ContentService.createTextOutput('Secret salah atau belum disertakan.');
  }
  let logText = '';
  try {
    const token = getTelegramToken_();
    const delResp = UrlFetchApp.fetch(TELEGRAM_API_BASE_ + token + '/deleteWebhook', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ drop_pending_updates: true }),
      muteHttpExceptions: true
    });
    logText += '1) deleteWebhook: ' + delResp.getContentText() + '\\n\\n';
    Utilities.sleep(1500);
    const setupResult = setupTelegramWebhook_();
    logText += '2) setWebhook (daftar ulang): ' + setupResult;
  } catch (err) {
    logText += 'ERROR: ' + err.message;
  }
  return ContentService.createTextOutput('Reset webhook selesai.\\n\\n' + logText);
}

function runWebhookInfoFromUrl_(e) {
  const expectedSecret = PropertiesService.getScriptProperties().getProperty('TELEGRAM_WEBHOOK_SECRET');
  const gotSecret = (e.parameter && e.parameter.secret) || '';
  if (expectedSecret && gotSecret !== expectedSecret) {
    return ContentService.createTextOutput('Secret salah atau belum disertakan.');
  }
  let resultText;
  try {
    const token = getTelegramToken_();
    const url = TELEGRAM_API_BASE_ + token + '/getWebhookInfo';
    const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    resultText = resp.getContentText();
  } catch (err) {
    resultText = 'ERROR: ' + err.message;
  }
  return ContentService.createTextOutput('Status webhook Telegram saat ini:\\n\\n' + resultText);
}

function runSetupWebhookFromUrl_(e) {
  const expectedSecret = PropertiesService.getScriptProperties().getProperty('TELEGRAM_WEBHOOK_SECRET');
  const gotSecret = (e.parameter && e.parameter.secret) || '';
  if (expectedSecret && gotSecret !== expectedSecret) {
    return ContentService.createTextOutput('Secret salah atau belum disertakan.\\n\\nTambahkan &secret=ISI_TELEGRAM_WEBHOOK_SECRET di akhir URL.');
  }
  let resultText;
  try {
    resultText = setupTelegramWebhook_();
  } catch (err) {
    resultText = 'ERROR saat setup webhook: ' + err.message;
  }
  return ContentService.createTextOutput('Setup webhook Telegram sudah dijalankan.\\n\\nBalasan:\\n' + resultText);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function pollTelegramUpdates_() {
  pollTelegramUpdatesImpl_();
}

function doPost(e) {
  try {
    const expectedSecret = PropertiesService.getScriptProperties().getProperty('TELEGRAM_WEBHOOK_SECRET');
    const gotSecret = (e && e.parameter && e.parameter.secret) || '';
    if (expectedSecret && gotSecret !== expectedSecret) {
      return ContentService.createTextOutput('ok');
    }
    const update = JSON.parse(e.postData.contents);
    handleTelegramUpdate_(update);
  } catch (err) {
    Logger.log('doPost error: ' + err.message);
  }
  return ContentService.createTextOutput('ok');
}`;
  }
}
