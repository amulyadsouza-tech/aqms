import React from 'react';
import { Thermometer, Droplets, Wind, Flame, Navigation, ExternalLink } from 'lucide-react';
import { SensorCardStatus } from '../../types';
import { formatRelativeTime, formatGpsCoordinate, getGoogleMapsUrl } from '../../utils/formatters';

// ── StatusDot ────────────────────────────────────────────────
interface StatusDotProps {
  status: SensorCardStatus;
}

const STATUS_MAP: Record<SensorCardStatus, { dot: string; label: string }> = {
  live:        { dot: 'bg-emerald-500', label: 'Live' },
  stale:       { dot: 'bg-amber-400',   label: 'Stale' },
  waiting:     { dot: 'bg-sky-400',     label: 'Waiting' },
  unavailable: { dot: 'bg-slate-300 dark:bg-slate-600', label: 'N/A' },
  offline:     { dot: 'bg-red-400',     label: 'Offline' },
  invalid:     { dot: 'bg-red-500',     label: 'Error' },
};

export const StatusDot: React.FC<StatusDotProps> = ({ status }) => {
  const { dot, label } = STATUS_MAP[status] ?? STATUS_MAP.unavailable;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/70 dark:bg-[#1D1D1D] border border-[#d1e6f5] dark:border-[#303030]">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} aria-hidden />
      <span className="text-xs font-semibold text-[#687583] dark:text-[#C4C4C4]">{label}</span>
    </span>
  );
};

// ── LastUpdated label ────────────────────────────────────────
interface LastUpdatedProps {
  timestamp?: number | null;
}

export const LastUpdated: React.FC<LastUpdatedProps> = ({ timestamp }) => (
  <p className="text-xs text-[#687583] dark:text-[#A0A0A0] mt-auto pt-4 border-t border-[#d1e6f5]/80 dark:border-[#303030]">
    Updated {formatRelativeTime(timestamp)}
  </p>
);

// ── TemperatureCard ──────────────────────────────────────────
interface TemperatureCardProps {
  value: number | null | undefined;
  status: SensorCardStatus;
  timestamp?: number | null;
}

export const TemperatureCard: React.FC<TemperatureCardProps> = ({ value, status, timestamp }) => {
  const display = value !== null && value !== undefined && !isNaN(value)
    ? value.toFixed(1)
    : '--';

  const tempColor = value === null || value === undefined ? 'text-slate-400 dark:text-slate-500'
    : value < 20  ? 'text-[#397FC0] dark:text-[#64B5F6]'
    : value < 30  ? 'text-emerald-600 dark:text-emerald-400'
    : value < 36  ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400';

  return (
    <div className="bg-[#EAF3FC] dark:bg-[#151515] rounded-2xl border border-[#d1e6f5] dark:border-[#303030] shadow-card hover:shadow-card-hover transition-all p-6 sm:p-7 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-orange-100/80 dark:bg-[#1D1D1D] border border-orange-200 dark:border-[#303030] flex items-center justify-center flex-shrink-0">
            <Thermometer className="w-6 h-6 text-orange-500" aria-hidden />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#687583] dark:text-[#A0A0A0] block">
              Temperature
            </span>
            <span className="text-base font-semibold text-[#24272D] dark:text-white">
              Ambient Air
            </span>
          </div>
        </div>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2 flex-1 my-2">
        <span className={`text-6xl sm:text-7xl font-extrabold tracking-tight ${tempColor} transition-colors leading-none`}>
          {display}
        </span>
        {display !== '--' && (
          <span className="text-2xl font-bold text-[#687583] dark:text-[#C4C4C4] self-start mt-1">°C</span>
        )}
      </div>

      {/* Temperature progress bar */}
      {value !== null && value !== undefined && !isNaN(value) && (
        <div className="mt-4 mb-2 h-2.5 bg-white/80 dark:bg-[#1D1D1D] border border-[#d1e6f5]/60 dark:border-[#303030] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-red-500 transition-all duration-700"
            style={{ width: `${Math.min(Math.max((value / 50) * 100, 2), 100)}%` }}
          />
        </div>
      )}

      <LastUpdated timestamp={timestamp} />
    </div>
  );
};

// ── HumidityCard ─────────────────────────────────────────────
interface HumidityCardProps {
  value: number | null | undefined;
  status: SensorCardStatus;
  timestamp?: number | null;
}

export const HumidityCard: React.FC<HumidityCardProps> = ({ value, status, timestamp }) => {
  const display = value !== null && value !== undefined && !isNaN(value)
    ? value.toFixed(1)
    : '--';

  const percent = value !== null && value !== undefined && !isNaN(value)
    ? Math.min(Math.max(value, 0), 100)
    : 0;

  return (
    <div className="bg-[#EAF3FC] dark:bg-[#151515] rounded-2xl border border-[#d1e6f5] dark:border-[#303030] shadow-card hover:shadow-card-hover transition-all p-6 sm:p-7 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-100/80 dark:bg-[#1D1D1D] border border-cyan-200 dark:border-[#303030] flex items-center justify-center flex-shrink-0">
            <Droplets className="w-6 h-6 text-cyan-600 dark:text-cyan-400" aria-hidden />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#687583] dark:text-[#A0A0A0] block">
              Humidity
            </span>
            <span className="text-base font-semibold text-[#24272D] dark:text-white">
              Relative Humidity
            </span>
          </div>
        </div>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2 flex-1 my-2">
        <span className="text-6xl sm:text-7xl font-extrabold tracking-tight text-[#397FC0] dark:text-[#64B5F6] transition-colors leading-none">
          {display}
        </span>
        {display !== '--' && (
          <span className="text-2xl font-bold text-[#687583] dark:text-[#C4C4C4] self-start mt-1">%</span>
        )}
      </div>

      {/* Humidity progress bar */}
      {display !== '--' && (
        <div className="mt-4 mb-2 h-2.5 bg-white/80 dark:bg-[#1D1D1D] border border-[#d1e6f5]/60 dark:border-[#303030] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-500 transition-all duration-700"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      <LastUpdated timestamp={timestamp} />
    </div>
  );
};

// ── PMCard ───────────────────────────────────────────────────
interface PMCardProps {
  label: 'PM1.0' | 'PM2.5' | 'PM10';
  value: number | null | undefined;
  status: SensorCardStatus;
  timestamp?: number | null;
  isPrimary?: boolean;
  warningNote?: string;
}

const PM_THRESHOLDS: Record<string, number> = { 'PM2.5': 60, 'PM10': 100 };

const getPMColor = (label: string, value: number | null | undefined) => {
  if (value === null || value === undefined) return '#94a3b8';
  const threshold = PM_THRESHOLDS[label];
  if (!threshold) return '#0ea5e9';
  if (value <= threshold * 0.5) return '#16a34a';
  if (value <= threshold)       return '#d97706';
  return '#dc2626';
};

export const PMCard: React.FC<PMCardProps> = ({
  label, value, status, timestamp, isPrimary = false, warningNote
}) => {
  const display = value !== null && value !== undefined && !isNaN(value)
    ? value.toFixed(1)
    : '--';

  const color = getPMColor(label, value);

  return (
    <div className="bg-[#EAF3FC] dark:bg-[#151515] rounded-2xl border border-[#d1e6f5] dark:border-[#303030] shadow-card hover:shadow-card-hover transition-all p-5 sm:p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border dark:border-[#303030]"
            style={{ backgroundColor: `${color}18`, borderColor: `${color}40` }}
          >
            <Wind className="w-5 h-5" style={{ color }} aria-hidden />
          </div>
          <div>
            <span className="text-lg font-bold text-[#24272D] dark:text-white font-mono block">
              {label}
            </span>
            <span className="text-[11px] font-semibold text-[#687583] dark:text-[#A0A0A0]">
              {label === 'PM2.5' ? 'Fine Particles' : label === 'PM10' ? 'Coarse Particles' : 'Ultrafine'}
            </span>
          </div>
        </div>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2 flex-1 my-2">
        <span
          className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-none transition-colors"
          style={{ color: display === '--' ? '#94a3b8' : color }}
        >
          {display}
        </span>
        {display !== '--' && (
          <span className="text-sm font-semibold text-[#687583] dark:text-[#C4C4C4] self-end pb-1">
            µg/m³
          </span>
        )}
      </div>

      {warningNote && display !== '--' && (
        <p className="text-xs text-amber-800 dark:text-amber-300 mt-2 leading-snug bg-amber-100/70 dark:bg-amber-950/40 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800/80">
          ⚠ {warningNote}
        </p>
      )}

      <LastUpdated timestamp={timestamp} />
    </div>
  );
};

// ── GasSensorCard ─────────────────────────────────────────────
interface GasSensorCardProps {
  rawValue: number | null | undefined;
  calibratedPpm?: number | null;
  status: SensorCardStatus;
  timestamp?: number | null;
}

export const GasSensorCard: React.FC<GasSensorCardProps> = ({
  rawValue, calibratedPpm, status, timestamp
}) => {
  const display = rawValue !== null && rawValue !== undefined && !isNaN(rawValue)
    ? Math.round(rawValue).toString()
    : '--';

  return (
    <div className="bg-[#EAF3FC] dark:bg-[#151515] rounded-2xl border border-[#d1e6f5] dark:border-[#303030] shadow-card hover:shadow-card-hover transition-all p-5 sm:p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-100/80 dark:bg-[#1D1D1D] border border-amber-200 dark:border-[#303030] flex items-center justify-center flex-shrink-0">
            <Flame className="w-5 h-5 text-amber-500" aria-hidden />
          </div>
          <div>
            <span className="text-base font-bold text-[#24272D] dark:text-white font-mono block">MQ-3</span>
            <span className="text-xs font-semibold text-[#687583] dark:text-[#A0A0A0]">Gas Sensor</span>
          </div>
        </div>
      </div>

      <div className="flex items-baseline gap-2 flex-1 my-2">
        <span className="text-5xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400 leading-none">
          {display}
        </span>
        {display !== '--' && (
          <span className="text-sm font-semibold text-[#687583] dark:text-[#C4C4C4] self-end pb-1">
            Raw ADC
          </span>
        )}
      </div>

      {calibratedPpm !== null && calibratedPpm !== undefined ? (
        <p className="text-xs text-[#687583] dark:text-[#C4C4C4] mt-2">
          Calibrated: {calibratedPpm.toFixed(2)} ppm
        </p>
      ) : (
        <p className="text-xs text-[#687583] dark:text-[#A0A0A0] mt-2 italic">
          Uncalibrated — raw 12-bit ADC count
        </p>
      )}

      <LastUpdated timestamp={timestamp} />
    </div>
  );
};

// ── LocationCard ──────────────────────────────────────────────
interface LocationCardProps {
  lat?: number | null;
  lng?: number | null;
  isGpsValid?: boolean;
  satellites?: number | null;
  altitude?: number | null;
  configuredLocation?: string;
}

export const LocationCard: React.FC<LocationCardProps> = ({
  lat, lng, isGpsValid = false, satellites, altitude, configuredLocation
}) => {
  const mapsUrl = getGoogleMapsUrl(lat, lng);
  const latStr  = formatGpsCoordinate(lat, true);
  const lngStr  = formatGpsCoordinate(lng, false);

  return (
    <div className="bg-[#EAF3FC] dark:bg-[#151515] rounded-2xl border border-[#d1e6f5] dark:border-[#303030] shadow-card hover:shadow-card-hover transition-all p-5 sm:p-6 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl bg-teal-100/80 dark:bg-[#1D1D1D] border border-teal-200 dark:border-[#303030] flex items-center justify-center flex-shrink-0">
          <Navigation className="w-5 h-5 text-teal-600 dark:text-teal-400" aria-hidden />
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#687583] dark:text-[#A0A0A0] block">
            GPS Location
          </span>
          <span className="text-base font-bold text-[#24272D] dark:text-white">
            {configuredLocation || 'SJEC, Vamanjoor, Mangaluru'}
          </span>
        </div>
      </div>

      {isGpsValid && lat !== null && lat !== undefined ? (
        <div className="space-y-2 flex-1">
          <div className="flex gap-3 text-sm font-mono text-[#24272D] dark:text-[#C4C4C4]">
            <span className="text-[#687583] dark:text-[#A0A0A0] w-4 flex-shrink-0 font-bold">N</span>
            <span>{latStr}</span>
          </div>
          <div className="flex gap-3 text-sm font-mono text-[#24272D] dark:text-[#C4C4C4]">
            <span className="text-[#687583] dark:text-[#A0A0A0] w-4 flex-shrink-0 font-bold">E</span>
            <span>{lngStr}</span>
          </div>
          {satellites !== null && satellites !== undefined && (
            <p className="text-xs text-[#687583] dark:text-[#A0A0A0] pt-1">
              {satellites} satellites{altitude !== null && altitude !== undefined ? ` · ${altitude}m alt` : ''}
            </p>
          )}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#397FC0] dark:text-[#64B5F6] hover:underline mt-2"
            >
              Open in Google Maps <ExternalLink className="w-3.5 h-3.5" aria-hidden />
            </a>
          )}
        </div>
      ) : (
        <div className="text-sm text-[#687583] dark:text-[#A0A0A0] italic flex-1 flex items-center">
          GPS: Acquiring satellite fix…
        </div>
      )}
    </div>
  );
};
