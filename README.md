# 🌿 SJEC AQMS — Air Quality Monitoring System

> **Institutional Real-Time Environmental Sensing & Analytics Platform**  
> **St. Joseph Engineering College (SJEC)**, Vamanjoor, Mangaluru, Karnataka — 575028  
> *A project under IUCEE*

[![Platform Status](https://img.shields.io/badge/Status-Operational-16a34a?style=for-the-badge)](https://github.com/amulyadsouza-tech/aqms)
[![React](https://img.shields.io/badge/React-18.3-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-v10-ffca28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Hardware](https://img.shields.io/badge/Hardware-ESP32%20Core-teal?style=for-the-badge&logo=espressif&logoColor=white)](iot/)

---

## 🚀 Deployed Application

| Environment | Link | Status |
| :--- | :--- | :--- |
| **🌐 Production Live App** | [👉 https://aqms-flcyz6o6u-amulyadsouza-techs-projects.vercel.app](YOUR_DEPLOYED_URL_HERE) | 🟢 Active |
| **🔐 Admin Console** | [👉 /admin](YOUR_DEPLOYED_URL_HERE/admin) | 🔒 Auth Required |
| **📁 GitHub Repository** | [github.com/amulyadsouza-tech/aqms](https://github.com/amulyadsouza-tech/aqms) | 🟢 Main |

> 💡 *Replace `YOUR_DEPLOYED_URL_HERE` above with your live Firebase Hosting, Vercel, or Netlify production link.*

---

## ✨ Key Features

- **CPCB NAQI Standard Gauge**: Computes real-time Indian National Air Quality Index (Good, Satisfactory, Moderate, Poor, Very Poor, Severe) with active pollutant identification.
- **Multi-Sensor Telemetry**: PM1.0, PM2.5, PM10 (PMS laser sensor), MQ-3 gas sensor ADC, temperature, relative humidity, and live GPS fix coordinates.
- **Modern Responsive UX**: Universal mountain landscape backdrop, light & dark theme toggling, and GPU-accelerated sticky header and footer for fast scrolling.
- **Admin Control Panel**: Real-time hardware telemetry inspection, device registration, Firebase config manager, custom branding/logo manager, and historical trend charts.
- **Dual Operating Modes**:
  - **Live Mode**: Connected to ESP32 hardware via Firebase Realtime Database & Cloud Functions.
  - **Interactive Evaluation Mode**: Embedded synthetic telemetry allowing full verification without physical sensors.

---

## 🛠️ Quick Start (Local Setup)

### 1. Prerequisites
- **Node.js**: v18.0+ (v20+ recommended)
- **npm**: v9.0+

### 2. Install & Run
```bash
# Clone the repository
git clone https://github.com/amulyadsouza-tech/aqms.git
cd aqms

# Install dependencies
npm install

# Start development server
npm run dev
```

Open your browser at:
```
http://localhost:3000
```

### 3. Production Build
```bash
npm run build
npm run preview
```

---

## ⚙️ Environment Configuration

Copy the example environment template:
```bash
cp .env.example .env
```

Provide your Firebase project credentials in `.env`:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_DEVICE_INGESTION_SECRET=your_device_token
```

---

## 📡 Hardware & Firmware Summary

- **Microcontroller**: ESP32 NodeMCU-32S (CP2102 UART bridge)
- **Firmware Location**: [`iot/firmware/sjec_aqms_esp32.ino`](iot/firmware/sjec_aqms_esp32.ino)
- **Pin Configuration**: [`iot/hardware-config/hardware_pins_template.h`](iot/hardware-config/hardware_pins_template.h)
- **Ingestion Cloud Function**: [`functions/src/index.ts`](functions/src/index.ts)

| Sensor | Parameter | Interface | Pin (ESP32) |
| :--- | :--- | :--- | :--- |
| **PMS5003 / PMS7003** | PM1.0, PM2.5, PM10 (µg/m³) | Hardware UART2 | GPIO 16 (RX), GPIO 17 (TX) |
| **MQ-3** | Alcohol / Volatile Gases (ADC 0–4095) | Analog ADC1 | GPIO 34 (Input-only) |
| **DHT22** | Temp (°C) & Humidity (%) | 1-Wire Digital | GPIO 4 (4.7kΩ pullup) |
| **NEO-6M GPS** | Latitude, Longitude, Altitude | Hardware UART1 | GPIO 18 (RX) |

---

## 🚢 Deployment

### Firebase Hosting
```bash
# Install Firebase CLI & Login
npm install -g firebase-tools
firebase login

# Build web application
npm run build

# Deploy Hosting, Database Rules & Cloud Functions
firebase deploy
```

---

## 🏛️ Acknowledgements

Developed for **St. Joseph Engineering College (SJEC)**, Vamanjoor, Mangaluru, Karnataka — 575028.  
Affiliated to **VTU, Belagavi** | Approved by **AICTE, New Delhi** | Accredited with **NAAC A+**  
*Project under IUCEE (Indo Universal Collaboration for Engineering Education)*
