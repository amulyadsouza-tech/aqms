# SJEC AQMS — Complete IoT Air Quality Monitoring Platform
### St. Joseph Engineering College (SJEC), Vamanjoor, Mangaluru, Karnataka

![Platform Status](https://img.shields.io/badge/Status-Operational-16a34a)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![Firebase](https://img.shields.io/badge/Firebase-v10-amber)
![Hardware](https://img.shields.io/badge/Hardware-ESP32%20Core-teal)

---

## Overview

The **SJEC Air Quality Monitoring System (AQMS)** is a full-stack, institutional IoT monitoring platform developed for **St. Joseph Engineering College (SJEC)**, Vamanjoor, Mangaluru.

The platform monitors real-time environmental metrics sampled by an **ESP32 microcontroller core** mounted on a perforated PCB with an integrated sensor array:
- **PMS Laser Particulate Matter Sensor**: PM1.0, PM2.5, PM10 (µg/m³)
- **MQ-3 Gas Sensor**: Raw 12-bit ADC count (0–4095), uncalibrated
- **Temperature & Humidity Sensor**: Ambient Temperature (°C) and Relative Humidity (%)
- **GPS Receiver Module**: Latitude, Longitude, Altitude, Satellites
- **Radio Transceiver**: Separate transceiver with external antenna (model unconfirmed)

Air quality index calculation strictly implements the **Central Pollution Control Board (CPCB) India National Air Quality Index (NAQI)** methodology.

---

## 1. Software Prerequisites

Before beginning setup, ensure your development machine has:
- **Node.js**: v18.0.0 or higher (v20+ recommended). Check with `node -v`.
- **npm**: v9.0.0 or higher. Check with `npm -v`.
- **Git**: Check with `git --version`.
- **Arduino IDE v2.x** or **VS Code + PlatformIO** (for ESP32 firmware flashing).
- Modern Web Browser (Chrome, Firefox, Edge, Safari).

---

## 2. Installing Dependencies

Clone or open the repository directory:
```bash
cd AQMS
npm install
```

---

## 3. Running the React Website Locally

Start the local development server:
```bash
npm run dev
```
Open your browser to:
```
http://localhost:3000
```

The system will start in **Interactive Prototype Evaluation Mode** with verified synthetic data so you can inspect all graphs, gauges, theme switching, and administrative controls even before connecting physical hardware.

---

## 4. Creating a Firebase Project

1. Navigate to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project** (or **Create a project**).
3. Name your project (e.g. `sjec-aqms-mangaluru`).
4. Google Analytics can be enabled or disabled according to preference.
5. Click **Create project** and wait for provisioning to complete.

---

## 5. Registering the Web App

1. In your project dashboard, click the **Web icon (`</>`)** to add a web application.
2. Enter App nickname: `SJEC AQMS Web Dashboard`.
3. Do not check Firebase Hosting yet. Click **Register app**.
4. Firebase will display your `firebaseConfig` object containing:
   - `apiKey`
   - `authDomain`
   - `databaseURL`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

---

## 6. Enabling Firebase Authentication

1. In the Firebase console left sidebar, navigate to **Build** -> **Authentication**.
2. Click **Get Started**.
3. Under the **Sign-in method** tab, select **Email/Password**.
4. Enable the first toggle: **Email/Password**. Leave Email link disabled.
5. Click **Save**.

---

## 7. Creating the Realtime Database

1. In the sidebar, select **Build** -> **Realtime Database**.
2. Click **Create Database**.
3. Select location (choose `Singapore` / `asia-southeast1` for lowest latency to Karnataka/India).
4. Choose **Start in locked mode** (we will apply complete rules next). Click **Enable**.
5. Copy your database URL (e.g. `https://sjec-aqms-default-rtdb.asia-southeast1.firebasedatabase.app`).

---

## 8. Configuring Firebase Storage

1. In the sidebar, select **Build** -> **Storage**.
2. Click **Get Started**.
3. Select **Start in production mode**. Click **Next**.
4. Select storage bucket location (e.g., `asia-south1` or `asia-southeast1`).
5. Click **Done**.

---

## 9. Installing Firebase CLI

To deploy security rules and Cloud Functions:
```bash
npm install -g firebase-tools
firebase login
```

Verify authentication:
```bash
firebase projects:list
```

---

## 10. Configuring the Ingestion Backend

The ingestion service is located in `functions/src/index.ts`. It enforces:
- `X-Device-Token` header authentication.
- Device authorization checks against `/devices/{deviceId}/metadata`.
- Range and boundary sanitization (PM: 0–1000, MQ-3: 0–4095 ADC, etc.).
- 5-second per-device rate limiting.
- Server receipt timestamping (`serverReceivedAt`).

---

## 11. Deploying Cloud Functions

From the project root:
```bash
cd functions
npm install
npm run build
firebase deploy --only functions
cd ..
```

Note the deployed trigger URL (e.g. `https://us-central1-sjec-aqms.cloudfunctions.net/ingestTelemetry`).

---

## 12. Setting Up Administrator Authorization

To protect institutional infrastructure, **public registration is disabled**.
Create the initial administrator manually in the Firebase Console:
1. Go to **Authentication** -> **Users** tab.
2. Click **Add user**.
3. Enter email: `admin@sjec.ac.in` (or faculty email).
4. Enter a strong password. Click **Add user**.

*(Note: In local demo mode when `.env` is unconfigured, you can evaluate the admin UI using `admin@sjec.ac.in` / `admin123`)*.

---

## 13. Applying Firebase Security Rules

Deploy the included security rules from the `firebase/` directory:
```bash
firebase deploy --only database,storage
```
- `database.rules.json`: Enforces public read for public telemetry and admin-only writes.
- `storage.rules`: Restricts logo uploads to authenticated admins with MIME type checking (`image/*`) and a 2 MB size ceiling.

---

## 14. Configuring Environment Variables

Create `.env` in the root directory by copying the template:
```bash
cp .env.example .env
```
Fill in the values from Step 5:
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=sjec-aqms.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://sjec-aqms-default-rtdb.asia-southeast1.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=sjec-aqms
VITE_FIREBASE_STORAGE_BUCKET=sjec-aqms.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_DEVICE_INGESTION_SECRET=sjec_aqms_sec_9f48a12e5c89304b
```

---

## 15. Testing Demo Mode

Run `npm run dev` and navigate to `http://localhost:3000`:
- Notice the **DEMO DATA — NOT LIVE** banner.
- Toggle between light and dark themes using the top-right button.
- Inspect the CPCB NAQI gauge and time-series charts (1h, 6h, 24h, 7d).
- Click **Admin Login** -> log in -> test changing settings and sending simulation packets.

---

## 16. Registering the PCB / Device

1. Navigate to `/admin` -> **2. Device & PCB Setup**.
2. Confirm or edit:
   - Device Identifier: `SJEC-AQMS-ESP32-001`
   - Node Friendly Name: `SJEC Mechanical Block Sensing Node`
   - Microcontroller Core: `ESP32 NodeMCU-32S (CP2102)`
   - Communication Transport: `Direct Wi-Fi HTTPS`
   - Radio Module: Keep as `Not configured` until physical part is verified.
3. Click **Save Configuration**.

---

## 17. Sending a Test Payload

1. Navigate to `/admin` -> **4. Live Data Inspector**.
2. Click **Post Test Telemetry Packet**.
3. Confirm that the packet appears in the raw inspector and that the public dashboard reflects the new reading in real time without refreshing the page!

---

## 18. Connecting ESP32 Wi-Fi

In `iot/firmware/sjec_aqms_esp32.ino`:
```cpp
const char* WIFI_SSID     = "SJEC_CAMPUS_WIFI";
const char* WIFI_PASSWORD = "Your_WiFi_Password";
const char* INGESTION_URL = "https://YOUR_FUNCTION_URL/ingestTelemetry";
const char* DEVICE_TOKEN  = "sjec_aqms_sec_9f48a12e5c89304b";
```

---

## 19. Adding the Confirmed Radio Module & Gateway

### When the radio module model is verified:
1. If the module is an **Ai-Thinker Ra-02 (SX1278 433 MHz)** or **Ra-01H (SX1276 865 MHz)**:
   - Install the `LoRa` library in Arduino IDE.
   - Configure SPI pins according to `iot/hardware-config/hardware_pins_template.h`.
2. **Gateway Bridge Requirement**:
   - Because a raw LoRa packet cannot connect directly to Firebase over the internet, set up a campus LoRa Gateway (an ESP32 + LoRa receiver with Wi-Fi).
   - The gateway receives the radio packet and executes the identical HTTPS POST call to `/ingestTelemetry`.

---

## 20. Flashing the Firmware

1. Connect the ESP32 via Micro-USB to your computer.
2. In Arduino IDE:
   - Board: `DOIT ESP32 DEVKIT V1`
   - Port: Select the corresponding COM port (e.g. `COM3` CP2102).
3. Click **Upload**.
4. Open the Serial Monitor at **115200 baud** to view live sensor readings and HTTP 200 responses.

---

## 21. Deploying the Website

Build the production distribution:
```bash
npm run build
```
Deploy to Firebase Hosting:
```bash
firebase init hosting # Select 'dist' as public directory and configure as SPA
firebase deploy --only hosting
```

---

## 22. Troubleshooting Guide

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **"AQI unavailable — insufficient valid data"** | Both PM2.5 and PM10 are missing, null, or stale (>5 min). | Verify PMS sensor UART2 wiring (RX: GPIO 16, TX: GPIO 17) and baud rate 9600. |
| **MQ-3 displays "Raw ADC" instead of ppm** | Uncalibrated sensor design. | By specification, raw ADC counts must never be labelled as ppm without a laboratory calibration curve. |
| **Device status shows "Offline"** | No packet received within offline timeout (120s). | Check ESP32 Serial Monitor to verify Wi-Fi connection and HTTP status code. |
| **HTTP 401 Unauthorized from Ingestion** | Mismatched `X-Device-Token`. | Ensure `DEVICE_TOKEN` in `sjec_aqms_esp32.ino` matches the key in admin settings. |
| **HTTP 403 Forbidden** | Device is disabled in admin portal. | Go to Admin Dashboard -> Device & PCB Setup -> check "Authorize device to ingest telemetry". |
| **Firebase Logo upload fails** | Storage rules rejection or file > 2 MB. | Ensure user is authenticated as admin and file is a valid PNG, JPG, or SVG under 2 MB. |

---

## Institutional Acknowledgement

**St. Joseph Engineering College (SJEC)**  
Vamanjoor, Mangaluru, Karnataka - 575028  
Affiliated to VTU, Belagavi | Approved by AICTE, New Delhi  
Department of Engineering Research & IoT Lab
