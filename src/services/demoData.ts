/**
 * Demo Data Provider
 * Explicitly isolated and labelled for testing, UI evaluation, and development.
 * NEVER mixed with real Firebase telemetry.
 */

import { DeviceMetadata, IngestedReading, SensorConfigItem } from '../types';

// Approximate coordinates for St. Joseph Engineering College, Vamanjoor campus
export const DEMO_SJEC_GPS = {
  latitude: 12.9126,
  longitude: 74.9038,
  valid: true,
  altitude_m: 85,
  satellites: 8,
};

export const DEMO_DEVICE_METADATA: DeviceMetadata = {
  deviceId: 'SJEC-AQMS-ESP32-DEMO',
  name: 'SJEC Vamanjoor Station (Prototype Demo)',
  locationName: 'Mechanical Eng. Block, SJEC Campus, Vamanjoor',
  esp32Model: 'ESP32 NodeMCU V1 (30-pin, CP2102)',
  radioModel: 'Unverified Module (Physical hardware inspection required)',
  radioFrequencyMhz: 'Not configured',
  interfaceBus: 'Not configured',
  transport: 'wifi',
  expectedIntervalSeconds: 30,
  offlineTimeoutSeconds: 120,
  firmwareVersion: 'v0.1.0-demo',
  enabled: true,
  createdAt: Date.now() - 86400000 * 7,
  updatedAt: Date.now() - 3600000,
};

export const DEFAULT_SENSOR_CONFIGS: SensorConfigItem[] = [
  {
    id: 'pm1_0',
    name: 'Particulate Matter PM1.0',
    hardwareModel: 'PMS5003 / PMS7003 Laser Particle Counter',
    enabled: true,
    unit: 'µg/m³',
    precision: 1,
    minValid: 0,
    maxValid: 1000,
    warningHigh: 50,
    hasCalibration: false,
  },
  {
    id: 'pm2_5',
    name: 'Fine Particulates PM2.5',
    hardwareModel: 'PMS5003 / PMS7003 Laser Particle Counter',
    enabled: true,
    unit: 'µg/m³',
    precision: 1,
    minValid: 0,
    maxValid: 1000,
    warningHigh: 60,
    hasCalibration: false,
  },
  {
    id: 'pm10',
    name: 'Coarse Particulates PM10',
    hardwareModel: 'PMS5003 / PMS7003 Laser Particle Counter',
    enabled: true,
    unit: 'µg/m³',
    precision: 1,
    minValid: 0,
    maxValid: 1500,
    warningHigh: 100,
    hasCalibration: false,
  },
  {
    id: 'mq3_raw',
    name: 'MQ-3 Gas Sensor (Raw ADC)',
    hardwareModel: 'MQ-3 Alcohol/Gas Analog Sensor (Perforated PCB mounted)',
    enabled: true,
    unit: 'raw ADC (0-4095)',
    precision: 0,
    minValid: 0,
    maxValid: 4095,
    warningHigh: 1500,
    hasCalibration: false, // Explicitly false until verified against gas chamber
    calibrationModel: 'Uncalibrated (Displays Raw ADC only)',
  },
  {
    id: 'temperature_c',
    name: 'Ambient Temperature',
    hardwareModel: 'Digital Temp/Humidity Sensor (Configurable DHT22/SHT31/BME280)',
    enabled: true,
    unit: '°C',
    precision: 1,
    minValid: -10,
    maxValid: 60,
    warningHigh: 40,
    hasCalibration: false,
  },
  {
    id: 'humidity_percent',
    name: 'Relative Humidity',
    hardwareModel: 'Digital Temp/Humidity Sensor (Configurable DHT22/SHT31/BME280)',
    enabled: true,
    unit: '%',
    precision: 1,
    minValid: 0,
    maxValid: 100,
    warningHigh: 85,
    hasCalibration: false,
  },
  {
    id: 'gps',
    name: 'GPS Receiver Module',
    hardwareModel: 'NEO-6M / Compatible NMEA GPS Module',
    enabled: true,
    unit: 'deg',
    precision: 4,
    minValid: -90,
    maxValid: 180,
    hasCalibration: false,
  },
  {
    id: 'radio',
    name: 'Wireless Transceiver Module',
    hardwareModel: 'Unconfirmed Model (Separate Radio with External Antenna)',
    enabled: true,
    unit: 'dBm',
    precision: 0,
    minValid: -140,
    maxValid: 20,
    hasCalibration: false,
  },
];

export function generateDemoReading(now: number = Date.now()): IngestedReading {
  // Realistic Mangaluru tropical ambient readings
  return {
    deviceId: 'SJEC-AQMS-ESP32-DEMO',
    timestamp: now - 3200, // Measured 3.2s ago
    serverReceivedAt: now - 1500,
    firmwareVersion: '0.1.0-demo',
    sensors: {
      pm1_0: 18.4,
      pm2_5: 38.6, // Satisfactory Indian AQI bracket
      pm10: 72.3,
      mq3_raw: 342, // Raw 12-bit ADC count
      mq3_ppm: null, // Strictly null: no fake ppm!
      temperature_c: 29.8,
      humidity_percent: 74.2,
    },
    gps: DEMO_SJEC_GPS,
    connectivity: {
      transport: 'wifi',
      rssi_dbm: -64,
      snr_db: null,
    },
  };
}

export function generateDemoHistoricalData(hours: number = 24): IngestedReading[] {
  const readings: IngestedReading[] = [];
  const now = Date.now();
  const intervalMs = Math.max(60000, Math.floor((hours * 3600000) / 48)); // 48 points across interval

  for (let t = now - hours * 3600000; t <= now; t += intervalMs) {
    const hourOfDay = new Date(t).getHours();
    // Diurnal variation
    const tempVariation = Math.sin(((hourOfDay - 6) / 24) * 2 * Math.PI) * 4;
    const humidityVariation = -Math.sin(((hourOfDay - 6) / 24) * 2 * Math.PI) * 12;
    const trafficFactor = (hourOfDay >= 8 && hourOfDay <= 10) || (hourOfDay >= 17 && hourOfDay <= 19) ? 1.5 : 1.0;

    readings.push({
      deviceId: 'SJEC-AQMS-ESP32-DEMO',
      timestamp: t,
      serverReceivedAt: t + 1200,
      firmwareVersion: '0.1.0-demo',
      sensors: {
        pm1_0: Math.round((14 + Math.random() * 8) * trafficFactor * 10) / 10,
        pm2_5: Math.round((28 + Math.random() * 16) * trafficFactor * 10) / 10,
        pm10: Math.round((55 + Math.random() * 25) * trafficFactor * 10) / 10,
        mq3_raw: Math.round(300 + Math.random() * 60 + (trafficFactor > 1 ? 40 : 0)),
        mq3_ppm: null,
        temperature_c: Math.round((27.5 + tempVariation + Math.random() * 0.8) * 10) / 10,
        humidity_percent: Math.round((76 + humidityVariation + Math.random() * 2) * 10) / 10,
      },
      gps: DEMO_SJEC_GPS,
      connectivity: {
        transport: 'wifi',
        rssi_dbm: Math.round(-68 + Math.random() * 8),
        snr_db: null,
      },
    });
  }

  return readings;
}
