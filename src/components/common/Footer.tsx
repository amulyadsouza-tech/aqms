import React from 'react';
import { MapPin, ShieldAlert } from 'lucide-react';

interface FooterProps {
  onNavigateAdmin?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateAdmin }) => {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-[#d1e6f5] dark:border-[#303030] bg-white/90 dark:bg-[#151515] transition-colors">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">

          {/* Left: Institution */}
          <div className="space-y-1.5">
            <p className="text-sm font-bold text-[#24272D] dark:text-white">
              St. Joseph Engineering College (SJEC)
            </p>
            <div className="flex items-center gap-1.5 text-xs text-[#687583] dark:text-[#C4C4C4]">
              <MapPin className="w-3.5 h-3.5 text-[#397FC0] dark:text-[#64B5F6] flex-shrink-0" aria-hidden />
              <span>Vamanjoor, Mangaluru, Karnataka – 575028</span>
            </div>
            <p className="text-xs text-[#687583] dark:text-[#A0A0A0]">
              Air Quality Monitoring System · An Autonomous Institution affiliated to VTU, Belagavi
            </p>
          </div>

          {/* Right: Legal + admin link */}
          <div className="space-y-1.5 sm:text-right">
            <p className="text-xs font-semibold text-[#24272D] dark:text-[#C4C4C4]">
              AQI computed per CPCB India NAQI methodology
            </p>
            <p className="text-xs text-[#687583] dark:text-[#A0A0A0]">
              © {year} SJEC AQMS · Department of Engineering Research
            </p>
            {onNavigateAdmin && (
              <button
                onClick={onNavigateAdmin}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#397FC0] dark:text-[#64B5F6] hover:underline transition-colors cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" aria-hidden />
                Admin Portal
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
