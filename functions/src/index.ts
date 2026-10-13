import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.database();

// Pre-shared default device ingestion secret (Can also be checked against /devices/{id}/metadata/token)
const MASTER_INGESTION_SECRET = process.env.DEVICE_INGESTION_SECRET || 'sjec_aqms_sec_9f48a12e5c89304b';

// In-memory rate limiting map (per function instance)
const lastRequestTimestamps = new Map<string, number>();
const MIN_REQUEST_INTERVAL_MS = 5000; // 5 seconds between packets

interface SensorPayload {
  pm1_0: number | null;
  pm2_5: number | null;
  pm10: number | null;
  mq3_raw: number | null;
  temperature_c: number | null;
  humidity_percent: number | null;
}

interface DeviceTelemetryBody {
  deviceId: string;
  timestamp: number;
  firmwareVersion: string;
  sensors: SensorPayload;
  gps: {
    latitude: number | null;
    longitude: number | null;
    valid: boolean;
    altitude_m?: number | null;
    satellites?: number | null;
  };
  connectivity: {
    transport: 'wifi' | 'lora_gateway' | 'cellular' | 'other';
    rssi_dbm: number | null;
    snr_db: number | null;
  };
}

export const ingestTelemetry = functions.https.onRequest(async (req, res) => {
  // 1. Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    return;
  }

  // 2. Authenticate Request via X-Device-Token Header
  const clientToken = req.headers['x-device-token'] || req.headers['authorization']?.replace('Bearer ', '');
  if (!clientToken || clientToken !== MASTER_INGESTION_SECRET) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid device token.' });
    return;
  }

  const payload = req.body as DeviceTelemetryBody;

  // 3. Schema and Device ID Validation
  if (!payload || typeof payload !== 'object') {
    res.status(400).json({ error: 'Bad Request: JSON body required.' });
    return;
  }

  const { deviceId, timestamp, firmwareVersion, sensors, gps, connectivity } = payload;

  if (!deviceId || typeof deviceId !== 'string' || deviceId.trim().length === 0) {
    res.status(400).json({ error: 'Bad Request: Missing or invalid deviceId string.' });
    return;
  }

  // 4. Rate Limiting Check
  const now = Date.now();
  const lastTime = lastRequestTimestamps.get(deviceId) || 0;
  if (now - lastTime < MIN_REQUEST_INTERVAL_MS) {
    res.status(429).json({ error: 'Too Many Requests: Minimum interval between packets is 5s.' });
    return;
  }
  lastRequestTimestamps.set(deviceId, now);

  // 5. Verify Device Authorization in Realtime Database
  try {
    const metaSnapshot = await db.ref(`devices/${deviceId}/metadata`).once('value');
    if (metaSnapshot.exists()) {
      const meta = metaSnapshot.val();
      if (meta.enabled === false) {
        res.status(403).json({ error: `Forbidden: Device ${deviceId} is disabled in admin settings.` });
        return;
      }
    }
  } catch (err) {
    console.error(`Error verifying metadata for ${deviceId}:`, err);
  }

  // 6. Validate Timestamps
  let validTimestamp = typeof timestamp === 'number' && timestamp > 0 ? timestamp : now;
  // If timestamp is unreasonably in future (> 10 mins) or past (> 30 days)
  if (validTimestamp > now + 600000 || validTimestamp < now - 30 * 86400000) {
    validTimestamp = now;
  }

  // 7. Validate Sensor Bounds
  const sanitizedSensors: SensorPayload = {
    pm1_0: typeof sensors?.pm1_0 === 'number' && sensors.pm1_0 >= 0 && sensors.pm1_0 <= 1000 ? sensors.pm1_0 : null,
    pm2_5: typeof sensors?.pm2_5 === 'number' && sensors.pm2_5 >= 0 && sensors.pm2_5 <= 1000 ? sensors.pm2_5 : null,
    pm10: typeof sensors?.pm10 === 'number' && sensors.pm10 >= 0 && sensors.pm10 <= 1500 ? sensors.pm10 : null,
    mq3_raw: typeof sensors?.mq3_raw === 'number' && sensors.mq3_raw >= 0 && sensors.mq3_raw <= 4095 ? Math.round(sensors.mq3_raw) : null,
    temperature_c: typeof sensors?.temperature_c === 'number' && sensors.temperature_c >= -40 && sensors.temperature_c <= 85 ? sensors.temperature_c : null,
    humidity_percent: typeof sensors?.humidity_percent === 'number' && sensors.humidity_percent >= 0 && sensors.humidity_percent <= 100 ? sensors.humidity_percent : null,
  };

  // 8. Validate GPS Bounds
  const sanitizedGps = {
    latitude: typeof gps?.latitude === 'number' && gps.latitude >= -90 && gps.latitude <= 90 ? gps.latitude : null,
    longitude: typeof gps?.longitude === 'number' && gps.longitude >= -180 && gps.longitude <= 180 ? gps.longitude : null,
    valid: Boolean(gps?.valid && gps.latitude && gps.longitude),
    altitude_m: typeof gps?.altitude_m === 'number' ? gps.altitude_m : null,
    satellites: typeof gps?.satellites === 'number' ? gps.satellites : null,
  };

  // 9. Format Final Validated Ingestion Record
  const ingestedRecord = {
    deviceId,
    timestamp: validTimestamp,
    serverReceivedAt: now,
    firmwareVersion: typeof firmwareVersion === 'string' ? firmwareVersion : '0.1.0',
    sensors: sanitizedSensors,
    gps: sanitizedGps,
    connectivity: {
      transport: connectivity?.transport || 'wifi',
      rssi_dbm: typeof connectivity?.rssi_dbm === 'number' ? connectivity.rssi_dbm : null,
      snr_db: typeof connectivity?.snr_db === 'number' ? connectivity.snr_db : null,
    },
  };

  try {
    // Write latest packet
    await db.ref(`devices/${deviceId}/latest`).set(ingestedRecord);

    // Push into historical time-series
    const newHistRef = await db.ref(`devices/${deviceId}/history`).push(ingestedRecord);

    // Update status
    await db.ref(`devices/${deviceId}/status`).update({
      isOnline: true,
      lastSeenTimestamp: now,
      lastValidPacketTimestamp: now,
      activeTransport: ingestedRecord.connectivity.transport,
      firmwareVersion: ingestedRecord.firmwareVersion,
    });

    res.status(200).json({
      success: true,
      message: 'Telemetry packet ingested successfully.',
      readingId: newHistRef.key,
      serverReceivedAt: now,
    });
  } catch (err: any) {
    console.error(`Database write failure for ${deviceId}:`, err);
    res.status(500).json({ error: 'Internal Database Error during telemetry ingestion.' });
  }
});
