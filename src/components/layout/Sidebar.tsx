import React from 'react';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Layers, 
  Scale, 
  BarChart3, 
  Database, 
  ExternalLink, 
  ShieldCheck, 
  Factory,
  Radio,
  PanelLeftClose,
  PanelLeftOpen,
  Maximize2,
  Minimize2,
  Smartphone,
  Users,
  Bot,
  Sparkles,
  Sliders
} from 'lucide-react';
import { UserSession } from '../../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  session: UserSession;
  onOpenMigration: () => void;
  onOpenSwitchApp: () => void;
  onOpenUserManagement?: () => void;
  onOpenAIBot?: () => void;
  onOpenSktSkmSettings?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onOpenInstall?: () => void;
  isInstalled?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  session,
  onOpenMigration,
  onOpenSwitchApp,
  onOpenUserManagement,
  onOpenAIBot,
  onOpenSktSkmSettings,
  isCollapsed = false,
  onToggleCollapse,
  isFullscreen = false,
  onToggleFullscreen,
  onOpenInstall,
  isInstalled = false
}) => {
  const hasBsppAccess = React.useMemo(() => {
    if (!session.allowedKomoditas || session.allowedKomoditas.includes('*') || session.allowedKomoditas.includes('all')) {
      return true;
    }
    return session.allowedKomoditas.some(ak => {
      const lower = ak.toLowerCase();
      return lower.includes('cengkeh') || lower.includes('tembakau') || lower.includes('krosok') || lower.includes('rajang');
    });
  }, [session.allowedKomoditas]);

  const hasAIAccess = React.useMemo(() => {
    if (!session || !session.role) return false;
    const roleLower = session.role.toLowerCase();
    return !roleLower.includes('staff');
  }, [session?.role]);

  const menuItems = [
    {
      id: 'ringkasan',
      label: 'Ringkasan Stok',
      desc: '4 Bahan Baku Utama',
      icon: LayoutDashboard
    },
    {
      id: 'mutasi',
      label: 'Mutasi Terbaru',
      desc: 'Lintas Komoditas & Filter',
      icon: ArrowLeftRight
    },
    {
      id: 'kode',
      label: 'Saldo Kode / Grade',
      desc: 'Live & Snapshot Tanggal',
      icon: Layers
    },
    ...(hasBsppAccess ? [{
      id: 'bspp',
      label: 'BSPP & Selisih',
      desc: 'Cengkeh & Rajang II',
      icon: Scale
    }] : []),
    {
      id: 'analisa',
      label: 'Analisa & Ringkasan',
      desc: 'Pergerakan & Validasi',
      icon: BarChart3
    },
    ...(hasAIAccess ? [{
      id: 'ai_logistik',
      label: 'AI Logistik & Prediksi',
      desc: 'Runout, ROP & Audit Susut',
      icon: Sparkles
    }] : [])
  ];

  return (
    <aside 
      className={`bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none transition-all duration-300 ease-in-out relative ${
        isCollapsed ? 'w-18' : 'w-64 xl:w-72'
      }`}
    >
      {/* Brand Header */}
      <div className={`p-4 border-b border-slate-800/80 flex flex-col justify-between ${isCollapsed ? 'items-center px-2' : ''}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} w-full`}>
          <div className="flex items-center gap-3 min-w-0">
            <button 
              className="w-10 h-10 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 cursor-pointer shadow-sm transition-colors"
              onClick={onToggleCollapse}
              title={isCollapsed ? "Klik untuk lebarkan sidebar (Expand)" : "PT Batu Karang"}
            >
              <Factory className="w-5 h-5 text-blue-400" />
            </button>
            {!isCollapsed && (
              <div className="min-w-0 animate-in fade-in duration-200">
                <h2 className="text-sm font-bold text-white tracking-tight truncate">
                  PT BATU KARANG
                </h2>
                <p className="text-[11.5px] text-slate-400 font-medium truncate">
                  Divisi Produksi I (PP1)
                </p>
              </div>
            )}
          </div>

          {/* Toggle Button in Header */}
          {!isCollapsed && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
              title="Perkecil menu sidebar (Sembunyikan teks / Sisakan ikon)"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* User Role Card in Sidebar */}
        {!isCollapsed ? (
          <div className="mt-4 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Akses Aktif</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Live
              </span>
            </div>
            <div className="text-sm font-semibold text-white truncate">
              {session.nama}
            </div>
            <div className="text-[12px] text-blue-300 font-medium truncate">
              {session.role}
            </div>
          </div>
        ) : (
          <div 
            className="mt-3 w-10 h-10 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-center justify-center text-blue-400 cursor-pointer relative group"
            title={`${session.nama} (${session.role}) - Akses Aktif`}
          >
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400"></span>
            
            {/* Tooltip on Hover */}
            <div className="absolute left-full ml-3 px-3 py-2 bg-slate-800 text-white rounded-lg shadow-xl text-xs whitespace-nowrap hidden group-hover:block z-50 border border-slate-700 pointer-events-none">
              <p className="font-bold">{session.nama}</p>
              <p className="text-[11px] text-blue-300">{session.role}</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <div className={`flex-1 py-4 space-y-1.5 overflow-y-auto ${isCollapsed ? 'px-2' : 'px-3'}`}>
        {!isCollapsed && (
          <div className="px-3 pb-2 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
            Modul Operasional
          </div>
        )}

        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <div key={item.id} className="relative group">
              <button
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center rounded-xl transition-all ${
                  isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5 text-left'
                } ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                }`}
                title={isCollapsed ? `${item.label} - ${item.desc}` : undefined}
              >
                <Icon className={`shrink-0 w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {!isCollapsed && (
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate leading-tight">
                      {item.label}
                    </div>
                    <div className={`text-[10.5px] truncate ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                      {item.desc}
                    </div>
                  </div>
                )}
              </button>

              {/* Flyout Tooltip when collapsed */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-800 text-white rounded-lg shadow-xl text-xs whitespace-nowrap hidden group-hover:block z-50 border border-slate-700 pointer-events-none">
                  <div className="font-semibold text-white">{item.label}</div>
                  <div className="text-[10px] text-slate-400">{item.desc}</div>
                </div>
              )}
            </div>
          );
        })}

        {/* AI Stock Assistant Tab */}
        {onOpenAIBot && (
          <div className="relative group pt-1">
            <button
              onClick={onOpenAIBot}
              className={`w-full flex items-center rounded-xl transition-all ${
                isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5 text-left'
              } text-indigo-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/30 cursor-pointer shadow-2xs`}
              title={isCollapsed ? "AI Assistant (Gemini 3.8 Flash)" : undefined}
            >
              <div className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-indigo-100 animate-pulse" />
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate leading-tight text-white flex items-center gap-1.5">
                    <span>AI Stock Bot</span>
                    <span className="text-[9px] bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-1.5 py-0.2 rounded-md font-mono">
                      Gemini
                    </span>
                  </div>
                  <div className="text-[10.5px] text-indigo-300/80 truncate">
                    Tanya Jawab &amp; Audit Stok
                  </div>
                </div>
              )}
            </button>
            {isCollapsed && (
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-800 text-white rounded-lg shadow-xl text-xs whitespace-nowrap hidden group-hover:block z-50 border border-slate-700 pointer-events-none">
                <div className="font-semibold text-indigo-200 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>AI Stock Bot (Gemini)</span>
                </div>
                <div className="text-[10px] text-slate-400">Tanya Jawab &amp; Audit Cerdas</div>
              </div>
            )}
          </div>
        )}

        {(session.hasDevAccess || session.canManageUsers) && !isCollapsed && (
          <div className="pt-4 px-3 pb-2 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
            Infrastruktur &amp; Akses
          </div>
        )}
        {(session.hasDevAccess || session.canManageUsers) && isCollapsed && <div className="my-2 border-t border-slate-800" />}

        {/* GAS Headless Config Tab (Only for Dev / Site Engineer) */}
        {session.hasDevAccess && (
          <div className="relative group">
            <button
              onClick={onOpenMigration}
              className={`w-full flex items-center rounded-xl transition-all ${
                isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5 text-left'
              } text-slate-400 hover:text-slate-100 hover:bg-slate-800/70`}
              title={isCollapsed ? "Headless GAS Center (REST JSON API)" : undefined}
            >
              <Database className="w-5 h-5 text-indigo-400 shrink-0" />
              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate leading-tight text-indigo-200">
                    Headless GAS Center
                  </div>
                  <div className="text-[10.5px] text-slate-500 truncate">
                    REST JSON API &amp; Test URL
                  </div>
                </div>
              )}
            </button>
            {isCollapsed && (
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-800 text-white rounded-lg shadow-xl text-xs whitespace-nowrap hidden group-hover:block z-50 border border-slate-700 pointer-events-none">
                <div className="font-semibold text-indigo-200">Headless GAS Center</div>
                <div className="text-[10px] text-slate-400">REST JSON API &amp; Test URL</div>
              </div>
            )}
          </div>
        )}

        {/* User Management RBAC Tab */}
        {session.canManageUsers && onOpenUserManagement && (
          <div className="relative group">
            <button
              onClick={onOpenUserManagement}
              className={`w-full flex items-center rounded-xl transition-all ${
                isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5 text-left'
              } text-slate-400 hover:text-slate-100 hover:bg-slate-800/70`}
              title={isCollapsed ? "Pengaturan Hak Akses Staf (RBAC)" : undefined}
            >
              <Users className="w-5 h-5 text-blue-400 shrink-0" />
              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate leading-tight text-blue-200">
                    Hak Akses Staf
                  </div>
                  <div className="text-[10.5px] text-slate-500 truncate">
                    Atur Pembatasan Bahan Baku
                  </div>
                </div>
              )}
            </button>
            {isCollapsed && (
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-800 text-white rounded-lg shadow-xl text-xs whitespace-nowrap hidden group-hover:block z-50 border border-slate-700 pointer-events-none">
                <div className="font-semibold text-blue-200">Hak Akses Staf</div>
                <div className="text-[10px] text-slate-400">Atur Pembatasan Bahan Baku</div>
              </div>
            )}
          </div>
        )}

        {/* Jalur SKT & SKM Configuration Tab */}
        {onOpenSktSkmSettings && (
          <div className="relative group">
            <button
              onClick={onOpenSktSkmSettings}
              className={`w-full flex items-center rounded-xl transition-all cursor-pointer ${
                isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5 text-left'
              } text-slate-400 hover:text-slate-100 hover:bg-slate-800/70`}
              title={isCollapsed ? "Pengaturan Jalur SKT & SKM per Bahan" : undefined}
            >
              <Sliders className="w-5 h-5 text-amber-400 shrink-0" />
              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate leading-tight text-amber-200">
                    Jalur SKT &amp; SKM
                  </div>
                  <div className="text-[10.5px] text-slate-500 truncate">
                    Checklist Bahan Aktif / Pasif
                  </div>
                </div>
              )}
            </button>
            {isCollapsed && (
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-800 text-white rounded-lg shadow-xl text-xs whitespace-nowrap hidden group-hover:block z-50 border border-slate-700 pointer-events-none">
                <div className="font-semibold text-amber-200">Jalur SKT &amp; SKM</div>
                <div className="text-[10px] text-slate-400">Checklist Bahan Aktif / Pasif</div>
              </div>
            )}
          </div>
        )}

        {/* Switch Board Susut */}
        <div className="relative group">
          <button
            onClick={onOpenSwitchApp}
            className={`w-full flex items-center rounded-xl transition-all ${
              isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5 text-left'
            } text-slate-400 hover:text-slate-100 hover:bg-slate-800/70`}
            title={isCollapsed ? "Switch Board Susut (Blend, Cengkeh, Tembakau)" : undefined}
          >
            <ExternalLink className="w-5 h-5 text-emerald-400 shrink-0" />
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate leading-tight text-emerald-200">
                  Switch Board Susut
                </div>
                <div className="text-[10.5px] text-slate-500 truncate">
                  Blend, Cengkeh, Tembakau
                </div>
              </div>
            )}
          </button>
          {isCollapsed && (
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-800 text-white rounded-lg shadow-xl text-xs whitespace-nowrap hidden group-hover:block z-50 border border-slate-700 pointer-events-none">
              <div className="font-semibold text-emerald-200">Switch Board Susut</div>
              <div className="text-[10px] text-slate-400">Blend, Cengkeh, Tembakau</div>
            </div>
          )}
        </div>

        {/* Fullscreen Quick Action in Sidebar */}
        {onToggleFullscreen && (
          <div className="relative group">
            <button
              onClick={onToggleFullscreen}
              className={`w-full flex items-center rounded-xl transition-all ${
                isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5 text-left'
              } text-slate-400 hover:text-slate-100 hover:bg-slate-800/70`}
              title={isCollapsed ? (isFullscreen ? "Keluar Layar Penuh" : "Mode Layar Penuh") : undefined}
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5 text-blue-400 shrink-0" />
              ) : (
                <Maximize2 className="w-5 h-5 text-slate-400 shrink-0" />
              )}
              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate leading-tight text-slate-300">
                    {isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh'}
                  </div>
                  <div className="text-[10.5px] text-slate-500 truncate">
                    {isFullscreen ? 'Tampilan normal' : 'Fullscreen HP & PC'}
                  </div>
                </div>
              )}
            </button>
            {isCollapsed && (
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-800 text-white rounded-lg shadow-xl text-xs whitespace-nowrap hidden group-hover:block z-50 border border-slate-700 pointer-events-none">
                <div className="font-semibold text-white">{isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh'}</div>
                <div className="text-[10px] text-slate-400">Layar lega tanpa browser bar</div>
              </div>
            )}
          </div>
        )}

        {/* Install Mobile PWA Button in Sidebar */}
        {onOpenInstall && !isInstalled && (
          <div className="relative group">
            <button
              onClick={onOpenInstall}
              className={`w-full flex items-center rounded-xl transition-all ${
                isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5 text-left'
              } bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-800/40`}
              title={isCollapsed ? "Install Aplikasi ke HP" : undefined}
            >
              <Smartphone className="w-5 h-5 text-emerald-400 shrink-0" />
              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate leading-tight text-emerald-300">
                    Install di Handphone
                  </div>
                  <div className="text-[10.5px] text-emerald-500 truncate">
                    Pasang ke Home Screen
                  </div>
                </div>
              )}
            </button>
            {isCollapsed && (
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-800 text-white rounded-lg shadow-xl text-xs whitespace-nowrap hidden group-hover:block z-50 border border-slate-700 pointer-events-none">
                <div className="font-semibold text-emerald-300">Install di HP</div>
                <div className="text-[10px] text-slate-400">Pasang ke Layar Utama</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Info or Expand Toggle when collapsed */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-500">
        {!isCollapsed ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span>Backend GAS:</span>
              <span className="text-slate-400 font-mono text-[10px]">Headless REST</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Telegram Bot:</span>
              <span className="text-emerald-400 font-mono text-[10px] flex items-center gap-1">
                <Radio className="w-2.5 h-2.5" /> Polling 1m
              </span>
            </div>
            <div className="pt-2 text-[10px] text-slate-600 text-center border-t border-slate-800/60 flex items-center justify-between">
              <span className="truncate">PT Batu Karang</span>
              <button
                onClick={onToggleCollapse}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
                title="Sembunyikan Sidebar"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <button
              onClick={onToggleCollapse}
              className="p-2.5 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white hover:bg-blue-600 transition-all shadow-sm group relative"
              title="Buka / Lebarkan Menu Sidebar (Expand)"
            >
              <PanelLeftOpen className="w-5 h-5 text-blue-400 group-hover:text-white" />
              <div className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white rounded text-xs whitespace-nowrap hidden group-hover:block z-50 border border-slate-700 pointer-events-none">
                Buka Menu (Expand)
              </div>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
