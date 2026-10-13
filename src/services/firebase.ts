/**
 * Firebase Client SDK Initialization & Service Layer
 * Supports Realtime Database, Authentication, and Storage.
 * Gracefully handles unconfigured / demo states.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getDatabase, Database, ref, onValue, set, get, query, limitToLast, orderByChild, push, off } from 'firebase/database';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { BrandingConfig, DeviceMetadata, IngestedReading, SensorConfigItem, SystemSettings } from '../types';
import { DEFAULT_SENSOR_CONFIGS, DEMO_DEVICE_METADATA } from './demoData';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
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
  } catch (err) {
    console.error('Failed to initialize Firebase SDK:', err);
  }
} else {
  console.info('[AQMS] Firebase environment variables not detected or incomplete. System running in Standalone/Demo mode.');
}

export { app, auth, db, storage, DEFAULT_SENSOR_CONFIGS, DEMO_DEVICE_METADATA };

// Default Fallback Configurations
export const DEFAULT_BRANDING: BrandingConfig = {
  institutionName: 'St. Joseph Engineering College',
  title: 'Air Quality Monitoring System',
  subtitle: 'Real-Time Environmental Monitoring | SJEC, Vamanjoor',
  location: 'Vamanjoor, Mangaluru, Karnataka - 575028',
  logoUrl: null, // Placeholder will be rendered
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
    onData(DEMO_DEVICE_METADATA);
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
export async function saveDeviceMetadata(metadata: DeviceMetadata): Promise<void> {
  if (!db || !isFirebaseConfigured) {
    throw new Error('Firebase Database not initialized.');
  }
  const metaRef = ref(db, `devices/${metadata.deviceId}/metadata`);
  await set(metaRef, {
    ...metadata,
    updatedAt: Date.now(),
  });
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

/**
 * Directly submit reading (Client test / Local ingestion endpoint)
 */
export async function writeDeviceReading(reading: IngestedReading): Promise<void> {
  if (!db || !isFirebaseConfigured) {
    throw new Error('Firebase Database is not configured. Telemetry cannot be written.');
  }

  const deviceId = reading.deviceId;
  const latestRef = ref(db, `devices/${deviceId}/latest`);
  const historyRef = ref(db, `devices/${deviceId}/history`);

  // Write latest
  await set(latestRef, reading);

  // Push to history
  const newHistItem = push(historyRef);
  await set(newHistItem, reading);
}
