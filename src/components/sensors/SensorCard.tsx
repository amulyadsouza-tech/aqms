import React from 'react';
import { 
  SensorCardStatus 
} from '../../types';
import { formatRelativeTime } from '../../utils/formatters';
import { AlertTriangle, Clock, CheckCircle2, XCircle, HelpCircle, WifiOff } from 'lucide-react';

interface SensorCardProps {
  id: string;
  name: string;
  hardwareModel?: string;
  valueDisplay: string;
  unit: string;
  status: SensorCardStatus;
  measuredAt?: number | null;
  serverReceivedAt?: number | null;
  icon: React.ReactNode;
  secondaryInfo?: string | React.ReactNode;
  actionButton?: React.ReactNode;
  warningNote?: string;
  isStale?: boolean;
}

export const SensorCard: React.FC<SensorCardProps> = ({
  name,
  hardwareModel,
  valueDisplay,
  unit,
  status,
  measuredAt,
  serverReceivedAt,
  icon,
  secondaryInfo,
  actionButton,
  warningNote,
}) => {
  // Status badge styling
  const getStatusBadge = () => {
    switch (status) {
      case 'live':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Live</span>
          </span>
        );
      case 'stale':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>Stale Data</span>
          </span>
        );
      case 'waiting':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <HelpCircle className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span>Waiting for Data</span>
          </span>
        );
      case 'offline':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <WifiOff className="w-3 h-3 text-rose-600 dark:text-rose-400" />
            <span>Device Offline</span>
          </span>
        );
      case 'invalid':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800">
            <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />
            <span>Invalid Reading</span>
          </span>
        );
      case 'unavailable':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <XCircle className="w-3 h-3 text-slate-500" />
            <span>Sensor Unavailable</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-surface-cardLight dark:bg-surface-cardDark rounded-xl border border-surface-borderLight dark:border-surface-borderDark p-5 shadow-sm hover:shadow transition-shadow flex flex-col justify-between">
      {/* Header Row */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
              {icon}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                {name}
              </h3>
              {hardwareModel && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[180px]">
                  {hardwareModel}
                </p>
              )}
            </div>
          </div>
          <div>{getStatusBadge()}</div>
        </div>

        {/* Primary Metric Reading */}
        <div className="my-4">
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-mono">
              {valueDisplay}
            </span>
            {unit && (
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {unit}
              </span>
            )}
          </div>

          {/* Secondary Info / Context (e.g. ADC vs ppm, GPS coordinates) */}
          {secondaryInfo && (
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {secondaryInfo}
            </div>
          )}

          {/* Warning Note if elevated or calibration missing */}
          {warningNote && (
            <div className="mt-2 text-xs flex items-center space-x-1 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{warningNote}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Row: Timestamps and Action */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex flex-col">
          <span>
            Sampled:{' '}
            <strong className="text-slate-700 dark:text-slate-300 font-normal">
              {formatRelativeTime(measuredAt)}
            </strong>
          </span>
          {serverReceivedAt && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              Server ingestion: {formatRelativeTime(serverReceivedAt)}
            </span>
          )}
        </div>
        {actionButton && <div>{actionButton}</div>}
      </div>
    </div>
  );
};
