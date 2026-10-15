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
#include <Preferences.h>
#include <DHT.h>
#include <TinyGPSPlus.h>
#include <math.h>
#include <time.h>
#include "../hardware-config/hardware_pins_template.h"

// ============================================================================
// Device and network settings are loaded through the USB provisioning protocol.
// ============================================================================
const char* FIRMWARE_VERSION  = "0.1.0";

Preferences devicePreferences;
TinyGPSPlus gpsParser;
DHT tempHumiditySensor(DHT_PIN, DHT_TYPE);
String wifiSsid;
String wifiPassword;
String deviceId;
String ingestionUrl;
String ingestionRootCa;
String deviceToken;
uint32_t reportingIntervalSeconds = 0;

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
  uint64_t timestamp_epoch_ms;
};

// ============================================================================
// FUNCTION DECLARATIONS
// ============================================================================
void connectWiFi();
void loadProvisionedConfig();
void processSerialProvisioning();
uint64_t getEpochMs();
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
  Serial.setRxBufferSize(8192);
  Serial.begin(115200);
  delay(1500);

  Serial.println("\n=======================================================");
  Serial.println("  AQMS - Environmental Sensing Node Initializing");
  Serial.printf("  Firmware: %s\n", FIRMWARE_VERSION);
  Serial.println("=======================================================\n");

  devicePreferences.begin("aqms-device", false);
  loadProvisionedConfig();
  pinMode(PIN_STATUS_LED, OUTPUT);
  digitalWrite(PIN_STATUS_LED, LOW);

  // Initialize PMS Sensor UART (9600 baud, 8N1)
  PmsSerial.begin(9600, SERIAL_8N1, PMS_RX_PIN, PMS_TX_PIN);
  Serial.println("[HW] Particulate sensor UART initialized.");

  // Configure MQ-3 ADC
  analogReadResolution(12); // 12-bit (0-4095 counts)
  analogSetPinAttenuation(MQ3_ANALOG_PIN, ADC_11db); // 0 - 3.3V range
  Serial.printf("[HW] MQ-3 ADC configured on pin %d\n", MQ3_ANALOG_PIN);

  tempHumiditySensor.begin();
  Serial1.begin(GPS_BAUD_RATE, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

  if (wifiSsid.length() > 0) connectWiFi();

  // Initialize NTP time sync
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET, NTP_SERVER);
  Serial.println("[NTP] Synchronizing with Indian Standard Time...");

  Serial.println("\n[SYSTEM] Initialization complete.\n");
}

// ============================================================================
// MAIN LOOP
// ============================================================================
void loop() {
  processSerialProvisioning();
  if (deviceId.length() == 0 || wifiSsid.length() == 0 || ingestionUrl.length() == 0 ||
      ingestionRootCa.length() == 0 || deviceToken.length() == 0 || reportingIntervalSeconds == 0) {
    delay(50);
    return;
  }

  digitalWrite(PIN_STATUS_LED, HIGH); // Blink LED during sampling
  Serial.println("\n-------------------------------------------------------");
  Serial.printf("[SAMPLE] Sampling sensors at %lu ms...\n", millis());

  TelemetryPacket pkt;
  pkt.timestamp_epoch_ms = getEpochMs();
  pkt.pm1_0 = -1.0;
  pkt.pm2_5 = -1.0;
  pkt.pm10 = -1.0;
  pkt.temperature = NAN;
  pkt.humidity = NAN;
  pkt.latitude = NAN;
  pkt.longitude = NAN;
  pkt.gps_valid = false;
  pkt.satellites = -1;
  pkt.altitude = NAN;

  // 1. Read PMS Particulate Sensor
  if (!readPmsSensor(pkt.pm1_0, pkt.pm2_5, pkt.pm10)) {
    Serial.println("[PMS] No valid sensor frame received.");
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
  const uint32_t intervalMs = reportingIntervalSeconds * 1000UL;
  Serial.printf("[SLEEP] Sleeping for %lu ms...\n", static_cast<unsigned long>(intervalMs));
  delay(intervalMs);
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
  temp = tempHumiditySensor.readTemperature();
  hum = tempHumiditySensor.readHumidity();
}

/**
 * Reads GPS NMEA Strings
 */
void readGps(double &lat, double &lng, bool &valid, int &sats, float &alt) {
  while (Serial1.available() > 0) gpsParser.encode(Serial1.read());
  valid = gpsParser.location.isValid() && gpsParser.location.age() < 5000;
  if (!valid) return;
  lat = gpsParser.location.lat();
  lng = gpsParser.location.lng();
  sats = gpsParser.satellites.isValid() ? gpsParser.satellites.value() : -1;
  alt = gpsParser.altitude.isValid() ? gpsParser.altitude.meters() : NAN;
}

// ============================================================================
// TELEMETRY TRANSMISSION (DIRECT WI-FI HTTPS)
// ============================================================================
bool transmitTelemetryHttp(const TelemetryPacket &pkt) {
  if (!ingestionUrl.startsWith("https://") || ingestionRootCa.length() == 0 || deviceToken.length() == 0) {
    Serial.println("[HTTP] Secure ingestion configuration is incomplete.");
    return false;
  }

  WiFiClientSecure client;
  client.setCACert(ingestionRootCa.c_str());

  HTTPClient http;
  if (!http.begin(client, ingestionUrl.c_str())) {
    Serial.println("[HTTP] Failed to initialize connection to endpoint.");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", deviceToken.c_str());

  // Construct JSON document according to SJEC AQMS schema
  StaticJsonDocument<768> doc;
  doc["deviceId"] = deviceId;
  doc["timestamp"] = pkt.timestamp_epoch_ms;
  doc["firmwareVersion"] = FIRMWARE_VERSION;

  JsonObject sensors = doc.createNestedObject("sensors");
  sensors["pm1_0"] = (pkt.pm1_0 >= 0) ? pkt.pm1_0 : nullptr;
  sensors["pm2_5"] = (pkt.pm2_5 >= 0) ? pkt.pm2_5 : nullptr;
  sensors["pm10"]  = (pkt.pm10 >= 0)  ? pkt.pm10  : nullptr;
  sensors["mq3_raw"] = pkt.mq3_raw;
  if (isfinite(pkt.temperature) && pkt.temperature >= -40 && pkt.temperature <= 85) {
    sensors["temperature_c"] = pkt.temperature;
  } else {
    sensors["temperature_c"] = nullptr;
  }
  if (isfinite(pkt.humidity) && pkt.humidity >= 0 && pkt.humidity <= 100) {
    sensors["humidity_percent"] = pkt.humidity;
  } else {
    sensors["humidity_percent"] = nullptr;
  }

  JsonObject gps = doc.createNestedObject("gps");
  gps["latitude"]  = pkt.gps_valid ? pkt.latitude : nullptr;
  gps["longitude"] = pkt.gps_valid ? pkt.longitude : nullptr;
  gps["valid"]     = pkt.gps_valid;
  if (pkt.gps_valid && isfinite(pkt.altitude)) {
    gps["altitude_m"] = pkt.altitude;
  } else {
    gps["altitude_m"] = nullptr;
  }
  if (pkt.gps_valid && pkt.satellites >= 0) {
    gps["satellites"] = pkt.satellites;
  } else {
    gps["satellites"] = nullptr;
  }

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
  if (wifiSsid.length() == 0) {
    Serial.println("[WIFI] No SSID provisioned.");
    return;
  }
  Serial.println("[WIFI] Connecting to the provisioned network...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(wifiSsid.c_str(), wifiPassword.c_str());

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

void loadProvisionedConfig() {
  wifiSsid = devicePreferences.getString("ssid", "");
  wifiPassword = devicePreferences.getString("wifiPassword", "");
  deviceId = devicePreferences.getString("deviceId", "");
  ingestionUrl = devicePreferences.getString("ingestionUrl", "");
  ingestionRootCa = devicePreferences.getString("rootCa", "");
  deviceToken = devicePreferences.getString("deviceToken", "");
  reportingIntervalSeconds = devicePreferences.getUInt("reportInterval", 0);
}

void processSerialProvisioning() {
  if (!Serial.available()) return;
  String line = Serial.readStringUntil('\n');
  if (!line.startsWith("AQMS_CONFIG:")) return;

  DynamicJsonDocument doc(8192);
  const DeserializationError error = deserializeJson(doc, line.substring(12));
  const char* requestId = doc["requestId"] | "";
  const char* nextDeviceId = doc["deviceId"] | "";
  const char* nextSsid = doc["ssid"] | "";
  const char* nextIngestionUrl = doc["ingestionUrl"] | "";
  const char* nextRootCa = doc["ingestionRootCa"] | "";
  const char* nextToken = doc["deviceToken"] | "";
  const uint32_t nextInterval = doc["reportingIntervalSeconds"] | 0;

  if (error || String(requestId).length() == 0 || String(nextDeviceId).length() == 0 || String(nextSsid).length() == 0 ||
      !String(nextIngestionUrl).startsWith("https://") || String(nextRootCa).length() == 0 ||
      String(nextToken).length() < 32 || nextInterval < 1 || nextInterval > 3600) {
    Serial.println("AQMS_CONFIG_ERROR");
    return;
  }

  wifiSsid = nextSsid;
  wifiPassword = doc["password"] | "";
  deviceId = nextDeviceId;
  ingestionUrl = nextIngestionUrl;
  ingestionRootCa = nextRootCa;
  deviceToken = nextToken;
  reportingIntervalSeconds = nextInterval;

  const bool stored =
    devicePreferences.putString("ssid", wifiSsid) > 0 &&
    (devicePreferences.putString("wifiPassword", wifiPassword) > 0 || wifiPassword.length() == 0) &&
    devicePreferences.putString("deviceId", deviceId) > 0 &&
    devicePreferences.putString("ingestionUrl", ingestionUrl) > 0 &&
    devicePreferences.putString("rootCa", ingestionRootCa) > 0 &&
    devicePreferences.putString("deviceToken", deviceToken) > 0 &&
    devicePreferences.putUInt("reportInterval", reportingIntervalSeconds) > 0;
  const bool verified =
    devicePreferences.getString("ssid", "") == wifiSsid &&
    devicePreferences.getString("wifiPassword", "") == wifiPassword &&
    devicePreferences.getString("deviceId", "") == deviceId &&
    devicePreferences.getString("ingestionUrl", "") == ingestionUrl &&
    devicePreferences.getString("rootCa", "") == ingestionRootCa &&
    devicePreferences.getString("deviceToken", "") == deviceToken &&
    devicePreferences.getUInt("reportInterval", 0) == reportingIntervalSeconds;
  if (!stored || !verified) {
    Serial.println("AQMS_CONFIG_ERROR");
    return;
  }

  Serial.printf("AQMS_CONFIG_OK:%s\n", requestId);
  delay(250);
  ESP.restart();
}

uint64_t getEpochMs() {
  time_t now;
  time(&now);
  if (now < 100000) return 0; // NTP not synced yet
  return static_cast<uint64_t>(now) * 1000ULL;
}
