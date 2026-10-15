/**
 * Core type definitions for SJEC AQMS Platform
 * St. Joseph Engineering College, Vamanjoor, Mangaluru
 */

export type TransportType = 'wifi' | 'lora_gateway' | 'cellular' | 'other' | 'unconfigured';

export interface SensorReadings {
  pm1_0: number | null;
  pm2_5: number | null;
  pm10: number | null;
  mq3_raw: number | null;
  mq3_ppm?: number | null; // Only calculated if verified calibration is active
  temperature_c: number | null;
  humidity_percent: number | null;
}

export interface GpsData {
  latitude: number | null;
  longitude: number | null;
  valid: boolean;
  altitude_m?: number | null;
  satellites?: number | null;
}

export interface ConnectivityData {
  transport: TransportType;
  rssi_dbm: number | null;
  snr_db: number | null;
  gatewayId?: string | null;
}

export interface DevicePayload {
  deviceId: string;
  timestamp: number; // Device hardware epoch ms (or 0 if no RTC/NTP)
  firmwareVersion: string;
  sensors: SensorReadings;
  gps: GpsData;
  connectivity: ConnectivityData;
}

export interface IngestedReading extends DevicePayload {
  id?: string;
  serverReceivedAt: number; // Server-side epoch ms
  source?: 'hardware' | 'manual' | 'websocket' | string;
  recordedBy?: string; // Authenticated admin email if source === 'manual'
}

export type SensorCardStatus = 
  | 'live' 
  | 'stale' 
  | 'waiting' 
  | 'unavailable' 
  | 'offline' 
  | 'invalid';

export type AQICategory = 
  | 'Good' 
  | 'Satisfactory' 
  | 'Moderate' 
  | 'Poor' 
  | 'Very Poor' 
  | 'Severe' 
  | 'Unavailable';

export interface AQISubIndex {
  pollutant: 'PM2.5' | 'PM10';
  concentration: number;
  subIndex: number;
}

export interface AQICalculationResult {
  aqi: number | null;
  category: AQICategory;
  colorHex: string;
  dominantPollutant: string | null;
  subIndices: AQISubIndex[];
  calculatedAt: number;
  isValid: boolean;
  explanation: string;
}

export interface DeviceMetadata {
  deviceId: string;
  name: string;
  locationName: string;
  esp32Model: string;
  radioModel: string; // Keep as "Not configured / Unknown" until physically verified
  radioFrequencyMhz?: string;
  interfaceBus?: string; // UART / SPI
  pinMapping?: Record<string, string>;
  transport: TransportType;
  expectedIntervalSeconds: number;
  offlineTimeoutSeconds: number;
  firmwareVersion: string;
  enabled: boolean;
  apiKeyHash?: string; // Hashed token for device auth
  createdAt: number;
  updatedAt: number;

  // Dynamic connection fields (non-secret only)
  ipAddress?: string;
  wsUrl?: string;
  ingestionUrl?: string;
  ingestionRootCa?: string;
  port?: number | string;
  path?: string;
  wifiSsid?: string; // Non-secret SSID (passwords are NEVER stored here)

  // Hardware LoRa parameters
  loraFrequencyMhz?: string;
  loraSpreadingFactor?: number | string;
  loraBandwidthKhz?: number | string;
  loraCodingRate?: string;
  loraSyncWord?: string;
}

export interface ManualReadingInput {
  deviceId: string;
  pm1_0?: number | null;
  pm2_5?: number | null;
  pm10?: number | null;
  mq3_raw?: number | null;
  temperature_c?: number | null;
  humidity_percent?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string;
}

export interface DeviceLiveStatus {
  deviceId: string;
  isOnline: boolean;
  lastSeenTimestamp: number;
  lastValidPacketTimestamp: number;
  activeTransport: TransportType;
  firmwareVersion: string;
  lastError?: string | null;
  packetCountTotal?: number;
}

export interface SensorConfigItem {
  id: keyof SensorReadings | 'gps' | 'radio';
  name: string;
  hardwareModel: string;
  enabled: boolean;
  unit: string;
  precision: number;
  minValid: number;
  maxValid: number;
  warningLow?: number;
  warningHigh?: number;
  hasCalibration: boolean;
  calibrationModel?: string; // e.g. "Linear y=a*x+b"
  calibrationA?: number;
  calibrationB?: number;
  rZero?: number;
}

export interface BrandingConfig {
  institutionName: string;
  title: string;
  subtitle: string;
  location: string;
  logoUrl: string | null;
  isCustomLogo: boolean;
  lastUpdated: number;
}

export interface AQIConfig {
  standard: 'CPCB_INDIA';
  requireBothPM: boolean; // CPCB requires at least 3 pollutants with 1 being PM2.5 or PM10 for 24h, for instant real-time sub-indices: require PM2.5 or PM10
  minValidHours: number;
  staleThresholdMinutes: number;
}

export interface SystemSettings {
  defaultReportingIntervalSeconds: number;
  deviceOfflineTimeoutSeconds: number;
  staleDataThresholdSeconds: number;
  demoMode: boolean;
  themeDefault: 'light' | 'dark' | 'system';
  dataRetentionDays: number;
}
