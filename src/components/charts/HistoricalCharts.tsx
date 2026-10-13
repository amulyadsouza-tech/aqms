import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { IngestedReading } from '../../types';
import { formatTimeOnly, formatTimestamp } from '../../utils/formatters';
import { TrendingUp, Database, Loader2, Calendar } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { calculateCPCB_AQI } from '../../utils/aqiCalculator';

interface HistoricalChartsProps {
  data: IngestedReading[];
  timeWindowHours: number;
  onTimeWindowChange: (hours: number) => void;
  isLoading: boolean;
  isDemoMode: boolean;
}

type MetricKey = 'temperature' | 'humidity' | 'pm1_0' | 'pm2_5' | 'pm10' | 'aqi';

interface MetricConfig {
  key: MetricKey;
  label: string;
  unit: string;
  color: string;
  gradientId: string;
  dataKey: string;
}

const METRICS: MetricConfig[] = [
  {
    key: 'temperature', label: 'Temperature', unit: '°C',
    color: '#f97316', gradientId: 'gradTemp', dataKey: 'temperature',
  },
  {
    key: 'humidity', label: 'Humidity', unit: '%',
    color: '#06b6d4', gradientId: 'gradHum', dataKey: 'humidity',
  },
  {
    key: 'pm1_0', label: 'PM1.0', unit: 'µg/m³',
    color: '#a78bfa', gradientId: 'gradPm1', dataKey: 'pm1_0',
  },
  {
    key: 'pm2_5', label: 'PM2.5', unit: 'µg/m³',
    color: '#397FC0', gradientId: 'gradPm25', dataKey: 'pm2_5',
  },
  {
    key: 'pm10', label: 'PM10', unit: 'µg/m³',
    color: '#10b981', gradientId: 'gradPm10', dataKey: 'pm10',
  },
  {
    key: 'aqi', label: 'AQI Index', unit: 'AQI',
    color: '#e11d48', gradientId: 'gradAqi', dataKey: 'aqi',
  },
];

const TIME_OPTIONS = [
  { label: '24H', hours: 24 },
  { label: '7D',  hours: 168 },
  { label: '30D', hours: 720 },
];

// Custom Tooltip
const ChartTooltip: React.FC<{
  active?: boolean;
  payload?: any[];
  label?: string;
  metric: MetricConfig;
}> = ({ active, payload, metric }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const val = d[metric.dataKey];

  return (
    <div className="bg-white dark:bg-[#1D1D1D] rounded-xl shadow-xl px-4 py-3 border border-[#d1e6f5] dark:border-[#303030] text-xs min-w-[160px]">
      <p className="text-[#687583] dark:text-[#A0A0A0] mb-1.5 font-medium">{formatTimestamp(d.timestamp)}</p>
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold text-[#24272D] dark:text-[#C4C4C4]">{metric.label}:</span>
        <span className="font-bold text-base font-mono" style={{ color: metric.color }}>
          {val !== null && val !== undefined ? `${Number(val).toFixed(1)} ${metric.unit}` : '—'}
        </span>
      </div>
    </div>
  );
};

export const HistoricalCharts: React.FC<HistoricalChartsProps> = ({
  data,
  timeWindowHours,
  onTimeWindowChange,
  isLoading,
  isDemoMode,
}) => {
  const { theme } = useTheme();
  const [selectedMetricKey, setSelectedMetricKey] = useState<MetricKey>('temperature');

  const isDark = theme === 'dark';
  const gridColor = isDark ? '#303030' : '#d1e6f5';
  const axisColor = isDark ? '#A0A0A0' : '#687583';

  const selectedMetric = METRICS.find(m => m.key === selectedMetricKey) ?? METRICS[0];

  // Process data points and include calculated AQI if possible
  const chartData = useMemo(() =>
    data.map(r => {
      let aqiVal: number | null = null;
      if (r.sensors) {
        const res = calculateCPCB_AQI(r.sensors, false);
        if (res.isValid && res.aqi !== null) {
          aqiVal = res.aqi;
        }
      }

      return {
        timestamp:   r.timestamp,
        timeLabel:   formatTimeOnly(r.timestamp),
        pm2_5:       r.sensors?.pm2_5 ?? null,
        pm10:        r.sensors?.pm10 ?? null,
        pm1_0:       r.sensors?.pm1_0 ?? null,
        temperature: r.sensors?.temperature_c ?? null,
        humidity:    r.sensors?.humidity_percent ?? null,
        aqi:         aqiVal,
      };
    }),
    [data]
  );

  return (
    <div className="bg-[#EAF3FC] dark:bg-[#151515] rounded-3xl border border-[#d1e6f5] dark:border-[#303030] shadow-card p-6 sm:p-8 transition-all">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-sky-100/80 dark:bg-[#1D1D1D] border border-sky-200 dark:border-[#303030] flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6 text-[#397FC0] dark:text-[#64B5F6]" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#397FC0] dark:text-[#64B5F6]">
              Environmental Trends
            </p>
            <h2 className="text-2xl font-extrabold text-[#24272D] dark:text-white flex items-center gap-2 tracking-tight">
              Telemetry History
              {isDemoMode && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  DEMO DATA
                </span>
              )}
            </h2>
          </div>
        </div>

        {/* Time range selector (24H, 7D, 30D) */}
        <div className="flex items-center gap-1.5 bg-white/80 dark:bg-[#1D1D1D] p-1.5 rounded-2xl border border-[#d1e6f5] dark:border-[#303030] self-start sm:self-auto flex-shrink-0">
          <Calendar className="w-4 h-4 ml-1.5 text-[#687583] dark:text-[#A0A0A0]" aria-hidden />
          {TIME_OPTIONS.map(opt => (
            <button
              key={opt.hours}
              onClick={() => onTimeWindowChange(opt.hours)}
              className={`px-4 py-1.5 text-sm font-bold rounded-xl transition-all cursor-pointer ${
                timeWindowHours === opt.hours
                  ? 'bg-institute-blue text-white shadow-sm'
                  : 'text-[#687583] dark:text-[#C4C4C4] hover:text-[#24272D] dark:hover:text-white'
              }`}
              aria-pressed={timeWindowHours === opt.hours}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metric selector tabs */}
      <div className="tabs-scroll flex gap-2 mb-6 pb-1" role="tablist">
        {METRICS.map(m => {
          const isSelected = selectedMetricKey === m.key;
          return (
            <button
              key={m.key}
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedMetricKey(m.key)}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all border flex items-center gap-2 cursor-pointer ${
                isSelected
                  ? 'bg-white dark:bg-[#1D1D1D] text-[#24272D] dark:text-white border-[#397FC0] dark:border-[#64B5F6] shadow-sm'
                  : 'bg-white/50 dark:bg-[#1D1D1D]/50 text-[#687583] dark:text-[#A0A0A0] border-[#d1e6f5] dark:border-[#303030] hover:text-[#24272D] dark:hover:text-white'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: m.color }}
              />
              <span>{m.label}</span>
              <span className="text-xs opacity-70 font-mono">({m.unit})</span>
            </button>
          );
        })}
      </div>

      {/* Chart container */}
      <div className="w-full bg-white/70 dark:bg-[#1D1D1D] rounded-2xl border border-[#d1e6f5] dark:border-[#303030] p-4 sm:p-6 min-h-[340px] flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 text-[#687583] dark:text-[#A0A0A0] py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#397FC0] dark:text-[#64B5F6]" />
            <span className="text-sm font-semibold">Loading telemetry history...</span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center gap-3 text-[#687583] dark:text-[#A0A0A0] py-16 text-center">
            <Database className="w-10 h-10 text-slate-300 dark:text-[#303030]" />
            <p className="text-base font-bold text-[#24272D] dark:text-white">No Historical Telemetry Recorded</p>
            <p className="text-sm max-w-md">
              No readings found for the {timeWindowHours}h window. Telemetry points will appear here as they are published to Firebase.
            </p>
          </div>
        ) : (
          <div className="w-full h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id={selectedMetric.gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={selectedMetric.color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={selectedMetric.color} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="timeLabel"
                  stroke={axisColor}
                  tick={{ fill: axisColor, fontSize: 11, fontFamily: 'monospace' }}
                  tickLine={{ stroke: gridColor }}
                />
                <YAxis
                  stroke={axisColor}
                  tick={{ fill: axisColor, fontSize: 11, fontFamily: 'monospace' }}
                  tickLine={{ stroke: gridColor }}
                  domain={['auto', 'auto']}
                  unit={` ${selectedMetric.unit}`}
                />
                <Tooltip content={<ChartTooltip metric={selectedMetric} />} />
                <Area
                  type="monotone"
                  dataKey={selectedMetric.dataKey}
                  stroke={selectedMetric.color}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill={`url(#${selectedMetric.gradientId})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
