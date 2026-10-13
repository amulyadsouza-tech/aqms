import React, { useEffect, useState, useMemo } from 'react';
import {
  BrandingConfig,
  DeviceMetadata,
  IngestedReading,
  SensorCardStatus
} from '../types';
import {
  DEFAULT_BRANDING,
  DEFAULT_SYSTEM_SETTINGS,
  fetchHistoricalReadings,
  isFirebaseConfigured,
  subscribeToBranding,
  subscribeToDeviceMetadata,
  subscribeToLatestReading
} from '../services/firebase';
import {
  generateDemoHistoricalData,
  generateDemoReading
} from '../services/demoData';
import { calculateCPCB_AQI } from '../utils/aqiCalculator';
import { Header } from '../components/common/Header';
import { Footer } from '../components/common/Footer';
import { AqiGauge } from '../components/sensors/AqiGauge';
import {
  TemperatureCard,
  HumidityCard,
  PMCard,
  GasSensorCard,
  LocationCard,
} from '../components/sensors/MetricCards';
import { HistoricalCharts } from '../components/charts/HistoricalCharts';
import { DeviceStatusCard } from '../components/devices/DeviceStatusCard';
import { Info, RefreshCw, Wind } from 'lucide-react';

interface DashboardPageProps {
  onNavigateAdmin: () => void;
}

const getSensorStatus = (
  val: number | null | undefined,
  isOffline: boolean,
  isStale: boolean
): SensorCardStatus => {
  if (isOffline) return 'offline';
  if (isStale)   return 'stale';
  if (val === null || val === undefined) return 'unavailable';
  if (isNaN(val)) return 'invalid';
  return 'live';
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateAdmin }) => {
  // ── State ──────────────────────────────────────────────────
  const [branding, setBranding]           = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [metadata, setMetadata]           = useState<DeviceMetadata | null>(null);
  const [latestReading, setLatestReading] = useState<IngestedReading | null>(null);
  const [historicalData, setHistoricalData] = useState<IngestedReading[]>([]);
  const [timeWindowHours, setTimeWindowHours] = useState<number>(24);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);
  const [activeDeviceId] = useState<string>('SJEC-AQMS-ESP32-001');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(!isFirebaseConfigured);

  // ── Firebase subscriptions ──────────────────────────────────
  useEffect(() => {
    const unsub = subscribeToBranding(setBranding);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isDemoMode && isFirebaseConfigured) {
      const unsubMeta    = subscribeToDeviceMetadata(activeDeviceId, setMetadata);
      const unsubReading = subscribeToLatestReading(activeDeviceId, setLatestReading);
      return () => { unsubMeta(); unsubReading(); };
    } else {
      const demoReading = generateDemoReading();
      setLatestReading(demoReading);
      const timer = setInterval(() => setLatestReading(generateDemoReading()), 10_000);
      return () => clearInterval(timer);
    }
  }, [isDemoMode, activeDeviceId]);

  useEffect(() => {
    setIsLoadingHistory(true);
    if (!isDemoMode && isFirebaseConfigured) {
      const count = timeWindowHours <= 1 ? 30 : timeWindowHours <= 6 ? 90 : 200;
      fetchHistoricalReadings(activeDeviceId, count)
        .then(setHistoricalData)
        .catch(err => console.error('Failed to load history:', err))
        .finally(() => setIsLoadingHistory(false));
    } else {
      setTimeout(() => {
        setHistoricalData(generateDemoHistoricalData(timeWindowHours));
        setIsLoadingHistory(false);
      }, 250);
    }
  }, [isDemoMode, activeDeviceId, timeWindowHours]);

  // ── Derived state ───────────────────────────────────────────
  const now = Date.now();
  const offlineTimeout  = metadata?.offlineTimeoutSeconds || DEFAULT_SYSTEM_SETTINGS.deviceOfflineTimeoutSeconds;
  const staleThreshold  = DEFAULT_SYSTEM_SETTINGS.staleDataThresholdSeconds;

  const readingAgeSec = latestReading?.timestamp
    ? Math.max(0, Math.floor((now - latestReading.timestamp) / 1000))
    : Infinity;

  const isDeviceOnline  = Boolean(latestReading && readingAgeSec <= offlineTimeout);
  const isDataStale     = Boolean(latestReading && readingAgeSec > staleThreshold && readingAgeSec <= offlineTimeout);
  const isDeviceOffline = Boolean(!latestReading || readingAgeSec > offlineTimeout);

  const s = latestReading?.sensors;
  const g = latestReading?.gps;

  const ss = (val: number | null | undefined) =>
    getSensorStatus(val, isDeviceOffline, isDataStale);

  const aqiResult = useMemo(
    () => calculateCPCB_AQI(latestReading?.sensors, isDataStale || isDeviceOffline),
    [latestReading?.sensors, isDataStale, isDeviceOffline]
  );

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-transparent text-[#24272D] dark:text-white">

      {/* Header */}
      <div className="relative z-40">
        <Header
          branding={branding}
          isDemoMode={isDemoMode}
          isDeviceOnline={isDeviceOnline}
          onNavigateAdmin={onNavigateAdmin}
          onNavigateHome={() => {}}
          currentPage="public"
        />
      </div>

      <main className="relative z-10 flex-1 max-w-[1240px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-9 animate-fade-in">

        {/* ── Demo Mode Banner ─────────────────────────────── */}
        {isDemoMode && (
          <div
            className="bg-[#EAF3FC] dark:bg-[#151515] border border-amber-300 dark:border-amber-800/80 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-card"
          >
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Demo Mode — Synthetic Data</p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  Displaying verified synthetic readings. Live telemetry streams once Firebase and the ESP32 node are configured.
                </p>
              </div>
            </div>
            {isFirebaseConfigured && (
              <button
                onClick={() => setIsDemoMode(false)}
                className="self-start sm:self-center inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-sm whitespace-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden />
                Switch to Live
              </button>
            )}
          </div>
        )}

        {/* ── 1. AQI Gauge — Visual centrepiece ────────────── */}
        <section aria-labelledby="aqi-section-heading">
          <h2 id="aqi-section-heading" className="sr-only">Air Quality Index</h2>
          <AqiGauge
            aqiResult={aqiResult}
            isStale={isDataStale}
            isOffline={isDeviceOffline}
            locationName={metadata?.locationName || branding.location}
            sensorReadings={latestReading?.sensors}
          />
        </section>

        {/* ── 2. Temperature + Humidity ────────────────────── */}
        <section aria-labelledby="climate-heading">
          <div className="mb-4">
            <p className="section-label">Meteorological</p>
            <h2 id="climate-heading" className="section-title">Temperature &amp; Humidity</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <TemperatureCard
              value={s?.temperature_c}
              status={ss(s?.temperature_c)}
              timestamp={latestReading?.timestamp}
            />
            <HumidityCard
              value={s?.humidity_percent}
              status={ss(s?.humidity_percent)}
              timestamp={latestReading?.timestamp}
            />
          </div>
        </section>

        {/* ── 3. Particulate Matter ─────────────────────────── */}
        <section aria-labelledby="pm-heading">
          <div className="mb-4 flex items-center gap-3">
            <div>
              <p className="section-label">Particulate Matter</p>
              <h2 id="pm-heading" className="section-title">Air Quality Readings</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            <PMCard
              label="PM1.0"
              value={s?.pm1_0}
              status={ss(s?.pm1_0)}
              timestamp={latestReading?.timestamp}
            />
            <PMCard
              label="PM2.5"
              value={s?.pm2_5}
              status={ss(s?.pm2_5)}
              timestamp={latestReading?.timestamp}
              isPrimary
              warningNote={
                s?.pm2_5 && s.pm2_5 > 60 ? 'Exceeds 24-hr standard (60 µg/m³)' : undefined
              }
            />
            <PMCard
              label="PM10"
              value={s?.pm10}
              status={ss(s?.pm10)}
              timestamp={latestReading?.timestamp}
              warningNote={
                s?.pm10 && s.pm10 > 100 ? 'Exceeds 24-hr standard (100 µg/m³)' : undefined
              }
            />
          </div>
        </section>

        {/* ── 4. Additional Sensors ─────────────────────────── */}
        <section aria-labelledby="gas-heading">
          <div className="mb-4">
            <p className="section-label">Additional Sensors</p>
            <h2 id="gas-heading" className="section-title">Gas &amp; Location</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <GasSensorCard
              rawValue={s?.mq3_raw}
              calibratedPpm={s?.mq3_ppm}
              status={ss(s?.mq3_raw)}
              timestamp={latestReading?.timestamp}
            />
            <LocationCard
              lat={g?.latitude}
              lng={g?.longitude}
              isGpsValid={g?.valid}
              satellites={g?.satellites}
              altitude={g?.altitude_m}
              configuredLocation={metadata?.locationName}
            />
          </div>
        </section>

        {/* ── 5. Device Status ──────────────────────────────── */}
        <section aria-labelledby="device-status-heading">
          <div className="mb-4">
            <p className="section-label">Hardware</p>
            <h2 id="device-status-heading" className="section-title">Device Status</h2>
          </div>
          <DeviceStatusCard
            metadata={metadata}
            latestReading={latestReading}
            isOnline={isDeviceOnline}
            isStale={isDataStale}
            offlineTimeoutSeconds={offlineTimeout}
          />
        </section>

        {/* ── 6. Historical Chart ───────────────────────────── */}
        <section aria-labelledby="history-heading">
          <div className="mb-4">
            <p className="section-label">Trends</p>
            <h2 id="history-heading" className="section-title">Environmental History</h2>
          </div>
          <HistoricalCharts
            data={historicalData}
            timeWindowHours={timeWindowHours}
            onTimeWindowChange={setTimeWindowHours}
            isLoading={isLoadingHistory}
            isDemoMode={isDemoMode}
          />
        </section>

      </main>

      <div className="relative z-10">
        <Footer onNavigateAdmin={onNavigateAdmin} />
      </div>
    </div>
  );
};
