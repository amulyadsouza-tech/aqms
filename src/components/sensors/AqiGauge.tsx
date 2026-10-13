import React from 'react';
import { AQICalculationResult, SensorReadings } from '../../types';
import { formatTimeOnly } from '../../utils/formatters';
import { MapPin, Clock, AlertCircle, CheckCircle2, Wind, Shield, Flame, Layers } from 'lucide-react';

interface AqiGaugeProps {
  aqiResult: AQICalculationResult;
  isStale: boolean;
  isOffline: boolean;
  locationName?: string;
  sensorReadings?: SensorReadings | null;
}

// CPCB AQI colour scale
const AQI_BANDS = [
  { label: 'Good',         min: 0,   max: 50,  color: '#16a34a' },
  { label: 'Satisfactory', min: 51,  max: 100, color: '#65a30d' },
  { label: 'Moderate',     min: 101, max: 200, color: '#d97706' },
  { label: 'Poor',         min: 201, max: 300, color: '#ea580c' },
  { label: 'Very Poor',    min: 301, max: 400, color: '#dc2626' },
  { label: 'Severe',       min: 401, max: 500, color: '#7f1d1d' },
];

function getAqiBand(aqi: number) {
  return AQI_BANDS.find(b => aqi >= b.min && aqi <= b.max) || AQI_BANDS[AQI_BANDS.length - 1];
}

/* ─── Semicircular AQI Gauge Indicator ─────────────────────── */
interface SemiGaugeProps {
  value: number | null;
  max?: number;
  color: string;
  isValid: boolean;
}

const SemiGauge: React.FC<SemiGaugeProps> = ({ value, max = 500, color, isValid }) => {
  const R  = 96;
  const CX = 120;
  const CY = 120;
  const strokeW = 16;

  const startAngle = -180;
  const endAngle   = 0;
  const totalSweep = 180;

  const polarToXY = (angleDeg: number, r: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
  };

  const describeArc = (from: number, to: number, r: number) => {
    const s = polarToXY(from, r);
    const e = polarToXY(to, r);
    const largeArc = Math.abs(to - from) > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  const fillFraction = isValid && value !== null
    ? Math.min(Math.max(value, 0), max) / max
    : 0;
  const fillEndAngle = startAngle + fillFraction * totalSweep;

  const trackPath = describeArc(startAngle, endAngle, R);
  const fillPath  = fillFraction > 0.005 ? describeArc(startAngle, fillEndAngle, R) : '';

  return (
    <svg
      viewBox="0 0 240 135"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="w-full max-w-[360px]"
    >
      {/* Background Track */}
      <path
        d={trackPath}
        strokeWidth={strokeW}
        fill="none"
        strokeLinecap="round"
        className="stroke-slate-200 dark:stroke-[#303030]"
      />

      {/* Active Fill Arc */}
      {fillPath && (
        <path
          d={fillPath}
          strokeWidth={strokeW}
          stroke={color}
          fill="none"
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      )}
    </svg>
  );
};

/* ─── Sensor Reading Mini-Box ──────────────────────────────── */
interface SensorBoxProps {
  name: string;
  value: number | null | undefined;
  unit: string;
  icon: React.ReactNode;
  accentColor: string;     // darker accent for icon/label
  bgTintLight: string;     // subtle bg tint in light mode
  bgTintDark: string;      // subtle bg tint in dark mode
  borderLight: string;
  borderDark: string;
}

const SensorBox: React.FC<SensorBoxProps> = ({
  name, value, unit, icon, accentColor, bgTintLight, bgTintDark, borderLight, borderDark
}) => {
  const display = value !== null && value !== undefined && !isNaN(value)
    ? name === 'MQ-3' ? Math.round(value).toString() : value.toFixed(1)
    : '--';

  return (
    <div className={`${bgTintLight} ${bgTintDark} rounded-xl border ${borderLight} ${borderDark} p-3.5 sm:p-4 flex flex-col gap-1.5 transition-colors`}>
      <div className="flex items-center gap-2">
        <span className={accentColor}>{icon}</span>
        <span className={`text-xs font-bold uppercase tracking-wider ${accentColor}`}>
          {name}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight leading-none ${accentColor}`}>
          {display}
        </span>
        {display !== '--' && (
          <span className="text-xs font-semibold text-[#687583] dark:text-[#A0A0A0]">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
};

/* ─── Main AQI Gauge Export ────────────────────────────────── */
export const AqiGauge: React.FC<AqiGaugeProps> = ({
  aqiResult,
  isStale,
  isOffline,
  locationName,
  sensorReadings,
}) => {
  const hasValidAqi = aqiResult.isValid && !isOffline && !isStale && aqiResult.aqi !== null;
  const band        = hasValidAqi && aqiResult.aqi !== null ? getAqiBand(aqiResult.aqi) : null;
  const gaugeColor  = band?.color ?? '#94a3b8';

  return (
    <div className="bg-[#EAF3FC] dark:bg-[#151515] rounded-3xl border border-[#d1e6f5] dark:border-[#303030] shadow-card overflow-hidden transition-all">
      {/* Top accent colour stripe */}
      <div
        className="h-2 transition-colors duration-500"
        style={{ backgroundColor: hasValidAqi ? gaugeColor : '#94a3b8' }}
        aria-hidden
      />

      <div className="p-6 sm:p-9">
        {/* Header Row — no LIVE badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Shield className="w-4 h-4 text-[#397FC0] dark:text-[#64B5F6]" aria-hidden />
              <p className="text-xs font-bold uppercase tracking-widest text-[#397FC0] dark:text-[#64B5F6]">
                National Air Quality Standard (CPCB)
              </p>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#24272D] dark:text-white tracking-tight">
              Air Quality Index (AQI)
            </h2>
            {locationName && (
              <div className="flex items-center gap-2 text-sm font-medium text-[#687583] dark:text-[#C4C4C4] mt-1.5">
                <MapPin className="w-4 h-4 flex-shrink-0 text-[#397FC0] dark:text-[#64B5F6]" aria-hidden />
                <span>{locationName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Balanced Two-column Layout on Desktop, Centered on Mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
          {/* Left Column: Semicircular Gauge & Prominent AQI */}
          <div className="flex flex-col items-center">
            <div className="relative w-full max-w-[360px] flex justify-center">
              <SemiGauge
                value={aqiResult.aqi}
                max={500}
                color={gaugeColor}
                isValid={hasValidAqi}
              />

              {/* Overlaid Prominent Numerical AQI */}
              <div
                className="absolute inset-x-0 bottom-1 flex flex-col items-center"
              >
                <span
                  className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-none transition-colors duration-500"
                  style={{ color: hasValidAqi ? gaugeColor : '#94a3b8' }}
                >
                  {hasValidAqi && aqiResult.aqi !== null ? aqiResult.aqi : '--'}
                </span>
                <span
                  className="text-lg sm:text-xl font-bold mt-2 tracking-wide uppercase px-4 py-1 rounded-full transition-colors duration-500"
                  style={{
                    color: hasValidAqi ? gaugeColor : '#94a3b8',
                    backgroundColor: hasValidAqi ? `${gaugeColor}15` : 'transparent',
                  }}
                >
                  {hasValidAqi ? aqiResult.category : 'Data Unavailable'}
                </span>
              </div>
            </div>

            {/* Scale min and max */}
            <div className="flex justify-between w-full max-w-[320px] mt-2 px-3 text-xs font-mono text-[#687583] dark:text-[#A0A0A0]">
              <span>0 (Clean)</span>
              <span>500 (Severe)</span>
            </div>

            {/* Timestamp */}
            <div className="flex items-center gap-2 mt-4 text-xs font-semibold text-[#687583] dark:text-[#A0A0A0]">
              {hasValidAqi ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" aria-hidden />
                  <span>Calculated at {formatTimeOnly(aqiResult.calculatedAt)}</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" aria-hidden />
                  <span>{isOffline ? 'Node is offline — waiting for telemetry' : isStale ? 'Telemetry is stale' : 'Awaiting valid sensor telemetry'}</span>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Sensor Boxes, Dominant Pollutant & Categories */}
          <div className="space-y-5">
            {/* 4 Sensor Reading Boxes — 2×2 Grid */}
            <div className="grid grid-cols-2 gap-3">
              <SensorBox
                name="PM1.0"
                value={sensorReadings?.pm1_0}
                unit="µg/m³"
                icon={<Wind className="w-4 h-4" />}
                accentColor="text-sky-700 dark:text-sky-400"
                bgTintLight="bg-sky-100/80"
                bgTintDark="dark:bg-sky-950/50"
                borderLight="border-sky-200"
                borderDark="dark:border-sky-800/50"
              />
              <SensorBox
                name="PM2.5"
                value={sensorReadings?.pm2_5}
                unit="µg/m³"
                icon={<Wind className="w-4 h-4" />}
                accentColor="text-emerald-700 dark:text-emerald-400"
                bgTintLight="bg-emerald-100/80"
                bgTintDark="dark:bg-emerald-950/50"
                borderLight="border-emerald-200"
                borderDark="dark:border-emerald-800/50"
              />
              <SensorBox
                name="PM10"
                value={sensorReadings?.pm10}
                unit="µg/m³"
                icon={<Layers className="w-4 h-4" />}
                accentColor="text-orange-700 dark:text-orange-400"
                bgTintLight="bg-orange-100/80"
                bgTintDark="dark:bg-orange-950/50"
                borderLight="border-orange-200"
                borderDark="dark:border-orange-800/50"
              />
              <SensorBox
                name="MQ-3"
                value={sensorReadings?.mq3_raw}
                unit={sensorReadings?.mq3_ppm != null ? 'ppm' : 'Raw ADC'}
                icon={<Flame className="w-4 h-4" />}
                accentColor="text-purple-700 dark:text-purple-400"
                bgTintLight="bg-purple-100/80"
                bgTintDark="dark:bg-purple-950/50"
                borderLight="border-purple-200"
                borderDark="dark:border-purple-800/50"
              />
            </div>

            {/* Dominant Pollutant if available */}
            {hasValidAqi && aqiResult.dominantPollutant && (
              <div className="p-4 rounded-xl bg-white/60 dark:bg-[#1D1D1D] border border-[#d1e6f5]/70 dark:border-[#303030] flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#687583] dark:text-[#A0A0A0]">
                  Dominant Pollutant
                </span>
                <span className="text-base font-extrabold font-mono text-[#24272D] dark:text-white bg-slate-100 dark:bg-[#252525] px-3 py-1 rounded-lg border border-slate-200 dark:border-[#303030]">
                  {aqiResult.dominantPollutant}
                </span>
              </div>
            )}

            {/* Scale legend */}
            <div className="pt-2">
              <p className="text-xs font-bold uppercase tracking-wider text-[#687583] dark:text-[#A0A0A0] mb-2">
                AQI Categories
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center">
                {AQI_BANDS.map(b => (
                  <div
                    key={b.label}
                    className="p-1.5 rounded-lg border text-[11px] font-bold"
                    style={{
                      backgroundColor: `${b.color}15`,
                      borderColor: `${b.color}40`,
                      color: b.color,
                    }}
                  >
                    <div className="truncate">{b.label}</div>
                    <div className="text-[10px] font-mono opacity-80">{b.min}-{b.max}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
