/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { KomoditasData, BSPPData, UserSession, UserRole, PublicPortalConfig } from './types';
import { GasService } from './services/gasService';
import { PublicPortalService } from './services/publicPortalService';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { OverviewCards } from './components/dashboard/OverviewCards';
import { MutasiPanel } from './components/dashboard/MutasiPanel';
import { SaldoKodePanel } from './components/dashboard/SaldoKodePanel';
import { BSPPPanel } from './components/dashboard/BSPPPanel';
import { AnalyticsCharts } from './components/dashboard/AnalyticsCharts';
import { AILogistikPanel } from './components/dashboard/AILogistikPanel';
import { HelpModal } from './components/modals/HelpModal';
import { GasMigrationModal } from './components/modals/GasMigrationModal';
import { SwitchAppModal } from './components/modals/SwitchAppModal';
import { LoginModal } from './components/modals/LoginModal';
import { InstallModal } from './components/modals/InstallModal';
import { UserManagementModal } from './components/modals/UserManagementModal';
import { ChangePasswordModal } from './components/modals/ChangePasswordModal';
import { AISmartInsights } from './components/dashboard/AISmartInsights';
import { AIBotModal } from './components/modals/AIBotModal';
import { SktSkmSettingsModal } from './components/modals/SktSkmSettingsModal';
import { SystemAuditReportModal } from './components/modals/SystemAuditReportModal';
import { PublicPortalSettingsModal } from './components/modals/PublicPortalSettingsModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { StockEstimationService } from './services/stockEstimationService';
import { useFullscreen } from './hooks/useFullscreen';
import { usePWAInstall } from './hooks/usePWAInstall';
import { useTheme } from './hooks/useTheme';
import { 
  Wifi, 
  RotateCw, 
  Layers, 
  Database, 
  ShieldCheck, 
  Calendar, 
  CheckCircle2, 
  Info,
  Menu,
  X,
  ExternalLink,
  Maximize2,
  Minimize2,
  Smartphone,
  Users,
  Lock,
  KeyRound,
  Bot,
  Sparkles,
  FileCheck2,
  Share2,
  Sun,
  Moon
} from 'lucide-react';

export default function App() {
  // 0. Public Portal View Detection & Configuration
  const [isPublicView] = useState<boolean>(() => PublicPortalService.isPublicView());
  const [publicConfig, setPublicConfig] = useState<PublicPortalConfig>(() => PublicPortalService.getConfig());
  const [isPublicPortalSettingsOpen, setIsPublicPortalSettingsOpen] = useState<boolean>(false);

  // 1. Initial cached data (Instant 0.01s load)
  const [komoditasList, setKomoditasList] = useState<KomoditasData[]>(() => GasService.getCachedKomoditas());
  const [bsppList, setBsppList] = useState<BSPPData[]>(() => GasService.getCachedBSPP());
  const [session, setSession] = useState<UserSession>(() => {
    if (PublicPortalService.isPublicView()) {
      return {
        nama: 'Portal Publik Tim PP1',
        email: 'publik@batukarang.com',
        role: 'Viewer Publik (Read-Only)' as any,
        hasDevAccess: false,
        isDefaultPassword: false,
        allowedKomoditas: ['*'],
        canExportPdf: false,
        canManageUsers: false,
        canAccessAI: false,
        isLoggedIn: true,
        token: 'session_public_readonly'
      };
    }
    return GasService.getCurrentSession();
  });
  const [lastSync, setLastSync] = useState<string>(() => GasService.getLastSyncTime() || new Date().toISOString());

  // 2. Active View & Filter states
  const [currentTab, setCurrentTab] = useState<string>('ringkasan');
  const [targetCommodityFilter, setTargetCommodityFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isForceFetching, setIsForceFetching] = useState<boolean>(false);
  const [isAutoRefresh, setIsAutoRefresh] = useState<boolean>(() => {
    return localStorage.getItem('monitoring_pp1_autorefresh') === 'true';
  });
  const [syncStatusNotice, setSyncStatusNotice] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('monitoring_pp1_sidebar_collapsed') === 'true';
  });

  // 3. Fullscreen, PWA & Theme Hooks
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const { isInstalled, canInstall } = usePWAInstall();
  const { theme, toggleTheme } = useTheme();

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('monitoring_pp1_sidebar_collapsed', String(next));
      return next;
    });
  }, []);

  // 4. Modal toggles
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isMigrationOpen, setIsMigrationOpen] = useState<boolean>(false);
  const [isSwitchAppOpen, setIsSwitchAppOpen] = useState<boolean>(false);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isInstallOpen, setIsInstallOpen] = useState<boolean>(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState<boolean>(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);
  const [isAIBotOpen, setIsAIBotOpen] = useState<boolean>(false);
  const [isSktSkmOpen, setIsSktSkmOpen] = useState<boolean>(false);
  const [isSystemAuditReportOpen, setIsSystemAuditReportOpen] = useState<boolean>(false);

  // Auto-detect ?page=admin query param to open login modal (hanya untuk mode internal)
  useEffect(() => {
    try {
      if (!isPublicView) {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('page') === 'admin' || urlParams.get('login') === 'true' || urlParams.get('email')) {
          setIsLoginOpen(true);
        }
      }
    } catch (e) {}

    // Sinkronkan daftar staf terdaftar dari server ke penyimpanan lokal perangkat saat aplikasi dibuka
    GasService.syncUsersWithServer().catch(err => {
      console.warn('Initial user whitelist sync notice:', err);
    });
  }, [isPublicView]);

  // Guard Proteksi Celah Keamanan Akses Publik: Pastikan tab aktif selalu berada dalam whitelist konfigurasi
  useEffect(() => {
    if (isPublicView && !PublicPortalService.isTabAllowedInPublic(currentTab, publicConfig)) {
      const fallbackTab = publicConfig.showRingkasan ? 'ringkasan' :
                          publicConfig.showMutasi ? 'mutasi' :
                          publicConfig.showSaldoKode ? 'kode' :
                          publicConfig.showBspp ? 'bspp' :
                          publicConfig.showAnalisa ? 'analisa' : 'ringkasan';
      setCurrentTab(fallbackTab);
    }
  }, [isPublicView, currentTab, publicConfig]);

  // Listen to public portal config update events
  useEffect(() => {
    const handlePortalConfigChange = (e: any) => {
      if (e.detail) {
        setPublicConfig(e.detail);
      } else {
        setPublicConfig(PublicPortalService.getConfig());
      }
    };
    window.addEventListener('stockpp1_public_portal_config_updated', handlePortalConfigChange);
    return () => {
      window.removeEventListener('stockpp1_public_portal_config_updated', handlePortalConfigChange);
    };
  }, []);

  // Redirect to an allowed tab if current tab is restricted in public view
  useEffect(() => {
    if (isPublicView) {
      if (!PublicPortalService.isTabAllowedInPublic(currentTab, publicConfig)) {
        setCurrentTab('ringkasan');
      }
    }
  }, [isPublicView, currentTab, publicConfig]);

  // Auto-refresh komoditasList when reconciliation data is fetched or updated (debounced to avoid freeze)
  useEffect(() => {
    let timeoutId: any = null;
    const handleReconUpdate = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setKomoditasList(GasService.getCachedKomoditas());
      }, 150);
    };
    window.addEventListener('stockpp1_reconciliation_data_updated', handleReconUpdate);
    return () => {
      window.removeEventListener('stockpp1_reconciliation_data_updated', handleReconUpdate);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Filtered Komoditas list according to user RBAC allowedKomoditas
  const visibleKomoditasList = React.useMemo(() => {
    if (!session.allowedKomoditas || session.allowedKomoditas.includes('*') || session.allowedKomoditas.includes('all')) {
      return komoditasList;
    }
    return komoditasList.filter(k => session.allowedKomoditas.includes(k.komoditas));
  }, [komoditasList, session.allowedKomoditas]);

  // Filtered BSPP list according to user RBAC allowedKomoditas
  const visibleBsppList = React.useMemo(() => {
    if (!session.allowedKomoditas || session.allowedKomoditas.includes('*') || session.allowedKomoditas.includes('all')) {
      return bsppList;
    }
    return bsppList.filter(b => {
      const bNama = b.nama.toLowerCase();
      return session.allowedKomoditas.some(allowed => {
        const allowedLower = allowed.toLowerCase();
        if (allowedLower === '*' || allowedLower === 'all') return true;
        // Check if allowed commodity matches BSPP commodity (e.g. "Cengkeh" -> "Cengkeh", "Tembakau" / "Krosok" -> "Tembakau & Krosok")
        if (bNama.includes(allowedLower)) return true;
        if (allowedLower.includes('cengkeh') && bNama.includes('cengkeh')) return true;
        if ((allowedLower.includes('tembakau') || allowedLower.includes('krosok')) && (bNama.includes('tembakau') || bNama.includes('krosok'))) return true;
        return false;
      });
    });
  }, [bsppList, session.allowedKomoditas]);

  const hasBsppAccess = React.useMemo(() => {
    if (!session.allowedKomoditas || session.allowedKomoditas.includes('*') || session.allowedKomoditas.includes('all')) {
      return true;
    }
    return session.allowedKomoditas.some(ak => {
      const lower = ak.toLowerCase();
      return lower.includes('cengkeh') || lower.includes('tembakau') || lower.includes('krosok') || lower.includes('rajang');
    });
  }, [session.allowedKomoditas]);

  // AI Feature access: Determined by user configuration (canAccessAI) or fallback
  const hasAIAccess = React.useMemo(() => {
    if (!session || !session.role) return false;
    if (session.canAccessAI !== undefined) return session.canAccessAI;
    const roleLower = session.role.toLowerCase();
    return !roleLower.includes('staff') && !roleLower.includes('accounting');
  }, [session?.role, session?.canAccessAI]);

  const allAvailableCommodityNames = React.useMemo(() => {
    return komoditasList.map(k => k.komoditas);
  }, [komoditasList]);

  // 5. Background sync on initial load
  useEffect(() => {
    // 5a. Immediate instant direct DHP & reconciliation refresh (~300ms)
    GasService.refreshDHPReconciliation().then(() => {
      setKomoditasList(GasService.getCachedKomoditas());
    });
    // Immediate direct BSPP Hub refresh for Blend & Rajang I
    GasService.refreshBSPPHubDirect().then((bspp) => {
      if (bspp && bspp.length > 0) setBsppList(bspp);
    }).catch(() => {});
    // Sync users & custom roles from server across all devices
    GasService.syncUsersWithServer();

    // 5b. Attempt silent background synchronization with GAS
    const initialSync = async () => {
      try {
        const res = await GasService.syncFromGas();
        if (res.data) {
          setKomoditasList(res.data.komoditas);
          setBsppList(res.data.bspp);
          setLastSync(new Date().toISOString());
        }
      } catch (e) {
        // Cached data is already displayed
      }
    };
    initialSync();
  }, []);

  // 6. Manual Refresh Handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setSyncStatusNotice('Menarik data 4 spreadsheet komoditas secara paralel...');
    try {
      const res = await GasService.syncFromGas((stage) => {
        setSyncStatusNotice(stage);
      });
      if (res.data) {
        setKomoditasList(res.data.komoditas);
        setBsppList(res.data.bspp);
        setLastSync(new Date().toISOString());
      }
      // Sinkronkan juga kalkulator resep pruf & rencana campur
      StockEstimationService.refreshFromGoogleSheets().catch(() => {});
      setSyncStatusNotice(res.message);
      setTimeout(() => setSyncStatusNotice(null), 5000);
    } catch (err: any) {
      setSyncStatusNotice('Pembaruan data selesai (menggunakan cache aktif).');
      setTimeout(() => setSyncStatusNotice(null), 4000);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // 6b. Tarik Datasheet Handler (Antisipasi data terlambat - Bypass total cache Google Sheets)
  const handleForceFetchDatasheet = useCallback(async () => {
    setIsForceFetching(true);
    setSyncStatusNotice('Memulai Tarik Datasheet: Mengambil ulang data langsung dari Google Spreadsheet...');
    try {
      const res = await GasService.forceFetchDatasheet((stage) => {
        setSyncStatusNotice(stage);
      });
      if (res.data) {
        setKomoditasList(res.data.komoditas);
        setBsppList(res.data.bspp);
        setLastSync(new Date().toISOString());
      }
      // Sinkronkan juga data master pruf & rencana campur langsung dari Google Sheets
      StockEstimationService.refreshFromGoogleSheets().catch(() => {});
      setSyncStatusNotice(res.message);
      setTimeout(() => setSyncStatusNotice(null), 6000);
    } catch (err: any) {
      setSyncStatusNotice('Tarik Datasheet selesai.');
      setTimeout(() => setSyncStatusNotice(null), 4000);
    } finally {
      setIsForceFetching(false);
    }
  }, []);

  // 6c. Toggle Auto-Refresh (Logo terus berputar saat aktif)
  const handleToggleAutoRefresh = useCallback(() => {
    setIsAutoRefresh(prev => {
      const next = !prev;
      localStorage.setItem('monitoring_pp1_autorefresh', String(next));
      if (next) {
        setSyncStatusNotice('Auto-Refresh Aktif: Otomatis memperbarui data tiap 60 detik saat tab aktif (Hemat Kuota).');
        setTimeout(() => setSyncStatusNotice(null), 4000);
      } else {
        setSyncStatusNotice('Auto-Refresh Dimatikan.');
        setTimeout(() => setSyncStatusNotice(null), 3000);
      }
      return next;
    });
  }, []);

  // Smart Auto-Refresh timer dengan Inactive Tab Detection & 60s interval hemat kuota
  useEffect(() => {
    if (!isAutoRefresh) return;

    let isFetching = false;
    const executeSync = async () => {
      // Jika tab browser sedang di-minimize atau membuka aplikasi lain, jeda sync (hemat kuota)
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      if (isFetching) return;
      isFetching = true;
      try {
        const res = await GasService.syncFromGas();
        if (res.data) {
          setKomoditasList(res.data.komoditas);
          setBsppList(res.data.bspp);
          setLastSync(new Date().toISOString());
        }
      } catch (e) {
      } finally {
        isFetching = false;
      }
    };

    // Jalankan background sync setiap 60 detik saat tab aktif
    const intervalId = setInterval(executeSync, 60000);

    // Saat operator kembali membuka tab ini setelah berpindah tab, lakukan sync segar langsung
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        executeSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAutoRefresh]);

  // 7. Optimistic Mutasi Check Toggle
  const handleToggleCek = useCallback((komoditasName: string, mutasiId: string, currentStatus: boolean) => {
    const updated = GasService.toggleMutasiCek(komoditasName, mutasiId, currentStatus);
    setKomoditasList(updated);
  }, []);

  // 8. Role change handler (RBAC)
  const handleChangeRole = useCallback((newRole: UserRole) => {
    const updated = GasService.switchRole(newRole);
    setSession(updated);
  }, []);

  // 8b. Logout handler (Clears session and locks gate)
  const handleLogout = useCallback(() => {
    GasService.logout();
    setSession(GasService.getCurrentSession());
    setIsLoginOpen(true);
  }, []);

  // 9. Jump to commodity filter
  const handleSelectCommodityFromCard = useCallback((commodityName: string) => {
    setTargetCommodityFilter(commodityName);
    setCurrentTab('mutasi');
  }, []);

  // 10. Fast tab selection handler
  const handleSelectTab = useCallback((tab: string) => {
    setCurrentTab(tab);
    setTargetCommodityFilter('all');
  }, []);

  return (
    <div className="h-screen h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans select-none overflow-hidden transition-colors duration-200">
      {/* Top Navigation */}
      <Navbar
        session={session}
        onChangeRole={handleChangeRole}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        onForceFetchDatasheet={handleForceFetchDatasheet}
        isForceFetching={isForceFetching}
        isAutoRefresh={isAutoRefresh}
        onToggleAutoRefresh={handleToggleAutoRefresh}
        lastUpdated={lastSync}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenMigration={() => setIsMigrationOpen(true)}
        onOpenSwitchApp={() => setIsSwitchAppOpen(true)}
        onOpenSystemAuditReport={() => setIsSystemAuditReportOpen(true)}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        onOpenAIBot={hasAIAccess ? () => setIsAIBotOpen(true) : undefined}
        onOpenAILogistik={hasAIAccess ? () => { setCurrentTab('ai_logistik'); setTargetCommodityFilter('all'); } : undefined}
        onOpenSktSkmSettings={() => setIsSktSkmOpen(true)}
        onOpenPublicPortalSettings={() => setIsPublicPortalSettingsOpen(true)}
        isPublicView={isPublicView}
        onLogout={handleLogout}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebarCollapse={handleToggleSidebar}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onOpenInstall={() => setIsInstallOpen(true)}
        canInstall={canInstall}
        isInstalled={isInstalled}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Workspace: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Desktop Sidebar (Locked in place) */}
        <div className="hidden lg:flex shrink-0 h-full min-h-0 z-20">
          <Sidebar
            currentTab={currentTab}
            onSelectTab={handleSelectTab}
            session={session}
            onOpenMigration={() => setIsMigrationOpen(true)}
            onOpenSwitchApp={() => setIsSwitchAppOpen(true)}
            onOpenSystemAuditReport={() => setIsSystemAuditReportOpen(true)}
            onOpenUserManagement={() => setIsUserManagementOpen(true)}
            onOpenAIBot={hasAIAccess ? () => setIsAIBotOpen(true) : undefined}
            onOpenSktSkmSettings={() => setIsSktSkmOpen(true)}
            isPublicView={isPublicView}
            publicConfig={publicConfig}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            onOpenInstall={() => setIsInstallOpen(true)}
            isInstalled={isInstalled}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        </div>

        {/* Content Area (Scrolls independently - dynamic width up to 1680px) */}
        <main className="flex-1 overflow-y-auto min-h-0 px-3 sm:px-5 lg:px-6 py-3 sm:py-4 pb-28 lg:pb-20 max-w-[1680px] mx-auto w-full select-text">
          {/* Sync notification toast */}
          {syncStatusNotice && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs sm:text-sm flex items-center justify-between shadow-2xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{syncStatusNotice}</span>
              </div>
              <button 
                onClick={() => setSyncStatusNotice(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Quick Tab Segmented Bar for Mobile / Tablet */}
          <div className="lg:hidden flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl mb-3 overflow-x-auto text-xs font-semibold select-none">
            {(!isPublicView || publicConfig.showRingkasan) && (
              <button
                onClick={() => { setCurrentTab('ringkasan'); setTargetCommodityFilter('all'); }}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                  currentTab === 'ringkasan' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600'
                }`}
              >
                Ringkasan Stok
              </button>
            )}
            {(!isPublicView || publicConfig.showMutasi) && (
              <button
                onClick={() => setCurrentTab('mutasi')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                  currentTab === 'mutasi' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600'
                }`}
              >
                Mutasi Lintas Bahan
              </button>
            )}
            {(!isPublicView || publicConfig.showSaldoKode) && (
              <button
                onClick={() => setCurrentTab('kode')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                  currentTab === 'kode' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600'
                }`}
              >
                Saldo Bahan
              </button>
            )}
            {(!isPublicView ? hasBsppAccess : publicConfig.showBspp) && (
              <button
                onClick={() => setCurrentTab('bspp')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                  currentTab === 'bspp' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600'
                }`}
              >
                BSPP
              </button>
            )}
            {(!isPublicView || publicConfig.showAnalisa) && (
              <button
                onClick={() => setCurrentTab('analisa')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                  currentTab === 'analisa' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600'
                }`}
              >
                Analisa
              </button>
            )}
            {!isPublicView && hasAIAccess && (
              <button
                onClick={() => setCurrentTab('ai_logistik')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  currentTab === 'ai_logistik' ? 'bg-indigo-600 text-white shadow-2xs font-bold' : 'text-indigo-700 bg-indigo-50 font-semibold'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>AI Logistik</span>
              </button>
            )}
            {!isPublicView && session.hasDevAccess && (
              <button
                onClick={() => setIsMigrationOpen(true)}
                className="px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-all bg-blue-600 text-white font-bold flex items-center gap-1 shrink-0 shadow-2xs"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Headless GAS</span>
              </button>
            )}
          </div>

          {/* Render Active View (Filtered by User Access) */}
          {currentTab === 'ringkasan' && (
            <div className="space-y-4">
              <OverviewCards
                data={visibleKomoditasList}
                onSelectCommodity={handleSelectCommodityFromCard}
              />

              {/* AI Smart Insights Bar (Pindah ke posisi paling bawah dashboard) */}
              {!isPublicView && hasAIAccess && (
                <AISmartInsights
                  komoditasList={visibleKomoditasList}
                  bsppList={visibleBsppList}
                  userRole={session.role}
                  allowedKomoditas={session.allowedKomoditas}
                  onNavigateTab={tab => {
                    setCurrentTab(tab);
                    if (tab !== 'mutasi') setTargetCommodityFilter('all');
                  }}
                />
              )}
            </div>
          )}

          {currentTab === 'mutasi' && (
            <MutasiPanel
              data={visibleKomoditasList}
              onToggleCek={handleToggleCek}
              initialCommodity={targetCommodityFilter}
            />
          )}

          {currentTab === 'kode' && (
            <SaldoKodePanel
              data={visibleKomoditasList}
              initialCommodity={targetCommodityFilter}
              isPublicView={isPublicView}
              allowKalkulatorInPublic={publicConfig.showKalkulatorPruf}
            />
          )}

          {currentTab === 'bspp' && (
            <BSPPPanel bsppList={visibleBsppList} />
          )}

          {currentTab === 'analisa' && (
            <AnalyticsCharts data={visibleKomoditasList} />
          )}

          {currentTab === 'ai_logistik' && !isPublicView && hasAIAccess && (
            <AILogistikPanel
              komoditasList={visibleKomoditasList}
              bsppList={visibleBsppList}
              session={session}
              onOpenAIBot={() => setIsAIBotOpen(true)}
              onSelectCommodity={handleSelectCommodityFromCard}
            />
          )}

          {/* Institutional Footer */}
          <footer className="mt-8 pt-4 border-t border-slate-200 text-center text-[11px] text-slate-500 space-y-1.5">
            <div className="flex items-center justify-center gap-1.5">
              <p className="font-semibold text-slate-700">
                Monitoring Stock Persediaan PP1 · Divisi Produksi I · PT Batu Karang
              </p>
              {!isPublicView && (
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                  title="Pintu Masuk Admin (?page=admin)"
                >
                  <Lock className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-center flex-wrap gap-2 text-[10px]">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                v2.4.0 · Golden Baseline (Locked)
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500">
                All Rights Reserved · Arsitektur Hybrid Headless GAS · Developed by Lalu Mahendra
              </span>
            </div>
          </footer>
        </main>
      </div>

      {/* Mobile Bottom Bar for Smartphone users */}
      <MobileBottomNav
        currentTab={currentTab}
        onSelectTab={tab => {
          setCurrentTab(tab);
          if (tab !== 'mutasi') setTargetCommodityFilter('all');
        }}
        onOpenMenu={() => setIsMobileMenuOpen(true)}
        allowedKomoditas={session.allowedKomoditas}
        isPublicView={isPublicView}
        publicConfig={publicConfig}
      />

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex flex-col justify-end p-3 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 space-y-3 max-w-lg mx-auto w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Menu Operasional</h3>
                <p className="text-[11.5px] text-slate-500">{session.nama} ({session.role})</p>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
              {/* Mobile Theme Toggle */}
              <button
                type="button"
                onClick={() => { toggleTheme(); setIsMobileMenuOpen(false); }}
                className="w-full text-left p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-indigo-700 dark:text-amber-300 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
                  <span>{theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}</span>
                </div>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {theme === 'dark' ? 'Gelap Aktif' : 'Terang Aktif'}
                </span>
              </button>

              {/* Mobile Fullscreen Toggle */}
              <button
                onClick={() => { toggleFullscreen(); setIsMobileMenuOpen(false); }}
                className="w-full text-left p-3 rounded-xl hover:bg-slate-50 flex items-center justify-between text-blue-700"
              >
                <div className="flex items-center gap-2.5">
                  {isFullscreen ? <Minimize2 className="w-4 h-4 text-blue-600" /> : <Maximize2 className="w-4 h-4 text-blue-600" />}
                  <span>{isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh (Fullscreen)'}</span>
                </div>
                <span className="text-[11px] font-normal text-slate-500">HP &amp; Tablet</span>
              </button>

              {/* AI Logistik Module Option in Mobile Menu (Hanya non-staff) */}
              {hasAIAccess && (
                <button
                  onClick={() => { setCurrentTab('ai_logistik'); setIsMobileMenuOpen(false); }}
                  className="w-full text-left p-3 rounded-xl bg-gradient-to-r from-indigo-900 to-blue-900 text-white flex items-center justify-between font-bold shadow-xs cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/40 border border-indigo-400/40 text-amber-300 flex items-center justify-center shrink-0">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">Pusat AI Logistik &amp; Prediksi</div>
                      <div className="text-[10px] text-indigo-200 font-normal">Sisa Hari, ROP &amp; Audit Susut</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded-full font-mono">
                    AI Modul
                  </span>
                </button>
              )}

              {/* AI Stock Assistant Option in Mobile Menu (Hanya non-staff) */}
              {hasAIAccess && (
                <button
                  onClick={() => { setIsAIBotOpen(true); setIsMobileMenuOpen(false); }}
                  className="w-full text-left p-3 rounded-xl bg-indigo-50 text-indigo-900 flex items-center justify-between font-bold"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span>AI Stock Assistant (Gemini Bot)</span>
                  </div>
                  <span className="text-[10px] bg-indigo-200/80 text-indigo-950 px-2 py-0.5 rounded-full font-mono">
                    Voice Bot
                  </span>
                </button>
              )}

              {/* Install PWA Option */}
              {!isInstalled && (
                <button
                  onClick={() => { setIsInstallOpen(true); setIsMobileMenuOpen(false); }}
                  className="w-full text-left p-3 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-between font-bold"
                >
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>Install Aplikasi ke Layar Utama HP</span>
                  </div>
                  <span className="text-[11px] bg-emerald-200/80 px-2 py-0.5 rounded-full text-emerald-900">PWA</span>
                </button>
              )}

              <button
                onClick={() => { setCurrentTab('analisa'); setIsMobileMenuOpen(false); }}
                className="w-full text-left p-3 rounded-xl hover:bg-slate-50 flex items-center justify-between"
              >
                <span>Analisa Komposisi &amp; Mutasi</span>
                <span className="text-slate-400">&rarr;</span>
              </button>
              {/* Ganti Password Mandiri Option */}
              <button
                onClick={() => { setIsChangePasswordOpen(true); setIsMobileMenuOpen(false); }}
                className="w-full text-left p-3 rounded-xl hover:bg-amber-50 text-amber-900 flex items-center justify-between font-semibold"
              >
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  <span>Ganti Password Mandiri</span>
                </div>
                <span className="text-slate-400">&rarr;</span>
              </button>

              {session.hasDevAccess && (
                <button
                  onClick={() => { setIsMigrationOpen(true); setIsMobileMenuOpen(false); }}
                  className="w-full text-left p-3 rounded-xl hover:bg-slate-50 flex items-center justify-between text-blue-700"
                >
                  <span>Pusat Arsitektur Headless GAS</span>
                  <Database className="w-4 h-4" />
                </button>
              )}

              {session.hasDevAccess && (
                <button
                  onClick={() => { setIsSystemAuditReportOpen(true); setIsMobileMenuOpen(false); }}
                  className="w-full text-left p-3 rounded-xl hover:bg-teal-50 flex items-center justify-between text-teal-800 font-semibold"
                >
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-teal-600" />
                    <span>Laporan Pemeriksaan &amp; Baseline v2.0</span>
                  </div>
                  <span className="text-[9.5px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-mono font-bold">LOCKED</span>
                </button>
              )}

              {session.canManageUsers && (
                <button
                  onClick={() => { setIsUserManagementOpen(true); setIsMobileMenuOpen(false); }}
                  className="w-full text-left p-3 rounded-xl hover:bg-blue-50 flex items-center justify-between text-blue-700 font-bold"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Pengaturan Hak Akses Staf</span>
                  </div>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">RBAC</span>
                </button>
              )}

              <button
                onClick={() => { setIsSwitchAppOpen(true); setIsMobileMenuOpen(false); }}
                className="w-full text-left p-3 rounded-xl hover:bg-slate-50 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Switch Board Data Proses</div>
                    <div className="text-[10.5px] text-slate-500">Blend, Krosok, Tembakau, Cengkeh</div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={() => { setIsHelpOpen(true); setIsMobileMenuOpen(false); }}
                className="w-full text-left p-3 rounded-xl hover:bg-slate-50 flex items-center justify-between"
              >
                <span>Panduan &amp; Keamanan Data</span>
                <span className="text-slate-400">?</span>
              </button>
              <button
                onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                className="w-full text-left p-3 rounded-xl hover:bg-rose-50 text-rose-600 flex items-center justify-between"
              >
                <span>Ganti Akun / Logout</span>
                <span className="text-slate-400">&rarr;</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <InstallModal
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
      />

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {!isPublicView && (
        <GasMigrationModal
          isOpen={isMigrationOpen}
          onClose={() => setIsMigrationOpen(false)}
          onRefreshData={handleRefresh}
        />
      )}

      {!isPublicView && (
        <SwitchAppModal
          isOpen={isSwitchAppOpen}
          onClose={() => setIsSwitchAppOpen(false)}
          allowedKomoditas={session.allowedKomoditas}
          canManage={session.hasDevAccess || session.role === 'Web Developer' || session.role === 'Site Engineer / PM'}
        />
      )}

      {!isPublicView && isUserManagementOpen && (
        <ErrorBoundary fallbackTitle="Kendala Membuka Pengaturan Hak Akses">
          <UserManagementModal
            isOpen={isUserManagementOpen}
            onClose={() => setIsUserManagementOpen(false)}
            availableKomoditas={allAvailableCommodityNames || []}
            currentUserEmail={session?.email || ''}
          />
        </ErrorBoundary>
      )}

      {!isPublicView && (
        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
          userEmail={session.email}
          userName={session.nama}
          onSuccess={() => {
            setSession(GasService.getCurrentSession());
            setSyncStatusNotice('Password berhasil diperbarui.');
            setTimeout(() => setSyncStatusNotice(null), 4000);
          }}
        />
      )}

      <LoginModal
        isOpen={!isPublicView && (isLoginOpen || !session.isLoggedIn)}
        onSuccess={newSession => {
          setSession(newSession);
          setIsLoginOpen(false);
        }}
        onClose={session.isLoggedIn ? () => setIsLoginOpen(false) : undefined}
      />

      {/* Pengaturan Portal Publik Tautkan Link */}
      {!isPublicView && (
        <PublicPortalSettingsModal
          isOpen={isPublicPortalSettingsOpen}
          onClose={() => setIsPublicPortalSettingsOpen(false)}
        />
      )}

      {!isPublicView && (
        <SktSkmSettingsModal
          isOpen={isSktSkmOpen}
          onClose={() => setIsSktSkmOpen(false)}
        />
      )}

      {/* Laporan Pemeriksaan & Baseline v2.0 Modal (Dev & Engineer) */}
      {!isPublicView && (
        <SystemAuditReportModal
          isOpen={isSystemAuditReportOpen}
          onClose={() => setIsSystemAuditReportOpen(false)}
          komoditasList={komoditasList}
        />
      )}

      {/* AI Logistik & Stock Bot Modal (Hanya jika berhak akses & bukan mode publik) */}
      {!isPublicView && hasAIAccess && (
        <AIBotModal
          isOpen={isAIBotOpen}
          onClose={() => setIsAIBotOpen(false)}
          komoditasList={visibleKomoditasList}
          bsppList={visibleBsppList}
          session={session}
        />
      )}

      {/* Floating AI Stock Assistant Trigger Button (Bottom Right - Hanya non-staff & bukan publik) */}
      {!isPublicView && hasAIAccess && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-30">
          <button
            onClick={() => setIsAIBotOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-full shadow-lg hover:shadow-xl border border-white/20 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
            title="Tanya Jawab Logistik & Rekomendasi Stok dengan AI Bot (Gemini)"
          >
            <Bot className="w-4 h-4 text-white" />
            <span className="font-semibold text-xs text-white">AI Stock Bot</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </button>
        </div>
      )}
    </div>
  );
}
