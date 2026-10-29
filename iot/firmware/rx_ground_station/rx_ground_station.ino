/*
  AQMS RECEIVER (Ground Station) - ESP32 + SX1278 (433 MHz) + Wi-Fi WebSocket Server
  St. Joseph Engineering College, Vamanjoor, Mangaluru

  Libraries needed (install via Arduino Library Manager):
    - LoRa                by Sandeep Mistry
    - WebSockets          by Markus Sattler   <-- install this!

  Wiring:
    SX1278  NSS 5, SCK 18, MISO 19, MOSI 23, RST 14, DIO0 26, VCC 3.3V, GND

  WebSocket URL:  ws://<ESP32_IP>:81
  Open Serial Monitor at 115200 baud to see the live IP address.
*/

#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <WebSocketsServer.h>

// ================= WI-FI CREDENTIALS =================
const char* WIFI_SSID     = "Jeevan";
const char* WIFI_PASSWORD = "PASSWORD";
const uint16_t WS_PORT    = 81;

// ================= LORA PINS (RECEIVER) =================
#define LORA_SCK   18
#define LORA_MISO  19
#define LORA_MOSI  23
#define LORA_NSS    5
#define LORA_RST   14
#define LORA_DIO0  26

#define LORA_FREQ  433E6

WebSocketsServer webSocket(WS_PORT);

unsigned long receivedPackets = 0;
long          lastId          = -1;
unsigned long lastStatus      = 0;

// ------------------------------------------------------------
// WebSocket event callback
// ------------------------------------------------------------
void onWsEvent(uint8_t clientNum, WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED: {
      IPAddress ip = webSocket.remoteIP(clientNum);
      Serial.printf("✅ [WebSocket] Client #%u connected from %s\n",
                    clientNum, ip.toString().c_str());
      break;
    }
    case WStype_DISCONNECTED:
      Serial.printf("🔌 [WebSocket] Client #%u disconnected\n", clientNum);
      break;
    case WStype_TEXT: {
      String msg = String((char*)payload);
      msg.trim();
      if (msg == "ping" || msg.indexOf("\"ping\"") >= 0) {
        webSocket.sendTXT(clientNum, "{\"type\":\"pong\",\"pong\":true}");
      }
      break;
    }
    default:
      break;
  }
}

// ------------------------------------------------------------
// Return the text value of "KEY=value" field from CSV-like packet
// ------------------------------------------------------------
String getField(const String& msg, const String& key) {
  int s = msg.indexOf(key);
  if (s < 0) return "?";
  s += key.length();
  int e = msg.indexOf(',', s);
  if (e < 0) e = msg.length();
  return msg.substring(s, e);
}

// ------------------------------------------------------------
// GPS field parser: "GPS=lat,lon"  or  "GPS=NO_FIX"
// ------------------------------------------------------------
void getGps(const String& msg, String& lat, String& lon) {
  lat = "NO_FIX";
  lon = "NO_FIX";
  int s = msg.indexOf("GPS=");
  if (s < 0) return;
  s += 4;
  String rest = msg.substring(s);
  if (rest.startsWith("NO_FIX")) return;
  int c = rest.indexOf(',');
  if (c < 0) return;
  lat = rest.substring(0, c);
  lon = rest.substring(c + 1);
  // strip anything after the lon value (next comma / end of string)
  int e = lon.indexOf(',');
  if (e >= 0) lon = lon.substring(0, e);
}

// ------------------------------------------------------------
// Convert sensor string to JSON value ("NA"/"?" -> null)
// ------------------------------------------------------------
String jsonVal(const String& val) {
  if (val == "NA" || val == "?" || val == "") return "null";
  return val;
}

// ------------------------------------------------------------
// LoRa Radio Init
// ------------------------------------------------------------
bool initRadio() {
  LoRa.setPins(LORA_NSS, LORA_RST, LORA_DIO0);
  LoRa.setSPIFrequency(1000000);
  if (!LoRa.begin(LORA_FREQ)) return false;

  LoRa.setSpreadingFactor(9);
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(5);
  LoRa.setPreambleLength(8);
  LoRa.setSyncWord(0x12);
  LoRa.enableCrc();
  LoRa.receive();
  return true;
}

// ------------------------------------------------------------
// SETUP
// ------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(1500);

  Serial.println();
  Serial.println("==================================================");
  Serial.println("   SJEC AQMS RECEIVER + WI-FI WEBSOCKET SERVER");
  Serial.println("==================================================");

  // 1. Connect to Wi-Fi
  Serial.printf("Connecting to Wi-Fi SSID: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long wifiStart = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - wifiStart < 20000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("✅ Wi-Fi Connected!");
    Serial.printf("   IP Address   : %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("   WebSocket URL: ws://%s:%u\n",
                  WiFi.localIP().toString().c_str(), WS_PORT);
  } else {
    Serial.println();
    Serial.println("⚠️  Wi-Fi timed out — running in serial-only mode.");
  }

  // 2. Start WebSocket server
  webSocket.begin();
  webSocket.onEvent(onWsEvent);
  Serial.printf("🌐 WebSocket server started on port %u\n", WS_PORT);

  // 3. Initialize LoRa Radio
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_NSS);

  bool ok = false;
  for (int attempt = 1; attempt <= 5 && !ok; attempt++) {
    ok = initRadio();
    if (!ok) {
      Serial.printf("LoRa init failed, retry %d\n", attempt);
      delay(500);
    }
  }

  if (!ok) {
    Serial.println("❌ LoRa initialization FAILED — check wiring and 3.3 V supply!");
    while (true) delay(1000);
  }

  Serial.println("📡 LoRa ready: 433 MHz | SF9 | BW125k | CR4/5 | sync 0x12 | CRC ON");
  Serial.println("Waiting for AQMS packets...");
  Serial.println("==================================================");
}

// ------------------------------------------------------------
// LOOP
// ------------------------------------------------------------
void loop() {
  // Service WebSocket connections (must be called every loop iteration)
  webSocket.loop();

  // Check for incoming LoRa packet
  int packetSize = LoRa.parsePacket();

  if (packetSize > 0) {
    receivedPackets++;

    String msg = "";
    while (LoRa.available()) msg += (char)LoRa.read();

    int   rssi = LoRa.packetRssi();
    float snr  = LoRa.packetSnr();

    String id    = getField(msg, "ID=");
    String p1    = getField(msg, "PM1=");
    String p25   = getField(msg, "PM25=");
    String p10   = getField(msg, "PM10=");
    String temp  = getField(msg, "TEMP=");
    String hum   = getField(msg, "HUM=");
    String mqRaw = getField(msg, "MQ3_RAW=");
    String mqmV  = getField(msg, "MQ3_mV=");
    String mqAO  = getField(msg, "MQ3_AO_mV=");
    String sat   = getField(msg, "SAT=");
    String lat, lon;
    getGps(msg, lat, lon);

    // Lost packet tracking
    long idNum = id.toInt();
    if (lastId >= 0 && idNum > lastId + 1) {
      Serial.printf("⚠️  Lost %ld packet(s) (expected %ld, got %ld)\n",
                    idNum - lastId - 1, lastId + 1, idNum);
    }
    if (idNum > 0) lastId = idNum;

    // --- Serial Monitor Display ---
    Serial.println();
    Serial.println("========== PACKET RECEIVED ==========");
    Serial.printf("Packet ID   : %s\n", id.c_str());
    Serial.printf("PM1.0       : %s ug/m3\n", p1.c_str());
    Serial.printf("PM2.5       : %s ug/m3\n", p25.c_str());
    Serial.printf("PM10        : %s ug/m3\n", p10.c_str());
    Serial.printf("Temperature : %s C\n",     temp.c_str());
    Serial.printf("Humidity    : %s %%\n",    hum.c_str());
    Serial.printf("MQ-3 Raw    : %s\n",       mqRaw.c_str());
    Serial.printf("MQ-3 pin mV : %s\n",       mqmV.c_str());
    Serial.printf("MQ-3 AO mV  : %s\n",       mqAO.c_str());
    Serial.printf("Satellites  : %s\n",       sat.c_str());
    Serial.printf("Latitude    : %s\n",       lat.c_str());
    Serial.printf("Longitude   : %s\n",       lon.c_str());
    Serial.printf("RSSI        : %d dBm\n",   rssi);
    Serial.printf("SNR         : %.2f dB\n",  snr);
    Serial.println("=====================================");

    // One-line CSV log
    Serial.printf("CSV,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%d,%.2f\n",
      id.c_str(), p1.c_str(), p25.c_str(), p10.c_str(),
      temp.c_str(), hum.c_str(), mqRaw.c_str(), mqmV.c_str(), mqAO.c_str(),
      sat.c_str(), lat.c_str(), lon.c_str(), rssi, snr);

    // --- Build Website-Compatible JSON Packet ---
    // timestamp = 0  →  website validator replaces with Date.now()
    bool isGpsValid = (lat != "NO_FIX" && lon != "NO_FIX" &&
                       lat != "?"      && lon != "?");

    String json = "{";
    json += "\"deviceId\":\"AQMS-SJEC-01\",";
    json += "\"timestamp\":0,";           // server fills this in with Date.now()
    json += "\"firmwareVersion\":\"1.0.0\",";
    json += "\"sensors\":{";
    json += "\"pm1_0\":"            + jsonVal(p1)    + ",";
    json += "\"pm2_5\":"            + jsonVal(p25)   + ",";
    json += "\"pm10\":"             + jsonVal(p10)   + ",";
    json += "\"mq3_raw\":"          + jsonVal(mqRaw) + ",";
    json += "\"mq3_ao_mv\":"        + jsonVal(mqAO)  + ",";
    json += "\"temperature_c\":"    + jsonVal(temp)  + ",";
    json += "\"humidity_percent\":" + jsonVal(hum);
    json += "},";
    json += "\"gps\":{";
    json += "\"latitude\":"  + (isGpsValid ? lat  : String("null")) + ",";
    json += "\"longitude\":" + (isGpsValid ? lon  : String("null")) + ",";
    json += "\"valid\":"     + String(isGpsValid ? "true" : "false") + ",";
    json += "\"satellites\":" + jsonVal(sat);
    json += "},";
    json += "\"connectivity\":{";
    json += "\"transport\":\"lora_gateway\",";
    json += "\"rssi_dbm\":"  + String(rssi)      + ",";
    json += "\"snr_db\":"    + String(snr, 2);
    json += "}}";

    // Broadcast live to all connected browser dashboards
    webSocket.broadcastTXT(json);
    Serial.printf("   ↳ Pushed to %u WebSocket client(s).\n",
                  webSocket.connectedClients());
  }

  // Periodic Wi-Fi reconnection check (every 10 s)
  if (millis() - lastStatus >= 10000UL) {
    lastStatus = millis();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("Wi-Fi lost — reconnecting...");
      WiFi.reconnect();
    } else {
      Serial.printf("[Heartbeat] IP: %s | Packets RX: %lu | WS clients: %u\n",
                    WiFi.localIP().toString().c_str(),
                    receivedPackets,
                    webSocket.connectedClients());
    }
  }
}
