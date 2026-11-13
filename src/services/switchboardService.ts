import { useState, useEffect, useCallback } from 'react';

export interface SwitchBoardItem {
  id: string;
  nama: string;
  desc: string;
  url: string;
  commodityKey: string; // 'all' | 'blend' | 'cengkeh' | 'tembakau' | 'krosok' | 'custom'
  isCurrent?: boolean;
  isCustom?: boolean;
}

export const DEFAULT_SWITCH_BOARDS: SwitchBoardItem[] = [
  {
    id: 'main',
    nama: 'Monitoring Stock Persediaan PP1',
    desc: 'Board saat ini (Tembakau, Krosok, Cengkeh, Saos, Blend & BSPP)',
    url: '#',
    commodityKey: 'all',
    isCurrent: true,
    isCustom: false
  },
  {
    id: 'blend',
    nama: 'Rekap Proses Blend',
    desc: 'Monitoring susut pengolahan & rekap mixing blend tembakau',
    url: 'https://rekap-data-proses-blend-pro-api-engine.appspengolahan.workers.dev/',
    commodityKey: 'blend',
    isCurrent: false,
    isCustom: false
  },
  {
    id: 'cengkeh',
    nama: 'Rekap Proses Cengkeh',
    desc: 'Monitoring susut perajangan & drying cengkeh',
    url: 'https://rekap-data-proses-cengkeh-pro-api.appspengolahan.workers.dev/',
    commodityKey: 'cengkeh',
    isCurrent: false,
    isCustom: false
  },
  {
    id: 'tembakau',
    nama: 'Rekap Proses Tembakau',
    desc: 'Rekapitulasi proses dan susut bahan tembakau',
    url: 'https://rekap-data-proses-tembakau-pro-api.appspengolahan.workers.dev/',
    commodityKey: 'tembakau',
    isCurrent: false,
    isCustom: false
  },
  {
    id: 'krosok',
    nama: 'Rekap Proses Krosok',
    desc: 'Monitoring susut perajangan krosok (Rajang I & II)',
    url: 'https://rekap-data-proses-krosok.appspengolahan.workers.dev/',
    commodityKey: 'krosok',
    isCurrent: false,
    isCustom: false
  }
];

const STORAGE_KEY = 'pp1_switchboard_modules_v3';
const LEGACY_STORAGE_KEY = 'pp1_switchboard_modules_v2';
const EVENT_NAME = 'pp1_switchboard_updated';

export const isVercelUrl = (url: string): boolean => {
  if (!url) return false;
  return url.toLowerCase().includes('.vercel.app');
};

export const isCloudflareUrl = (url: string): boolean => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes('.workers.dev') || lower.includes('.pages.dev') || lower.includes('cloudflare');
};

export const SwitchBoardService = {
  getBoards(): SwitchBoardItem[] {
    try {
      // 1. Coba baca penyimpanan v3
      let stored = localStorage.getItem(STORAGE_KEY);
      
      // 2. Jika v3 belum ada, periksa apakah ada konfigurasi di v2
      if (!stored) {
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) {
          stored = legacy;
        }
      }

      if (!stored) return DEFAULT_SWITCH_BOARDS;

      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Auto-merge: Pastikan board 'main' selalu ada
        const hasMain = parsed.some(b => b.id === 'main');
        const listWithMain = hasMain ? parsed : [DEFAULT_SWITCH_BOARDS[0], ...parsed];

        // Jika ada board bawaan yang di DEFAULT_SWITCH_BOARDS sudah diupdate ke non-Vercel,
        // prioritaskan URL baru jika entri di cache lokal masih menggunakan domain Vercel yang mati
        const upgraded = listWithMain.map(item => {
          const defaultMatch = DEFAULT_SWITCH_BOARDS.find(d => d.id === item.id);
          if (defaultMatch && !isVercelUrl(defaultMatch.url) && isVercelUrl(item.url)) {
            return {
              ...item,
              url: defaultMatch.url
            };
          }
          return item;
        });

        // Simpan versi terupgrade ke v3
        localStorage.setItem(STORAGE_KEY, JSON.stringify(upgraded));
        return upgraded;
      }
      return DEFAULT_SWITCH_BOARDS;
    } catch (e) {
      console.warn('Gagal membaca data switchboard dari localStorage, gunakan default:', e);
      return DEFAULT_SWITCH_BOARDS;
    }
  },

  saveBoards(boards: SwitchBoardItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: boards }));
    } catch (e) {
      console.error('Gagal menyimpan data switchboard ke localStorage:', e);
    }
  },

  resetToDefault(): SwitchBoardItem[] {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: DEFAULT_SWITCH_BOARDS }));
      return DEFAULT_SWITCH_BOARDS;
    } catch (e) {
      console.error('Gagal mereset switchboard:', e);
      return DEFAULT_SWITCH_BOARDS;
    }
  },

  exportConfigJson(boards: SwitchBoardItem[]): string {
    return JSON.stringify(boards, null, 2);
  },

  importConfigJson(jsonStr: string): { ok: boolean; message: string; boards?: SwitchBoardItem[] } {
    try {
      const parsed = JSON.parse(jsonStr.trim());
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return { ok: false, message: 'Format JSON tidak valid atau daftar kosong' };
      }
      // Validasi struktur minimal
      const isValid = parsed.every(p => p && typeof p.id === 'string' && typeof p.nama === 'string' && typeof p.url === 'string');
      if (!isValid) {
        return { ok: false, message: 'Objek modul di dalam JSON harus memiliki properti id, nama, dan url' };
      }

      // Pastikan main tetap ada
      const hasMain = parsed.some(b => b.id === 'main');
      const finalBoards = hasMain ? parsed : [DEFAULT_SWITCH_BOARDS[0], ...parsed];

      this.saveBoards(finalBoards);
      return { ok: true, message: `Berhasil mengimpor ${finalBoards.length} modul switchboard`, boards: finalBoards };
    } catch (e) {
      return { ok: false, message: 'JSON tidak dapat diparse: ' + (e instanceof Error ? e.message : 'Syntax error') };
    }
  }
};

/**
 * Hook untuk sinkronisasi realtime daftar switchboard di seluruh komponen (Sidebar, Navbar, Modal)
 */
export function useSwitchBoards() {
  const [boards, setBoards] = useState<SwitchBoardItem[]>(() => SwitchBoardService.getBoards());

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<SwitchBoardItem[]>;
      if (customEvent.detail) {
        setBoards(customEvent.detail);
      } else {
        setBoards(SwitchBoardService.getBoards());
      }
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const updateBoards = useCallback((newBoards: SwitchBoardItem[]) => {
    setBoards(newBoards);
    SwitchBoardService.saveBoards(newBoards);
  }, []);

  const resetBoards = useCallback(() => {
    const def = SwitchBoardService.resetToDefault();
    setBoards(def);
  }, []);

  const importBoards = useCallback((jsonStr: string) => {
    const res = SwitchBoardService.importConfigJson(jsonStr);
    if (res.ok && res.boards) {
      setBoards(res.boards);
    }
    return res;
  }, []);

  return {
    boards,
    updateBoards,
    resetBoards,
    importBoards
  };
}
