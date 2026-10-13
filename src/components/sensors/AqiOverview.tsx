import React from 'react';
import { AQICalculationResult } from '../../types';
import { formatTimeOnly, formatTimestamp } from '../../utils/formatters';
import { AlertCircle, CheckCircle, Info, ShieldAlert } from 'lucide-react';

interface AqiOverviewProps {
  aqiResult: AQICalculationResult;
  isStale: boolean;
  isOffline: boolean;
}

export const AqiOverview: React.FC<AqiOverviewProps> = ({
  aqiResult,
  isStale,
  isOffline,
}) => {
  // If device is offline or data is stale or calculation is invalid
  const hasValidAqi = aqiResult.isValid && !isOffline && !isStale && aqiResult.aqi !== null;

  return (
    <div className="bg-surface-cardLight dark:bg-surface-cardDark rounded-2xl border border-surface-borderLight dark:border-surface-borderDark p-6 shadow-sm overflow-hidden relative transition-all">
      {/* Subtle indicator bar on the left/top */}
      <div 
        className="absolute top-0 left-0 right-0 h-1.5 transition-all"
        style={{ backgroundColor: hasValidAqi ? aqiResult.colorHex : '#94a3b8' }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Column: Big AQI Gauge / Number */}
        <div className="lg:col-span-4 flex flex-col items-center lg:items-start text-center lg:text-left border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 pb-6 lg:pb-0 lg:pr-6">
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            <span>CPCB National Air Quality Index (NAQI)</span>
          </div>

          <div className="flex items-baseline space-x-3 my-2">
            <span
              className="text-6xl sm:text-7xl font-extrabold font-mono tracking-tight"
              style={{ color: hasValidAqi ? aqiResult.colorHex : '#64748b' }}
            >
              {hasValidAqi ? aqiResult.aqi : '--'}
            </span>
            <div className="flex flex-col text-left">
              <span className="text-sm font-semibold uppercase text-slate-400 dark:text-slate-500">
                Index (0–500)
              </span>
              <span 
                className="text-lg font-bold"
                style={{ color: hasValidAqi ? aqiResult.colorHex : '#94a3b8' }}
              >
                {hasValidAqi ? aqiResult.category : 'Unavailable'}
              </span>
            </div>
          </div>

          <div className="mt-1 flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
            {hasValidAqi ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Calculated at {formatTimeOnly(aqiResult.calculatedAt)}</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                <span>Computed: {formatTimestamp(aqiResult.calculatedAt)}</span>
              </>
            )}
          </div>
        </div>

        {/* Middle Column: Dominant Pollutant & Explanation */}
        <div className="lg:col-span-5 flex flex-col justify-center space-y-3">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Health Impact & Status
            </h4>
            <p className="mt-1 text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
              {hasValidAqi ? (
                aqiResult.explanation
              ) : (
                <span className="text-amber-700 dark:text-amber-400">
                  {aqiResult.explanation}
                </span>
              )}
            </p>
          </div>

          {hasValidAqi && aqiResult.dominantPollutant && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Dominant Criteria Pollutant:
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-mono">
                {aqiResult.dominantPollutant}
              </span>
            </div>
          )}

          {/* Sub-indices Breakdown if available */}
          {hasValidAqi && aqiResult.subIndices.length > 0 && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {aqiResult.subIndices.map((sub) => (
                <div 
                  key={sub.pollutant} 
                  className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs"
                >
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>{sub.pollutant} Sub-index</span>
                    <strong className="font-mono text-slate-900 dark:text-slate-100">{sub.subIndex}</strong>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Conc: {sub.concentration.toFixed(1)} µg/m³
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: CPCB Standard Scale Reference */}
        <div className="lg:col-span-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            <span>CPCB NAQI Bands</span>
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span className="text-slate-600 dark:text-slate-400">Good</span>
              </span>
              <span className="font-mono text-slate-500">0 – 50</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-lime-600" />
                <span className="text-slate-600 dark:text-slate-400">Satisfactory</span>
              </span>
              <span className="font-mono text-slate-500">51 – 100</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-600" />
                <span className="text-slate-600 dark:text-slate-400">Moderate</span>
              </span>
              <span className="font-mono text-slate-500">101 – 200</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-600" />
                <span className="text-slate-600 dark:text-slate-400">Poor</span>
              </span>
              <span className="font-mono text-slate-500">201 – 300</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600" />
                <span className="text-slate-600 dark:text-slate-400">Very Poor</span>
              </span>
              <span className="font-mono text-slate-500">301 – 400</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-900" />
                <span className="text-slate-600 dark:text-slate-400">Severe</span>
              </span>
              <span className="font-mono text-slate-500">401 – 500</span>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 leading-tight">
            *Indian NAQI standard requires criteria particulate (PM2.5 or PM10) monitoring.
          </div>
        </div>
      </div>
    </div>
  );
};
