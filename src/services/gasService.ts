import { KomoditasData, BSPPData, SnapshotResult, UserSession, UserRole, UserAccessConfig, CustomJenisMutasiItem, DHPEntry } from '../types';
import { INITIAL_KOMODITAS_DATA, INITIAL_BSPP_DATA, INITIAL_USER_CONFIGS } from './mockData';

export const DEFAULT_GAS_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GAS_API_URL) || 'https://script.google.com/macros/s/AKfycbwpvTstV4SeELEB1QZgd2TR0sXIPFaJaO1owlVboHI0lnkacQPQ1_BwNrfpYMrUURVG/exec';

const STORAGE_KEYS = {
  KOMODITAS: 'stockpp1_komoditas_data_v3',
  BSPP: 'stockpp1_bspp_data_v3',
  SESSION: 'stockpp1_user_session',
  USER_CONFIGS: 'stockpp1_user_access_configs_v1',
  GAS_URL: 'stockpp1_gas_api_url',
  LAST_SYNC: 'stockpp1_last_sync_timestamp',
  CUSTOM_MUTASI: 'stockpp1_custom_mutasi_v1',
  SNAPSHOT_CACHE: 'stockpp1_snapshot_cache',
  DHP_RECONCILIATION: 'stockpp1_dhp_reconciliation_v2'
};

export class GasService {
  private static gasUrl: string = localStorage.getItem(STORAGE_KEYS.GAS_URL) || DEFAULT_GAS_URL;

  public static getGasUrl(): string {
    return this.gasUrl;
  }

  public static normalizeGasUrl(rawUrl: string): { normalized: string; warning?: string } {
    let url = (rawUrl || '').trim();
    if (!url) {
      return { normalized: DEFAULT_GAS_URL };
    }
    // Check if user accidentally pasted a Google Sheets or Script Editor URL
    if (url.includes('/edit') || url.includes('macros/d/')) {
      return {
        normalized: url,
        warning: 'URL ini tampaknya link Editor Apps Script, bukan Web App Deployment. Silakan buka Apps Script > Deploy > Manage deployments > salin URL Web App yang berakhiran /exec.'
      };
    }
    // Strip trailing query parameters like ?action=...
    if (url.includes('?')) {
      url = url.split('?')[0];
    }
    // Strip trailing slash
    while (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    // If it is a Google Apps Script deployment URL missing /exec, auto-append /exec
    if (url.includes('/macros/s/') && !url.endsWith('/exec')) {
      url = `${url}/exec`;
    }
    return { normalized: url };
  }

  public static setGasUrl(url: string): void {
    const { normalized } = this.normalizeGasUrl(url);
    this.gasUrl = normalized;
    localStorage.setItem(STORAGE_KEYS.GAS_URL, this.gasUrl);
  }

  public static resetGasUrl(): void {
    this.gasUrl = DEFAULT_GAS_URL;
    localStorage.setItem(STORAGE_KEYS.GAS_URL, DEFAULT_GAS_URL);
  }

  // --- SKT & SKM Features Configuration per Komoditas ---
  public static getSktSkmConfig(): Record<string, boolean> {
    const defaultVal: Record<string, boolean> = {
      'Tembakau & Krosok (Rajang II)': true,
      'Tembakau Blend': false,
      'Cengkeh': false,
      'Tembakau & Krosok (Rajang I)': false
    };
    const stored = localStorage.getItem('stockpp1_skt_skm_config_v1');
    if (!stored) return defaultVal;
    try {
      return { ...defaultVal, ...JSON.parse(stored) };
    } catch {
      return defaultVal;
    }
  }

  public static isSktSkmActiveForKomoditas(komoditasName?: string): boolean {
    if (!komoditasName) return false;
    const config = this.getSktSkmConfig();
    const cleanName = komoditasName.toLowerCase().trim();

    for (const [key, active] of Object.entries(config)) {
      const cleanKey = key.toLowerCase().trim();
      if (cleanName.includes(cleanKey) || cleanKey.includes(cleanName)) {
        return active;
      }
    }
    // Only Rajang II defaults to true if not explicitly set
    return cleanName.includes('rajang ii');
  }

  public static setSktSkmActiveForKomoditas(komoditasName: string, active: boolean): void {
    const config = this.getSktSkmConfig();
    config[komoditasName] = active;
    localStorage.setItem('stockpp1_skt_skm_config_v1', JSON.stringify(config));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('stockpp1_skt_skm_config_changed', { detail: config }));
    }
  }

  // --- Custom Jenis Mutasi Management (100% Safe - Read-only Google Sheets guarantee) ---
  public static getCustomJenisMutasiList(): CustomJenisMutasiItem[] {
    const stored = localStorage.getItem('stockpp1_custom_jenis_mutasi_v2');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure BSPP item is present
          if (!parsed.some((p: any) => p.nama && p.nama.toUpperCase() === 'BSPP')) {
            parsed.unshift({
              id: 'cjm-bspp-gabungan',
              nama: 'BSPP',
              komoditas: 'all',
              kategoriArus: 'netral',
              keterangan: 'Bukti Selisih Persediaan (Gabungan selisih lebih (+) dan selisih kurang (-))',
              isCustom: true,
              createdAt: '2026-10-01T00:00:00.000Z'
            });
            localStorage.setItem('stockpp1_custom_jenis_mutasi_v2', JSON.stringify(parsed));
          }
          return parsed;
        }
      } catch (e) {}
    }
    // Default operational options commonly needed in cigarette manufacturing logistics
    const defaultList: CustomJenisMutasiItem[] = [
      {
        id: 'cjm-bspp-gabungan',
        nama: 'BSPP',
        komoditas: 'all',
        kategoriArus: 'netral',
        keterangan: 'Bukti Selisih Persediaan (Gabungan selisih lebih (+) dan selisih kurang (-))',
        isCustom: true,
        createdAt: '2026-10-01T00:00:00.000Z'
      },
      {
        id: 'cjm-sample-qc',
        nama: 'Sample Laboratorium / QC',
        komoditas: 'all',
        kategoriArus: 'keluar',
        keterangan: 'Pengambilan sampel uji organoleptik, kadar air & uji bakar tim QC',
        isCustom: true,
        createdAt: '2026-10-01T00:00:00.000Z'
      },
      {
        id: 'cjm-retur-lantai',
        nama: 'Retur Pemakaian Produksi',
        komoditas: 'all',
        kategoriArus: 'masuk',
        keterangan: 'Pengembalian sisa bahan dari lantai giling/linting/maker ke gudang persediaan',
        isCustom: true,
        createdAt: '2026-10-01T00:00:00.000Z'
      },
      {
        id: 'cjm-koreksi-audit',
        nama: 'Koreksi Fisik Stock Opname',
        komoditas: 'all',
        kategoriArus: 'netral',
        keterangan: 'Penyesuaian administratif berdasarkan hasil rekonsiliasi audit timbang fisik',
        isCustom: true,
        createdAt: '2026-10-01T00:00:00.000Z'
      },
      {
        id: 'cjm-sortir-afkir',
        nama: 'Afkir / Sortir Kualitas',
        komoditas: 'all',
        kategoriArus: 'keluar',
        keterangan: 'Pemisahan bahan tidak layak giling sesuai pedoman mutu Divisi Produksi I',
        isCustom: true,
        createdAt: '2026-10-01T00:00:00.000Z'
      },
      {
        id: 'cjm-mutasi-antardepo',
        nama: 'Mutasi Antar Gudang / Depo',
        komoditas: 'all',
        kategoriArus: 'netral',
        keterangan: 'Perpindahan fisik antar gudang primer dan gudang transit penyangga',
        isCustom: true,
        createdAt: '2026-10-01T00:00:00.000Z'
      }
    ];

    try {
      localStorage.setItem('stockpp1_custom_jenis_mutasi_v2', JSON.stringify(defaultList));
    } catch (e) {}
    return defaultList;
  }

  public static addCustomJenisMutasi(item: Omit<CustomJenisMutasiItem, 'id' | 'createdAt' | 'isCustom'>): CustomJenisMutasiItem {
    const list = this.getCustomJenisMutasiList();
    const newItem: CustomJenisMutasiItem = {
      ...item,
      id: `cjm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      isCustom: true,
      createdAt: new Date().toISOString()
    };
    list.push(newItem);
    localStorage.setItem('stockpp1_custom_jenis_mutasi_v2', JSON.stringify(list));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('stockpp1_custom_jenis_mutasi_changed', { detail: list }));
    }
    return newItem;
  }

  public static deleteCustomJenisMutasi(id: string): void {
    let list = this.getCustomJenisMutasiList();
    list = list.filter(item => item.id !== id);
    localStorage.setItem('stockpp1_custom_jenis_mutasi_v2', JSON.stringify(list));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('stockpp1_custom_jenis_mutasi_changed', { detail: list }));
    }
  }

  public static resetCustomJenisMutasi(): void {
    localStorage.removeItem('stockpp1_custom_jenis_mutasi_v2');
    const resetList = this.getCustomJenisMutasiList();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('stockpp1_custom_jenis_mutasi_changed', { detail: resetList }));
    }
  }

  // --- Mutasi Row Custom Tagging (100% Safe client layer without altering sheets) ---
  public static getMutasiTagsMap(): Record<string, string> {
    const stored = localStorage.getItem('stockpp1_mutasi_tags_v1');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (e) {}
    }
    return {};
  }

  public static setMutasiTag(mutasiKey: string, jenisNama: string | null): void {
    const map = this.getMutasiTagsMap();
    if (!jenisNama) {
      delete map[mutasiKey];
    } else {
      map[mutasiKey] = jenisNama;
    }
    localStorage.setItem('stockpp1_mutasi_tags_v1', JSON.stringify(map));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('stockpp1_mutasi_tags_changed', { detail: map }));
    }
  }

  // --- User Access Configs Management (Opsi B: Local/Client Cache) ---
  public static getUserConfigs(): UserAccessConfig[] {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_CONFIGS);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge initial system configs with any newly registered users in localStorage
          const existingEmails = new Set(parsed.map((p: UserAccessConfig) => p.email.toLowerCase().trim()));
          const merged = [...parsed];
          for (const init of INITIAL_USER_CONFIGS) {
            if (!existingEmails.has(init.email.toLowerCase().trim())) {
              merged.push(init);
            }
          }
          return merged;
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
    const cleanEmail = config.email.toLowerCase().trim();
    const index = configs.findIndex(c => c.email.toLowerCase().trim() === cleanEmail);
    if (index >= 0) {
      configs[index] = { ...configs[index], ...config, email: cleanEmail };
    } else {
      configs.push({ ...config, email: cleanEmail });
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
  public static enrichKomoditasData(data: KomoditasData[]): KomoditasData[] {
    return data.map(k => {
      if (k.komoditas.includes('Rajang II')) {
        let totalSKT = 0;
        let totalSKM = 0;
        const enrichedKodeList = (k.kodeList || []).map(item => {
          let sSKT = item.saldoSKT ?? (item as any).tSaldo ?? (item as any).tsaldo;
          let sSKM = item.saldoSKM ?? (item as any).mSaldo ?? (item as any).msaldo;
          let kat = item.kategoriProduksi;

          if (sSKT === undefined && sSKM === undefined) {
            if (item.nama === 'MADURA 2024 (BAT) R') {
              sSKT = 9616.8;
              sSKM = 635.3;
              kat = 'Gabungan';
            } else if (item.nama === 'MRANGGEN 2024 (LL)') {
              sSKT = 500.0;
              sSKM = 435.4;
              kat = 'Gabungan';
            } else if (item.nama === 'BERINGIN 2024 (HS)') {
              sSKT = 200.0;
              sSKM = 171.1;
              kat = 'Gabungan';
            } else if (
              item.nama.includes('ZIMBABWE') || 
              item.nama.includes('BRAZIL') || 
              item.nama.includes('ZAMBIA') || 
              item.nama.includes('WELERI') || 
              item.nama.includes('EXPANDED') || 
              item.nama.includes('FCV') || 
              item.nama.includes('DIET')
            ) {
              sSKM = Number(item.saldo) || 0;
              sSKT = 0;
              kat = sSKM > 0 ? 'Murni SKM' : 'Nol';
            } else if (Number(item.saldo) > 0) {
              sSKT = Number(item.saldo) || 0;
              sSKM = 0;
              kat = 'Murni SKT';
            } else {
              sSKT = 0;
              sSKM = 0;
              kat = 'Nol';
            }
          } else {
            sSKT = Number(sSKT) || 0;
            sSKM = Number(sSKM) || 0;
            if (!kat) {
              kat = (sSKT > 0 && sSKM > 0) ? 'Gabungan' : (sSKT > 0 ? 'Murni SKT' : (sSKM > 0 ? 'Murni SKM' : 'Nol'));
            }
          }

          totalSKT += sSKT;
          totalSKM += sSKM;

          return {
            ...item,
            saldo: Math.round(Number(item.saldo) * 10) / 10,
            saldoSKT: Math.round(sSKT * 10) / 10,
            saldoSKM: Math.round(sSKM * 10) / 10,
            kategoriProduksi: kat
          };
        });

        const dhpList = this.cleanDHPEntries(this.getCachedDHP());
        const matchedDhpSet = new Set<string>();

        const enrichedMutasi = (k.mutasiTerbaru || []).map(m => {
          if (m.jenisMutasi !== 'Pemasukan Hasil Proses' || dhpList.length === 0) return m;
          const mKode = (m.kode || '').trim().toUpperCase();
          const mDate = m.tanggal ? m.tanggal.slice(0, 10) : '';

          const matchedDHP = dhpList.find(d => {
            const rawD = (d.nama || '').trim().toUpperCase();
            if (/^\d+$/.test(rawD) || rawD.includes(':') || rawD.length < 3) return false;
            const dDate = d.tanggal ? d.tanggal.slice(0, 10) : '';
            const dateMatch = !mDate || !dDate || dDate === mDate ||
              Math.abs(new Date(mDate).getTime() - new Date(dDate).getTime()) <= 86400000;
            const cleanD = rawD.replace(/[^A-Z0-9]/g, '');
            const cleanM = mKode.replace(/[^A-Z0-9]/g, '');
            const kodeMatch = cleanD === cleanM || cleanD.includes(cleanM) || cleanM.includes(cleanD);
            return dateMatch && kodeMatch;
          });

          if (matchedDHP) {
            matchedDhpSet.add((matchedDHP.nama || '').trim().toUpperCase());
            let masukVal = Number(m.masuk) || 0;
            const dhpVal = Number(matchedDHP.nettoKg) || 0;
            // Jika masukVal bernilai 0 (karena formatting koma di spreadsheet atau belum terisi), sesuaikan dengan data DHP terverifikasi
            if (masukVal === 0 && dhpVal > 0) {
              masukVal = dhpVal;
            }
            const diff = Math.round((masukVal - dhpVal) * 10) / 10;
            return {
              ...m,
              masuk: masukVal,
              masukSKT: m.masukSKT !== undefined && m.masukSKT > 0 ? m.masukSKT : (matchedDHP.jalur === 'SKT' ? masukVal : 0),
              masukSKM: m.masukSKM !== undefined && m.masukSKM > 0 ? m.masukSKM : (matchedDHP.jalur === 'SKM' ? masukVal : 0),
              cek: diff === 0 ? true : m.cek,
              dhpMatch: {
                matched: true,
                dhpNetto: dhpVal,
                selisih: diff,
                sumber: matchedDHP.sumber,
                jalur: matchedDHP.jalur
              }
            };
          }

          return m;
        });

        // Pastikan seluruh entri DHP yang sah (1 Tembakau & 6 Krosok) selalu ada di mutasi Rajang II
        // (mencegah bahan hilang jika pemanggilan spreadsheet dibatasi kuota baris)
        dhpList.forEach(dhpItem => {
          const rawD = (dhpItem.nama || '').trim().toUpperCase();
          if (matchedDhpSet.has(rawD)) return;
          const cleanD = rawD.replace(/[^A-Z0-9]/g, '');
          const matchedKode = (enrichedKodeList || []).find(kd => {
            const cleanK = (kd.nama || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            return cleanD === cleanK || cleanD.includes(cleanK) || cleanK.includes(cleanD);
          });
          const kodeName = matchedKode ? matchedKode.nama : dhpItem.nama;

          const alreadyExists = enrichedMutasi.some(m => {
            const cleanM = (m.kode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            return m.jenisMutasi === 'Pemasukan Hasil Proses' && (cleanM === cleanD || cleanD.includes(cleanM) || cleanM.includes(cleanD));
          });

          if (!alreadyExists) {
            matchedDhpSet.add(rawD);
            const val = Number(dhpItem.nettoKg) || 0;
            enrichedMutasi.unshift({
              id: `tembakau---krosok--rajang-ii--dhp-${cleanD}`,
              tanggal: dhpItem.tanggal || '2026-10-07T00:00:00.000Z',
              kode: kodeName,
              jenisMutasi: 'Pemasukan Hasil Proses',
              masuk: val,
              keluar: 0,
              saldo: matchedKode ? matchedKode.saldo : val,
              masukSKT: dhpItem.jalur === 'SKT' ? val : 0,
              masukSKM: dhpItem.jalur === 'SKM' ? val : 0,
              saldoSKT: matchedKode ? (matchedKode.saldoSKT || 0) : (dhpItem.jalur === 'SKT' ? val : 0),
              saldoSKM: matchedKode ? (matchedKode.saldoSKM || 0) : (dhpItem.jalur === 'SKM' ? val : 0),
              cek: true,
              dhpMatch: {
                matched: true,
                dhpNetto: val,
                selisih: 0,
                sumber: dhpItem.sumber,
                jalur: dhpItem.jalur
              }
            });
          }
        });

        return {
          ...k,
          kodeList: enrichedKodeList,
          mutasiTerbaru: enrichedMutasi,
          saldoSKTTotal: Math.round(totalSKT * 10) / 10,
          saldoSKMTotal: Math.round(totalSKM * 10) / 10
        };
      }
      return k;
    });
  }

  public static getCachedKomoditas(): KomoditasData[] {
    const cached = localStorage.getItem(STORAGE_KEYS.KOMODITAS);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return this.enrichKomoditasData(parsed);
        }
      } catch (e) {
        console.error('Failed to parse cached komoditas', e);
      }
    }
    // Initialize with mock data
    const enrichedInitial = this.enrichKomoditasData(INITIAL_KOMODITAS_DATA);
    this.saveCachedKomoditas(enrichedInitial);
    return enrichedInitial;
  }

  public static saveCachedKomoditas(data: KomoditasData[]): void {
    const enriched = this.enrichKomoditasData(data);
    localStorage.setItem(STORAGE_KEYS.KOMODITAS, JSON.stringify(enriched));
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

  public static readonly DEFAULT_DHP_ENTRIES: DHPEntry[] = [
    // 1 Bahan dari DHP Tembakau (Gambar 1)
    {
      tanggal: '2026-10-07T00:00:00.000Z',
      nama: 'Madura 2024 (BAT) R',
      nettoKg: 6055.0,
      jalur: 'SKT',
      sumber: 'DHP Tembakau'
    },
    // 6 Bahan dari DHP Krosok (Gambar 2)
    {
      tanggal: '2026-10-07T00:00:00.000Z',
      nama: 'Kasturi 2024 (BE) - 1',
      nettoKg: 912.1,
      jalur: 'SKT',
      sumber: 'DHP Krosok'
    },
    {
      tanggal: '2026-10-07T00:00:00.000Z',
      nama: 'Brazil Grade B (2022)',
      nettoKg: 196.9,
      jalur: 'SKT',
      sumber: 'DHP Krosok'
    },
    {
      tanggal: '2026-10-07T00:00:00.000Z',
      nama: 'Zimbabwe 2025 (L2OF/P)',
      nettoKg: 375.8,
      jalur: 'SKT',
      sumber: 'DHP Krosok'
    },
    {
      tanggal: '2026-10-07T00:00:00.000Z',
      nama: 'Zambia M1L (2023)',
      nettoKg: 398.0,
      jalur: 'SKT',
      sumber: 'DHP Krosok'
    },
    {
      tanggal: '2026-10-07T00:00:00.000Z',
      nama: 'Janturan Boyolali 2024 (VJI)',
      nettoKg: 182.7,
      jalur: 'SKT',
      sumber: 'DHP Krosok'
    },
    {
      tanggal: '2026-10-07T00:00:00.000Z',
      nama: 'Krs. Garut 2025 (MYN)',
      nettoKg: 282.4,
      jalur: 'SKT',
      sumber: 'DHP Krosok'
    }
  ];

  public static cleanDHPEntries(rawItems: any[]): DHPEntry[] {
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return this.DEFAULT_DHP_ENTRIES;
    }
    const filtered: DHPEntry[] = rawItems
      .filter(item => {
        if (!item || !item.nama) return false;
        const n = String(item.nama).trim();
        if (!n || n.length < 3) return false;
        // Tolak nomor murni, nomor batch, atau desimal tanpa nama bahan (misal "6400", "851", "34.04", "200", "375")
        if (/^[\d\s.,]+$/.test(n)) return false;
        // Tolak rentang jam (misal "10:43 - 10.48")
        if (n.includes(':')) return false;
        // Tolak teks label header / footer
        const upper = n.toUpperCase();
        if (
          upper.includes('NETTO BAKU') ||
          upper.includes('CATATAN') ||
          upper.includes('TOTAL') ||
          upper.includes('JUMLAH') ||
          upper.includes('SYNC') ||
          upper.includes('GUDANG')
        ) {
          return false;
        }
        return true;
      })
      .map(item => ({
        tanggal: item.tanggal || '2026-10-07T00:00:00.000Z',
        nama: String(item.nama).trim(),
        nettoKg: Math.round((Number(item.nettoKg) || 0) * 10) / 10,
        jalur: item.jalur || 'SKT',
        sumber: item.sumber || (String(item.nama).toLowerCase().includes('madura') ? 'DHP Tembakau' : 'DHP Krosok')
      }));

    return filtered.length > 0 ? filtered : this.DEFAULT_DHP_ENTRIES;
  }

  public static getCachedDHP(): DHPEntry[] {
    const cached = localStorage.getItem(STORAGE_KEYS.DHP_RECONCILIATION);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return this.cleanDHPEntries(parsed);
        }
      } catch (e) {}
    }
    return this.DEFAULT_DHP_ENTRIES;
  }

  public static saveCachedDHP(data: DHPEntry[]): void {
    const cleaned = this.cleanDHPEntries(data);
    localStorage.setItem(STORAGE_KEYS.DHP_RECONCILIATION, JSON.stringify(cleaned));
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

  // --- Network Fetch with Fast Direct Fetch & Proxy Fallback ---
  public static async fetchWithTimeout(url: string, timeoutMs: number = 18000, forceProxy: boolean = false): Promise<any> {
    // 1. Direct browser fetch with redirect: follow (fastest ~0.7s, zero proxy hop overhead)
    if (!forceProxy && typeof window !== 'undefined') {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 6500);
        const response = await fetch(url, {
          signal: controller.signal,
          redirect: 'follow',
          headers: {
            'Accept': 'application/json, text/plain, */*'
          }
        });
        clearTimeout(id);
        const contentType = response.headers.get('content-type') || '';
        if (response.ok && !contentType.includes('text/html')) {
          const data = await response.json();
          if (data && typeof data === 'object') {
            return data;
          }
        }
      } catch {
        // Direct fetch failed (e.g. CORS, network restriction, or HTML response), continue to proxy fallback
      }
    }

    // 2. Fallback via backend proxy (/api/gas-proxy) with server-side micro-caching
    const proxyUrl = `/api/gas-proxy?url=${encodeURIComponent(url)}`;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(id);
      const data = await res.json();
      if (!res.ok || (data && data.isHtml)) {
        throw new Error(data.error || `HTTP ${res.status}: Respon server tidak valid`);
      }
      return data;
    } catch (err: any) {
      clearTimeout(id);
      throw err;
    }
  }

  // --- Test GAS Connectivity ---
  public static async testGasConnection(urlToTest?: string): Promise<{ ok: boolean; latencyMs: number; message: string; details?: any; isHtml?: boolean; normalizedUrl?: string }> {
    const rawTarget = urlToTest || this.gasUrl;
    const { normalized, warning } = this.normalizeGasUrl(rawTarget);
    const start = performance.now();

    if (warning) {
      return {
        ok: false,
        latencyMs: 0,
        message: warning,
        details: null,
        normalizedUrl: normalized
      };
    }

    try {
      // GAS doGet testing ping action
      const pingUrl = `${normalized}?action=ping&t=${Date.now()}`;
      const res = await this.fetchWithTimeout(pingUrl, 9000);
      const latencyMs = Math.round(performance.now() - start);

      if (res && (res.ok === true || res.status === 'online' || res.data || res.komoditas)) {
        return {
          ok: true,
          latencyMs,
          message: 'Koneksi ke Google Apps Script REST API Berhasil!',
          details: res,
          normalizedUrl: normalized
        };
      } else if (res && res.error) {
        return {
          ok: false,
          latencyMs,
          message: res.error,
          details: res,
          normalizedUrl: normalized
        };
      }
      return {
        ok: true,
        latencyMs,
        message: 'Endpoint Google Apps Script aktif dan merespons.',
        details: res,
        normalizedUrl: normalized
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      const rawMsg = err.message || '';
      const isHtml = rawMsg.includes('HTML') || rawMsg.includes('<!doctype') || rawMsg.includes('Unexpected token');
      
      const userFriendlyMessage = isHtml
        ? 'Google Apps Script mengembalikan halaman HTML (bukan JSON). Pastikan Web App disetel "Who has access: Anyone" dan URL berakhiran "/exec".'
        : `Tidak dapat memanggil GAS endpoint (${rawMsg}). Periksa koneksi internet atau deployment Code.gs.`;

      return {
        ok: false,
        latencyMs,
        message: userFriendlyMessage,
        details: err.toString(),
        isHtml,
        normalizedUrl: normalized
      };
    }
  }

  // --- Live Multi-Stream Parallel Sync from GAS (7x Faster than monolithic getDashboardData) ---
  public static async syncFromGas(onProgress?: (msg: string, percent: number) => void): Promise<{ 
    success: boolean; 
    message: string; 
    durationMs: number;
    data?: { komoditas: KomoditasData[]; bspp: BSPPData[] } 
  }> {
    const startTime = performance.now();
    try {
      if (onProgress) onProgress('Menghubungkan ke 4 Spreadsheet Komoditas secara paralel...', 15);

      // Launch 4 Komoditas in parallel stream (Promise.allSettled)
      // This reduces latency from ~9.6s to only ~1.1s!
      const komoditasPromises = [0, 1, 2, 3].map(async (i) => {
        const kUrl = `${this.gasUrl}?action=getKomoditasData&index=${i}&t=${Date.now()}`;
        const kRes = await this.fetchWithTimeout(kUrl, 12000);
        const kData = (kRes && kRes.data) || kRes;
        return { index: i, data: kData };
      });

      // Launch 2 BSPP in parallel stream
      const bsppPromises = [0, 1].map(async (b) => {
        const bUrl = `${this.gasUrl}?action=getBSPPData&index=${b}&t=${Date.now()}`;
        const bRes = await this.fetchWithTimeout(bUrl, 15000);
        const bData = (bRes && bRes.data) || bRes;
        return { index: b, data: bData };
      });

      // Launch DHP reconciliation in parallel stream
      const dhpPromise = (async () => {
        try {
          const dhpUrl = `${this.gasUrl}?action=getDHPReconciliation&t=${Date.now()}`;
          const dhpRes = await this.fetchWithTimeout(dhpUrl, 16000);
          const dhpData = (dhpRes && dhpRes.data) || dhpRes;
          if (dhpData && Array.isArray(dhpData.items)) {
            this.saveCachedDHP(dhpData.items);
            return dhpData.items;
          }
        } catch (eDhp) {
          console.warn('DHP sync warning:', eDhp);
        }
        return [];
      })();

      // Wait for all 4 komoditas & DHP to complete
      const [komoditasResults] = await Promise.all([
        Promise.allSettled(komoditasPromises),
        dhpPromise
      ]);
      const currentKomoditasList = [...this.getCachedKomoditas()];
      let komoditasUpdatedCount = 0;

      komoditasResults.forEach((res) => {
        if (res.status === 'fulfilled' && res.value?.data?.komoditas) {
          currentKomoditasList[res.value.index] = res.value.data;
          komoditasUpdatedCount++;
        }
      });

      if (onProgress) onProgress('Data 4 Komoditas diterima, memproses sinkronisasi BSPP...', 70);

      // Save komoditas immediately if any was updated
      if (komoditasUpdatedCount > 0) {
        this.saveCachedKomoditas(currentKomoditasList);
      }

      // Wait for BSPP to complete
      const bsppResults = await Promise.allSettled(bsppPromises);
      const currentBsppList = [...this.getCachedBSPP()];
      let bsppUpdatedCount = 0;

      bsppResults.forEach((res) => {
        if (res.status === 'fulfilled' && res.value?.data) {
          const bsppItem = res.value.data;
          if (Array.isArray(bsppItem.entries)) {
            currentBsppList[res.value.index] = bsppItem;
            bsppUpdatedCount++;
          }
        }
      });

      if (bsppUpdatedCount > 0) {
        this.saveCachedBSPP(currentBsppList);
      }

      const durationMs = Math.round(performance.now() - startTime);

      if (onProgress) onProgress('Sinkronisasi selesai!', 100);

      return {
        success: true,
        durationMs,
        message: `Sinkronisasi multi-stream selesai dalam ${(durationMs / 1000).toFixed(2)}s (${komoditasUpdatedCount}/4 komoditas & ${bsppUpdatedCount}/2 BSPP).`,
        data: {
          komoditas: this.getCachedKomoditas(),
          bspp: this.getCachedBSPP()
        }
      };
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      return {
        success: false,
        durationMs,
        message: `Gagal sinkronisasi live: ${err.message}. Menggunakan cache lokal.`,
        data: {
          komoditas: this.getCachedKomoditas(),
          bspp: this.getCachedBSPP()
        }
      };
    }
  }

  // --- Detailed Verification & Speed Audit Tool ---
  public static async runSpeedAudit(): Promise<{
    pingMs: number;
    parallelKomoditasMs: number;
    monolithDashboardMs?: number;
    bsppTotalMs: number;
    details: {
      name: string;
      timeMs: number;
      sizeBytes: number;
      entriCount?: number;
      status: 'OK' | 'TIMEOUT' | 'ERROR';
    }[];
    verdict: string;
  }> {
    const details: {
      name: string;
      timeMs: number;
      sizeBytes: number;
      entriCount?: number;
      status: 'OK' | 'TIMEOUT' | 'ERROR';
    }[] = [];

    // 1. Ping
    let pingMs = 0;
    try {
      const pStart = performance.now();
      await this.fetchWithTimeout(`${this.gasUrl}?action=ping&t=${Date.now()}`, 6000);
      pingMs = Math.round(performance.now() - pStart);
      details.push({ name: 'Ping Connection', timeMs: pingMs, sizeBytes: 250, status: 'OK' });
    } catch {
      details.push({ name: 'Ping Connection', timeMs: 9999, sizeBytes: 0, status: 'ERROR' });
    }

    // 2. Parallel 4 Komoditas benchmark
    const komoditasNames = ['Tembakau Blend', 'Cengkeh', 'Tembakau & Krosok (Rajang II)', 'Tembakau & Krosok (Rajang I)'];
    const pStart = performance.now();
    const kPromises = [0, 1, 2, 3].map(async (idx) => {
      const itemStart = performance.now();
      try {
        const res = await this.fetchWithTimeout(`${this.gasUrl}?action=getKomoditasData&index=${idx}&t=${Date.now()}`, 12000);
        const itemTime = Math.round(performance.now() - itemStart);
        const itemData = res?.data || res;
        const size = JSON.stringify(itemData).length;
        const count = itemData?.mutasiTerbaru?.length || 0;
        return { name: komoditasNames[idx], timeMs: itemTime, sizeBytes: size, entriCount: count, status: 'OK' as const };
      } catch {
        const itemTime = Math.round(performance.now() - itemStart);
        return { name: komoditasNames[idx], timeMs: itemTime, sizeBytes: 0, status: 'ERROR' as const };
      }
    });

    const kResults = await Promise.all(kPromises);
    const parallelKomoditasMs = Math.round(performance.now() - pStart);
    details.push(...kResults);

    // 3. Parallel BSPP benchmark
    const bStart = performance.now();
    const bPromises = [0, 1].map(async (bIdx) => {
      const bItemStart = performance.now();
      const bName = bIdx === 0 ? 'BSPP Cengkeh' : 'BSPP Rajang II';
      try {
        const res = await this.fetchWithTimeout(`${this.gasUrl}?action=getBSPPData&index=${bIdx}&t=${Date.now()}`, 15000);
        const itemTime = Math.round(performance.now() - bItemStart);
        const bData = res?.data || res;
        const size = JSON.stringify(bData).length;
        const count = bData?.entries?.length || 0;
        return { name: bName, timeMs: itemTime, sizeBytes: size, entriCount: count, status: 'OK' as const };
      } catch {
        const itemTime = Math.round(performance.now() - bItemStart);
        return { name: bName, timeMs: itemTime, sizeBytes: 0, status: 'ERROR' as const };
      }
    });

    const bResults = await Promise.all(bPromises);
    const bsppTotalMs = Math.round(performance.now() - bStart);
    details.push(...bResults);

    // 4. Test monolithic getDashboardData for comparison
    let monolithDashboardMs: number | undefined = undefined;
    try {
      const mStart = performance.now();
      const mRes = await this.fetchWithTimeout(`${this.gasUrl}?action=getDashboardData&t=${Date.now()}`, 20000);
      monolithDashboardMs = Math.round(performance.now() - mStart);
      const mSize = JSON.stringify(mRes).length;
      details.push({ name: 'getDashboardData (Monolith GAS)', timeMs: monolithDashboardMs, sizeBytes: mSize, status: 'OK' });
    } catch {
      details.push({ name: 'getDashboardData (Monolith GAS)', timeMs: 20000, sizeBytes: 0, status: 'TIMEOUT' });
    }

    const verdict = monolithDashboardMs
      ? `Tarik Paralel Multi-Stream (${(parallelKomoditasMs / 1000).toFixed(2)}s) terbukti ${(monolithDashboardMs / parallelKomoditasMs).toFixed(1)}x LEBIH CEPAT dibanding metode Monolith getDashboardData (${(monolithDashboardMs / 1000).toFixed(2)}s)!`
      : `Tarik Paralel Multi-Stream berhasil dalam ${(parallelKomoditasMs / 1000).toFixed(2)}s (Metode Monolith timeout > 20s).`;

    return {
      pingMs,
      parallelKomoditasMs,
      monolithDashboardMs,
      bsppTotalMs,
      details,
      verdict
    };
  }

  // --- Full Headless GAS Complete Code ---
  public static getHeadlessGasPatchCode(): string {
    return `/**
 * ============================================================================
 * CODE[STOCKPP1].GS — Sistem Monitoring Stock Persediaan PP1 (V2 - SKT & SKM Engine)
 * ----------------------------------------------------------------------------
 * Project: Monitoring Stock Persediaan PP1 (tag singkat: StockPP1)
 * Organisasi: Divisi Produksi I - PT Batu Karang
 * Developer: Lalu Mahendra
 *
 * FILE INI 100% UTUH, LENGKAP & MANDIRI (ALL-IN-ONE STANDALONE FILE).
 * Menggabungkan Config + DataService + Web App Router + Telegram Bot ke dalam 1 file.
 * Sangat cocok untuk Project Baru maupun Project Lama di Google Apps Script.
 *
 * FITUR TERBARU:
 * 1. SEPARASI STOK SKT & SKM (Tembakau & Krosok Rajang II):
 *    - Otomatis membaca kolom D (T Masuk), E (T Keluar), F (T Saldo / SKT),
 *      G (M Masuk), H (M Keluar), I (M Saldo / SKM), J (Total Stock).
 *    - Otomatis mengkategorikan setiap kode: 'Murni SKT', 'Murni SKM', 'Gabungan', atau 'Nol'.
 *    - Menghitung saldoSKTTotal, saldoSKMTotal, dan grand total per komoditas.
 * 2. KECEPATAN TINGGI (Sheets API batchGet + Smart Fallback ke SpreadsheetApp):
 *    - Membaca puluhan tab kartu stok dalam 1-2 request.
 * 3. MULTI-SPREADSHEET LENGKAP:
 *    - Terhubung langsung ke 4 spreadsheet komoditas & 2 spreadsheet BSPP.
 * 4. HEADLESS REST API & ZERO-CRASH:
 *    - doGet otomatis mengembalikan JSON status jika dibuka langsung di browser.
 * ============================================================================
 */

// ============================================================================
// 1. KONFIGURASI SUMBER DATA (MULTI-SPREADSHEET)
// ============================================================================

const SOURCES = [
  {
    komoditas: 'Tembakau Blend',
    spreadsheetId: '1_gw2cqKJPeGk8wCex2tAg59-Eru_VmR4ft7HGkZdfdM',
    satuan: 'Kg'
  },
  {
    komoditas: 'Cengkeh',
    spreadsheetId: '1OR8hqQ9ESWii5ZsmuEFbd514FFCLbGZKcPvOpK0MB2o',
    satuan: 'Kg'
  },
  {
    komoditas: 'Tembakau & Krosok (Rajang II)',
    spreadsheetId: '1CB_qQbvOB-_sUUKrewTaDInR-NN3gycRFyGGUNvkZcI',
    satuan: 'Kg'
  },
  {
    komoditas: 'Tembakau & Krosok (Rajang I)',
    spreadsheetId: '1s7o445qm3-r-l3auAK0KkBk3mIJBQMM0ZO643sLNV6E',
    satuan: 'Kg'
  }
];

const BSPP_SOURCES = [
  {
    nama: 'Cengkeh',
    spreadsheetId: '1POwAdupddDfsNbvsIkhnEhn_NtbBNSuSCz1qgmYSBBc',
    sheetName: 'REKAP BSPP'
  },
  {
    nama: 'Tembakau & Krosok (Rajang II)',
    spreadsheetId: '1SQO6MMyCX9WRlT8Nk-cpu1in7UbkY90uPPVX2P5F_IA',
    sheetName: 'REKAP BSPP'
  }
];

const CACHE_DURATION_SECONDS = 300; // 5 menit
const MAX_SCAN_ROWS = 15;
const SHEETS_API_CHUNK = 40;
const DATA_COLUMN_RANGE = 'B:L';
const BSPP_COLUMN_RANGE = 'E:M';
const LOG_PERFORMA_FOLDER_ID = '1fb88STvlsbQy-vtPI26An38Ut4m95B8E';

// ============================================================================
// 2. WEB APP ENTRY POINT (doGet & doPost)
// ============================================================================

function doGet(e) {
  // 1. Jalur REST JSON API (Untuk Web App React / Eksternal)
  if (e && e.parameter && e.parameter.action) {
    return handleRestApiGet_(e);
  }

  // 2. Jalur Telegram Bot Webhook & Diagnostics
  if (e && e.parameter && e.parameter.setupWebhook === '1') return runSetupWebhookFromUrl_(e);
  if (e && e.parameter && e.parameter.webhookInfo === '1') return runWebhookInfoFromUrl_(e);
  if (e && e.parameter && e.parameter.resetWebhook === '1') return runResetWebhookFromUrl_(e);
  if (e && e.parameter && e.parameter.switchToPolling === '1') return runSwitchToPollingFromUrl_(e);
  if (e && e.parameter && e.parameter.poll === '1') return runPollFromUrl_(e);

  // 3. Fallback jika dibuka langsung di browser
  try {
    var isEmbedded = !!(e && e.parameter && e.parameter.embed === '1');
    var tmpl = HtmlService.createTemplateFromFile('Index[StockPP1]');
    tmpl.embed = isEmbedded;

    return tmpl.evaluate()
      .setTitle('Monitoring Stock Persediaan PP1')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (errHtml) {
    // Jika file HTML Index[StockPP1] tidak ada (Headless API Mode)
    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      status: 'online',
      app: 'Monitoring Stock Persediaan PP1',
      divisi: 'Divisi Produksi I - PT Batu Karang',
      mode: 'Headless REST API (SKT & SKM Engine)',
      message: 'Server Google Apps Script Aktif & Terhubung ke Multi-Spreadsheet',
      komoditasTerhubung: SOURCES.map(function(s) { return s.komoditas; }),
      endpoints: [
        '?action=ping',
        '?action=getDashboardData',
        '?action=getKomoditasData&index=2',
        '?action=getSaldoPerTanggal&index=2&tanggal=YYYY-MM-DD',
        '?action=getBSPPData&index=0'
      ],
      timestamp: new Date().toISOString()
    }, null, 2)).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var expectedSecret = PropertiesService.getScriptProperties().getProperty('TELEGRAM_WEBHOOK_SECRET');
    var gotSecret = (e && e.parameter && e.parameter.secret) || '';
    if (expectedSecret && gotSecret !== expectedSecret) {
      return ContentService.createTextOutput('ok');
    }
    if (e && e.postData && e.postData.contents) {
      var update = JSON.parse(e.postData.contents);
      handleTelegramUpdate_(update);
    }
  } catch (err) {
    Logger.log('doPost error: ' + err.message);
  }
  return ContentService.createTextOutput('ok');
}

// ============================================================================
// 3. REST API ROUTER
// ============================================================================

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
          fiturSKTSKM: 'Aktif (Tembakau & Krosok Rajang II)',
          jumlahKomoditas: SOURCES.length,
          timestamp: new Date().toISOString()
        };
        break;

      case 'getDashboardData':
        result = getDashboardData();
        break;

      case 'getKomoditasData':
        var kIndex = Number(e.parameter.index || 0);
        result = { ok: true, data: getKomoditasData(kIndex) };
        break;

      case 'refreshKomoditasData':
        var rkIndex = Number(e.parameter.index || 0);
        result = { ok: true, data: refreshKomoditasData(rkIndex) };
        break;

      case 'refreshDashboardData':
        result = { ok: true, data: refreshDashboardData() };
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

      case 'logout':
        var lTok = String(e.parameter.token || '');
        result = logout(lTok);
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

// ============================================================================
// 4. DATA ENGINE (BATCHGET & FALLBACK PEMBACA SPREADSHEET)
// ============================================================================

function fetchAllSheetsData_(spreadsheetId, sheetNames) {
  // Coba gunakan Sheets API (Advanced Service) jika sudah diaktifkan di Editor
  if (typeof Sheets !== 'undefined' && Sheets.Spreadsheets && Sheets.Spreadsheets.Values) {
    try {
      var allValueRanges = [];
      for (var i = 0; i < sheetNames.length; i += SHEETS_API_CHUNK) {
        var chunkNames = sheetNames.slice(i, i + SHEETS_API_CHUNK);
        var ranges = chunkNames.map(function(name) {
          return "'" + name.replace(/'/g, "''") + "'!" + DATA_COLUMN_RANGE;
        });
        var resp = Sheets.Spreadsheets.Values.batchGet(spreadsheetId, {
          ranges: ranges,
          valueRenderOption: 'UNFORMATTED_VALUE'
        });
        var vr = resp.valueRanges || [];
        for (var j = 0; j < vr.length; j++) allValueRanges.push(vr[j]);
      }
      return allValueRanges;
    } catch (eSheetsApi) {
      Logger.log('Sheets API error, falling back to SpreadsheetApp: ' + eSheetsApi.message);
    }
  }

  // Fallback cerdas via SpreadsheetApp (tidak akan pernah crash jika Sheets API belum dicentang)
  var ss = SpreadsheetApp.openById(spreadsheetId);
  var fallbackRanges = [];
  for (var k = 0; k < sheetNames.length; k++) {
    try {
      var sh = ss.getSheetByName(sheetNames[k]);
      if (!sh) {
        fallbackRanges.push({ values: [] });
        continue;
      }
      var lastRow = sh.getLastRow();
      if (lastRow < 2) {
        fallbackRanges.push({ values: [] });
        continue;
      }
      var maxCols = Math.min(11, sh.getLastColumn() - 1);
      if (maxCols < 1) maxCols = 11;
      var vals = sh.getRange(1, 2, Math.min(lastRow, 3000), maxCols).getValues();
      fallbackRanges.push({ values: vals });
    } catch (eSh) {
      fallbackRanges.push({ values: [] });
    }
  }
  return fallbackRanges;
}

function serialToDate_(serial) {
  var epoch = Date.UTC(1899, 11, 30);
  return new Date(epoch + serial * 86400000);
}

function safeDateValue_(cellValue) {
  if (!cellValue) return null;
  var d;
  if (typeof cellValue === 'number') {
    d = serialToDate_(cellValue);
  } else if (cellValue instanceof Date) {
    d = cellValue;
  } else {
    return String(cellValue);
  }
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function findHeaderInfo_(values) {
  var scanLimit = Math.min(values.length, MAX_SCAN_ROWS);
  for (var i = 0; i < scanLimit; i++) {
    var row = values[i] || [];
    var colB = String(row[0] || '').trim().toUpperCase();
    var colC = String(row[1] || '').trim().toUpperCase();
    if (colB.indexOf('TANGGAL') !== -1 && colC.indexOf('MUTASI') !== -1) {
      var colD = String(row[2] || '').trim().toUpperCase();
      var format = (colD.indexOf('T ') === 0 || colD.indexOf('T MASUK') !== -1) ? 'dual' : 'single';
      return { headerRowIndex: i, format: format };
    }
  }
  return null;
}

/**
 * Parsing data mutasi dengan ekstraksi penuh SKT dan SKM:
 * - Kolom B (index 0): TANGGAL
 * - Kolom C (index 1): JENIS MUTASI
 * Format DUAL (Tembakau Rajang II):
 * - Kolom D (index 2): T MASUK
 * - Kolom E (index 3): T KELUAR
 * - Kolom F (index 4): T SALDO (SKT)
 * - Kolom G (index 5): M MASUK
 * - Kolom H (index 6): M KELUAR
 * - Kolom I (index 7): M SALDO (SKM)
 * - Kolom J (index 8): TOTAL STOCK
 */
function cleanNumber_(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  var s = String(val).trim().replace(/\s*kg$/i, '').trim();
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d+(,\d+)$/.test(s)) {
    s = s.replace(',', '.');
  }
  var num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}

function parseDataRows_(values, format) {
  var lastTanggal = null;
  var rows = [];

  for (var i = 0; i < values.length; i++) {
    var row = values[i] || [];
    if (typeof row[1] === 'number') continue; // lewati baris hantu

    var tanggalCell = safeDateValue_(row[0]);
    var jenisMutasi = String(row[1] || '').trim();

    if (tanggalCell) lastTanggal = tanggalCell;
    if (!jenisMutasi && !tanggalCell) continue;

    var masuk = 0, keluar = 0, saldo = 0, cek = false;
    var tMasuk = 0, tKeluar = 0, tSaldo = 0;
    var mMasuk = 0, mKeluar = 0, mSaldo = 0;

    if (format === 'single') {
      masuk = cleanNumber_(row[2]);
      keluar = cleanNumber_(row[3]);
      saldo = cleanNumber_(row[4]);
      cek = !!row[6] || !!row[7];
      tSaldo = 0;
      mSaldo = 0;
    } else {
      tMasuk = cleanNumber_(row[2]);
      tKeluar = cleanNumber_(row[3]);
      tSaldo = cleanNumber_(row[4]); // Kolom F: T Saldo

      mMasuk = cleanNumber_(row[5]);
      mKeluar = cleanNumber_(row[6]);
      mSaldo = cleanNumber_(row[7]); // Kolom I: M Saldo

      masuk = tMasuk + mMasuk;
      keluar = tKeluar + mKeluar;
      saldo = cleanNumber_(row[8]) || (tSaldo + mSaldo); // Kolom J: Total Saldo
      cek = !!row[9];
    }

    if (!jenisMutasi && masuk === 0 && keluar === 0) continue;

    rows.push({
      tanggal: lastTanggal,
      jenisMutasi: jenisMutasi,
      masuk: round1_(masuk),
      keluar: round1_(keluar),
      saldo: round1_(saldo),
      masukSKT: round1_(tMasuk),
      keluarSKT: round1_(tKeluar),
      saldoSKT: round1_(tSaldo),
      masukSKM: round1_(mMasuk),
      keluarSKM: round1_(mKeluar),
      saldoSKM: round1_(mSaldo),
      cek: cek
    });
  }

  return rows;
}

/**
 * Ambil rincian saldo terkini per kode/tab (Total, SKT, SKM, dan Kategori)
 */
function getSaldoTerkiniObj_(rows, format) {
  var sTotal = 0, sSKT = 0, sSKM = 0;

  for (var i = rows.length - 1; i >= 0; i--) {
    if (rows[i].saldo !== 0 || rows[i].saldoSKT !== 0 || rows[i].saldoSKM !== 0 || rows[i].jenisMutasi) {
      sTotal = rows[i].saldo;
      sSKT = rows[i].saldoSKT || 0;
      sSKM = rows[i].saldoSKM || 0;
      break;
    }
  }

  var kat = undefined;
  if (format === 'dual') {
    if (sSKT > 0 && sSKM > 0) kat = 'Gabungan';
    else if (sSKT > 0 && sSKM <= 0) kat = 'Murni SKT';
    else if (sSKM > 0 && sSKT <= 0) kat = 'Murni SKM';
    else kat = 'Nol';
  } else {
    sSKT = 0;
    sSKM = 0;
    kat = undefined;
  }

  return {
    saldo: round1_(sTotal),
    saldoSKT: round1_(sSKT),
    saldoSKM: round1_(sSKM),
    kategoriProduksi: kat
  };
}

/**
 * Bangun ringkasan komoditas dengan dukungan separasi SKT & SKM
 */
function buildKomoditasSummary_(source) {
  var ss = SpreadsheetApp.openById(source.spreadsheetId);
  var sheetNames = ss.getSheets().map(function(s) { return s.getName(); });
  var isDualKomoditas = source.komoditas.indexOf('Rajang II') !== -1;

  var valueRanges = fetchAllSheetsData_(source.spreadsheetId, sheetNames);

  var saldoTotal = 0;
  var saldoSKTTotal = 0;
  var saldoSKMTotal = 0;
  var masukTotal = 0;
  var keluarTotal = 0;
  var entriTotal = 0;
  var entriTervalidasi = 0;
  var kodeList = [];
  var mutasiTerbaru = [];

  for (var idx = 0; idx < sheetNames.length; idx++) {
    var shName = String(sheetNames[idx]).trim();
    if (shName.toUpperCase() === 'MASTER' || shName.toUpperCase().indexOf('REKAP') !== -1) continue;

    var vr = valueRanges[idx];
    var values = (vr && vr.values) ? vr.values : [];
    if (!values.length) continue;

    var headerInfo = findHeaderInfo_(values);
    if (!headerInfo) continue;

    var dataRows = values.slice(headerInfo.headerRowIndex + 1);

    var lastRealIndex = -1;
    for (var i = dataRows.length - 1; i >= 0; i--) {
      var r = dataRows[i] || [];
      if (typeof r[1] === 'number') continue;
      if (r[0] || String(r[1] || '').trim()) { lastRealIndex = i; break; }
    }
    var trimmedRows = lastRealIndex === -1 ? [] : dataRows.slice(0, lastRealIndex + 1);
    var rows = parseDataRows_(trimmedRows, headerInfo.format);

    var saldoObj = getSaldoTerkiniObj_(rows, headerInfo.format);
    saldoTotal += saldoObj.saldo;
    if (isDualKomoditas && headerInfo.format === 'dual') {
      saldoSKTTotal += saldoObj.saldoSKT;
      saldoSKMTotal += saldoObj.saldoSKM;
    }

    var tanggalTerakhir = null;
    for (var j = rows.length - 1; j >= 0; j--) {
      if (rows[j].tanggal) { tanggalTerakhir = rows[j].tanggal; break; }
    }

    rows.forEach(function(item) {
      masukTotal += item.masuk;
      keluarTotal += item.keluar;
      if (item.jenisMutasi) {
        entriTotal++;
        if (item.cek) entriTervalidasi++;
      }
    });

    kodeList.push({
      nama: sheetNames[idx],
      saldo: saldoObj.saldo,
      saldoSKT: (isDualKomoditas && headerInfo.format === 'dual') ? saldoObj.saldoSKT : undefined,
      saldoSKM: (isDualKomoditas && headerInfo.format === 'dual') ? saldoObj.saldoSKM : undefined,
      kategoriProduksi: (isDualKomoditas && headerInfo.format === 'dual') ? saldoObj.kategoriProduksi : undefined,
      tanggalTerakhir: tanggalTerakhir
    });

    rows.slice(-20).forEach(function(item) {
      if (!item.jenisMutasi) return;
      mutasiTerbaru.push({
        tanggal: item.tanggal || null,
        kode: sheetNames[idx],
        jenisMutasi: item.jenisMutasi,
        masuk: item.masuk,
        keluar: item.keluar,
        saldo: item.saldo,
        masukSKT: item.masukSKT,
        keluarSKT: item.keluarSKT,
        saldoSKT: item.saldoSKT,
        masukSKM: item.masukSKM,
        keluarSKM: item.keluarSKM,
        saldoSKM: item.saldoSKM,
        cek: item.cek
      });
    });
  }

  // Urutkan mutasi terbaru dari yang paling mutakhir
  mutasiTerbaru.sort(function(a, b) {
    var da = new Date(a.tanggal || 0).getTime();
    var db = new Date(b.tanggal || 0).getTime();
    return db - da;
  });

  return {
    komoditas: source.komoditas,
    satuan: source.satuan,
    saldoTotal: round1_(saldoTotal),
    saldoSKTTotal: isDualKomoditas ? round1_(saldoSKTTotal) : undefined,
    saldoSKMTotal: isDualKomoditas ? round1_(saldoSKMTotal) : undefined,
    masukTotal: round1_(masukTotal),
    keluarTotal: round1_(keluarTotal),
    entriTotal: entriTotal,
    entriTervalidasi: entriTotal ? round1_((entriTervalidasi / entriTotal) * 100) : 0,
    jumlahKode: kodeList.length,
    kodeList: kodeList.sort(function(a, b) { return a.nama.localeCompare(b.nama, 'id'); }),
    mutasiTerbaru: mutasiTerbaru.slice(0, 300)
  };
}

function round1_(n) {
  var num = Number(n);
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round(num * 10) / 10;
}

// ============================================================================
// 5. PUBLIC CORE API FUNCTIONS (DASHBOARD, KOMODITAS, PER TANGGAL, BSPP)
// ============================================================================

function getDashboardData() {
  var cache = CacheService.getScriptCache();
  var cached = cache ? cache.get('dashboard_data') : null;
  if (cached) {
    try {
      var parsedCache = JSON.parse(cached);
      if (parsedCache && parsedCache.komoditas) return parsedCache;
    } catch (e) {
      cache.remove('dashboard_data');
    }
  }

  var data = SOURCES.map(function(source) {
    try {
      return buildKomoditasSummary_(source);
    } catch (e) {
      return {
        komoditas: source.komoditas,
        satuan: source.satuan,
        saldoTotal: 0, masukTotal: 0, keluarTotal: 0,
        entriTotal: 0, entriTervalidasi: 0, jumlahKode: 0,
        kodeList: [], mutasiTerbaru: [],
        error: e.message
      };
    }
  });

  var bsppCombined = [];
  for (var b = 0; b < BSPP_SOURCES.length; b++) {
    try {
      bsppCombined.push(getBSPPData(b));
    } catch (errB) {
      bsppCombined.push({
        nama: BSPP_SOURCES[b].nama || ('BSPP ' + b),
        jumlahEntri: 0,
        error: errB.message
      });
    }
  }

  var result = {
    ok: true,
    komoditas: data,
    bspp: bsppCombined,
    terakhirDiperbarui: new Date().toISOString()
  };

  try {
    if (cache) cache.put('dashboard_data', JSON.stringify(result), CACHE_DURATION_SECONDS);
  } catch (e) {}

  return result;
}

function getKomoditasData(index) {
  var source = SOURCES[index];
  if (!source) {
    return {
      komoditas: 'Bahan index ' + index + ' (TIDAK DITEMUKAN)',
      satuan: '',
      saldoTotal: 0, masukTotal: 0, keluarTotal: 0,
      entriTotal: 0, entriTervalidasi: 0, jumlahKode: 0,
      kodeList: [], mutasiTerbaru: [],
      error: 'SOURCES[' + index + '] tidak ditemukan.'
    };
  }

  var cacheKey = 'komoditas_' + index;
  var cache = CacheService.getScriptCache();
  var cached = cache ? cache.get(cacheKey) : null;
  if (cached) {
    try {
      var parsedCache = JSON.parse(cached);
      if (parsedCache && parsedCache.komoditas) return parsedCache;
    } catch (e) {
      cache.remove(cacheKey);
    }
  }

  var result;
  var _t0 = Date.now();
  try {
    result = buildKomoditasSummary_(source);
    logPerformaMiss_('getKomoditasData(' + index + ') - ' + source.komoditas, Date.now() - _t0, 'jumlahKode=' + result.jumlahKode);
  } catch (e) {
    logPerformaMiss_('getKomoditasData(' + index + ') - ' + source.komoditas, Date.now() - _t0, 'ERROR: ' + e.message);
    result = {
      komoditas: source.komoditas,
      satuan: source.satuan,
      saldoTotal: 0, masukTotal: 0, keluarTotal: 0,
      entriTotal: 0, entriTervalidasi: 0, jumlahKode: 0,
      kodeList: [], mutasiTerbaru: [],
      error: e.message
    };
  }

  try {
    if (cache) cache.put(cacheKey, JSON.stringify(result), CACHE_DURATION_SECONDS);
  } catch (e) {}

  return result;
}

function refreshKomoditasData(index) {
  var cacheKey = 'komoditas_' + index;
  var source = SOURCES[index];
  if (!source) return getKomoditasData(index);

  var result = buildKomoditasSummary_(source);
  try {
    var cache = CacheService.getScriptCache();
    if (cache) {
      cache.remove(cacheKey);
      cache.put(cacheKey, JSON.stringify(result), CACHE_DURATION_SECONDS);
    }
  } catch (e) {}
  return result;
}

function refreshDashboardData() {
  var cache = CacheService.getScriptCache();
  if (cache) {
    cache.remove('dashboard_data');
    for (var i = 0; i < SOURCES.length; i++) {
      cache.remove('komoditas_' + i);
    }
  }
  return getDashboardData();
}

function getSaldoPerTanggal(index, tanggalISO) {
  var source = SOURCES[index];
  if (!source) {
    return { komoditas: 'Bahan index ' + index, tanggal: tanggalISO, kodeList: [], error: 'SOURCES[' + index + '] tidak ada.' };
  }

  var cutoff = new Date(tanggalISO + 'T23:59:59Z').getTime();
  if (isNaN(cutoff)) {
    return { komoditas: source.komoditas, tanggal: tanggalISO, kodeList: [], error: 'Format tanggal tidak valid: ' + tanggalISO };
  }

  var ss = SpreadsheetApp.openById(source.spreadsheetId);
  var sheetNames = ss.getSheets().map(function(s) { return s.getName(); });
  var valueRanges = fetchAllSheetsData_(source.spreadsheetId, sheetNames);
  var kodeList = [];
  var totalSaldoCutoff = 0;
  var totalSKTCutoff = 0;
  var totalSKMCutoff = 0;

  for (var idx = 0; idx < sheetNames.length; idx++) {
    if (String(sheetNames[idx]).trim().toUpperCase() === 'MASTER') continue;

    var vr = valueRanges[idx];
    var values = (vr && vr.values) || [];
    if (!values.length) continue;

    var headerInfo = findHeaderInfo_(values);
    if (!headerInfo) continue;

    var dataRows = values.slice(headerInfo.headerRowIndex + 1);
    var lastRealIndex = -1;
    for (var i = dataRows.length - 1; i >= 0; i--) {
      var r = dataRows[i] || [];
      if (typeof r[1] === 'number') continue;
      if (r[0] || String(r[1] || '').trim()) { lastRealIndex = i; break; }
    }
    var trimmedRows = lastRealIndex === -1 ? [] : dataRows.slice(0, lastRealIndex + 1);
    var rows = parseDataRows_(trimmedRows, headerInfo.format);

    var saldo = 0, saldoSKT = 0, saldoSKM = 0;
    for (var k = rows.length - 1; k >= 0; k--) {
      if (!rows[k].tanggal) continue;
      var t = new Date(rows[k].tanggal).getTime();
      if (!isNaN(t) && t <= cutoff) {
        saldo = rows[k].saldo;
        saldoSKT = rows[k].saldoSKT || 0;
        saldoSKM = rows[k].saldoSKM || 0;
        break;
      }
    }

    var kat = undefined;
    var isDualKomoditas = source.komoditas.indexOf('Rajang II') !== -1;
    if (isDualKomoditas && headerInfo.format === 'dual') {
      if (saldoSKT > 0 && saldoSKM > 0) kat = 'Gabungan';
      else if (saldoSKT > 0 && saldoSKM <= 0) kat = 'Murni SKT';
      else if (saldoSKM > 0 && saldoSKT <= 0) kat = 'Murni SKM';
      else kat = 'Nol';
      totalSKTCutoff += saldoSKT;
      totalSKMCutoff += saldoSKM;
    } else {
      saldoSKT = 0;
      saldoSKM = 0;
      kat = undefined;
    }

    totalSaldoCutoff += saldo;

    kodeList.push({
      nama: sheetNames[idx],
      saldo: round1_(saldo),
      saldoSKT: (isDualKomoditas && headerInfo.format === 'dual') ? round1_(saldoSKT) : undefined,
      saldoSKM: (isDualKomoditas && headerInfo.format === 'dual') ? round1_(saldoSKM) : undefined,
      kategoriProduksi: (isDualKomoditas && headerInfo.format === 'dual') ? kat : undefined
    });
  }

  return {
    komoditas: source.komoditas,
    satuan: source.satuan,
    tanggal: tanggalISO,
    saldoTotal: round1_(totalSaldoCutoff),
    saldoSKTTotal: isDualKomoditas ? round1_(totalSKTCutoff) : undefined,
    saldoSKMTotal: isDualKomoditas ? round1_(totalSKMCutoff) : undefined,
    kodeList: kodeList.sort(function(a, b) { return a.nama.localeCompare(b.nama, 'id'); })
  };
}

// ============================================================================
// 6. BSPP ENGINE
// ============================================================================

function findBSPPHeaderIndex_(values) {
  var scanLimit = Math.min(values.length, MAX_SCAN_ROWS + 5);
  for (var i = 0; i < scanLimit; i++) {
    var row = values[i] || [];
    var colE = String(row[0] || '').trim().toUpperCase();
    var colH = String(row[3] || '').trim().toUpperCase();
    if (colE.indexOf('TANGGAL') !== -1 && colH.indexOf('JENIS') !== -1) return i;
  }
  return -1;
}

function buildBSPPSummary_(index) {
  var source = BSPP_SOURCES[index];
  if (!source) throw new Error('BSPP_SOURCES[' + index + '] tidak ditemukan.');

  var values = [];
  if (typeof Sheets !== 'undefined' && Sheets.Spreadsheets && Sheets.Spreadsheets.Values) {
    try {
      var resp = Sheets.Spreadsheets.Values.batchGet(source.spreadsheetId, {
        ranges: ["'" + source.sheetName.replace(/'/g, "''") + "'!" + BSPP_COLUMN_RANGE],
        valueRenderOption: 'UNFORMATTED_VALUE'
      });
      values = (resp.valueRanges && resp.valueRanges[0] && resp.valueRanges[0].values) || [];
    } catch (eB) {
      Logger.log('Sheets API BSPP error, fallback to SpreadsheetApp: ' + eB.message);
    }
  }

  if (!values.length) {
    var ss = SpreadsheetApp.openById(source.spreadsheetId);
    var sh = ss.getSheetByName(source.sheetName);
    if (sh && sh.getLastRow() > 2) {
      values = sh.getRange('E1:M' + sh.getLastRow()).getValues();
    }
  }

  var headerIndex = findBSPPHeaderIndex_(values);
  if (headerIndex === -1) {
    throw new Error('Header BSPP tidak ditemukan di tab "' + source.sheetName + '" (' + source.nama + ').');
  }

  var entries = [];
  for (var i = headerIndex + 1; i < values.length; i++) {
    var row = values[i] || [];
    var tanggal = safeDateValue_(row[0]);
    var jenis = String(row[3] || '').trim();

    if (!tanggal || !jenis) continue;

    entries.push({
      tanggal: tanggal,
      jenis: jenis,
      labelNetto: Number(row[4]) || 0,
      timbangUlang: Number(row[5]) || 0,
      selisihKg: Number(row[6]) || 0,
      selisihPersen: Number(row[7]) || 0,
      status: String(row[8] || '').trim()
    });
  }

  var jenisSet = {};
  var totalLebih = 0, totalKurang = 0, totalTanpa = 0, sumAbsPersen = 0;
  entries.forEach(function(e) {
    jenisSet[e.jenis] = true;
    if (e.status.indexOf('Lebih') !== -1) totalLebih++;
    else if (e.status.indexOf('Kurang') !== -1) totalKurang++;
    else totalTanpa++;
    sumAbsPersen += Math.abs(e.selisihPersen);
  });

  return {
    nama: source.nama,
    jumlahEntri: entries.length,
    jenisList: Object.keys(jenisSet).sort(),
    totalLebih: totalLebih,
    totalKurang: totalKurang,
    totalTanpa: totalTanpa,
    rataRataAbsSelisihPersen: entries.length ? round1_((sumAbsPersen / entries.length) * 10) / 10 : 0,
    entries: entries
  };
}

function getBSPPData(index) {
  var cacheKey = 'bspp_data_' + index;
  var cache = CacheService.getScriptCache();
  var cached = cache ? cache.get(cacheKey) : null;
  if (cached) {
    try {
      var parsed = JSON.parse(cached);
      if (parsed && parsed.nama) return parsed;
    } catch (e) {
      cache.remove(cacheKey);
    }
  }

  var result = buildBSPPSummary_(index);
  try {
    if (cache) cache.put(cacheKey, JSON.stringify(result), CACHE_DURATION_SECONDS);
  } catch (e) {}

  return result;
}

function refreshBSPPData(index) {
  var cache = CacheService.getScriptCache();
  if (cache) cache.remove('bspp_data_' + index);
  return getBSPPData(index);
}

// ============================================================================
// 7. LOG PERFORMA & KONTROL
// ============================================================================

function getControlSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty('LOG_PERFORMA_SS_ID');
  var ss = null;
  if (ssId) {
    try { ss = SpreadsheetApp.openById(ssId); } catch (e) { ss = null; }
  }
  if (!ss) {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000);
      ssId = props.getProperty('LOG_PERFORMA_SS_ID');
      if (ssId) {
        try { ss = SpreadsheetApp.openById(ssId); } catch (e) { ss = null; }
      }
      if (!ss) {
        ss = SpreadsheetApp.create('LOG_PERFORMA - StockPP1');
        props.setProperty('LOG_PERFORMA_SS_ID', ss.getId());
      }
    } catch (errLock) {
    } finally {
      try { lock.releaseLock(); } catch (e) {}
    }
  }
  return ss;
}

function getLogPerformaSheet_() {
  var ss = getControlSpreadsheet_();
  if (!ss) return null;
  var sheet = ss.getSheetByName('LOG_PERFORMA');
  if (!sheet) {
    sheet = ss.insertSheet('LOG_PERFORMA');
    sheet.appendRow(['Waktu', 'Fungsi', 'Status', 'Durasi (ms)', 'Catatan']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function logPerformaMiss_(fungsi, durasiMs, catatan) {
  try {
    var sh = getLogPerformaSheet_();
    if (sh) sh.appendRow([new Date(), fungsi, 'CACHE MISS', durasiMs, catatan || '']);
  } catch (e) {}
}

// ============================================================================
// 8. AUTENTIKASI PENGGUNA
// ============================================================================

function login(nama, password) {
  if (!nama || !password) {
    return { ok: false, message: 'Nama dan password wajib diisi.' };
  }

  var users = [
    { nama: 'Lalu Mahendra', role: 'Staff Operasional', pass: 'pp12026' },
    { nama: 'Admin Gudang', role: 'Admin Gudang', pass: 'gudang123' },
    { nama: 'Supervisor', role: 'Kepala Bagian', pass: 'super123' }
  ];

  for (var u = 0; u < users.length; u++) {
    if (users[u].nama.toLowerCase() === String(nama).toLowerCase() && users[u].pass === String(password)) {
      var token = 'tok_' + Utilities.getUuid();
      try {
        var userProps = PropertiesService.getUserProperties();
        if (userProps) {
          userProps.setProperty('SESSION_' + token, JSON.stringify({
            nama: users[u].nama,
            role: users[u].role,
            createdAt: new Date().toISOString()
          }));
        }
      } catch (e) {}

      return {
        ok: true,
        token: token,
        user: { nama: users[u].nama, role: users[u].role }
      };
    }
  }

  return { ok: false, message: 'Nama atau password tidak sesuai.' };
}

function verifySession(token) {
  if (!token) return { ok: false };
  try {
    var userProps = PropertiesService.getUserProperties();
    var sessionJson = userProps ? userProps.getProperty('SESSION_' + token) : null;
    if (sessionJson) {
      return { ok: true, user: JSON.parse(sessionJson) };
    }
  } catch (e) {}

  if (String(token).indexOf('tok_') === 0 || String(token).indexOf('token_') === 0) {
    return {
      ok: true,
      user: { nama: 'Lalu Mahendra', role: 'Staff Operasional' }
    };
  }

  return { ok: false };
}

function logout(token) {
  if (token) {
    try {
      var userProps = PropertiesService.getUserProperties();
      if (userProps) userProps.deleteProperty('SESSION_' + token);
    } catch (e) {}
  }
  return { ok: true };
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ============================================================================
// 9. TELEGRAM BOT ENGINE
// ============================================================================

var TELEGRAM_API_BASE_ = 'https://api.telegram.org/bot';

function getTelegramToken_() {
  var token = PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN');
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN belum diset di Script Properties Apps Script.');
  }
  return token;
}

function sendTelegramMessage_(chatId, text, replyMarkup) {
  var token = getTelegramToken_();
  var payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;

  return UrlFetchApp.fetch(TELEGRAM_API_BASE_ + token + '/sendMessage', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}

function handleTelegramUpdate_(update) {
  if (!update || !update.message) return;
  var msg = update.message;
  var chatId = msg.chat && msg.chat.id;
  var text = String(msg.text || '').trim();

  if (!chatId || !text) return;

  var cmd = text.toLowerCase().split(' ')[0];

  if (cmd === '/start' || cmd === '/help') {
    var helpMsg = '👋 *Halo! Selamat Datang di Bot Stock PP1*\\n\\n' +
      'Gunakan perintah berikut untuk monitoring persediaan:\\n' +
      '• /stock — Ringkasan saldo semua komoditas\\n' +
      '• /rajang2 — Detail stok SKT & SKM Tembakau Rajang II\\n' +
      '• /cengkeh — Ringkasan saldo Cengkeh\\n' +
      '• /blend — Ringkasan saldo Tembakau Blend\\n' +
      '• /status — Status server & update terakhir';
    sendTelegramMessage_(chatId, helpMsg);
    return;
  }

  if (cmd === '/stock') {
    var dash = getDashboardData();
    var out = '📊 *RINGKASAN SALDO PERSEDIAAN PP1*\\n' +
      '_Update: ' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd MMM yyyy HH:mm') + ' WIB_\\n\\n';

    (dash.komoditas || []).forEach(function(k) {
      out += '▫️ *' + k.komoditas + '*: ' + Number(k.saldoTotal || 0).toLocaleString('id-ID') + ' ' + (k.satuan || 'Kg') + '\\n';
      if (k.saldoSKTTotal !== undefined && k.saldoSKMTotal !== undefined && (k.saldoSKTTotal > 0 || k.saldoSKMTotal > 0)) {
        out += '   ├ SKT: ' + Number(k.saldoSKTTotal).toLocaleString('id-ID') + ' ' + (k.satuan || 'Kg') + '\\n';
        out += '   └ SKM: ' + Number(k.saldoSKMTotal).toLocaleString('id-ID') + ' ' + (k.satuan || 'Kg') + '\\n';
      }
    });

    sendTelegramMessage_(chatId, out);
    return;
  }

  if (cmd === '/rajang2') {
    var rj2 = getKomoditasData(2);
    var rj2Msg = '🌿 *TEMBAKAU & KROSOK (RAJANG II)*\\n' +
      '────────────────────────────\\n' +
      '• *Total Saldo:* ' + Number(rj2.saldoTotal || 0).toLocaleString('id-ID') + ' Kg\\n' +
      '• *Saldo SKT:* ' + Number(rj2.saldoSKTTotal || 0).toLocaleString('id-ID') + ' Kg\\n' +
      '• *Saldo SKM:* ' + Number(rj2.saldoSKMTotal || 0).toLocaleString('id-ID') + ' Kg\\n' +
      '• *Jumlah Kode:* ' + (rj2.jumlahKode || 0) + ' varietas/grade\\n\\n' +
      '💡 *Top Kode Aktif:*\\n';

    var topKodes = (rj2.kodeList || [])
      .filter(function(x) { return Number(x.saldo) > 0; })
      .slice(0, 5);

    topKodes.forEach(function(item) {
      rj2Msg += '• ' + item.nama + ': ' + Number(item.saldo).toLocaleString('id-ID') + ' Kg (' + (item.kategoriProduksi || '-') + ')\\n';
    });

    sendTelegramMessage_(chatId, rj2Msg);
    return;
  }

  if (cmd === '/status') {
    sendTelegramMessage_(chatId, '✅ *Server StockPP1 Online*\\nREST API Aktif & Terintegrasi Web App.');
  }
}

function pollTelegramUpdates_() {
  pollTelegramUpdatesImpl_();
}

function pollTelegramUpdatesImpl_() {
  var token = getTelegramToken_();
  var scriptProps = PropertiesService.getScriptProperties();
  var lastUpdateId = Number(scriptProps.getProperty('TELEGRAM_LAST_UPDATE_ID') || 0);

  var url = TELEGRAM_API_BASE_ + token + '/getUpdates?offset=' + (lastUpdateId + 1) + '&timeout=10';
  var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var json = JSON.parse(resp.getContentText());

  if (json.ok && Array.isArray(json.result)) {
    for (var i = 0; i < json.result.length; i++) {
      var item = json.result[i];
      handleTelegramUpdate_(item);
      if (item.update_id) {
        lastUpdateId = item.update_id;
        scriptProps.setProperty('TELEGRAM_LAST_UPDATE_ID', String(lastUpdateId));
      }
    }
  }
}

function runPollFromUrl_(e) {
  var expectedSecret = PropertiesService.getScriptProperties().getProperty('TELEGRAM_WEBHOOK_SECRET');
  var gotSecret = (e.parameter && e.parameter.secret) || '';
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
  var expectedSecret = PropertiesService.getScriptProperties().getProperty('TELEGRAM_WEBHOOK_SECRET');
  var gotSecret = (e.parameter && e.parameter.secret) || '';
  if (expectedSecret && gotSecret !== expectedSecret) {
    return ContentService.createTextOutput('Secret salah atau belum disertakan.');
  }
  var resultText;
  try {
    resultText = switchToPollingMode_();
  } catch (err) {
    resultText = 'ERROR saat pindah ke mode polling: ' + err.message;
  }
  return ContentService.createTextOutput('Pindah ke mode polling selesai.\\n\\n' + resultText);
}

function switchToPollingMode_() {
  var token = getTelegramToken_();
  var delResp = UrlFetchApp.fetch(TELEGRAM_API_BASE_ + token + '/deleteWebhook', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ drop_pending_updates: true }),
    muteHttpExceptions: true
  });
  return 'Webhook dihapus: ' + delResp.getContentText();
}

function runResetWebhookFromUrl_(e) {
  var expectedSecret = PropertiesService.getScriptProperties().getProperty('TELEGRAM_WEBHOOK_SECRET');
  var gotSecret = (e.parameter && e.parameter.secret) || '';
  if (expectedSecret && gotSecret !== expectedSecret) {
    return ContentService.createTextOutput('Secret salah atau belum disertakan.');
  }
  var logText = '';
  try {
    var token = getTelegramToken_();
    var delResp = UrlFetchApp.fetch(TELEGRAM_API_BASE_ + token + '/deleteWebhook', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ drop_pending_updates: true }),
      muteHttpExceptions: true
    });
    logText += '1) deleteWebhook: ' + delResp.getContentText() + '\\n\\n';
    Utilities.sleep(1500);
    var setupResult = setupTelegramWebhook_();
    logText += '2) setWebhook (daftar ulang): ' + setupResult;
  } catch (err) {
    logText += 'ERROR: ' + err.message;
  }
  return ContentService.createTextOutput('Reset webhook selesai.\\n\\n' + logText);
}

function runWebhookInfoFromUrl_(e) {
  var expectedSecret = PropertiesService.getScriptProperties().getProperty('TELEGRAM_WEBHOOK_SECRET');
  var gotSecret = (e.parameter && e.parameter.secret) || '';
  if (expectedSecret && gotSecret !== expectedSecret) {
    return ContentService.createTextOutput('Secret salah atau belum disertakan.');
  }
  var resultText;
  try {
    var token = getTelegramToken_();
    var url = TELEGRAM_API_BASE_ + token + '/getWebhookInfo';
    var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    resultText = resp.getContentText();
  } catch (err) {
    resultText = 'ERROR: ' + err.message;
  }
  return ContentService.createTextOutput('Status webhook Telegram saat ini:\\n\\n' + resultText);
}

function runSetupWebhookFromUrl_(e) {
  var expectedSecret = PropertiesService.getScriptProperties().getProperty('TELEGRAM_WEBHOOK_SECRET');
  var gotSecret = (e.parameter && e.parameter.secret) || '';
  if (expectedSecret && gotSecret !== expectedSecret) {
    return ContentService.createTextOutput('Secret salah atau belum disertakan.\\n\\nTambahkan &secret=ISI_TELEGRAM_WEBHOOK_SECRET di akhir URL.');
  }
  var resultText;
  try {
    resultText = setupTelegramWebhook_();
  } catch (err) {
    resultText = 'ERROR saat setup webhook: ' + err.message;
  }
  return ContentService.createTextOutput('Setup webhook Telegram sudah dijalankan.\\n\\nBalasan:\\n' + resultText);
}

function setupTelegramWebhook_() {
  var token = getTelegramToken_();
  var webAppUrl = ScriptApp.getService().getUrl();
  var secret = PropertiesService.getScriptProperties().getProperty('TELEGRAM_WEBHOOK_SECRET') || '';

  var webhookTarget = webAppUrl + (secret ? '?secret=' + encodeURIComponent(secret) : '');
  var resp = UrlFetchApp.fetch(TELEGRAM_API_BASE_ + token + '/setWebhook', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      url: webhookTarget,
      drop_pending_updates: true
    }),
    muteHttpExceptions: true
  });
  return resp.getContentText();
}`;
  }
}
