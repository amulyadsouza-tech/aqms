"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.purgeExpiredHistory = exports.ingestTelemetry = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto_1 = require("crypto");
admin.initializeApp();
const db = admin.database();
// In-memory rate limiting map (per function instance)
const lastRequestTimestamps = new Map();
const MIN_REQUEST_INTERVAL_MS = 1000;
exports.ingestTelemetry = functions.https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Device-Token, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    // 1. Only allow POST requests
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
        return;
    }
    const payload = req.body;
    // 3. Schema and Device ID Validation
    if (!payload || typeof payload !== 'object') {
        res.status(400).json({ error: 'Bad Request: JSON body required.' });
        return;
    }
    const { deviceId, timestamp, firmwareVersion, sensors, gps, connectivity } = payload;
    if (!deviceId ||
        typeof deviceId !== 'string' ||
        deviceId.trim().length === 0 ||
        /[.#$\[\]/]/.test(deviceId)) {
        res.status(400).json({ error: 'Bad Request: Missing or invalid deviceId string.' });
        return;
    }
    const now = Date.now();
    const clientTokenHeader = req.headers['x-device-token'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
    const clientToken = Array.isArray(clientTokenHeader) ? clientTokenHeader[0] : clientTokenHeader;
    if (typeof clientToken !== 'string' || clientToken.length < 32) {
        res.status(401).json({ error: 'Unauthorized: Missing or invalid device token.' });
        return;
    }
    // 4. Require an enabled registration and a per-device token hash.
    let metadata;
    try {
        const [metaSnapshot, tokenSnapshot] = await Promise.all([
            db.ref(`devices/${deviceId}/metadata`).once('value'),
            db.ref(`devices/${deviceId}/private/deviceTokenHash`).once('value'),
        ]);
        if (!metaSnapshot.exists() || !tokenSnapshot.exists()) {
            res.status(403).json({ error: 'Forbidden: Device is not registered with an ingestion token.' });
            return;
        }
        metadata = metaSnapshot.val();
        const expectedHash = tokenSnapshot.val();
        const actualHash = (0, crypto_1.createHash)('sha256').update(clientToken).digest();
        const expectedBytes = typeof expectedHash === 'string' ? Buffer.from(expectedHash, 'hex') : Buffer.alloc(0);
        if (metadata.enabled !== true) {
            res.status(403).json({ error: 'Forbidden: Device is disabled in admin settings.' });
            return;
        }
        if (expectedBytes.length !== actualHash.length || !(0, crypto_1.timingSafeEqual)(actualHash, expectedBytes)) {
            res.status(401).json({ error: 'Unauthorized: Invalid device token.' });
            return;
        }
    }
    catch (err) {
        console.error(`Error verifying device authorization for ${deviceId}:`, err);
        res.status(500).json({ error: 'Unable to verify device authorization.' });
        return;
    }
    // 5. Rate limiting after authentication avoids unauthenticated key poisoning.
    const lastTime = lastRequestTimestamps.get(deviceId) || 0;
    if (now - lastTime < MIN_REQUEST_INTERVAL_MS) {
        res.status(429).json({ error: 'Too Many Requests: Minimum interval between packets is 1s.' });
        return;
    }
    lastRequestTimestamps.set(deviceId, now);
    // 6. Validate timestamps and reject sensor payloads without actual readings.
    let validTimestamp = typeof timestamp === 'number' && timestamp > 0 ? timestamp : now;
    // If timestamp is unreasonably in future (> 10 mins) or past (> 30 days)
    if (validTimestamp > now + 600000 || validTimestamp < now - 30 * 86400000) {
        validTimestamp = now;
    }
    // 7. Validate Sensor Bounds
    const sanitizedSensors = {
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
        valid: Boolean(gps?.valid &&
            typeof gps.latitude === 'number' && gps.latitude >= -90 && gps.latitude <= 90 &&
            typeof gps.longitude === 'number' && gps.longitude >= -180 && gps.longitude <= 180),
        altitude_m: typeof gps?.altitude_m === 'number' ? gps.altitude_m : null,
        satellites: typeof gps?.satellites === 'number' ? gps.satellites : null,
    };
    if (!Object.values(sanitizedSensors).some((value) => value !== null) && !sanitizedGps.valid) {
        res.status(400).json({ error: 'Bad Request: No valid sensor reading or GPS fix was provided.' });
        return;
    }
    const intervalSeconds = Number(metadata.expectedIntervalSeconds);
    if (!Number.isFinite(intervalSeconds) || intervalSeconds < 1 || intervalSeconds > 3600) {
        res.status(400).json({ error: 'Bad Request: Device reporting interval is not configured.' });
        return;
    }
    // 9. Format Final Validated Ingestion Record
    const ingestedRecord = {
        deviceId,
        timestamp: validTimestamp,
        serverReceivedAt: now,
        firmwareVersion: typeof firmwareVersion === 'string' ? firmwareVersion : '',
        sensors: sanitizedSensors,
        gps: sanitizedGps,
        connectivity: {
            transport: ['wifi', 'lora_gateway', 'cellular', 'other'].includes(connectivity?.transport)
                ? connectivity.transport
                : 'unconfigured',
            rssi_dbm: typeof connectivity?.rssi_dbm === 'number' ? connectivity.rssi_dbm : null,
            snr_db: typeof connectivity?.snr_db === 'number' ? connectivity.snr_db : null,
        },
        source: 'hardware',
    };
    try {
        // Write latest packet
        await db.ref(`devices/${deviceId}/latest`).set(ingestedRecord);
        const historyRef = db.ref(`devices/${deviceId}/history`);
        const previousHistory = await historyRef.limitToLast(1).once('value');
        let lastHistoryTimestamp = 0;
        previousHistory.forEach((child) => {
            const record = child.val();
            lastHistoryTimestamp = Math.max(lastHistoryTimestamp, record.serverReceivedAt || 0);
        });
        let readingId = null;
        if (!lastHistoryTimestamp || now - lastHistoryTimestamp >= intervalSeconds * 1000) {
            const newHistRef = historyRef.push();
            readingId = newHistRef.key;
            await newHistRef.set({ ...ingestedRecord, id: readingId });
        }
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
            readingId,
            serverReceivedAt: now,
        });
    }
    catch (err) {
        console.error(`Database write failure for ${deviceId}:`, err);
        res.status(500).json({ error: 'Internal Database Error during telemetry ingestion.' });
    }
});
exports.purgeExpiredHistory = functions.pubsub.schedule('every 24 hours').onRun(async () => {
    const cutoff = Date.now() - 30 * 86400000;
    try {
        const devicesSnapshot = await db.ref('devices').once('value');
        const purgeJobs = [];
        devicesSnapshot.forEach((deviceSnapshot) => {
            const deviceId = deviceSnapshot.key;
            if (!deviceId)
                return;
            const historyRef = db.ref(`devices/${deviceId}/history`);
            const purgeJob = historyRef
                .orderByChild('timestamp')
                .endAt(cutoff)
                .once('value')
                .then(async (oldRecords) => {
                if (!oldRecords.exists())
                    return;
                const updates = {};
                oldRecords.forEach((record) => {
                    if (record.key)
                        updates[record.key] = null;
                });
                await historyRef.update(updates);
            });
            purgeJobs.push(purgeJob);
        });
        await Promise.all(purgeJobs);
        return null;
    }
    catch (error) {
        console.error('[AQMS Retention] Failed to purge expired history:', error);
        return null;
    }
});
//# sourceMappingURL=index.js.map