# SJEC AQMS — IoT Firmware & Hardware Integration Guide

This directory contains the firmware starter project, payload schemas, and pinout definitions for the **St. Joseph Engineering College (SJEC) Air Quality Monitoring System (AQMS)**.

---

## 1. Physical Hardware Overview

The prototype comprises:
- **Core Microcontroller**: ESP32 NodeMCU-32S (30-pin, CP2102 USB-to-UART bridge) mounted on a perforated PCB.
- **Sensor Array**:
  - **PMS Particulate Matter Sensor**: Measures PM1.0, PM2.5, and PM10 concentrations via laser light scattering.
  - **MQ-3 Gas Sensor**: Measures alcohol and volatile hydrocarbon levels via a metal-oxide semiconductor (MOX) heated element.
  - **Temperature & Humidity Sensor**: Ambient temperature (°C) and relative humidity (%).
  - **GPS Receiver Module**: NMEA 0183 output for geographic positioning.
- **Wireless Radio Module**: Separate transceiver with an external whip antenna mounted beside the ESP32.

---

## 2. Radio Transceiver Architecture & Next Steps

> **CRITICAL HARDWARE NOTICE**:  
> The exact model of the radio transceiver mounted on the perforated PCB has **not yet been confirmed**.  
> Do not assume the module is LoRa until physical verification is completed!

### Steps to Confirm Radio Hardware:
1. Inspect the silkscreen or metal shield of the module:
   - **Ai-Thinker Ra-02 / Ra-01**: Semtech SX1278 (433 MHz LoRa transceiver).
   - **Ai-Thinker Ra-01H**: Semtech SX1276 (868 / 915 MHz LoRa transceiver).
   - **NRF24L01+**: Nordic 2.4 GHz GFSK transceiver (SPI bus).
   - **HC-12**: 433 MHz serial wireless module (UART bus).
2. Measure antenna length to confirm carrier frequency:
   - ~17.3 cm quarter-wave whip = **433 MHz**.
   - ~8.6 cm quarter-wave whip = **865–868 MHz** (Indian license-free LoRa band).
3. If confirmed as a LoRa radio:
   - A standalone LoRa node cannot speak directly to Firebase over the internet.
   - It requires a **LoRa Gateway Bridge** (e.g. an ESP32 LoRa Gateway connected to campus Wi-Fi) that receives RF packets and forwards them via HTTPS to `/ingestTelemetry`.
   - Enter LoRa frequency, spreading factor, bandwidth, coding rate, and sync word only after verifying the exact radio and gateway configuration. The supplied firmware does not implement a LoRa driver while the installed radio remains unconfirmed.

---

## 3. Recommended Pin Connections

Refer to `hardware-config/hardware_pins_template.h`.

| Component | ESP32 Pin | Interface | Notes |
| :--- | :--- | :--- | :--- |
| **PMS5003 TX** | GPIO 16 (RX2) | Hardware UART2 | 9600 baud, 8N1 |
| **PMS5003 RX** | GPIO 17 (TX2) | Hardware UART2 | Optional sleep control |
| **MQ-3 Analog Out** | GPIO 34 | ADC1_CH6 | Input-only. Must not exceed 3.3V! |
| **DHT22 Data** | GPIO 4 | 1-Wire Bus | Requires 4.7kΩ pullup to 3.3V |
| **GPS TX** | GPIO 18 (RX1) | Hardware UART1 | 9600 baud NMEA sentences |
| **Status LED** | GPIO 2 | Output | Onboard blue indicator |

---

## 4. Flash and Configure the Firmware

### Using Arduino IDE:
1. Install **ESP32 Board Support** in Arduino IDE:
   - Go to `File` -> `Preferences`.
   - Add `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json` to Additional Boards Manager URLs.
   - Go to `Tools` -> `Board` -> `Boards Manager`, search for `esp32` by Espressif and install it.
2. Install Required Libraries via Library Manager (`Sketch` -> `Include Library` -> `Manage Libraries`):
   - `ArduinoJson` (v6 or v7)
   - `DHT sensor library` by Adafruit
   - `Adafruit Unified Sensor`
   - `TinyGPSPlus` by Mikal Hart
3. Verify `hardware-config/hardware_pins_template.h` against the assembled PCB and connected sensor modules. The firmware currently reads the configured PMS UART, MQ-3 ADC, DHT22, and GPS UART. It sends null for unavailable DHT/GPS/PM values; it has no fabricated fallback readings.
4. Open `firmware/sjec_aqms_esp32.ino`. The source contains no Wi-Fi password, device ID, endpoint, or device token. Do not add those credentials to committed source.
5. Select the actual ESP32 board and upload speed for the board in hand. Upload the firmware over USB.
6. In Firebase, create and enroll the administrator UID as described in `firebase/README.md`. Configure the app's Firebase Web SDK values and deploy Realtime Database rules and Functions with `firebase deploy --only database,functions`.
7. In the admin page, enter the actual device ID and name, reporting interval, connection timeout, deployed HTTPS `ingestTelemetry` URL, and the CA certificate that validates that endpoint. Generate a device token and save the configuration. Copy no Wi-Fi password or plaintext token into Firebase.
8. Enter the actual Wi-Fi SSID and password in the admin provisioning section, click **Provision over USB**, and select the physically attached ESP32 in the browser's serial-port picker. Use Chrome or Edge on HTTPS (localhost is also a secure browser context). The firmware stores the settings in ESP32 NVS and restarts; the page reports success only after a matching acknowledgement from that device. The password is sent over the local USB serial connection, not over WebSocket/HTTP, and is not saved in browser storage or Firebase.
9. Confirm the firmware reports Wi-Fi connection and that real sensor packets appear under `/devices/{deviceId}/latest` and `/history` in Realtime Database. The public dashboard reads only these stored records.

The included ESP32 firmware posts HTTPS telemetry to the deployed Function; it does **not** run a WebSocket server. The admin WebSocket client is for a separately configured ESP32/gateway that actually serves compatible JSON messages. On an HTTPS-hosted site it must use `wss://`. A LoRa radio without an IP-connected gateway cannot be reached by the browser client.
