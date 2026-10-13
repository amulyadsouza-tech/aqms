# Firebase Architecture & Security Rules

This directory contains the production security rules and schema definitions for the **St. Joseph Engineering College (SJEC) Air Quality Monitoring System (AQMS)**.

---

## 1. Realtime Database Hierarchy

```
/
├── config/
│   ├── branding/                  # College logo URL, titles, campus location
│   ├── sensors/                   # Per-sensor hardware model, units, calibrations
│   ├── aqi/                       # CPCB India breakpoints, thresholds
│   └── site/                      # Retention policies, offline timeouts
│
├── devices/
│   └── {deviceId}/                # e.g., "SJEC-AQMS-ESP32-001"
│       ├── metadata/              # Hardware profile, radio model, pin mappings
│       ├── status/                # Live connection state, packet counts
│       ├── latest/                # Latest valid telemetry packet (read by dashboard)
│       └── history/               # Time-indexed historical telemetry records
│           └── {readingId}        # Ingested packet with server timestamp
│
└── public/
    └── dashboard/                 # Aggregated public cached status
```

---

## 2. Deploying Security Rules

Install the Firebase CLI and login:
```bash
npm install -g firebase-tools
firebase login
firebase init database
firebase init storage
```

Deploy rules using the Firebase CLI:
```bash
# Deploy Realtime Database rules
firebase deploy --only database

# Deploy Storage rules
firebase deploy --only storage
```

---

## 3. Initial Administrator Setup

To prevent unauthorized public access, public registration is **disabled**. Create your initial admin user in the Firebase Console:

1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Select your project -> **Authentication** -> **Users** tab.
3. Click **Add user**.
4. Enter an administrative email (e.g., `admin@sjec.ac.in`) and a strong password (minimum 12 characters).
5. Click **Add user**.
6. Navigate to the web app (`/admin`) and log in with these credentials.
