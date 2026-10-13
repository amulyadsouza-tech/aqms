/**
 * Indian Central Pollution Control Board (CPCB) National Air Quality Index (NAQI)
 * Calculation Engine.
 * 
 * Complies with CPCB Technical Guidelines:
 * - Sub-indices calculated via linear interpolation on official breakpoints.
 * - Overall AQI is the maximum of the calculated sub-indices (Dominant Pollutant).
 * - Requires at least one validated criteria particulate (PM2.5 or PM10).
 * - Explicitly rejects calculating AQI from PM1.0 alone, or using MQ-3/Temp/Humidity as substitutes.
 */

import { AQICalculationResult, AQICategory, AQISubIndex, SensorReadings } from '../types';

interface Breakpoint {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
}

// CPCB 24-hr Breakpoints for PM2.5 (µg/m³)
const PM25_BREAKPOINTS: Breakpoint[] = [
  { cLow: 0,   cHigh: 30,  iLow: 0,   iHigh: 50 },   // Good
  { cLow: 31,  cHigh: 60,  iLow: 51,  iHigh: 100 },  // Satisfactory
  { cLow: 61,  cHigh: 90,  iLow: 101, iHigh: 200 },  // Moderate
  { cLow: 91,  cHigh: 120, iLow: 201, iHigh: 300 },  // Poor
  { cLow: 121, cHigh: 250, iLow: 301, iHigh: 400 },  // Very Poor
  { cLow: 251, cHigh: 500, iLow: 401, iHigh: 500 },  // Severe
];

// CPCB 24-hr Breakpoints for PM10 (µg/m³)
const PM10_BREAKPOINTS: Breakpoint[] = [
  { cLow: 0,   cHigh: 50,  iLow: 0,   iHigh: 50 },   // Good
  { cLow: 51,  cHigh: 100, iLow: 51,  iHigh: 100 },  // Satisfactory
  { cLow: 101, cHigh: 250, iLow: 101, iHigh: 200 },  // Moderate
  { cLow: 251, cHigh: 350, iLow: 201, iHigh: 300 },  // Poor
  { cLow: 351, cHigh: 430, iLow: 301, iHigh: 400 },  // Very Poor
  { cLow: 431, cHigh: 600, iLow: 401, iHigh: 500 },  // Severe
];

/**
 * Calculates linear sub-index for a single pollutant concentration against its breakpoints.
 */
function calculateSubIndex(concentration: number, breakpoints: Breakpoint[]): number | null {
  if (concentration < 0 || isNaN(concentration)) return null;

  for (const bp of breakpoints) {
    if (concentration >= bp.cLow && concentration <= bp.cHigh) {
      const sub = ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (concentration - bp.cLow) + bp.iLow;
      return Math.round(sub);
    }
  }

  // Value exceeds highest bracket
  if (concentration > breakpoints[breakpoints.length - 1].cHigh) {
    return 500;
  }

  return null;
}

/**
 * Assigns official CPCB AQI Category and standardized color styling.
 */
export function getAQICategory(aqi: number): { category: AQICategory; colorHex: string; description: string } {
  if (aqi <= 50) {
    return { category: 'Good', colorHex: '#16a34a', description: 'Minimal impact' };
  } else if (aqi <= 100) {
    return { category: 'Satisfactory', colorHex: '#65a30d', description: 'Minor breathing discomfort to sensitive people' };
  } else if (aqi <= 200) {
    return { category: 'Moderate', colorHex: '#d97706', description: 'Breathing discomfort to people with lungs, asthma, and heart diseases' };
  } else if (aqi <= 300) {
    return { category: 'Poor', colorHex: '#ea580c', description: 'Breathing discomfort to most people on prolonged exposure' };
  } else if (aqi <= 400) {
    return { category: 'Very Poor', colorHex: '#dc2626', description: 'Respiratory illness on prolonged exposure' };
  } else {
    return { category: 'Severe', colorHex: '#991b1b', description: 'Affects healthy people and seriously impacts those with existing diseases' };
  }
}

/**
 * Calculate Indian CPCB NAQI from available sensor readings.
 * 
 * Rules:
 * 1. Must have valid PM2.5 or PM10 (or both).
 * 2. If neither is valid, AQI is UNAVAILABLE.
 * 3. Never calculates AQI from PM1.0, MQ-3, temperature, or humidity.
 */
export function calculateCPCB_AQI(
  sensors: SensorReadings | null | undefined,
  isDataStale: boolean = false
): AQICalculationResult {
  const now = Date.now();

  if (!sensors || isDataStale) {
    return {
      aqi: null,
      category: 'Unavailable',
      colorHex: '#94a3b8',
      dominantPollutant: null,
      subIndices: [],
      calculatedAt: now,
      isValid: false,
      explanation: isDataStale 
        ? 'AQI unavailable — sensor data is stale (exceeds freshness window).'
        : 'AQI unavailable — no sensor telemetry received.',
    };
  }

  const subIndices: AQISubIndex[] = [];

  // Check PM2.5
  if (sensors.pm2_5 !== null && sensors.pm2_5 !== undefined && sensors.pm2_5 >= 0 && sensors.pm2_5 <= 1000) {
    const sub = calculateSubIndex(sensors.pm2_5, PM25_BREAKPOINTS);
    if (sub !== null) {
      subIndices.push({
        pollutant: 'PM2.5',
        concentration: sensors.pm2_5,
        subIndex: sub,
      });
    }
  }

  // Check PM10
  if (sensors.pm10 !== null && sensors.pm10 !== undefined && sensors.pm10 >= 0 && sensors.pm10 <= 1500) {
    const sub = calculateSubIndex(sensors.pm10, PM10_BREAKPOINTS);
    if (sub !== null) {
      subIndices.push({
        pollutant: 'PM10',
        concentration: sensors.pm10,
        subIndex: sub,
      });
    }
  }

  // If no criteria particulate sub-index could be computed:
  if (subIndices.length === 0) {
    let reason = 'AQI unavailable — insufficient valid data. CPCB requires valid PM2.5 or PM10 readings.';
    if (sensors.pm1_0 !== null && sensors.pm1_0 !== undefined) {
      reason += ' Note: PM1.0 is not a recognized standalone CPCB criteria pollutant.';
    }
    if (sensors.mq3_raw !== null && sensors.mq3_raw !== undefined) {
      reason += ' Gas sensor (MQ-3) and meteorological readings cannot substitute for particulate criteria.';
    }

    return {
      aqi: null,
      category: 'Unavailable',
      colorHex: '#94a3b8',
      dominantPollutant: null,
      subIndices: [],
      calculatedAt: now,
      isValid: false,
      explanation: reason,
    };
  }

  // Overall AQI = Max of available sub-indices
  let maxSubIndex = subIndices[0];
  for (const s of subIndices) {
    if (s.subIndex > maxSubIndex.subIndex) {
      maxSubIndex = s;
    }
  }

  const categoryInfo = getAQICategory(maxSubIndex.subIndex);

  return {
    aqi: maxSubIndex.subIndex,
    category: categoryInfo.category,
    colorHex: categoryInfo.colorHex,
    dominantPollutant: maxSubIndex.pollutant,
    subIndices,
    calculatedAt: now,
    isValid: true,
    explanation: `${categoryInfo.category} air quality. Dominant pollutant: ${maxSubIndex.pollutant} (${maxSubIndex.concentration} µg/m³). ${categoryInfo.description}.`,
  };
}
