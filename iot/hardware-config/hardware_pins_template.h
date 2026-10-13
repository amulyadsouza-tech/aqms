/**
 * ============================================================================
 * ST. JOSEPH ENGINEERING COLLEGE (SJEC), VAMANJOOR, MANGALURU
 * Air Quality Monitoring System (AQMS) - Hardware Configuration Template
 * ============================================================================
 * 
 * IMPORTANT HARDWARE ENGINEERING NOTICE:
 * This template defines the hardware interfaces for the prototype mounted on
 * the perforated PCB. DO NOT invent or assume pin connections without verifying
 * against your physical soldered traces on the board!
 * 
 * Copy this file to "hardware_pins.h" before compiling your firmware.
 */

#ifndef HARDWARE_PINS_TEMPLATE_H
#define HARDWARE_PINS_TEMPLATE_H

// ============================================================================
// 1. ESP32 MICROCONTROLLER PINOUT DEFINITION
// ============================================================================
// Confirmed Board: ESP32 NodeMCU-32S (30-pin development board, CP2102 USB)

// Onboard Status LED
#define PIN_STATUS_LED          2       // Built-in blue LED on NodeMCU-32S

// ============================================================================
// 2. PMS PARTICULATE MATTER SENSOR (PMS5003 / PMS7003 / PMSA003)
// ============================================================================
// Interface: Dedicated Hardware UART2
// Note: PMS sensors output 3.3V logic (safe for ESP32 GPIO)
#define PMS_RX_PIN              16      // Connects to PMS TX pin
#define PMS_TX_PIN              17      // Connects to PMS RX pin (optional if only reading)
#define PMS_SET_PIN             -1      // Set pin (optional sleep control, -1 if tied to VCC)
#define PMS_RESET_PIN           -1      // Reset pin (optional, -1 if tied to VCC)

// ============================================================================
// 3. MQ-3 GAS SENSOR (ALCOHOL / HYDROCARBON MOX ANALOG DETECTOR)
// ============================================================================
// Interface: ESP32 ADC1 (Pins 32-39). DO NOT use ADC2 pins while Wi-Fi is active!
// Note: ESP32 ADC is 12-bit (0 to 4095 counts). Input voltage MUST be 0 - 3.3V max!
// Use a 5V -> 3.3V resistor voltage divider if your MQ-3 breakout outputs 5V analog!
#define MQ3_ANALOG_PIN          34      // ADC1_CH6 (Input-only pin, no internal pullup)

// MQ-3 Calibration Defaults (Set to 0/false until calibrated in gas test chamber)
#define MQ3_CALIBRATED          false   // Keep FALSE: Raw ADC count will be transmitted
#define MQ3_RL_VALUE            10.0    // Load resistance on board in kOhms
#define MQ3_RO_CLEAN_AIR        10.0    // Sensor resistance in clean air (to be calibrated)

// ============================================================================
// 4. TEMPERATURE & HUMIDITY SENSOR
// ============================================================================
// Configurable Driver: DHT22 (AM2302) or SHT31 (I2C) or BME280 (I2C)
#define TEMP_SENSOR_TYPE_DHT22  1
#define TEMP_SENSOR_TYPE_I2C    2
#define ACTIVE_TEMP_SENSOR_TYPE TEMP_SENSOR_TYPE_DHT22

#if (ACTIVE_TEMP_SENSOR_TYPE == TEMP_SENSOR_TYPE_DHT22)
  #define DHT_PIN               4       // GPIO4 for DHT22 1-Wire bus
  #define DHT_TYPE              DHT22   // DHT11 or DHT22
#else
  // I2C Bus Pins (SHT31 / BME280)
  #define I2C_SDA_PIN           21
  #define I2C_SCL_PIN           22
#endif

// ============================================================================
// 5. GPS RECEIVER MODULE (NEO-6M / COMPATIBLE NMEA)
// ============================================================================
// Interface: SoftwareSerial or Serial1
#define GPS_RX_PIN              18      // ESP32 RX <- GPS TX pin
#define GPS_TX_PIN              19      // ESP32 TX -> GPS RX pin
#define GPS_BAUD_RATE           9600    // Standard NMEA 0183 baud rate

// ============================================================================
// 6. UNCONFIRMED RADIO TRANSCEIVER MODULE (WITH EXTERNAL ANTENNA)
// ============================================================================
// IMPORTANT: The radio module model on the perforated PCB is not yet identified!
// Inspect the metal shield / markings before enabling any of the definitions below!
//
// Candidate Transceiver Profiles:
// - SX1278 (Ai-Thinker Ra-02, 433 MHz LoRa)
// - SX1276 (Ra-01H, 868 / 915 MHz LoRa)
// - NRF24L01+ (2.4 GHz GFSK Transceiver)
// - HC-12 (433 MHz Serial Transceiver)

#define RADIO_TYPE_UNCONFIRMED  0
#define RADIO_TYPE_LORA_SX1278  1
#define RADIO_TYPE_LORA_SX1276  2
#define RADIO_TYPE_NRF24        3

// Currently set to UNCONFIRMED. Wi-Fi ingestion is used by default.
#define ACTIVE_RADIO_MODULE     RADIO_TYPE_UNCONFIRMED

#if (ACTIVE_RADIO_MODULE == RADIO_TYPE_LORA_SX1278 || ACTIVE_RADIO_MODULE == RADIO_TYPE_LORA_SX1276)
  // Standard SPI Bus Pins for LoRa transceiver
  #define LORA_SCK_PIN          18
  #define LORA_MISO_PIN         19
  #define LORA_MOSI_PIN         23
  #define LORA_SS_PIN           5       // Chip Select (NSS)
  #define LORA_RST_PIN          14      // Reset (RST)
  #define LORA_DIO0_PIN         26      // Interrupt (DIO0)
  
  // Carrier Frequency: In India, license-free LoRa bands are 865-867 MHz or 433 MHz
  #define LORA_FREQUENCY_HZ     433E6   // Verify against antenna length & module crystal!
#endif

#endif // HARDWARE_PINS_TEMPLATE_H
