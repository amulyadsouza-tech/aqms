/**
 * Firebase Client SDK Initialization & Service Layer
 * Supports Realtime Database, Authentication, and Storage.
 * Gracefully handles unconfigured / demo states.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import { getAuth, Auth } from 'firebase/auth';
import { getDatabase, Database, ref, onValue, set, get, query, limitToLast, orderByChild, push, off } from 'firebase/database';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { BrandingConfig, DeviceMetadata, IngestedReading, SensorConfigItem, SystemSettings } from '../types';
import { DEFAULT_SENSOR_CONFIGS } from './demoData';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.databaseURL &&
  firebaseConfig.projectId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Database | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getDatabase(app);
    storage = getStorage(app);
    if (firebaseConfig.measurementId) {
      void isAnalyticsSupported()
        .then((supported) => {
          if (supported && app) getAnalytics(app);
        })
        .catch((err) => console.warn('[Firebase] Analytics is unavailable in this browser:', err));
    }
  } catch (err) {
    console.error('Failed to initialize Firebase SDK:', err);
  }
} else {
  console.info('[AQMS] Firebase environment variables not detected or incomplete. System running in Standalone/Demo mode.');
}

export { app, auth, db, storage, DEFAULT_SENSOR_CONFIGS };

// Default Fallback Configurations
export const DEFAULT_BRANDING: BrandingConfig = {
  institutionName: 'St. Joseph Engineering College',
  title: 'Air Quality Monitoring System',
  subtitle: 'Real-Time Environmental Monitoring | SJEC, Vamanjoor',
  location: 'Vamanjoor, Mangaluru, Karnataka - 575028',
  logoUrl: '/sjec-logo.png',
  isCustomLogo: false,
  lastUpdated: Date.now(),
};

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  defaultReportingIntervalSeconds: 30,
  deviceOfflineTimeoutSeconds: 120, // 2 minutes
  staleDataThresholdSeconds: 90,   // 1.5 minutes
  demoMode: !isFirebaseConfigured, // Default to demo mode if Firebase is not yet configured
  themeDefault: 'system',
  dataRetentionDays: 30,
};

// ==========================================
// REAL-TIME SUBSCRIPTION HELPERS
// ==========================================

/**
 * Subscribe to the latest reading of a device
 */
export function subscribeToLatestReading(
  deviceId: string,
  onData: (reading: IngestedReading | null) => void,
  onError?: (err: Error) => void
): () => void {
  if (!db || !isFirebaseConfigured) {
    onData(null);
    return () => {};
  }

  const latestRef = ref(db, `devices/${deviceId}/latest`);
  const unsubscribe = onValue(
    latestRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.val() as IngestedReading);
      } else {
        onData(null);
      }
    },
    (error) => {
      console.warn(`[Firebase] Error fetching latest reading for ${deviceId}:`, error);
      if (onError) onError(error);
    }
  );

  return () => {
    off(latestRef);
    unsubscribe();
  };
}

/**
 * Subscribe to device metadata and registration details
 */
export function subscribeToDeviceMetadata(
  deviceId: string,
  onData: (metadata: DeviceMetadata | null) => void
): () => void {
  if (!db || !isFirebaseConfigured) {
    onData(null);
    return () => {};
  }

  const metaRef = ref(db, `devices/${deviceId}/metadata`);
  const unsubscribe = onValue(metaRef, (snapshot) => {
    if (snapshot.exists()) {
      onData(snapshot.val() as DeviceMetadata);
    } else {
      onData(null);
    }
  });

  return () => {
    off(metaRef);
    unsubscribe();
  };
}

/**
 * Subscribe to branding configuration
 */
export function subscribeToBranding(
  onData: (branding: BrandingConfig) => void
): () => void {
  if (!db || !isFirebaseConfigured) {
    onData(DEFAULT_BRANDING);
    return () => {};
  }

  const brandRef = ref(db, 'config/branding');
  const unsubscribe = onValue(brandRef, (snapshot) => {
    if (snapshot.exists()) {
      onData(snapshot.val() as BrandingConfig);
    } else {
      onData(DEFAULT_BRANDING);
    }
  });

  return () => {
    off(brandRef);
    unsubscribe();
  };
}

/**
 * Subscribe to sensor configuration list
 */
export function subscribeToSensorConfigs(
  onData: (configs: SensorConfigItem[]) => void
): () => void {
  if (!db || !isFirebaseConfigured) {
    onData(DEFAULT_SENSOR_CONFIGS);
    return () => {};
  }

  const configRef = ref(db, 'config/sensors');
  const unsubscribe = onValue(configRef, (snapshot) => {
    if (snapshot.exists()) {
      const val = snapshot.val();
      const list: SensorConfigItem[] = Array.isArray(val) ? val : Object.values(val);
      onData(list);
    } else {
      onData(DEFAULT_SENSOR_CONFIGS);
    }
  });

  return () => {
    off(configRef);
    unsubscribe();
  };
}

/**
 * Fetch historical data for a device with a given limit
 */
export async function fetchHistoricalReadings(
  deviceId: string,
  limitCount: number = 100
): Promise<IngestedReading[]> {
  if (!db || !isFirebaseConfigured) {
    return [];
  }

  try {
    const histRef = query(
      ref(db, `devices/${deviceId}/history`),
      orderByChild('timestamp'),
      limitToLast(limitCount)
    );
    const snapshot = await get(histRef);
    if (!snapshot.exists()) return [];

    const items: IngestedReading[] = [];
    snapshot.forEach((child) => {
      items.push({
        id: child.key || undefined,
        ...(child.val() as IngestedReading),
      });
    });
    return items.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error('Error fetching historical readings:', error);
    return [];
  }
}

/**
 * Save sensor configurations (Admin only)
 */
export async function saveSensorConfigs(configs: SensorConfigItem[]): Promise<void> {
  if (!db || !isFirebaseConfigured) {
    throw new Error('Firebase Database not initialized.');
  }
  const configRef = ref(db, 'config/sensors');
  await set(configRef, configs);
}

/**
 * Save device metadata (Admin only)
 */
export async function saveDeviceMetadata(metadata: DeviceMetadata, deviceToken?: string): Promise<void> {
  if (!db || !isFirebaseConfigured) {
    throw new Error('Firebase Database not initialized.');
  }
  if (/[.#$\[\]/]/.test(metadata.deviceId)) {
    throw new Error('Device ID contains characters that are not valid in Firebase paths.');
  }
  const metaRef = ref(db, `devices/${metadata.deviceId}/metadata`);
  await set(metaRef, {
    ...metadata,
    updatedAt: Date.now(),
  });
  if (deviceToken) {
    const tokenBytes = new TextEncoder().encode(deviceToken);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', tokenBytes);
    const tokenHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
    await set(ref(db, `devices/${metadata.deviceId}/private/deviceTokenHash`), tokenHash);
  }
}

/**
 * Save site branding (Admin only)
 */
export async function saveBranding(branding: BrandingConfig): Promise<void> {
  if (!db || !isFirebaseConfigured) {
    throw new Error('Firebase Database not initialized.');
  }
  const brandRef = ref(db, 'config/branding');
  await set(brandRef, {
    ...branding,
    lastUpdated: Date.now(),
  });
}

/** Subscribe to actual historical readings for a device. */
export function subscribeToHistoricalReadings(
  deviceId: string,
  limitCount: number,
  onData: (readings: IngestedReading[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!db || !isFirebaseConfigured || !deviceId) {
    onData([]);
    return () => {};
  }

  const historyQuery = query(
    ref(db, `devices/${deviceId}/history`),
    orderByChild('timestamp'),
    limitToLast(limitCount)
  );
  const unsubscribe = onValue(
    historyQuery,
    (snapshot) => {
      const readings: IngestedReading[] = [];
      snapshot.forEach((child) => {
        readings.push({ id: child.key || undefined, ...(child.val() as IngestedReading) });
      });
      onData(readings.sort((left, right) => left.timestamp - right.timestamp));
    },
    (error) => onError?.(error)
  );
  return unsubscribe;
}

/**
 * Directly submit reading (Client test / Local ingestion endpoint)
 */
export async function writeDeviceReading(reading: IngestedReading): Promise<void> {
  await saveIncomingReading(reading, 1, true);
}

// ==========================================
// DYNAMIC TELEMETRY INGESTION & MANUAL ENTRY
// ==========================================

const lastHistoryRecordTimeByDevice: Record<string, number> = {};

/**
 * Validates and parses raw incoming JSON message from hardware or gateway.
 * Returns null if the structure is invalid. Does NOT fabricate numbers.
 */
export function validateAndParseSensorMessage(
  message: any,
  defaultSource: 'hardware' | 'websocket' | 'manual' = 'hardware'
): IngestedReading | null {
  if (!message || typeof message !== 'object' || Array.isArray(message)) return null;

  const deviceId =
    typeof message.deviceId === 'string' && message.deviceId.trim().length > 0
      ? message.deviceId.trim()
      : null;
  if (!deviceId) return null;

  const rawSensors = message.sensors;
  if (!rawSensors || typeof rawSensors !== 'object') return null;

  const parseBoundedNumber = (value: unknown, min: number, max: number): number | null => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) return null;
    return value;
  };

  const parseOptionalNumber = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;

  const sensors = {
    pm1_0: parseBoundedNumber(rawSensors.pm1_0, 0, 1000),
    pm2_5: parseBoundedNumber(rawSensors.pm2_5, 0, 1000),
    pm10: parseBoundedNumber(rawSensors.pm10, 0, 1500),
    mq3_raw: parseBoundedNumber(rawSensors.mq3_raw, 0, 4095),
    mq3_ppm: parseBoundedNumber(rawSensors.mq3_ppm, 0, 100000),
    temperature_c: parseBoundedNumber(rawSensors.temperature_c, -40, 85),
    humidity_percent: parseBoundedNumber(rawSensors.humidity_percent, 0, 100),
  };

  // GPS parsing & validation
  const rawGps = message.gps || {};
  const lat = parseBoundedNumber(rawGps.latitude, -90, 90);
  const lng = parseBoundedNumber(rawGps.longitude, -180, 180);
  const isLatValid = lat !== null;
  const isLngValid = lng !== null;
  const isGpsValid = Boolean(rawGps.valid && isLatValid && isLngValid);
  if (!Object.values(sensors).some((value) => value !== null) && !isGpsValid) return null;

  const gps = {
    latitude: isLatValid ? lat : null,
    longitude: isLngValid ? lng : null,
    valid: isGpsValid,
    altitude_m: parseOptionalNumber(rawGps.altitude_m),
    satellites: parseOptionalNumber(rawGps.satellites),
  };

  // Connectivity
  const rawConn = message.connectivity || {};
  const supportedTransports = ['wifi', 'lora_gateway', 'cellular', 'other', 'unconfigured'];
  const connectivity = {
    transport: supportedTransports.includes(rawConn.transport) ? rawConn.transport : 'unconfigured',
    rssi_dbm: parseOptionalNumber(rawConn.rssi_dbm),
    snr_db: parseOptionalNumber(rawConn.snr_db),
    gatewayId: typeof rawConn.gatewayId === 'string' ? rawConn.gatewayId : null,
  };

  const now = Date.now();
  const rawTimestamp = message.timestamp;
  // Accept only plausible Unix timestamps (after 2020-01-01). millis() uptime
  // values (small numbers like 5000) are treated as missing → server uses Date.now().
  const MIN_VALID_TS = 1577836800000; // 2020-01-01 00:00:00 UTC in ms
  const timestamp =
    typeof rawTimestamp === 'number' && Number.isFinite(rawTimestamp) && rawTimestamp >= MIN_VALID_TS
      ? rawTimestamp
      : now;

  return {
    deviceId,
    timestamp,
    serverReceivedAt: now,
    firmwareVersion: typeof message.firmwareVersion === 'string' ? message.firmwareVersion : '',
    sensors,
    gps,
    connectivity,
    source: defaultSource,
  };
}

/**
 * Persists incoming validated reading to Firebase Realtime Database.
 * Updates devices/{deviceId}/latest
 * Saves to devices/{deviceId}/history/{recordId} according to reporting interval.
 */
export async function saveIncomingReading(
  reading: IngestedReading,
  reportingIntervalSeconds: number = 30,
  forceHistory: boolean = false
): Promise<{ latestSaved: boolean; historySaved: boolean; recordId?: string }> {
  if (!db || !isFirebaseConfigured) {
    throw new Error('Firebase Realtime Database is not configured. Reading was not saved.');
  }

  const deviceId = reading.deviceId;
  if (
    !deviceId ||
    !reading.sensors ||
    (!Object.values(reading.sensors).some((value) => value !== null) && !reading.gps?.valid)
  ) {
    throw new Error('A device ID and at least one validated sensor reading or GPS fix are required.');
  }
  const latestRef = ref(db, `devices/${deviceId}/latest`);
  await set(latestRef, reading);

  const historyRef = ref(db, `devices/${deviceId}/history`);
  const lastHistorySnapshot = await get(query(historyRef, limitToLast(1)));
  let lastSavedAt = lastHistoryRecordTimeByDevice[deviceId] || 0;
  lastHistorySnapshot.forEach((child) => {
    const record = child.val() as IngestedReading;
    lastSavedAt = Math.max(lastSavedAt, record.serverReceivedAt || record.timestamp || 0);
  });
  const intervalMs = Math.max(1, Number(reportingIntervalSeconds) || 1) * 1000;
  const receivedAt = reading.serverReceivedAt || Date.now();
  const shouldSaveHistory = forceHistory || receivedAt - lastSavedAt >= intervalMs;

  let recordId: string | undefined = undefined;
  if (shouldSaveHistory) {
    const newRecordRef = push(historyRef);
    recordId = newRecordRef.key || undefined;
    await set(newRecordRef, {
      ...reading,
      id: recordId,
    });
    lastHistoryRecordTimeByDevice[deviceId] = receivedAt;
  }

  return { latestSaved: true, historySaved: shouldSaveHistory, recordId };
}

/**
 * Save a manual sensor reading by an authorized administrator.
 * Distinguishable from hardware readings (source: "manual").
 */
export async function saveManualReading(
  input: {
    deviceId: string;
    pm1_0?: number | null;
    pm2_5?: number | null;
    pm10?: number | null;
    mq3_raw?: number | null;
    temperature_c?: number | null;
    humidity_percent?: number | null;
    latitude?: number | null;
    longitude?: number | null;
    notes?: string;
  },
  adminIdentity: string
): Promise<{ recordId: string; reading: IngestedReading }> {
  const deviceId = input.deviceId?.trim();
  if (!deviceId) {
    throw new Error('Device identifier is required.');
  }
  if (!db || !isFirebaseConfigured || !auth?.currentUser) {
    throw new Error('An authenticated Firebase administrator is required to save manual readings.');
  }
  if (!adminIdentity || (auth.currentUser.email && adminIdentity !== auth.currentUser.email)) {
    throw new Error('The authenticated administrator identity is unavailable or does not match.');
  }

  const parseNum = (v: any) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    if (!Number.isFinite(n)) throw new Error(`Invalid numerical value: ${v}`);
    return n;
  };

  const pm1_0 = parseNum(input.pm1_0);
  const pm2_5 = parseNum(input.pm2_5);
  const pm10 = parseNum(input.pm10);
  const mq3_raw = parseNum(input.mq3_raw);
  const temperature_c = parseNum(input.temperature_c);
  const humidity_percent = parseNum(input.humidity_percent);
  const lat = parseNum(input.latitude);
  const lng = parseNum(input.longitude);

  const hasReading = [pm1_0, pm2_5, pm10, mq3_raw, temperature_c, humidity_percent, lat, lng].some(
    (v) => v !== null
  );
  if (!hasReading) {
    throw new Error('Please enter at least one valid sensor reading or coordinate.');
  }

  // Validate physically realistic ranges
  if (pm1_0 !== null && (pm1_0 < 0 || pm1_0 > 1000)) throw new Error('PM1.0 must be between 0 and 1000.');
  if (pm2_5 !== null && (pm2_5 < 0 || pm2_5 > 1000)) throw new Error('PM2.5 must be between 0 and 1000.');
  if (pm10 !== null && (pm10 < 0 || pm10 > 1500)) throw new Error('PM10 must be between 0 and 1500.');
  if (mq3_raw !== null && (mq3_raw < 0 || mq3_raw > 4095))
    throw new Error('MQ-3 raw ADC must be between 0 and 4095.');
  if (temperature_c !== null && (temperature_c < -40 || temperature_c > 85))
    throw new Error('Temperature must be between -40°C and 85°C.');
  if (humidity_percent !== null && (humidity_percent < 0 || humidity_percent > 100))
    throw new Error('Humidity must be between 0% and 100%.');
  if (lat !== null && (lat < -90 || lat > 90))
    throw new Error('Latitude must be between -90 and 90 degrees.');
  if (lng !== null && (lng < -180 || lng > 180))
    throw new Error('Longitude must be between -180 and 180 degrees.');

  const now = Date.now();
  const historyRef = ref(db, `devices/${deviceId}/history`);
  const recordId = push(historyRef).key;
  if (!recordId) throw new Error('Could not allocate a unique manual reading ID.');

  const reading: IngestedReading = {
    id: recordId,
    deviceId,
    timestamp: now,
    serverReceivedAt: now,
    firmwareVersion: 'manual-admin-entry',
    source: 'manual',
    recordedBy: adminIdentity,
    sensors: {
      pm1_0,
      pm2_5,
      pm10,
      mq3_raw,
      mq3_ppm: null,
      temperature_c,
      humidity_percent,
    },
    gps: {
      latitude: lat,
      longitude: lng,
      valid: lat !== null && lng !== null,
    },
    connectivity: {
      transport: 'other',
      rssi_dbm: null,
      snr_db: null,
    },
  };

  await set(ref(db, `devices/${deviceId}/history/${recordId}`), reading);

  return { recordId, reading };
}

/**
 * Subscribe to active device ID configured for the dashboard
 */
export function subscribeToActiveDeviceId(
  onData: (deviceId: string | null) => void
): () => void {
  if (!db || !isFirebaseConfigured) {
    onData(null);
    return () => {};
  }

  const activeRef = ref(db, 'config/activeDeviceId');
  const unsubscribe = onValue(activeRef, (snapshot) => {
    const val = snapshot.val();
    onData(typeof val === 'string' && val.trim().length > 0 ? val.trim() : null);
  });

  return () => {
    off(activeRef);
    unsubscribe();
  };
}

/**
 * Save the active device ID
 */
export async function setActiveDeviceId(deviceId: string): Promise<void> {
  const trimmed = deviceId.trim();
  if (!trimmed || !db || !isFirebaseConfigured) {
    throw new Error('A device ID and configured Firebase Database are required.');
  }
  await set(ref(db, 'config/activeDeviceId'), trimmed);
}
