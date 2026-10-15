import React from 'react';
import { MapPin, ShieldAlert } from 'lucide-react';

interface FooterProps {
  onNavigateAdmin?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateAdmin }) => {
  const year = new Date().getFullYear();

  return (
    <footer className="sticky bottom-0 z-40 w-full border-t border-[#d1e6f5] dark:border-[#303030] bg-white/95 dark:bg-[#151515]/95 backdrop-blur-md transition-colors shadow-[0_-2px_10px_rgba(0,0,0,0.06)] transform-gpu will-change-transform">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">

          {/* Left: Institution */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-bold text-[#24272D] dark:text-white">
              St. Joseph Engineering College (SJEC)
            </span>
            <span className="hidden sm:inline text-slate-400">·</span>
            <div className="flex items-center gap-1 text-[#687583] dark:text-[#C4C4C4]">
              <MapPin className="w-3.5 h-3.5 text-[#397FC0] dark:text-[#64B5F6] flex-shrink-0" aria-hidden />
              <span>Vamanjoor, Mangaluru, Karnataka – 575028</span>
            </div>
          </div>

          {/* Right: Project + admin link */}
          <div className="flex items-center gap-3 sm:gap-4 sm:justify-end text-xs">
            <span className="text-[#687583] dark:text-[#A0A0A0]">
              A project under IUCEE
            </span>
            {onNavigateAdmin && (
              <button
                onClick={onNavigateAdmin}
                className="inline-flex items-center gap-1.5 font-semibold text-[#397FC0] dark:text-[#64B5F6] hover:underline transition-colors cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" aria-hidden />
                <span>Admin Portal</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
