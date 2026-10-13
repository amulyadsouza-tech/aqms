import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  BrandingConfig, 
  DeviceMetadata, 
  IngestedReading, 
  SystemSettings 
} from '../types';
import { 
  DEFAULT_BRANDING, 
  DEFAULT_SYSTEM_SETTINGS, 
  isFirebaseConfigured, 
  subscribeToBranding, 
  subscribeToDeviceMetadata, 
  subscribeToLatestReading, 
  fetchHistoricalReadings
} from '../services/firebase';
import { DEMO_DEVICE_METADATA, generateDemoHistoricalData, generateDemoReading } from '../services/demoData';
import { Header } from '../components/common/Header';
import { DeviceSetupTab } from '../features/admin/DeviceSetupTab';
import { FirebaseConfigTab } from '../features/admin/FirebaseConfigTab';
import { BrandingTab } from '../features/admin/BrandingTab';
import { HistoricalDataTab } from '../features/admin/HistoricalDataTab';
import { AdminAccountsTab } from '../features/admin/AdminAccountsTab';
import { 
  Cpu, 
  Server, 
  Image as ImageIcon, 
  Database, 
  Users, 
  LogOut, 
  Menu, 
  X,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

interface AdminDashboardPageProps {
  onNavigateHome: () => void;
  onLogout: () => void;
}

type AdminTab = 
  | 'device' 
  | 'firebase' 
  | 'branding' 
  | 'history' 
  | 'accounts';

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  onNavigateHome,
  onLogout,
}) => {
  const { currentUser, logout, isDevDemoAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('device');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // System states
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [metadata, setMetadata] = useState<DeviceMetadata | null>(DEMO_DEVICE_METADATA);
  const [latestReading, setLatestReading] = useState<IngestedReading | null>(null);
  const [historicalData, setHistoricalData] = useState<IngestedReading[]>([]);
  const [systemSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [isDemoMode] = useState<boolean>(!isFirebaseConfigured);

  const activeDeviceId = metadata?.deviceId || 'SJEC-AQMS-ESP32-001';

  // Subscriptions
  useEffect(() => {
    const unsubBrand = subscribeToBranding(setBranding);

    let unsubMeta = () => {};
    let unsubReading = () => {};

    if (!isDemoMode && isFirebaseConfigured) {
      unsubMeta = subscribeToDeviceMetadata(activeDeviceId, setMetadata);
      unsubReading = subscribeToLatestReading(activeDeviceId, setLatestReading);
      fetchHistoricalReadings(activeDeviceId, 150).then(setHistoricalData);
    } else {
      setLatestReading(generateDemoReading());
      setHistoricalData(generateDemoHistoricalData(24));
    }

    return () => {
      unsubBrand();
      unsubMeta();
      unsubReading();
    };
  }, [isDemoMode, activeDeviceId]);

  // Online check
  const now = Date.now();
  const timeoutSec = metadata?.offlineTimeoutSeconds || systemSettings.deviceOfflineTimeoutSeconds;
  const isOnline = Boolean(
    latestReading && (now - latestReading.timestamp) / 1000 <= timeoutSec
  );

  const handleLogoutClick = async () => {
    await logout();
    onLogout();
  };

  const navItems = [
    { id: 'device',   label: 'Device & PCB Setup',             icon: <Cpu className="w-5 h-5" /> },
    { id: 'firebase', label: 'Firebase Project Configuration', icon: <Server className="w-5 h-5" /> },
    { id: 'branding', label: 'Logo & Branding',                icon: <ImageIcon className="w-5 h-5" /> },
    { id: 'history',  label: 'Historical Data & Charts',       icon: <Database className="w-5 h-5" /> },
    { id: 'accounts', label: 'Admin Accounts & Access',        icon: <Users className="w-5 h-5" /> },
  ];

  const activeLabel = navItems.find((n) => n.id === activeTab)?.label ?? '';

  return (
    <div className="min-h-screen flex flex-col bg-transparent transition-colors">
      
      {/* Top Header */}
      <Header
        branding={branding}
        isDemoMode={isDemoMode}
        isDeviceOnline={isOnline}
        onNavigateAdmin={() => {}}
        onNavigateHome={onNavigateHome}
        currentPage="admin"
      />

      {/* Main Admin Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
        
        {/* Mobile Navigation Toggle */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white/95 dark:bg-[#151515]/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-[#303030] shadow-sm">
          <div className="flex items-center gap-3">
            {navItems.find((n) => n.id === activeTab)?.icon && (
              <span className="text-institute-blue dark:text-sky-400">
                {navItems.find((n) => n.id === activeTab)?.icon}
              </span>
            )}
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Section</p>
              <strong className="text-base font-bold text-slate-900 dark:text-white">{activeLabel}</strong>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Sidebar */}
        <aside
          className={`lg:w-72 flex-shrink-0 ${
            mobileMenuOpen ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="bg-white/95 dark:bg-[#151515]/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-[#303030] p-4 shadow-sm space-y-4 sticky top-28">
            
            {/* Admin identity */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-institute-blue to-institute-accent text-white">
              <span className="text-xs opacity-80 block uppercase font-semibold tracking-wider mb-1">
                Administrator
              </span>
              <strong className="text-sm font-bold truncate block">
                {currentUser?.email || 'admin@sjec.ac.in'}
              </strong>
              {isDevDemoAdmin && (
                <span className="inline-block mt-1.5 text-xs text-white/80 font-medium">
                  • Offline Dev Session
                </span>
              )}
            </div>

            {/* Navigation list */}
            <nav className="space-y-1" aria-label="Admin navigation">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as AdminTab);
                    setMobileMenuOpen(false);
                  }}
                  className={`admin-nav-item ${
                    activeTab === item.id
                      ? 'admin-nav-active'
                      : 'admin-nav-inactive'
                  }`}
                  aria-current={activeTab === item.id ? 'page' : undefined}
                >
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                  {activeTab === item.id && (
                    <ChevronRight className="w-4 h-4 opacity-70" />
                  )}
                </button>
              ))}
            </nav>

            {/* Bottom actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
              <button
                onClick={onNavigateHome}
                className="w-full flex items-center gap-3 px-4 py-3 text-base font-medium rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
              >
                <ExternalLink className="w-5 h-5 text-teal-500" />
                <span>View Public Dashboard</span>
              </button>

              <button
                onClick={handleLogoutClick}
                className="w-full flex items-center gap-3 px-4 py-3 text-base font-semibold rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>

          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          {activeTab === 'device' && (
            <DeviceSetupTab
              metadata={metadata}
              latestReading={latestReading}
              isOnline={isOnline}
              onMetadataUpdated={setMetadata}
              isFirebaseReady={isFirebaseConfigured}
            />
          )}

          {activeTab === 'firebase' && (
            <FirebaseConfigTab
              isFirebaseReady={isFirebaseConfigured}
            />
          )}

          {activeTab === 'branding' && (
            <BrandingTab
              branding={branding}
              onBrandingUpdated={setBranding}
              isFirebaseReady={isFirebaseConfigured}
            />
          )}

          {activeTab === 'history' && (
            <HistoricalDataTab
              historicalData={historicalData}
              isDemoMode={isDemoMode}
            />
          )}

          {activeTab === 'accounts' && (
            <AdminAccountsTab />
          )}
        </main>

      </div>

    </div>
  );
};

export default AdminDashboardPage;
