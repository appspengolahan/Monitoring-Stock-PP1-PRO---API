import { PublicPortalConfig } from '../types';

const STORAGE_KEY_PUBLIC_CONFIG = 'monitoring_pp1_public_portal_config';

export class PublicPortalService {
  public static getDefaultConfig(): PublicPortalConfig {
    return {
      showRingkasan: true,       // Ringkasan Stok (Overview 4 Bahan Baku Utama)
      showMutasi: true,          // Mutasi Lintas Bahan
      showSaldoKode: true,       // Saldo Kode / Grade
      showKalkulatorPruf: false, // Default: FALSE (sesuai instruksi user)
      showBspp: false,
      showAnalisa: false,
      showAiLogistik: false
    };
  }

  public static getConfig(): PublicPortalConfig {
    if (typeof localStorage === 'undefined') return this.getDefaultConfig();
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PUBLIC_CONFIG);
      if (stored) {
        return { ...this.getDefaultConfig(), ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed reading public portal config:', e);
    }
    return this.getDefaultConfig();
  }

  public static saveConfig(patch: Partial<PublicPortalConfig>): PublicPortalConfig {
    const current = this.getConfig();
    const updated = { ...current, ...patch };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_PUBLIC_CONFIG, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('stockpp1_public_portal_config_updated', { detail: updated }));
    }
    return updated;
  }

  public static isPublicView(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const params = new URLSearchParams(window.location.search);
      const view = (params.get('view') || params.get('mode') || params.get('portal') || '').toLowerCase();
      return view === 'public' || view === 'publik';
    } catch {
      return false;
    }
  }

  public static getPublicUrl(): string {
    if (typeof window === 'undefined') return '?view=public';
    try {
      const url = new URL(window.location.href);
      // Bersihkan param admin/login/email jika ada
      url.searchParams.delete('page');
      url.searchParams.delete('login');
      url.searchParams.delete('email');
      url.searchParams.set('view', 'public');
      return url.toString();
    } catch {
      return `${window.location.origin}${window.location.pathname}?view=public`;
    }
  }

  public static isTabAllowedInPublic(tabId: string, config: PublicPortalConfig): boolean {
    switch (tabId) {
      case 'ringkasan':
        return config.showRingkasan;
      case 'mutasi':
        return config.showMutasi;
      case 'kode':
        return config.showSaldoKode;
      case 'bspp':
        return config.showBspp;
      case 'analisa':
        return config.showAnalisa;
      case 'ai_logistik':
        return config.showAiLogistik;
      default:
        return false;
    }
  }
}
