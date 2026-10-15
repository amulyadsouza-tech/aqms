import React from 'react';
import { Sun, Moon, ShieldCheck, ShieldAlert, School, Wifi, WifiOff } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { BrandingConfig } from '../../types';

interface HeaderProps {
  branding: BrandingConfig;
  isDemoMode: boolean;
  isDeviceOnline?: boolean;
  onNavigateAdmin: () => void;
  onNavigateHome: () => void;
  currentPage: 'public' | 'admin' | 'login';
}

export const Header: React.FC<HeaderProps> = ({
  branding,
  isDemoMode,
  isDeviceOnline = false,
  onNavigateAdmin,
  onNavigateHome,
  currentPage,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { currentUser } = useAuth();

  const showOnlineIndicator = !isDemoMode;

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 dark:bg-[#151515]/95 backdrop-blur-md border-b border-[#d1e6f5] dark:border-[#303030] transition-colors shadow-sm transform-gpu will-change-transform">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 sm:h-20">

          {/* Left: Logo + Title */}
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-3 sm:gap-4 min-w-0 group focus:outline-none text-left cursor-pointer"
            aria-label="Go to public dashboard"
          >
            {/* Logo container supporting SVG or PNG */}
            <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white dark:bg-[#1D1D1D] border-2 border-sky-200 dark:border-[#303030] flex items-center justify-center overflow-hidden shadow-sm transition-all group-hover:border-[#397FC0] dark:group-hover:border-[#64B5F6]">
              <img
                src={branding.logoUrl || '/sjec-logo.png'}
                alt="SJEC Logo"
                className="w-full h-full object-contain p-1"
                onError={(e) => {
                  // Fallback in case of broken link
                  e.currentTarget.src = '/sjec-logo.png';
                }}
              />
            </div>

            {/* Title block */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-extrabold uppercase tracking-tight text-[#24272D] dark:text-white group-hover:text-[#397FC0] dark:group-hover:text-[#64B5F6] transition-colors truncate leading-tight">
                  {branding.title || 'AIR QUALITY MONITORING SYSTEM'}
                </span>
                {isDemoMode && (
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 whitespace-nowrap flex-shrink-0">
                    DEMO
                  </span>
                )}
              </div>
              <span className="text-xs sm:text-sm font-medium text-[#687583] dark:text-[#C4C4C4] truncate leading-tight mt-0.5">
                St. Joseph Engineering College, Vamanjoor, Mangaluru
              </span>
            </div>
          </button>

          {/* Right: Status + Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0 ml-3">

            {/* Actual Device connection status */}
            {showOnlineIndicator && (
              <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
                isDeviceOnline
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800'
              }`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isDeviceOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />
                {isDeviceOnline
                  ? <><Wifi className="w-3.5 h-3.5" /><span>Node Online</span></>
                  : <><WifiOff className="w-3.5 h-3.5" /><span>Node Offline</span></>
                }
              </div>
            )}

            {/* Accessible Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              className="p-2.5 rounded-xl text-[#24272D] dark:text-white bg-slate-100 dark:bg-[#1D1D1D] hover:bg-sky-100 dark:hover:bg-[#252525] transition-colors border border-slate-200 dark:border-[#303030] cursor-pointer flex items-center gap-2"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-5 h-5 text-slate-700" aria-hidden />
                  <span className="sr-only">Switch to dark mode</span>
                </>
              ) : (
                <>
                  <Sun className="w-5 h-5 text-amber-400" aria-hidden />
                  <span className="sr-only">Switch to light mode</span>
                </>
              )}
            </button>

            {/* Admin Login action */}
            {currentPage === 'admin' ? (
              <button
                onClick={onNavigateHome}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-[#24272D] dark:text-white bg-slate-100 dark:bg-[#1D1D1D] hover:bg-slate-200 dark:hover:bg-[#252525] border border-slate-300 dark:border-[#303030] transition-colors cursor-pointer"
              >
                <span>Public View</span>
              </button>
            ) : (
              <button
                onClick={onNavigateAdmin}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-institute-blue hover:bg-institute-accent transition-colors shadow-sm cursor-pointer"
              >
                {currentUser ? (
                  <>
                    <ShieldCheck className="w-4 h-4" aria-hidden />
                    <span className="hidden sm:inline">Admin Panel</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" aria-hidden />
                    <span className="hidden sm:inline">Admin Login</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Demo mode mobile banner */}
        {isDemoMode && (
          <div className="sm:hidden py-1 border-t border-amber-300 dark:border-amber-800 bg-amber-100/80 dark:bg-amber-950/40 text-center text-[11px] font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider">
            Demo Mode — Simulated Telemetry
          </div>
        )}
      </div>
    </header>
  );
};
