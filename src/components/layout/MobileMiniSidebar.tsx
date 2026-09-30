import React from 'react';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Layers, 
  Scale, 
  LineChart,
  RotateCw,
  Maximize2,
  Minimize2,
  Database,
  Smartphone,
  ShieldCheck,
  HelpCircle,
  LogOut,
  ChevronRight,
  MoreVertical
} from 'lucide-react';
import { UserSession } from '../../types';

interface MobileMiniSidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenMigration: () => void;
  onOpenSwitchApp: () => void;
  onOpenHelp: () => void;
  onOpenInstall: () => void;
  onOpenMenu: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  session: UserSession;
  isInstalled: boolean;
}

export const MobileMiniSidebar: React.FC<MobileMiniSidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenMigration,
  onOpenInstall,
  onOpenMenu,
  onRefresh,
  isRefreshing,
  isFullscreen,
  onToggleFullscreen,
  session,
  isInstalled
}) => {
  const mainNavItems = [
    { id: 'ringkasan', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'mutasi', label: 'Mutasi', icon: ArrowLeftRight },
    { id: 'kode', label: 'Saldo Kode', icon: Layers },
    { id: 'bspp', label: 'BSPP', icon: Scale },
    { id: 'analisa', label: 'Analisa', icon: LineChart },
  ];

  return (
    <aside className="lg:hidden flex flex-col items-center justify-between w-14 bg-slate-900 border-r border-slate-800 py-3 shrink-0 select-none z-30 shadow-md">
      {/* Top: Logo Mini */}
      <div className="flex flex-col items-center gap-3">
        <div 
          className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-500/20"
          title="Stock PP1 - PT Batu Karang"
        >
          PP1
        </div>

        {/* Refresh Action Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white flex items-center justify-center transition-all disabled:opacity-50"
          title="Refresh Data dari Google Sheets"
        >
          <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Middle: Tab Navigation Icons */}
      <nav className="flex flex-col items-center gap-2 my-auto py-2">
        {mainNavItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={item.label}
              aria-label={item.label}
            >
              <Icon className="w-5 h-5 stroke-[2.2]" />
              {isActive && (
                <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom: Quick Utility Actions */}
      <div className="flex flex-col items-center gap-2 pt-2 border-t border-slate-800/80 w-full px-2">
        {/* Fullscreen Toggle */}
        <button
          onClick={onToggleFullscreen}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
            isFullscreen 
              ? 'bg-blue-950 text-blue-400 border border-blue-800' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh HP'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Install App Button (if not installed) */}
        {!isInstalled && (
          <button
            onClick={onOpenInstall}
            className="w-9 h-9 rounded-xl bg-emerald-950 text-emerald-400 hover:bg-emerald-900 border border-emerald-800/80 flex items-center justify-center transition-all shadow-xs"
            title="Install ke Layar Utama Ponsel"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        )}

        {/* Headless GAS API Quick Access */}
        <button
          onClick={onOpenMigration}
          className="w-9 h-9 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-slate-800 flex items-center justify-center transition-all"
          title="Headless GAS REST API"
        >
          <Database className="w-4 h-4" />
        </button>

        {/* More Menu Drawer Trigger */}
        <button
          onClick={onOpenMenu}
          className="w-9 h-9 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-all"
          title="Buka Menu Lainnya"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
