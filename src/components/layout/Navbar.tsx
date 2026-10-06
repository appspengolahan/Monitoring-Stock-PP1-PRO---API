import React, { useState, useRef, useEffect } from 'react';
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
  PanelLeftOpen,
  Users,
  KeyRound,
  Sparkles,
  Sliders,
  Grid,
  Bot
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
  onOpenUserManagement?: () => void;
  onOpenChangePassword?: () => void;
  onOpenAIBot?: () => void;
  onOpenAILogistik?: () => void;
  onOpenSktSkmSettings?: () => void;
  onLogout: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onOpenInstall?: () => void;
  canInstall?: boolean;
  isInstalled?: boolean;
}

export const Navbar: React.FC<NavbarProps> = React.memo(({
  session,
  onChangeRole,
  onRefresh,
  isRefreshing,
  lastUpdated,
  onOpenHelp,
  onOpenMigration,
  onOpenSwitchApp,
  onOpenUserManagement,
  onOpenChangePassword,
  onOpenAIBot,
  onOpenAILogistik,
  onOpenSktSkmSettings,
  onLogout,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
  isFullscreen = false,
  onToggleFullscreen,
  onOpenInstall,
  isInstalled = false
}) => {
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  
  const toolsRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  const roles: UserRole[] = [
    'Web Developer',
    'Site Engineer / PM',
    'Admin Produksi',
    'Staff Operasional'
  ];

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setIsToolsOpen(false);
      }
      if (roleRef.current && !roleRef.current.contains(event.target as Node)) {
        setIsRoleOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Total available extra tools to show dynamic badge count
  const availableToolsCount = [
    session.hasDevAccess,
    true, // Switch Board
    !!onOpenAILogistik,
    !!onOpenSktSkmSettings,
    !!onOpenInstall && !isInstalled,
    !!onOpenAIBot,
    !!onOpenChangePassword,
    !!onToggleFullscreen
  ].filter(Boolean).length;

  return (
    <header className="shrink-0 sticky top-0 z-30 bg-white border-b border-slate-200 px-3 sm:px-4 lg:px-6 py-2.5 transition-colors shadow-xs">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Zone 1: Brand & Sidebar Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Toggle Sidebar Button (Desktop) */}
          {onToggleSidebarCollapse && (
            <button
              onClick={onToggleSidebarCollapse}
              className="hidden lg:flex items-center justify-center p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
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
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"></span>
              <h1 className="text-sm sm:text-base lg:text-lg font-bold tracking-tight text-slate-900 truncate">
                Monitoring Stock Persediaan
              </h1>
            </div>
            <p className="text-[11px] sm:text-[12px] text-slate-600 flex items-center gap-1.5 truncate">
              <span>Divisi Produksi I</span>
              <span aria-hidden="true" className="text-slate-400">·</span>
              <span>PT Batu Karang</span>
              <span aria-hidden="true" className="text-slate-400 hidden sm:inline">·</span>
              <span className="text-slate-500 font-mono text-[10.5px] tabular-nums hidden md:inline">
                {lastUpdated ? `Sync: ${new Date(lastUpdated).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Aktif'}
              </span>
            </p>
          </div>
        </div>

        {/* Zone 2: Compact Actions & Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* 1. Tombol Utama: Refresh Data (Selalu tampak langsung untuk kemudahan operasional) */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 transition-colors shadow-2xs cursor-pointer"
            title="Ambil data terbaru dari Google Sheets"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Memuat...' : 'Refresh'}</span>
          </button>

          {/* 2. Dropdown Dinamis: Gabungan Seluruh Menu Alat & Fitur */}
          <div className="relative" ref={toolsRef}>
            <button
              type="button"
              onClick={() => {
                setIsToolsOpen(prev => !prev);
                setIsRoleOpen(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs ${
                isToolsOpen
                  ? 'bg-blue-50 text-blue-800 border-blue-300 ring-2 ring-blue-500/20'
                  : 'bg-slate-100 hover:bg-slate-200/90 text-slate-800 border-slate-200/90'
              }`}
              title="Akses cepat ke alat, modul AI, dan pengaturan"
            >
              <Grid className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="hidden md:inline">Menu Alat &amp; Fitur</span>
              <span className="md:hidden">Menu</span>
              <span className="text-[10px] bg-white border border-slate-200 text-slate-600 px-1.5 py-0.2 rounded-full font-mono font-bold">
                {availableToolsCount}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isToolsOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Panel Dropdown Dinamis */}
            {isToolsOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150 select-none">
                <div className="px-2.5 py-1.5 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Menu &amp; Fitur Terintegrasi
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Akses Cepat
                  </span>
                </div>

                <div className="py-1 space-y-1 max-h-[75vh] overflow-y-auto">
                  {/* Kelompok 1: Kecerdasan Buatan (AI) */}
                  {(onOpenAILogistik || onOpenAIBot) && (
                    <div className="pt-1">
                      <div className="px-2.5 py-1 text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                        Fitur Intelijen AI
                      </div>
                      {onOpenAILogistik && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsToolsOpen(false);
                            onOpenAILogistik();
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:text-indigo-900 hover:bg-indigo-50/70 transition-colors cursor-pointer text-left"
                        >
                          <div className="p-1.5 rounded-md bg-indigo-100 text-indigo-700 shrink-0">
                            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              <span>AI Logistik &amp; Prediksi</span>
                              <span className="text-[9px] px-1 bg-indigo-100 text-indigo-700 rounded font-mono">Modul</span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">Runout stock, ROP &amp; audit susut</div>
                          </div>
                        </button>
                      )}

                      {onOpenAIBot && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsToolsOpen(false);
                            onOpenAIBot();
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:text-indigo-900 hover:bg-indigo-50/70 transition-colors cursor-pointer text-left"
                        >
                          <div className="p-1.5 rounded-md bg-indigo-100 text-indigo-700 shrink-0">
                            <Bot className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              <span>AI Stock Bot</span>
                              <span className="text-[9px] px-1 bg-indigo-100 text-indigo-700 rounded font-mono">Gemini</span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">Asisten cerdas tanya-jawab stok</div>
                          </div>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Kelompok 2: Modul & Operasional */}
                  <div className="pt-1 border-t border-slate-100">
                    <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Operasional &amp; Pengaturan
                    </div>

                    {/* Switch Board */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsOpen(false);
                        onOpenSwitchApp();
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer text-left"
                    >
                      <div className="p-1.5 rounded-md bg-slate-100 text-slate-700 shrink-0">
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900">Switch Board Susut</div>
                        <div className="text-[11px] text-slate-500 truncate">Beralih ke monitoring susut bahan</div>
                      </div>
                    </button>

                    {/* Pengaturan Jalur SKT/SKM */}
                    {onOpenSktSkmSettings && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsOpen(false);
                          onOpenSktSkmSettings();
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:text-amber-900 hover:bg-amber-50/70 transition-colors cursor-pointer text-left"
                      >
                        <div className="p-1.5 rounded-md bg-amber-100 text-amber-800 shrink-0">
                          <Sliders className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900">Pengaturan Jalur SKT / SKM</div>
                          <div className="text-[11px] text-slate-500 truncate">Pemisahan arus rokok tangan vs mesin</div>
                        </div>
                      </button>
                    )}

                    {/* Headless GAS API */}
                    {session.hasDevAccess && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsOpen(false);
                          onOpenMigration();
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:text-blue-900 hover:bg-blue-50/70 transition-colors cursor-pointer text-left"
                      >
                        <div className="p-1.5 rounded-md bg-blue-100 text-blue-700 shrink-0">
                          <Database className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>Headless GAS API</span>
                            <span className="text-[9px] px-1 bg-blue-100 text-blue-700 rounded font-mono">Dev</span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">REST API Google Apps Script</div>
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Kelompok 3: Perangkat & Tampilan */}
                  <div className="pt-1 border-t border-slate-100">
                    <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Tampilan &amp; Perangkat
                    </div>

                    {/* Fullscreen */}
                    {onToggleFullscreen && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsOpen(false);
                          onToggleFullscreen();
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer text-left"
                      >
                        <div className="p-1.5 rounded-md bg-slate-100 text-slate-700 shrink-0">
                          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900">
                            {isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh (Fullscreen)'}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {isFullscreen ? 'Kembalikan tampilan normal' : 'Maksimalkan ruang kerja monitor'}
                          </div>
                        </div>
                      </button>
                    )}

                    {/* Install PWA */}
                    {onOpenInstall && !isInstalled && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsOpen(false);
                          onOpenInstall();
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:text-emerald-900 hover:bg-emerald-50/70 transition-colors cursor-pointer text-left"
                      >
                        <div className="p-1.5 rounded-md bg-emerald-100 text-emerald-700 shrink-0">
                          <Smartphone className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900">Pasang Aplikasi (PWA)</div>
                          <div className="text-[11px] text-slate-500 truncate">Install ke layar utama HP / Laptop</div>
                        </div>
                      </button>
                    )}

                    {/* Ganti Password Mandiri */}
                    {onOpenChangePassword && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsOpen(false);
                          onOpenChangePassword();
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:text-amber-900 hover:bg-amber-50/70 transition-colors cursor-pointer text-left"
                      >
                        <div className="p-1.5 rounded-md bg-amber-100 text-amber-700 shrink-0">
                          <KeyRound className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900">Ganti Password</div>
                          <div className="text-[11px] text-slate-500 truncate">Ubah kata sandi akun aktif</div>
                        </div>
                      </button>
                    )}

                    {/* Bantuan */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsOpen(false);
                        onOpenHelp();
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer text-left"
                    >
                      <div className="p-1.5 rounded-md bg-slate-100 text-slate-700 shrink-0">
                        <HelpCircle className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900">Petunjuk Penggunaan</div>
                        <div className="text-[11px] text-slate-500 truncate">Bantuan &amp; panduan monitoring stok</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Profil Pengguna & Pilihan Peran (RBAC) */}
          <div className="relative" ref={roleRef}>
            <button
              type="button"
              onClick={() => {
                setIsRoleOpen(prev => !prev);
                setIsToolsOpen(false);
              }}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 cursor-pointer transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
              <div className="flex flex-col text-left leading-tight hidden lg:block">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Peran</span>
                <span className="font-semibold text-slate-900 truncate max-w-[110px]">{session.role}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isRoleOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Role Dropdown */}
            {isRoleOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150 select-none">
                <div className="px-2.5 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-600">
                  PILIH PERAN PENGGUNA (RBAC)
                </div>
                <div className="py-1 space-y-0.5">
                  {roles.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        onChangeRole(r);
                        setIsRoleOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
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

                <div className="mt-1 pt-1.5 border-t border-slate-100 space-y-1">
                  <div className="px-2.5 py-1 text-[11px] text-slate-500 truncate">
                    User: <span className="font-medium text-slate-700">{session.nama}</span>
                  </div>
                  {session.canManageUsers && onOpenUserManagement && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsRoleOpen(false);
                        onOpenUserManagement();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-blue-700 hover:bg-blue-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>Pengaturan Hak Akses</span>
                    </button>
                  )}
                  {onOpenChangePassword && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsRoleOpen(false);
                        onOpenChangePassword();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-700 hover:bg-amber-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                      <span>Ganti Password Mandiri</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRoleOpen(false);
                      onLogout();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    <span>Keluar / Ganti Akun</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 4. Logout Cepat (Ikon) */}
          <button
            onClick={onLogout}
            className="p-1.5 sm:p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            title="Keluar / Ganti Akun"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
});
