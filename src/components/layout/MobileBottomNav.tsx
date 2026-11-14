import React from 'react';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Layers, 
  Scale, 
  BarChart3,
  MoreHorizontal
} from 'lucide-react';
import { PublicPortalConfig } from '../../types';

interface MobileBottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenMenu: () => void;
  allowedKomoditas?: string[];
  isPublicView?: boolean;
  publicConfig?: PublicPortalConfig;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenMenu,
  allowedKomoditas = ['*'],
  isPublicView = false,
  publicConfig
}) => {
  const hasBsppAccess = React.useMemo(() => {
    if (!allowedKomoditas || allowedKomoditas.includes('*') || allowedKomoditas.includes('all')) {
      return true;
    }
    return allowedKomoditas.some(ak => {
      const lower = ak.toLowerCase();
      return lower.includes('cengkeh') || lower.includes('tembakau') || lower.includes('krosok') || lower.includes('rajang');
    });
  }, [allowedKomoditas]);

  const tabs = React.useMemo(() => {
    if (isPublicView) {
      const list = [];
      if (!publicConfig || publicConfig.showRingkasan) {
        list.push({ id: 'ringkasan', label: 'Ringkasan', icon: LayoutDashboard });
      }
      if (!publicConfig || publicConfig.showMutasi) {
        list.push({ id: 'mutasi', label: 'Mutasi', icon: ArrowLeftRight });
      }
      if (!publicConfig || publicConfig.showSaldoKode) {
        list.push({ id: 'kode', label: 'Saldo Bahan', icon: Layers });
      }
      if (publicConfig?.showBspp) {
        list.push({ id: 'bspp', label: 'BSPP', icon: Scale });
      }
      if (publicConfig?.showAnalisa) {
        list.push({ id: 'analisa', label: 'Analisa', icon: BarChart3 });
      }
      return list;
    }

    return [
      { id: 'ringkasan', label: 'Ringkasan', icon: LayoutDashboard },
      { id: 'mutasi', label: 'Mutasi', icon: ArrowLeftRight },
      { id: 'kode', label: 'Saldo Bahan', icon: Layers },
      ...(hasBsppAccess ? [{ id: 'bspp', label: 'BSPP', icon: Scale }] : []),
    ];
  }, [isPublicView, publicConfig, hasBsppAccess]);

  const showMenuBtn = !isPublicView;
  const totalCount = tabs.length + (showMenuBtn ? 1 : 0);
  const gridColsClass = totalCount === 3 
    ? 'grid-cols-3' 
    : totalCount === 4 
      ? 'grid-cols-4' 
      : 'grid-cols-5';

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)] shadow-lg transition-colors">
      <div className={`grid ${gridColsClass} items-center h-15`}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className="flex flex-col items-center justify-center min-h-[44px] py-1 transition-colors group cursor-pointer"
            >
              <div className={`p-1 rounded-xl transition-all ${isActive ? 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60' : 'text-slate-500 dark:text-slate-400'}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[10.5px] font-medium tracking-tight mt-0.5 ${isActive ? 'text-blue-700 dark:text-blue-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* Menu / Lainnya (Hanya untuk Internal / Admin) */}
        {showMenuBtn && (
          <button
            onClick={onOpenMenu}
            className="flex flex-col items-center justify-center min-h-[44px] py-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
          >
            <div className="p-1 rounded-xl">
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="text-[10.5px] font-medium tracking-tight mt-0.5">
              Menu
            </span>
          </button>
        )}
      </div>
    </nav>
  );
};
