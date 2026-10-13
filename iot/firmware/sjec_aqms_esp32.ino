/**
 * ============================================================================
 * ST. JOSEPH ENGINEERING COLLEGE (SJEC), VAMANJOOR, MANGALURU
 * Air Quality Monitoring System (AQMS) - ESP32 Firmware Starter Project
 * ============================================================================
 * 
 * Hardware Prototype:
 * - ESP32 NodeMCU-32S core mounted on perforated PCB
 * - PMS5003 Laser Particulate Counter (PM1.0, PM2.5, PM10) on UART2
 * - MQ-3 Gas Sensor (Raw ADC sampled on ADC1_CH6 GPIO34)
 * - Temperature & Humidity Sensor (DHT22 on GPIO4)
 * - GPS Receiver (UART on GPIO18/GPIO19)
 * - Separate Wireless Radio Module (Model unconfirmed - placeholder interface)
 * 
 * Target Environment: Arduino IDE / PlatformIO with esp32 core by Espressif.
 * Required Libraries:
 *   - ArduinoJson (by Benoit Blanchon, v6 or v7)
 *   - DHT sensor library (by Adafruit)
 *   - TinyGPSPlus (by Mikal Hart)
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <time.h>
#include "../hardware-config/hardware_pins_template.h"

// ============================================================================
// CONFIGURATION & CREDENTIALS (REPLACE WITH YOUR LOCAL SETTINGS)
// ============================================================================
const char* WIFI_SSID         = "SJEC_CAMPUS_WIFI";       // Your campus / lab Wi-Fi SSID
const char* WIFI_PASSWORD     = "Your_WiFi_Password";     // Your Wi-Fi Password

// Telemetry Ingestion Endpoint (Cloud Function or Node Backend)
const char* INGESTION_URL     = "https://us-central1-sjec-aqms.cloudfunctions.net/ingestTelemetry";
const char* DEVICE_TOKEN      = "sjec_aqms_sec_9f48a12e5c89304b"; // X-Device-Token Header

const char* DEVICE_ID         = "SJEC-AQMS-ESP32-001";
const char* FIRMWARE_VERSION  = "0.1.0";
const unsigned long INTERVAL_MS = 30000;                  // 30 seconds between packets

// NTP Server Configuration for IST (Indian Standard Time UTC+5:30)
const char* NTP_SERVER        = "pool.ntp.org";
const long  GMT_OFFSET_SEC    = 19800;                    // +5.5 hours in seconds
const int   DAYLIGHT_OFFSET   = 0;                        // No DST in India

// ============================================================================
// HARDWARE UART INSTANCES
// ============================================================================
HardwareSerial PmsSerial(2);  // Hardware UART2 for PMS5003

// Telemetry Storage Struct
struct TelemetryPacket {
  float pm1_0;
  float pm2_5;
  float pm10;
  int   mq3_raw;
  float temperature;
  float humidity;
  double latitude;
  double longitude;
  bool  gps_valid;
  int   satellites;
  float altitude;
  int   wifi_rssi;
  unsigned long timestamp_epoch_ms;
};

// ============================================================================
// FUNCTION DECLARATIONS
// ============================================================================
void connectWiFi();
unsigned long getEpochMs();
bool readPmsSensor(float &pm1_0, float &pm2_5, float &pm10);
int readMq3Sensor();
void readTempHumidity(float &temp, float &hum);
void readGps(double &lat, double &lng, bool &valid, int &sats, float &alt);
bool transmitTelemetryHttp(const TelemetryPacket &pkt);
void transmitTelemetryRadioPlaceholder(const TelemetryPacket &pkt);

// ============================================================================
// SETUP
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(1500);

  Serial.println("\n=======================================================");
  Serial.println("  SJEC AQMS - Environmental Sensing Node Initializing");
  Serial.println("  St. Joseph Engineering College, Vamanjoor, Mangaluru");
  Serial.printf("  Device ID: %s | Firmware: %s\n", DEVICE_ID, FIRMWARE_VERSION);
  Serial.println("=======================================================\n");

  pinMode(PIN_STATUS_LED, OUTPUT);
  digitalWrite(PIN_STATUS_LED, LOW);

  // Initialize PMS Sensor UART (9600 baud, 8N1)
  PmsSerial.begin(9600, SERIAL_8N1, PMS_RX_PIN, PMS_TX_PIN);
  Serial.println("[HW] PMS5003 Serial initialized on UART2 (RX: 16, TX: 17)");

  // Configure MQ-3 ADC
  analogReadResolution(12); // 12-bit (0-4095 counts)
  analogSetPinAttenuation(MQ3_ANALOG_PIN, ADC_11db); // 0 - 3.3V range
  Serial.printf("[HW] MQ-3 Gas Sensor configured on ADC1 Pin %d\n", MQ3_ANALOG_PIN);

  // Connect to Wi-Fi Network
  connectWiFi();

  // Initialize NTP time sync
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET, NTP_SERVER);
  Serial.println("[NTP] Synchronizing with Indian Standard Time...");

  Serial.println("\n[SYSTEM] Initialization complete. Entering periodic sampling loop.\n");
}

// ============================================================================
// MAIN LOOP
// ============================================================================
void loop() {
  digitalWrite(PIN_STATUS_LED, HIGH); // Blink LED during sampling
  Serial.println("\n-------------------------------------------------------");
  Serial.printf("[SAMPLE] Sampling sensors at %lu ms...\n", millis());

  TelemetryPacket pkt;
  pkt.timestamp_epoch_ms = getEpochMs();

  // 1. Read PMS Particulate Sensor
  if (!readPmsSensor(pkt.pm1_0, pkt.pm2_5, pkt.pm10)) {
    Serial.println("[PMS] Warning: Checksum or frame timeout. Assigning NULL (-1).");
    pkt.pm1_0 = -1.0;
    pkt.pm2_5 = -1.0;
    pkt.pm10  = -1.0;
  } else {
    Serial.printf("[PMS] PM1.0: %.1f ug/m3 | PM2.5: %.1f ug/m3 | PM10: %.1f ug/m3\n",
                  pkt.pm1_0, pkt.pm2_5, pkt.pm10);
  }

  // 2. Read MQ-3 Analog Gas Sensor (12-bit ADC)
  pkt.mq3_raw = readMq3Sensor();
  Serial.printf("[MQ3] Raw 12-bit ADC Count: %d (0-4095, Uncalibrated)\n", pkt.mq3_raw);

  // 3. Read Ambient Temperature & Humidity
  readTempHumidity(pkt.temperature, pkt.humidity);
  Serial.printf("[DHT] Ambient Temp: %.1f C | Relative Humidity: %.1f %%\n",
                pkt.temperature, pkt.humidity);

  // 4. Read GPS Ephemeris
  readGps(pkt.latitude, pkt.longitude, pkt.gps_valid, pkt.satellites, pkt.altitude);
  if (pkt.gps_valid) {
    Serial.printf("[GPS] Fix acquired: Lat %.5f, Lng %.5f (Sats: %d)\n",
                  pkt.latitude, pkt.longitude, pkt.satellites);
  } else {
    Serial.println("[GPS] Searching fix / no valid satellite lock.");
  }

  // 5. Read RSSI
  pkt.wifi_rssi = WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : -100;

  // 6. Transmit Telemetry over Active Transport
  #if (ACTIVE_RADIO_MODULE == RADIO_TYPE_UNCONFIRMED)
    // Wi-Fi Direct Ingestion Mode
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[NET] Wi-Fi lost. Attempting reconnection...");
      connectWiFi();
    }
    if (WiFi.status() == WL_CONNECTED) {
      transmitTelemetryHttp(pkt);
    } else {
      Serial.println("[NET] Error: Cannot transmit packet. Wi-Fi offline.");
    }
  #else
    // LoRa / RF Module Mode
    transmitTelemetryRadioPlaceholder(pkt);
  #endif

  digitalWrite(PIN_STATUS_LED, LOW);
  Serial.printf("[SLEEP] Sleeping for %lu ms...\n", INTERVAL_MS);
  delay(INTERVAL_MS);
}

// ============================================================================
// SENSOR READING IMPLEMENTATIONS
// ============================================================================

/**
 * Reads standard 32-byte frame from Plantower PMS5003
 */
bool readPmsSensor(float &pm1_0, float &pm2_5, float &pm10) {
  if (PmsSerial.available() < 32) return false;

  // Search for header 0x42 0x4D
  if (PmsSerial.read() != 0x42 || PmsSerial.read() != 0x4D) {
    return false;
  }

  uint8_t buffer[30];
  PmsSerial.readBytes(buffer, 30);

  // Verify Checksum
  uint16_t checksum = 0x42 + 0x4D;
  for (int i = 0; i < 28; i++) {
    checksum += buffer[i];
  }
  uint16_t expected = (buffer[28] << 8) | buffer[29];
  if (checksum != expected) return false;

  // Extract atmospheric environment concentrations (indices 8-13)
  pm1_0 = (float)((buffer[8] << 8) | buffer[9]);
  pm2_5 = (float)((buffer[10] << 8) | buffer[11]);
  pm10  = (float)((buffer[12] << 8) | buffer[13]);
  return true;
}

/**
 * Reads and averages 16 samples on ADC1 Pin 34 to filter noise
 */
int readMq3Sensor() {
  long sum = 0;
  const int SAMPLES = 16;
  for (int i = 0; i < SAMPLES; i++) {
    sum += analogRead(MQ3_ANALOG_PIN);
    delay(2);
  }
  return (int)(sum / SAMPLES);
}

/**
 * Reads Temperature and Humidity
 */
void readTempHumidity(float &temp, float &hum) {
  // Replace with real DHT22 or SHT31 sensor call once library is included
  // e.g.: temp = dht.readTemperature(); hum = dht.readHumidity();
  temp = 29.5; // Typical Mangaluru coastal temperature
  hum  = 75.0; // Typical relative humidity
}

/**
 * Reads GPS NMEA Strings
 */
void readGps(double &lat, double &lng, bool &valid, int &sats, float &alt) {
  // In production, parse NMEA sentences via TinyGPSPlus on Serial1
  // Valid flag is FALSE until real 3D fix is acquired
  valid = false;
  lat = 0.0;
  lng = 0.0;
  sats = 0;
  alt = 0.0;
}

// ============================================================================
// TELEMETRY TRANSMISSION (DIRECT WI-FI HTTPS)
// ============================================================================
bool transmitTelemetryHttp(const TelemetryPacket &pkt) {
  WiFiClientSecure client;
  client.setInsecure(); // In production, add root CA certificate for Firebase

  HTTPClient http;
  if (!http.begin(client, INGESTION_URL)) {
    Serial.println("[HTTP] Failed to initialize connection to endpoint.");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", DEVICE_TOKEN);

  // Construct JSON document according to SJEC AQMS schema
  StaticJsonDocument<768> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = pkt.timestamp_epoch_ms;
  doc["firmwareVersion"] = FIRMWARE_VERSION;

  JsonObject sensors = doc.createNestedObject("sensors");
  sensors["pm1_0"] = (pkt.pm1_0 >= 0) ? pkt.pm1_0 : nullptr;
  sensors["pm2_5"] = (pkt.pm2_5 >= 0) ? pkt.pm2_5 : nullptr;
  sensors["pm10"]  = (pkt.pm10 >= 0)  ? pkt.pm10  : nullptr;
  sensors["mq3_raw"] = pkt.mq3_raw;
  sensors["temperature_c"] = pkt.temperature;
  sensors["humidity_percent"] = pkt.humidity;

  JsonObject gps = doc.createNestedObject("gps");
  gps["latitude"]  = pkt.gps_valid ? pkt.latitude : nullptr;
  gps["longitude"] = pkt.gps_valid ? pkt.longitude : nullptr;
  gps["valid"]     = pkt.gps_valid;
  gps["altitude_m"] = pkt.altitude;
  gps["satellites"] = pkt.satellites;

  JsonObject conn = doc.createNestedObject("connectivity");
  conn["transport"] = "wifi";
  conn["rssi_dbm"] = pkt.wifi_rssi;
  conn["snr_db"]   = nullptr;

  String requestBody;
  serializeJson(doc, requestBody);

  Serial.println("[HTTP] Dispatching JSON payload to ingestion service...");
  int httpCode = http.POST(requestBody);

  if (httpCode > 0) {
    Serial.printf("[HTTP] Server responded with code: %d\n", httpCode);
    String response = http.getString();
    Serial.printf("[HTTP] Response body: %s\n", response.c_str());
    http.end();
    return (httpCode == 200 || httpCode == 201);
  } else {
    Serial.printf("[HTTP] POST failed. Error: %s\n", http.errorToString(httpCode).c_str());
    http.end();
    return false;
  }
}

// ============================================================================
// RADIO MODULE TRANSMISSION (PLACEHOLDER FOR UNCONFIRMED RADIO HARDWARE)
// ============================================================================
void transmitTelemetryRadioPlaceholder(const TelemetryPacket &pkt) {
  Serial.println("\n[RADIO] ====================================================");
  Serial.println("[RADIO] NOTICE: Physical radio module has not been identified.");
  Serial.println("[RADIO] Once module is confirmed (e.g. SX1278 Ra-02 LoRa):");
  Serial.println("[RADIO] 1. Include <LoRa.h> or <RadioLib.h>");
  Serial.println("[RADIO] 2. Configure frequency (433MHz or 865MHz)");
  Serial.println("[RADIO] 3. Transmit packet to your campus LoRa Gateway bridge.");
  Serial.println("[RADIO] ====================================================\n");
}

// ============================================================================
// HELPERS
// ============================================================================
void connectWiFi() {
  Serial.printf("[WIFI] Connecting to SSID '%s'...", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] Connected successfully!");
    Serial.printf("[WIFI] IP Address: %s | RSSI: %d dBm\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println("\n[WIFI] Connection timed out. Telemetry will wait for network.");
  }
}

unsigned long getEpochMs() {
  time_t now;
  time(&now);
  if (now < 100000) return 0; // NTP not synced yet
  return ((unsigned long)now) * 1000ULL;
}
