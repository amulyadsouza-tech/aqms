/*
  AQMS TRANSMITTER - ESP32 + PMS7003 + MQ-3 + DHT11 + NEO-6M + SX1278 (433 MHz)

  Libraries needed (Library Manager):
    - LoRa                    by Sandeep Mistry
    - TinyGPSPlus             by Mikal Hart
    - DHT sensor library      by Adafruit  (also install "Adafruit Unified Sensor")

  WIRING SUMMARY
    PMS7003  TX -> GPIO 16   (VCC 5V, GND)
    MQ-3     AO -> 10k/10k divider -> GPIO 34   (VCC 5V, GND)
    DHT11    DATA -> GPIO 4  (VCC 3.3V, GND)  [module boards already have a pull-up]
    NEO-6M   TX -> GPIO 25   (VCC per breakout, GND)
    SX1278   NSS 5, SCK 18, MISO 19, MOSI 23, RST 27, DIO0 26, VCC 3.3V, GND

  POWER NOTES
   - LoRa VCC must be a steady 3.3 V, with 100 uF across its VCC and GND.
   - PMS7003 needs 5 V. All grounds common.
*/

#include <SPI.h>
#include <LoRa.h>
#include <TinyGPSPlus.h>
#include <DHT.h>

// ================= LORA PINS (TRANSMITTER) =================
#define LORA_SCK   18
#define LORA_MISO  19
#define LORA_MOSI  23
#define LORA_NSS    5
#define LORA_RST   27
#define LORA_DIO0  26

// ================= SENSOR PINS =================
#define PMS_RX_PIN 16
#define PMS_TX_PIN 17
#define GPS_RX_PIN 25
#define MQ3_PIN    34
#define DHT_PIN     4
#define DHT_TYPE   DHT11

// ================= SETTINGS =================
#define LORA_FREQ        433E6
#define SEND_INTERVAL    5000UL
#define PMS_STALE_MS     5000UL
#define GPS_STALE_MS     5000UL
#define DHT_READ_MS      2500UL     // DHT11 must not be read faster than ~1 Hz
#define DHT_STALE_MS     15000UL
#define USE_RFO          false

#define REG_IRQ_FLAGS    0x12
#define IRQ_TX_DONE      0x08

HardwareSerial PMSserial(2);
HardwareSerial GPSserial(1);
TinyGPSPlus gps;
DHT dht(DHT_PIN, DHT_TYPE);

// ---------- PMS data ----------
uint16_t pm1 = 0, pm25 = 0, pm10 = 0;
unsigned long pmsLastOk = 0;
bool pmsEverOk = false;

// ---------- DHT data ----------
float temperatureC = 0;
float humidityPct = 0;
unsigned long dhtLastOk = 0;
bool dhtEverOk = false;
unsigned long dhtLastTry = 0;

// ---------- misc ----------
unsigned long packetCounter = 0;
unsigned long lastSend = 0;
int txFailStreak = 0;

// ============================================================
// SX127x register access
// ============================================================
uint8_t readReg(uint8_t addr) {
  SPI.beginTransaction(SPISettings(1000000, MSBFIRST, SPI_MODE0));
  digitalWrite(LORA_NSS, LOW);
  SPI.transfer(addr & 0x7F);
  uint8_t v = SPI.transfer(0);
  digitalWrite(LORA_NSS, HIGH);
  SPI.endTransaction();
  return v;
}

void writeReg(uint8_t addr, uint8_t val) {
  SPI.beginTransaction(SPISettings(1000000, MSBFIRST, SPI_MODE0));
  digitalWrite(LORA_NSS, LOW);
  SPI.transfer(addr | 0x80);
  SPI.transfer(val);
  digitalWrite(LORA_NSS, HIGH);
  SPI.endTransaction();
}

// ============================================================
// LoRa init
// ============================================================
bool initRadio() {
  LoRa.setPins(LORA_NSS, LORA_RST, LORA_DIO0);
  LoRa.setSPIFrequency(1000000);

  if (!LoRa.begin(LORA_FREQ)) return false;

  // MUST match the receiver
  LoRa.setSpreadingFactor(9);
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(5);
  LoRa.setPreambleLength(8);
  LoRa.setSyncWord(0x12);
  LoRa.enableCrc();

  if (USE_RFO) LoRa.setTxPower(14, PA_OUTPUT_RFO_PIN);
  else         LoRa.setTxPower(17, PA_OUTPUT_PA_BOOST_PIN);

  return true;
}

// ============================================================
// PMS7003 non-blocking parser
// ============================================================
void pollPMS() {
  static uint8_t buf[32];
  static uint8_t idx = 0;

  while (PMSserial.available()) {
    uint8_t b = PMSserial.read();

    if (idx == 0) {
      if (b != 0x42) continue;
    } else if (idx == 1) {
      if (b != 0x4D) {
        idx = 0;
        if (b == 0x42) { buf[0] = b; idx = 1; }
        continue;
      }
    }

    buf[idx++] = b;

    if (idx == 32) {
      idx = 0;

      uint16_t len = ((uint16_t)buf[2] << 8) | buf[3];
      if (len != 28) continue;

      uint16_t sum = 0;
      for (int i = 0; i < 30; i++) sum += buf[i];
      uint16_t rx = ((uint16_t)buf[30] << 8) | buf[31];
      if (sum != rx) continue;

      pm1  = ((uint16_t)buf[10] << 8) | buf[11];
      pm25 = ((uint16_t)buf[12] << 8) | buf[13];
      pm10 = ((uint16_t)buf[14] << 8) | buf[15];

      pmsLastOk = millis();
      pmsEverOk = true;
    }
  }
}

// ============================================================
// GPS
// ============================================================
void pollGPS() {
  while (GPSserial.available()) {
    gps.encode(GPSserial.read());
  }
}

// ============================================================
// DHT11 (read at most every DHT_READ_MS)
// ============================================================
void pollDHT() {
  if (millis() - dhtLastTry < DHT_READ_MS) return;
  dhtLastTry = millis();

  float h = dht.readHumidity();
  float t = dht.readTemperature();

  if (!isnan(h) && !isnan(t)) {
    humidityPct = h;
    temperatureC = t;
    dhtLastOk = millis();
    dhtEverOk = true;
  }
}

// ============================================================
// Send packet, wait for TX-done with timeout
// ============================================================
bool sendPacket(const String &data) {
  if (!LoRa.beginPacket()) return false;
  LoRa.print(data);
  LoRa.endPacket(true);

  unsigned long t0 = millis();
  while (millis() - t0 < 3000UL) {
    pollGPS();
    pollPMS();
    if (readReg(REG_IRQ_FLAGS) & IRQ_TX_DONE) {
      writeReg(REG_IRQ_FLAGS, IRQ_TX_DONE);
      return true;
    }
    delay(1);
  }
  return false;
}

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(1500);

  Serial.println();
  Serial.println("==================================");
  Serial.println("        AQMS TRANSMITTER");
  Serial.println("==================================");

  analogReadResolution(12);
  analogSetPinAttenuation(MQ3_PIN, ADC_11db);

  PMSserial.setRxBufferSize(512);
  PMSserial.begin(9600, SERIAL_8N1, PMS_RX_PIN, PMS_TX_PIN);
  Serial.println("PMS7003 UART ready");

  GPSserial.setRxBufferSize(1024);
  GPSserial.begin(9600, SERIAL_8N1, GPS_RX_PIN, -1);
  Serial.println("GPS UART ready");

  dht.begin();
  Serial.println("DHT11 ready (GPIO 4)");

  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_NSS);
  pinMode(LORA_NSS, OUTPUT);
  digitalWrite(LORA_NSS, HIGH);

  bool ok = false;
  for (int attempt = 1; attempt <= 5 && !ok; attempt++) {
    ok = initRadio();
    if (!ok) {
      Serial.print("LoRa init failed, retry ");
      Serial.println(attempt);
      delay(500);
    }
  }

  if (!ok) {
    Serial.println("LoRa initialization FAILED - check wiring and 3.3V!");
    while (true) delay(1000);
  }

  Serial.print("Radio version register: 0x");
  Serial.println(readReg(0x42), HEX);
  Serial.println("LoRa ready: 433 MHz, SF9, BW125k, CR4/5, sync 0x12, CRC on");
  Serial.println("Starting AQMS (sensors need warm-up time)...");

  lastSend = millis() - SEND_INTERVAL + 3000;   // first packet after ~3 s
}

// ============================================================
// LOOP
// ============================================================
void loop() {
  pollPMS();
  pollGPS();
  pollDHT();

  if (millis() - lastSend < SEND_INTERVAL) return;
  lastSend = millis();
  packetCounter++;

  // ---------- PMS ----------
  bool pmsFresh = pmsEverOk && (millis() - pmsLastOk < PMS_STALE_MS);

  // ---------- DHT ----------
  bool dhtFresh = dhtEverOk && (millis() - dhtLastOk < DHT_STALE_MS);

  // ---------- MQ-3 (average 16 samples) ----------
  long rawSum = 0, mvSum = 0;
  for (int i = 0; i < 16; i++) {
    rawSum += analogRead(MQ3_PIN);
    mvSum  += analogReadMilliVolts(MQ3_PIN);
    delay(2);
  }
  int mq3RawHw = rawSum / 16;  // hardware raw count (reads 0 below ~100-150 mV)
  int mq3mV  = mvSum / 16;     // voltage at the ESP32 pin (after the divider)
  int mq3AOmV = mq3mV * 2;     // real MQ-3 AO voltage (10k/10k divider halves it)

  // 12-bit equivalent value (0-4095 = 0-3.3 V) from the CALIBRATED millivolts.
  // Used instead of the hardware raw count, which reads 0 at low voltages.
  int mq3Raw = (int)((mq3mV * 4095L) / 3300L);

  // ---------- GPS ----------
  bool gpsFix = gps.location.isValid() && gps.location.age() < GPS_STALE_MS;
  int sats = gps.satellites.isValid() ? (int)gps.satellites.value() : 0;

  // ---------- Build packet ----------
  String packet = "ID=" + String(packetCounter);
  packet += ",PM1=";     packet += pmsFresh ? String(pm1)  : "NA";
  packet += ",PM25=";    packet += pmsFresh ? String(pm25) : "NA";
  packet += ",PM10=";    packet += pmsFresh ? String(pm10) : "NA";
  packet += ",TEMP=";    packet += dhtFresh ? String(temperatureC, 1) : "NA";
  packet += ",HUM=";     packet += dhtFresh ? String(humidityPct, 0)  : "NA";
  packet += ",MQ3_RAW="; packet += String(mq3Raw);
  packet += ",MQ3_mV=";  packet += String(mq3mV);
  packet += ",MQ3_AO_mV="; packet += String(mq3AOmV);
  packet += ",SAT=";     packet += String(sats);
  packet += ",GPS=";
  if (gpsFix) {
    packet += String(gps.location.lat(), 6);
    packet += ",";
    packet += String(gps.location.lng(), 6);
  } else {
    packet += "NO_FIX";
  }

  // ---------- Local display ----------
  Serial.println();
  Serial.println("========== AQMS DATA ==========");
  Serial.print("Packet ID  : "); Serial.println(packetCounter);
  Serial.print("PM1.0      : "); Serial.println(pmsFresh ? String(pm1)  : "NA");
  Serial.print("PM2.5      : "); Serial.println(pmsFresh ? String(pm25) : "NA");
  Serial.print("PM10       : "); Serial.println(pmsFresh ? String(pm10) : "NA");
  Serial.print("Temperature: "); Serial.println(dhtFresh ? String(temperatureC, 1) + " C" : "NA");
  Serial.print("Humidity   : "); Serial.println(dhtFresh ? String(humidityPct, 0) + " %" : "NA");
  Serial.print("MQ-3 raw   : "); Serial.println(mq3Raw);
  Serial.print("MQ-3 pin   : "); Serial.print(mq3mV); Serial.println(" mV");
  Serial.print("MQ-3 AO    : "); Serial.print(mq3AOmV); Serial.println(" mV");
  Serial.print("Satellites : "); Serial.println(sats);
  if (gpsFix) {
    Serial.print("Latitude   : "); Serial.println(gps.location.lat(), 6);
    Serial.print("Longitude  : "); Serial.println(gps.location.lng(), 6);
  } else {
    Serial.println("GPS        : waiting for satellite fix");
  }
  Serial.print("Packet     : "); Serial.println(packet);

  // ---------- Transmit ----------
  if (sendPacket(packet)) {
    txFailStreak = 0;
    Serial.println("LoRa       : TX DONE");
  } else {
    txFailStreak++;
    Serial.print("LoRa       : TX FAILED (");
    Serial.print(txFailStreak);
    Serial.println(" in a row) - check 3.3V supply");

    if (txFailStreak >= 3) {
      Serial.println("Re-initialising radio...");
      if (initRadio()) {
        Serial.println("Radio re-initialised");
        txFailStreak = 0;
      }
    }
  }
  Serial.println("===============================");
}
