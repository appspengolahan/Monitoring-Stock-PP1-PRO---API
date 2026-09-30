/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { KomoditasData, BSPPData, UserSession, UserRole } from './types';
import { GasService } from './services/gasService';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { OverviewCards } from './components/dashboard/OverviewCards';
import { MutasiPanel } from './components/dashboard/MutasiPanel';
import { SaldoKodePanel } from './components/dashboard/SaldoKodePanel';
import { BSPPPanel } from './components/dashboard/BSPPPanel';
import { AnalyticsCharts } from './components/dashboard/AnalyticsCharts';
import { HelpModal } from './components/modals/HelpModal';
import { GasMigrationModal } from './components/modals/GasMigrationModal';
import { SwitchAppModal } from './components/modals/SwitchAppModal';
import { LoginModal } from './components/modals/LoginModal';
import { InstallModal } from './components/modals/InstallModal';
import { useFullscreen } from './hooks/useFullscreen';
import { usePWAInstall } from './hooks/usePWAInstall';
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
  Smartphone
} from 'lucide-react';

export default function App() {
  // 1. Initial cached data (Instant 0.01s load)
  const [komoditasList, setKomoditasList] = useState<KomoditasData[]>(() => GasService.getCachedKomoditas());
  const [bsppList, setBsppList] = useState<BSPPData[]>(() => GasService.getCachedBSPP());
  const [session, setSession] = useState<UserSession>(() => GasService.getCurrentSession());
  const [lastSync, setLastSync] = useState<string>(() => GasService.getLastSyncTime() || new Date().toISOString());

  // 2. Active View & Filter states
  const [currentTab, setCurrentTab] = useState<string>('ringkasan');
  const [targetCommodityFilter, setTargetCommodityFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [syncStatusNotice, setSyncStatusNotice] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('monitoring_pp1_sidebar_collapsed') === 'true';
  });

  // 3. Fullscreen & PWA Hooks
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const { isInstalled, canInstall } = usePWAInstall();

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

  // 5. Background sync on initial load
  useEffect(() => {
    // Attempt silent background synchronization with GAS
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
    setSyncStatusNotice(null);
    try {
      const res = await GasService.syncFromGas();
      if (res.data) {
        setKomoditasList(res.data.komoditas);
        setBsppList(res.data.bspp);
        setLastSync(new Date().toISOString());
      }
      setSyncStatusNotice(res.message);
      setTimeout(() => setSyncStatusNotice(null), 5000);
    } catch (err: any) {
      setSyncStatusNotice('Pembaruan data selesai (menggunakan cache aktif).');
      setTimeout(() => setSyncStatusNotice(null), 4000);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

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

  // 9. Jump to commodity filter
  const handleSelectCommodityFromCard = useCallback((commodityName: string) => {
    setTargetCommodityFilter(commodityName);
    setCurrentTab('mutasi');
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans select-none">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        session={session}
        onChangeRole={handleChangeRole}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        lastUpdated={lastSync}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenMigration={() => setIsMigrationOpen(true)}
        onOpenSwitchApp={() => setIsSwitchAppOpen(true)}
        onLogout={() => setIsLoginOpen(true)}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebarCollapse={handleToggleSidebar}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onOpenInstall={() => setIsInstallOpen(true)}
        canInstall={canInstall}
        isInstalled={isInstalled}
      />

      {/* Main Workspace: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex shrink-0">
          <Sidebar
            currentTab={currentTab}
            onSelectTab={tab => {
              setCurrentTab(tab);
              if (tab !== 'mutasi') setTargetCommodityFilter('all');
            }}
            session={session}
            onOpenMigration={() => setIsMigrationOpen(true)}
            onOpenSwitchApp={() => setIsSwitchAppOpen(true)}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            onOpenInstall={() => setIsInstallOpen(true)}
            isInstalled={isInstalled}
          />
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-5 lg:px-6 py-3 sm:py-4 pb-20 lg:pb-10 max-w-7xl mx-auto w-full select-text">
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
          <div className="lg:hidden flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl mb-4 overflow-x-auto text-xs font-semibold select-none">
            <button
              onClick={() => { setCurrentTab('ringkasan'); setTargetCommodityFilter('all'); }}
              className={`px-3 py-2 rounded-lg whitespace-nowrap transition-all ${
                currentTab === 'ringkasan' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              Ringkasan Stok
            </button>
            <button
              onClick={() => setCurrentTab('mutasi')}
              className={`px-3 py-2 rounded-lg whitespace-nowrap transition-all ${
                currentTab === 'mutasi' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              Mutasi Lintas Bahan
            </button>
            <button
              onClick={() => setCurrentTab('kode')}
              className={`px-3 py-2 rounded-lg whitespace-nowrap transition-all ${
                currentTab === 'kode' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              Saldo Kode
            </button>
            <button
              onClick={() => setCurrentTab('bspp')}
              className={`px-3 py-2 rounded-lg whitespace-nowrap transition-all ${
                currentTab === 'bspp' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              BSPP
            </button>
            <button
              onClick={() => setCurrentTab('analisa')}
              className={`px-3 py-2 rounded-lg whitespace-nowrap transition-all ${
                currentTab === 'analisa' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              Analisa
            </button>
            <button
              onClick={() => setIsMigrationOpen(true)}
              className="px-3 py-2 rounded-lg whitespace-nowrap transition-all bg-blue-600 text-white font-bold flex items-center gap-1 shrink-0 shadow-2xs"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Headless GAS API</span>
            </button>
          </div>

          {/* Render Active View */}
          {currentTab === 'ringkasan' && (
            <OverviewCards
              data={komoditasList}
              onSelectCommodity={handleSelectCommodityFromCard}
            />
          )}

          {currentTab === 'mutasi' && (
            <MutasiPanel
              data={komoditasList}
              onToggleCek={handleToggleCek}
              initialCommodity={targetCommodityFilter}
            />
          )}

          {currentTab === 'kode' && (
            <SaldoKodePanel
              data={komoditasList}
              initialCommodity={targetCommodityFilter}
            />
          )}

          {currentTab === 'bspp' && (
            <BSPPPanel bsppList={bsppList} />
          )}

          {currentTab === 'analisa' && (
            <AnalyticsCharts data={komoditasList} />
          )}

          {/* Institutional Footer */}
          <footer className="mt-12 pt-6 border-t border-slate-200 text-center text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">
              Monitoring Stock Persediaan PP1 · Divisi Produksi I · PT Batu Karang
            </p>
            <p className="text-[11.5px] text-slate-500">
              All Rights Reserved · Arsitektur Hybrid Headless GAS · Developed by Lalu Mahendra
            </p>
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

            <div className="space-y-1 text-xs sm:text-sm font-semibold text-slate-700">
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
              <button
                onClick={() => { setIsMigrationOpen(true); setIsMobileMenuOpen(false); }}
                className="w-full text-left p-3 rounded-xl hover:bg-slate-50 flex items-center justify-between text-blue-700"
              >
                <span>Pusat Arsitektur Headless GAS</span>
                <Database className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setIsSwitchAppOpen(true); setIsMobileMenuOpen(false); }}
                className="w-full text-left p-3 rounded-xl hover:bg-slate-50 flex items-center justify-between"
              >
                <span>Switch Board Susut Lainnya</span>
                <ExternalLink className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setIsHelpOpen(true); setIsMobileMenuOpen(false); }}
                className="w-full text-left p-3 rounded-xl hover:bg-slate-50 flex items-center justify-between"
              >
                <span>Panduan &amp; Keamanan Data</span>
                <span className="text-slate-400">?</span>
              </button>
              <button
                onClick={() => { setIsLoginOpen(true); setIsMobileMenuOpen(false); }}
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

      <GasMigrationModal
        isOpen={isMigrationOpen}
        onClose={() => setIsMigrationOpen(false)}
        onRefreshData={handleRefresh}
      />

      <SwitchAppModal
        isOpen={isSwitchAppOpen}
        onClose={() => setIsSwitchAppOpen(false)}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onSuccess={newSession => {
          setSession(newSession);
          setIsLoginOpen(false);
        }}
        onClose={() => setIsLoginOpen(false)}
      />
    </div>
  );
}
