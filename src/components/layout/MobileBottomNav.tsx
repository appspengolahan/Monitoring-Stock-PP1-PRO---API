import React from 'react';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Layers, 
  Scale, 
  MoreHorizontal
} from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenMenu
}) => {
  const tabs = [
    { id: 'ringkasan', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'mutasi', label: 'Mutasi', icon: ArrowLeftRight },
    { id: 'kode', label: 'Saldo Kode', icon: Layers },
    { id: 'bspp', label: 'BSPP', icon: Scale },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-[env(safe-area-inset-bottom)] shadow-lg">
      <div className="grid grid-cols-5 items-center h-15">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className="flex flex-col items-center justify-center min-h-[44px] py-1 transition-colors group"
            >
              <div className={`p-1 rounded-xl transition-all ${isActive ? 'text-blue-700 bg-blue-50' : 'text-slate-500'}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[10.5px] font-medium tracking-tight mt-0.5 ${isActive ? 'text-blue-700 font-semibold' : 'text-slate-500'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* Menu / Lainnya */}
        <button
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center min-h-[44px] py-1 text-slate-500 hover:text-slate-900 transition-colors"
        >
          <div className="p-1 rounded-xl">
            <MoreHorizontal className="w-5 h-5" />
          </div>
          <span className="text-[10.5px] font-medium tracking-tight mt-0.5">
            Menu
          </span>
        </button>
      </div>
    </nav>
  );
};
