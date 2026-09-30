import React, { useState } from 'react';
import { 
  RotateCw, 
  Maximize2, 
  Minimize2, 
  ShieldCheck, 
  ChevronDown, 
  HelpCircle, 
  LogOut,
  Layers,
  Database,
  Smartphone,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { UserSession, UserRole } from '../../types';

interface NavbarProps {
  session: UserSession;
  onChangeRole: (newRole: UserRole) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  lastUpdated: string | null;
  onOpenHelp: () => void;
  onOpenMigration: () => void;
  onOpenSwitchApp: () => void;
  onLogout: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onOpenInstall?: () => void;
  canInstall?: boolean;
  isInstalled?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  session,
  onChangeRole,
  onRefresh,
  isRefreshing,
  lastUpdated,
  onOpenHelp,
  onOpenMigration,
  onOpenSwitchApp,
  onLogout,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
  isFullscreen = false,
  onToggleFullscreen,
  onOpenInstall,
  isInstalled = false
}) => {
  const roles: UserRole[] = [
    'Project Manager',
    'Kepala Bagian',
    'Mandor Penerimaan',
    'Mandor Sortasi',
    'Mandor Rajang',
    'Admin Gudang',
    'Admin Produksi'
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 transition-colors shadow-2xs">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        {/* Zone 1: Brand & Sidebar Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Toggle Sidebar Button (Desktop) */}
          {onToggleSidebarCollapse && (
            <button
              onClick={onToggleSidebarCollapse}
              className="hidden lg:flex items-center justify-center p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors shadow-2xs"
              title={isSidebarCollapsed ? "Perlebar Sidebar Menu" : "Perkecil Sidebar (Hanya Ikon)"}
              aria-label="Toggle Sidebar"
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-blue-600" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-slate-600" />
              )}
            </button>
          )}

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"></span>
              <h1 className="text-xs sm:text-base lg:text-lg font-bold tracking-tight text-slate-900 truncate">
                Monitoring Stock PP1
              </h1>
            </div>
            <p className="text-[10px] sm:text-[12px] text-slate-500 flex items-center gap-1 truncate">
              <span>Divisi Produksi I</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>PT Batu Karang</span>
              <span aria-hidden="true" className="text-slate-300 hidden sm:inline">·</span>
              <span className="text-slate-500 font-mono text-[10.5px] tabular-nums hidden sm:inline">
                {lastUpdated ? `Sync: ${new Date(lastUpdated).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : 'Aktif'}
              </span>
            </p>
          </div>
        </div>

        {/* Zone 2: Desktop Quick Access Links */}
        <div className="hidden md:flex items-center gap-2">
          {/* Headless GAS API */}
          <button
            onClick={onOpenMigration}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all shadow-2xs"
            title="Integrasi Headless GAS REST API"
          >
            <Database className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="whitespace-nowrap">Headless GAS API</span>
          </button>

          {/* Switch Board button */}
          <button
            onClick={onOpenSwitchApp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100/90 hover:bg-slate-200/90 border border-slate-200 transition-all"
            title="Pindah Board Monitoring Susut"
          >
            <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="whitespace-nowrap">Switch Board</span>
          </button>
        </div>

        {/* Zone 3: Actions & Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Fullscreen Button (Handphone & PC) */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className={`p-1.5 sm:p-2 rounded-lg border transition-all ${
                isFullscreen 
                  ? 'bg-blue-50 border-blue-300 text-blue-700' 
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
              title={isFullscreen ? "Keluar Layar Penuh" : "Mode Layar Penuh"}
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-blue-600" />
              ) : (
                <Maximize2 className="w-4 h-4 text-slate-600" />
              )}
            </button>
          )}

          {/* PWA Install Button (Always prominent or opens modal guide) */}
          {onOpenInstall && !isInstalled && (
            <button
              onClick={onOpenInstall}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-semibold rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all shadow-2xs"
              title="Pasang Aplikasi ke Layar Utama HP / PC"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="hidden sm:inline">Install HP</span>
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:py-2 text-xs font-semibold rounded-lg text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 transition-colors shadow-xs"
            title="Ambil data terkini dari Google Sheets"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Memuat...' : 'Refresh'}</span>
          </button>

          {/* Role Selector */}
          <div className="relative group">
            <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 cursor-pointer transition-colors">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <span className="font-semibold text-slate-900 truncate max-w-[85px] sm:max-w-[120px] text-[11px] sm:text-xs">
                {session.role}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </div>

            {/* Role Dropdown */}
            <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-lg p-1 hidden group-hover:block z-50">
              <div className="px-2.5 py-1 border-b border-slate-100 text-[10px] font-semibold text-slate-500 uppercase">
                Peran Pengguna (RBAC)
              </div>
              {roles.map(r => (
                <button
                  key={r}
                  onClick={() => onChangeRole(r)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                    session.role === r
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{r}</span>
                  {session.role === r && <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>}
                </button>
              ))}
            </div>
          </div>

          {/* Logout / Switch User */}
          <button
            onClick={onLogout}
            className="p-1.5 sm:p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
            title="Keluar / Ganti Akun"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
