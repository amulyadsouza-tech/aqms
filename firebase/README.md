# Firebase Architecture & Security Rules

This directory contains the production security rules and schema definitions for the **St. Joseph Engineering College (SJEC) Air Quality Monitoring System (AQMS)**.

---

## 1. Realtime Database Hierarchy

```
/
├── admins/
│   └── {uid}/                      # Boolean true for Firebase-authenticated administrators
├── config/
│   ├── branding/                  # College logo URL, titles, campus location
│   ├── sensors/                   # Per-sensor hardware model, units, calibrations
│   ├── aqi/                       # CPCB India breakpoints, thresholds
│   ├── site/                      # Retention policies, offline timeouts
│   └── activeDeviceId/            # Device currently displayed by the dashboard
│
├── devices/
│   └── {deviceId}/                # Actual configured hardware ID
│       ├── metadata/              # Non-secret hardware and connection configuration
│       ├── private/               # Admin-only device token hash
│       ├── status/                # Live connection state, packet counts
│       ├── latest/                # Latest valid telemetry packet (read by dashboard)
│       └── history/               # Actual hardware and manual historical records
│           └── {readingId}        # Ingested packet with server timestamp
│
└── public/
    └── dashboard/                 # Aggregated public cached status
```

---

## 2. Deploying Security Rules

The root `firebase.json` points the Realtime Database rules at `database.rules.json` and Functions at `functions/`.

Install the Firebase CLI, select the existing project, install Functions dependencies, and deploy:
```bash
npm install -g firebase-tools
firebase login
firebase use --add
npm --prefix functions install
npm --prefix functions run build
firebase deploy --only database,functions
```
The Function uses the Firebase Admin SDK's deployed service identity; no service-account key belongs in the React app. The scheduled history cleanup requires a billing-enabled project with Cloud Scheduler available.

---

## 3. Initial Administrator Setup

To prevent unauthorized public access, public registration is **disabled**. Create your initial admin user in the Firebase Console:

1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Select your project -> **Authentication** -> **Users** tab.
3. Click **Add user**.
4. Enter the administrator email and a strong password.
5. Click **Add user**.
6. Copy the user's UID and, in Realtime Database, set `/admins/{uid}` to boolean `true` using the Firebase Console. Rules intentionally deny client writes to `/admins`.
7. Navigate to `/admin` and log in with that account. Any client-side Firebase write requires this enrolled UID.

## Device Ingestion

The admin page stores public device metadata and a SHA-256 hash of the generated device token at `/devices/{deviceId}/private/deviceTokenHash`. The plaintext token remains in the admin page's memory only and must be provisioned to the physical device. Wi-Fi passwords are never written to Firebase.

The HTTPS Function requires an existing enabled device registration and a matching per-device token. It writes each validated packet to `/devices/{deviceId}/latest` and appends `/history/{recordId}` at the reporting interval saved in device metadata. Public clients can read telemetry but cannot write it unless their authenticated UID is listed in `/admins`.

Configure the Vite Firebase Web SDK values in the deployment environment, including the existing project's API key, Auth domain, Realtime Database URL, project ID, and app ID. Enable Firebase Email/Password Authentication. Do not put Admin SDK credentials in frontend environment variables.
