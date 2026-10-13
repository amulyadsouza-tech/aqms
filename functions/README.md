# SJEC AQMS Telemetry Ingestion Cloud Function

This directory contains the server-side telemetry ingestion microservice deployed to Firebase Cloud Functions.

---

## Ingestion Architecture

```
Physical Sensors -> ESP32 Firmware -> HTTPS POST -> Ingestion Cloud Function -> Firebase RTDB
                                  (with X-Device-Token)  (Validation & Auth)      (/devices/{id}/latest)
```

### Security & Ingestion Checks
1. **Endpoint Protection**: Every incoming HTTP POST request must include the header:
   ```
   X-Device-Token: sjec_aqms_sec_9f48a12e5c89304b
   ```
   Requests lacking this header are rejected with `401 Unauthorized`.
2. **Device Registration Check**: The function verifies that `deviceId` is present in `/devices/{deviceId}/metadata` and has `enabled: true`. Disabled devices are rejected with `403 Forbidden`.
3. **Payload Sanitization**: Numbers are range-checked against physical boundaries (e.g., PM: 0–1000 µg/m³, MQ-3: 0–4095 ADC, Humidity: 0–100%).
4. **Rate Limiting**: Throttles requests arriving faster than 5 seconds per device to prevent denial-of-service and database quota exhaustion.
5. **Timestamp Recording**: Records the official server receipt time `serverReceivedAt` distinctly from the device's RTC/NTP `timestamp`.

---

## Deployment Instructions

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

Once deployed, copy the function trigger URL (e.g. `https://us-central1-<project-id>.cloudfunctions.net/ingestTelemetry`) into your ESP32 firmware configuration.
