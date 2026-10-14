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
    url: 'https://rekap-data-proses-blend-pro-api-eng.vercel.app/',
    commodityKey: 'blend',
    isCurrent: false,
    isCustom: false
  },
  {
    id: 'cengkeh',
    nama: 'Rekap Proses Cengkeh',
    desc: 'Monitoring susut perajangan & drying cengkeh',
    url: 'https://rekap-data-proses-cengkeh-pro-api-l.vercel.app/',
    commodityKey: 'cengkeh',
    isCurrent: false,
    isCustom: false
  },
  {
    id: 'tembakau',
    nama: 'Rekap Proses Tembakau',
    desc: 'Rekapitulasi proses dan susut bahan tembakau',
    url: 'https://rekap-dataproses-tembakau-pro.vercel.app/',
    commodityKey: 'tembakau',
    isCurrent: false,
    isCustom: false
  },
  {
    id: 'krosok',
    nama: 'Rekap Proses Krosok',
    desc: 'Monitoring susut perajangan krosok (Rajang I & II)',
    url: 'https://rekap-data-krosok-api-phi.vercel.app/',
    commodityKey: 'krosok',
    isCurrent: false,
    isCustom: false
  }
];

const STORAGE_KEY = 'pp1_switchboard_modules_v2';
const EVENT_NAME = 'pp1_switchboard_updated';

export const SwitchBoardService = {
  getBoards(): SwitchBoardItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return DEFAULT_SWITCH_BOARDS;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure main is always present and marked isCurrent
        const hasMain = parsed.some(b => b.id === 'main');
        if (!hasMain) {
          return [DEFAULT_SWITCH_BOARDS[0], ...parsed];
        }
        return parsed;
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
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: DEFAULT_SWITCH_BOARDS }));
      return DEFAULT_SWITCH_BOARDS;
    } catch (e) {
      console.error('Gagal mereset switchboard:', e);
      return DEFAULT_SWITCH_BOARDS;
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

  return {
    boards,
    updateBoards,
    resetBoards
  };
}
