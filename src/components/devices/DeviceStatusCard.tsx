import React from 'react';
import { DeviceMetadata, IngestedReading, TransportType } from '../../types';
import { formatRelativeTime, formatTimestamp } from '../../utils/formatters';
import {
  Cpu, Wifi, Radio, MapPin, CheckCircle2, AlertTriangle,
  Clock, ShieldCheck, HelpCircle, Activity, Signal
} from 'lucide-react';

interface DeviceStatusCardProps {
  metadata: DeviceMetadata | null;
  latestReading: IngestedReading | null;
  isOnline: boolean;
  isStale: boolean;
  offlineTimeoutSeconds: number;
}

const getTransportIcon = (t: TransportType) => {
  switch (t) {
    case 'wifi':         return <Wifi className="w-4 h-4 text-emerald-500" aria-hidden />;
    case 'lora_gateway': return <Radio className="w-4 h-4 text-[#397FC0] dark:text-[#64B5F6]" aria-hidden />;
    default:             return <HelpCircle className="w-4 h-4 text-slate-400" aria-hidden />;
  }
};

const getTransportLabel = (t: TransportType) => {
  switch (t) {
    case 'wifi':         return 'Wi-Fi Direct HTTPS';
    case 'lora_gateway': return 'LoRa Gateway Ingestion';
    case 'cellular':     return 'Cellular IoT';
    default:             return 'Not configured';
  }
};

const StatCell: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}> = ({ icon, label, value, sub }) => (
  <div className="p-3.5 rounded-xl bg-white/80 dark:bg-[#1D1D1D] border border-[#d1e6f5] dark:border-[#303030]">
    <div className="flex items-center gap-1.5 text-xs font-bold text-[#687583] dark:text-[#A0A0A0] uppercase tracking-wider mb-1.5">
      {icon}
      <span>{label}</span>
    </div>
    <div className="text-sm font-bold text-[#24272D] dark:text-white leading-tight">
      {value}
    </div>
    {sub && (
      <div className="text-[11px] text-[#687583] dark:text-[#A0A0A0] font-mono mt-1 truncate">{sub}</div>
    )}
  </div>
);

export const DeviceStatusCard: React.FC<DeviceStatusCardProps> = ({
  metadata,
  latestReading,
  isOnline,
  isStale,
  offlineTimeoutSeconds,
}) => {
  const transport: TransportType =
    latestReading?.connectivity.transport || metadata?.transport || 'unconfigured';
  const hasGpsFix = Boolean(latestReading?.gps?.valid);

  return (
    <div className="bg-[#EAF3FC] dark:bg-[#151515] rounded-3xl border border-[#d1e6f5] dark:border-[#303030] shadow-card p-6 sm:p-7 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-5 border-b border-[#d1e6f5] dark:border-[#303030]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-sky-100/80 dark:bg-[#1D1D1D] border border-sky-200 dark:border-[#303030] flex items-center justify-center flex-shrink-0">
            <Cpu className="w-6 h-6 text-[#397FC0] dark:text-[#64B5F6]" aria-hidden />
          </div>
          <div>
            <h3 className="font-extrabold text-[#24272D] dark:text-white text-base">
              {metadata?.name || 'Device not configured'}
            </h3>
            <p className="text-xs text-[#687583] dark:text-[#A0A0A0] font-mono mt-0.5">
              ID: {metadata?.deviceId || 'Not configured'} · Firmware: {latestReading?.firmwareVersion || metadata?.firmwareVersion || 'Not reported'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border ${
            isOnline
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {isOnline ? 'Node Online' : `Node Offline (>${offlineTimeoutSeconds}s)`}
          </span>
          {isStale && isOnline && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
              <Clock className="w-3.5 h-3.5" />
              Stale Telemetry
            </span>
          )}
        </div>
      </div>

      {/* Grid of stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCell
          icon={getTransportIcon(transport)}
          label="Telemetry Radio"
          value={getTransportLabel(transport)}
          sub={latestReading?.connectivity.rssi_dbm != null ? `RSSI ${latestReading.connectivity.rssi_dbm} dBm` : 'No signal report'}
        />

        <StatCell
          icon={<Signal className="w-4 h-4 text-emerald-500" aria-hidden />}
          label="Reporting Rate"
          value={metadata?.expectedIntervalSeconds ? `${metadata.expectedIntervalSeconds}s interval` : 'Not configured'}
          sub={`Timeout: ${offlineTimeoutSeconds}s`}
        />

        <StatCell
          icon={<MapPin className="w-4 h-4 text-[#397FC0] dark:text-[#64B5F6]" aria-hidden />}
          label="GPS Fix Status"
          value={hasGpsFix ? 'GPS Fix' : 'No GPS Fix'}
          sub={hasGpsFix ? `${latestReading?.gps?.satellites ?? 'Unknown'} satellites` : 'Awaiting GPS data'}
        />

        <StatCell
          icon={<Activity className="w-4 h-4 text-purple-500" aria-hidden />}
          label="Last Ingested"
          value={formatRelativeTime(latestReading?.timestamp)}
          sub={latestReading?.timestamp ? formatTimestamp(latestReading.timestamp) : 'Awaiting data'}
        />
      </div>
    </div>
  );
};
