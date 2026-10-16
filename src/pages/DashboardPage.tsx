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
  isFirebaseConfigured,
  subscribeToBranding,
  subscribeToDeviceMetadata,
  subscribeToLatestReading,
  subscribeToActiveDeviceId,
  subscribeToHistoricalReadings
} from '../services/firebase';
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
import { WebSocketStatusBar } from '../components/common/WebSocketStatusBar';
import { deviceConnection } from '../services/deviceConnection';
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
  if (isStale) return 'stale';
  if (val === null || val === undefined) return 'unavailable';
  if (isNaN(val)) return 'invalid';
  return 'live';
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateAdmin }) => {
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [metadata, setMetadata] = useState<DeviceMetadata | null>(null);
  const [latestReading, setLatestReading] = useState<IngestedReading | null>(null);
  const [historicalData, setHistoricalData] = useState<IngestedReading[]>([]);
  const [timeWindowHours, setTimeWindowHours] = useState<number>(24);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);
  const [activeDeviceId, setActiveDeviceId] = useState<string>('');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const unsubscribe = subscribeToBranding(setBranding);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToActiveDeviceId((deviceId) => {
      setActiveDeviceId(deviceId || '');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setMetadata(null);
    setLatestReading(null);
    if (!activeDeviceId || !isFirebaseConfigured) return;

    const unsubscribeMetadata = subscribeToDeviceMetadata(activeDeviceId, setMetadata);
    const unsubscribeLatest = subscribeToLatestReading(activeDeviceId, setLatestReading);
    return () => {
      unsubscribeMetadata();
      unsubscribeLatest();
    };
  }, [activeDeviceId]);

  useEffect(() => {
    const unsubWs = deviceConnection.subscribeReading((live) => {
      setLatestReading(live);
      setIsDemoMode(false);
      setHistoricalData((prev) => {
        const next = [...prev, live];
        return next.length > 200 ? next.slice(next.length - 200) : next;
      });
      setIsLoadingHistory(false);
    });
    return () => unsubWs();
  }, []);

  useEffect(() => {
    setIsLoadingHistory(true);
    if (!activeDeviceId || !isFirebaseConfigured) {
      setHistoricalData([]);
      setIsLoadingHistory(false);
      return;
    }

    const limitCount = timeWindowHours <= 1 ? 30 : timeWindowHours <= 6 ? 90 : 200;
    return subscribeToHistoricalReadings(
      activeDeviceId,
      limitCount,
      (readings) => {
        setHistoricalData(readings);
        setIsLoadingHistory(false);
      },
      (error) => {
        console.error('Failed to subscribe to history:', error);
        setHistoricalData([]);
        setIsLoadingHistory(false);
      }
    );
  }, [activeDeviceId, timeWindowHours]);

  const offlineTimeout = metadata?.offlineTimeoutSeconds || DEFAULT_SYSTEM_SETTINGS.deviceOfflineTimeoutSeconds;
  const staleThreshold = DEFAULT_SYSTEM_SETTINGS.staleDataThresholdSeconds;
  const dashboardReading = latestReading?.source === 'manual' ? null : latestReading;
  // Use serverReceivedAt as the age reference — it's always Date.now() at ingest,
  // so millis()-based firmware timestamps don't make readings appear ancient.
  const readingRef = dashboardReading
    ? (dashboardReading.serverReceivedAt || dashboardReading.timestamp)
    : 0;
  const readingAgeSec = readingRef
    ? Math.max(0, Math.floor((now - readingRef) / 1000))
    : Infinity;
  const isWsConnected = deviceConnection.getState().status === 'connected';
  const isDeviceOnline = Boolean(dashboardReading && (isWsConnected || readingAgeSec <= offlineTimeout));
  const isDataStale = Boolean(dashboardReading && !isWsConnected && readingAgeSec > staleThreshold && readingAgeSec <= offlineTimeout);
  const isDeviceOffline = Boolean(!dashboardReading || (!isWsConnected && readingAgeSec > offlineTimeout));
  const sensors = dashboardReading?.sensors;
  const gps = dashboardReading?.gps;
  const sensorStatus = (value: number | null | undefined) =>
    getSensorStatus(value, isDeviceOffline, isDataStale);

  const aqiResult = useMemo(
    () => calculateCPCB_AQI(dashboardReading?.sensors, isDataStale || isDeviceOffline),
    [dashboardReading?.sensors, isDataStale, isDeviceOffline]
  );

  return (
    <div className="min-h-screen flex flex-col relative bg-transparent text-[#24272D] dark:text-white">
      <Header
        branding={branding}
        isDemoMode={isDemoMode}
        isDeviceOnline={isDeviceOnline}
        onNavigateAdmin={onNavigateAdmin}
        onNavigateHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        currentPage="public"
      />

      <main className="relative z-10 flex-1 max-w-[1240px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-9 animate-fade-in">
        {isDemoMode && (
          <div className="bg-[#EAF3FC] dark:bg-[#151515] border border-amber-300 dark:border-amber-800/80 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-card">
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

        <WebSocketStatusBar />

        <section aria-labelledby="aqi-section-heading">
          <h2 id="aqi-section-heading" className="sr-only">Air Quality Index</h2>
          <AqiGauge
            aqiResult={aqiResult}
            isStale={isDataStale}
            isOffline={isDeviceOffline}
            locationName={metadata?.locationName || branding.location}
            sensorReadings={dashboardReading?.sensors}
          />
        </section>

        <section aria-labelledby="climate-heading">
          <div className="mb-4">
            <p className="section-label">Meteorological</p>
            <h2 id="climate-heading" className="section-title">Temperature &amp; Humidity</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <TemperatureCard value={sensors?.temperature_c} status={sensorStatus(sensors?.temperature_c)} timestamp={dashboardReading?.timestamp} />
            <HumidityCard value={sensors?.humidity_percent} status={sensorStatus(sensors?.humidity_percent)} timestamp={dashboardReading?.timestamp} />
          </div>
        </section>

        <section aria-labelledby="pm-heading">
          <div className="mb-4 flex items-center gap-3">
            <div>
              <p className="section-label">Particulate Matter</p>
              <h2 id="pm-heading" className="section-title">Air Quality Readings</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            <PMCard label="PM1.0" value={sensors?.pm1_0} status={sensorStatus(sensors?.pm1_0)} timestamp={dashboardReading?.timestamp} />
            <PMCard
              label="PM2.5"
              value={sensors?.pm2_5}
              status={sensorStatus(sensors?.pm2_5)}
              timestamp={dashboardReading?.timestamp}
              isPrimary
              warningNote={sensors?.pm2_5 && sensors.pm2_5 > 60 ? 'Exceeds 24-hr standard (60 µg/m³)' : undefined}
            />
            <PMCard
              label="PM10"
              value={sensors?.pm10}
              status={sensorStatus(sensors?.pm10)}
              timestamp={dashboardReading?.timestamp}
              warningNote={sensors?.pm10 && sensors.pm10 > 100 ? 'Exceeds 24-hr standard (100 µg/m³)' : undefined}
            />
          </div>
        </section>

        <section aria-labelledby="gas-heading">
          <div className="mb-4">
            <p className="section-label">Additional Sensors</p>
            <h2 id="gas-heading" className="section-title">Gas &amp; Location</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <GasSensorCard
              rawValue={sensors?.mq3_raw}
              calibratedPpm={sensors?.mq3_ppm}
              status={sensorStatus(sensors?.mq3_raw)}
              timestamp={dashboardReading?.timestamp}
            />
            <LocationCard
              lat={gps?.latitude}
              lng={gps?.longitude}
              isGpsValid={gps?.valid}
              satellites={gps?.satellites}
              altitude={gps?.altitude_m}
              configuredLocation={metadata?.locationName}
            />
          </div>
        </section>

        <section aria-labelledby="device-status-heading">
          <div className="mb-4">
            <p className="section-label">Hardware</p>
            <h2 id="device-status-heading" className="section-title">Device Status</h2>
          </div>
          <DeviceStatusCard
            metadata={metadata}
            latestReading={dashboardReading}
            isOnline={isDeviceOnline}
            isStale={isDataStale}
            offlineTimeoutSeconds={offlineTimeout}
          />
        </section>

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

      <Footer onNavigateAdmin={onNavigateAdmin} />
    </div>
  );
};
