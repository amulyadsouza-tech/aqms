/**
 * AQMS LoRa Ground Station USB-to-WebSocket Bridge
 * St. Joseph Engineering College, Vamanjoor, Mangaluru
 *
 * Reads Serial output from the ESP32 SX1278 Ground Station receiver
 * and streams parsed JSON packets to the WebSocket relay server.
 *
 * Usage:
 *   node scripts/ground-bridge.js [COM_PORT] [WS_URL]
 * Examples:
 *   node scripts/ground-bridge.js COM3 ws://localhost:8080
 *   node scripts/ground-bridge.js COM4 wss://your-relay.onrender.com
 *   node scripts/ground-bridge.js --simulate
 */

import { WebSocket } from 'ws';
import readline from 'readline';

// Command line parameters
const args = process.argv.slice(2);
const isSimulate = args.includes('--simulate');
const portArg = args.find((a) => !a.startsWith('--') && !a.startsWith('ws://') && !a.startsWith('wss://'));
const wsUrlArg = args.find((a) => a.startsWith('ws://') || a.startsWith('wss://'));

const WS_URL = wsUrlArg || process.env.WS_RELAY_URL || 'ws://localhost:8080';
const DEFAULT_BAUD = 115200;
const DEVICE_ID = process.env.AQMS_DEVICE_ID || 'AQMS-SJEC-01';

console.log('====================================================');
console.log('   SJEC AQMS Ground Station Serial-to-WebSocket');
console.log('====================================================');
console.log(`Target WebSocket Relay: ${WS_URL}`);

let wsClient = null;
let isWsConnected = false;
let retryTimer = null;

function connectWebSocket() {
  if (retryTimer) clearTimeout(retryTimer);

  console.log(`[Bridge] Connecting to WebSocket relay at ${WS_URL}...`);
  wsClient = new WebSocket(WS_URL);

  wsClient.on('open', () => {
    isWsConnected = true;
    console.log('✅ [Bridge] Connected to WebSocket relay server!');
  });

  wsClient.on('close', () => {
    isWsConnected = false;
    console.warn('⚠️ [Bridge] Disconnected from WebSocket relay. Retrying in 3 seconds...');
    retryTimer = setTimeout(connectWebSocket, 3000);
  });

  wsClient.on('error', (err) => {
    isWsConnected = false;
    console.error('❌ [Bridge] WebSocket connection error:', err.message);
  });
}

connectWebSocket();

/**
 * Parses numeric value or returns null if NA/invalid
 */
function parseNum(val) {
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  if (str === 'NA' || str === '?' || str === 'NO_FIX' || str === '') return null;
  const num = parseFloat(str);
  return Number.isFinite(num) ? num : null;
}

/**
 * Parses single CSV line from ESP32 Ground Station:
 * Format: CSV,ID,PM1,PM25,PM10,TEMP,HUM,MQ3_RAW,MQ3_mV,MQ3_AO_mV,SAT,LAT,LON,RSSI,SNR
 */
function parseCsvLine(line) {
  if (!line || !line.startsWith('CSV,')) return null;

  const parts = line.split(',').map((p) => p.trim());
  if (parts.length < 15) return null;

  const [
    _prefix,
    packetId,
    p1,
    p25,
    p10,
    temp,
    hum,
    mqRaw,
    mqmV,
    mqAO,
    sat,
    latStr,
    lonStr,
    rssi,
    snr,
  ] = parts;

  const isGpsFix =
    latStr &&
    lonStr &&
    latStr !== 'NO_FIX' &&
    lonStr !== 'NO_FIX' &&
    latStr !== '?' &&
    lonStr !== '?';

  const lat = isGpsFix ? parseNum(latStr) : null;
  const lon = isGpsFix ? parseNum(lonStr) : null;

  return {
    deviceId: DEVICE_ID,
    timestamp: Date.now(),
    firmwareVersion: '1.0.0',
    packetId: parseNum(packetId),
    sensors: {
      pm1_0: parseNum(p1),
      pm2_5: parseNum(p25),
      pm10: parseNum(p10),
      mq3_raw: parseNum(mqRaw),
      mq3_ao_mv: parseNum(mqAO),
      mq3_mv: parseNum(mqmV),
      temperature_c: parseNum(temp),
      humidity_percent: parseNum(hum),
    },
    gps: {
      latitude: lat,
      longitude: lon,
      valid: Boolean(isGpsFix && lat !== null && lon !== null),
      satellites: parseNum(sat) || 0,
    },
    connectivity: {
      transport: 'lora_gateway',
      rssi_dbm: parseNum(rssi),
      snr_db: parseNum(snr),
      gatewayId: 'SJEC-GROUND-RX',
    },
  };
}

/**
 * Broadcasts reading to the WebSocket relay
 */
function forwardReading(reading) {
  if (!reading) return;

  const s = reading.sensors;
  const c = reading.connectivity;
  const g = reading.gps;

  console.log(
    `📡 [LoRa Packet #${reading.packetId}] PM2.5: ${s.pm2_5 ?? 'NA'} µg/m³ | PM10: ${s.pm10 ?? 'NA'} µg/m³ | Temp: ${s.temperature_c ?? 'NA'}°C | Hum: ${s.humidity_percent ?? 'NA'}% | MQ3: ${s.mq3_raw ?? 'NA'} | GPS: ${g.valid ? `${g.latitude?.toFixed(4)},${g.longitude?.toFixed(4)}` : 'No Fix'} | RSSI: ${c.rssi_dbm} dBm, SNR: ${c.snr_db} dB`
  );

  if (isWsConnected && wsClient && wsClient.readyState === WebSocket.OPEN) {
    try {
      wsClient.send(JSON.stringify(reading));
      console.log('   ↳ Forwarded to WebSocket Relay server successfully.');
    } catch (err) {
      console.error('   ↳ Failed to forward to WebSocket:', err.message);
    }
  } else {
    console.warn('   ↳ [Hold] WebSocket not connected yet; reading skipped.');
  }
}

// -------------------------------------------------------------
// Execution Mode: Simulation vs Serial Port
// -------------------------------------------------------------
if (isSimulate) {
  console.log('⚡ SIMULATION MODE ACTIVATED');
  console.log('   Generating mock LoRa packets every 5 seconds for dashboard verification...\n');

  let simId = 100;
  setInterval(() => {
    simId++;
    const mockCsv = `CSV,${simId},${(12 + Math.random() * 4).toFixed(1)},${(24 + Math.random() * 6).toFixed(1)},${(42 + Math.random() * 8).toFixed(1)},${(28.5 + Math.random() * 1.5).toFixed(1)},${Math.round(62 + Math.random() * 5)},${Math.round(1300 + Math.random() * 80)},950,1900,8,12.914100,74.856000,-72,8.5`;
    const reading = parseCsvLine(mockCsv);
    forwardReading(reading);
  }, 5000);
} else {
  // Serial Port Mode
  async function startSerial() {
    let SerialPort;
    let ReadlineParser;
    try {
      const serialPkg = await import('serialport');
      SerialPort = serialPkg.SerialPort;
      const parserPkg = await import('@serialport/parser-readline');
      ReadlineParser = parserPkg.ReadlineParser;
    } catch (err) {
      console.error('\n⚠️ SerialPort library not installed in this environment.');
      console.log('To install, run: cd scripts && npm install');
      console.log('Or you can run simulation mode with: node scripts/ground-bridge.js --simulate\n');
      console.log('Alternatively, you can pipe raw serial input into this script via stdin:');
      console.log('Example: type COM3 | node scripts/ground-bridge.js\n');

      // Listen on stdin as fallback
      const rl = readline.createInterface({ input: process.stdin });
      rl.on('line', (line) => {
        const reading = parseCsvLine(line.trim());
        if (reading) forwardReading(reading);
      });
      return;
    }

    let targetPort = portArg;

    if (!targetPort) {
      console.log('Scanning available COM ports...');
      try {
        const ports = await SerialPort.list();
        if (ports.length === 0) {
          console.warn('⚠️ No USB COM ports detected. Connect your ESP32 Ground Station and retry.');
          console.log('Tip: You can test with simulated data using: node scripts/ground-bridge.js --simulate\n');
          return;
        }

        console.log('Found available ports:');
        ports.forEach((p) => {
          console.log(`  - ${p.path} (${p.manufacturer || 'Standard Serial'})`);
        });

        // Pick Silicon Labs / CH340 / CP210x or first port
        const espMatch = ports.find(
          (p) =>
            (p.manufacturer && /silicon|ch340|cp210|wch/i.test(p.manufacturer)) ||
            (p.friendlyName && /usb/i.test(p.friendlyName))
        );
        targetPort = espMatch ? espMatch.path : ports[0].path;
        console.log(`Auto-selected port: ${targetPort}`);
      } catch (e) {
        targetPort = 'COM3';
      }
    }

    console.log(`Opening serial port ${targetPort} at ${DEFAULT_BAUD} baud...`);
    const port = new SerialPort({
      path: targetPort,
      baudRate: DEFAULT_BAUD,
      autoOpen: false,
    });

    const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    function openPort() {
      port.open((err) => {
        if (err) {
          console.error(`❌ Error opening port ${targetPort}:`, err.message);
          console.log('👉 Please CLOSE the Serial Monitor in Arduino IDE (port is locked). Retrying in 2 seconds...');
          setTimeout(openPort, 2000);
          return;
        }
        console.log(`✅ Serial port ${targetPort} opened successfully. Listening for LoRa packets...\n`);
      });
    }

    openPort();

    parser.on('data', (line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('CSV,')) {
        const reading = parseCsvLine(trimmed);
        if (reading) forwardReading(reading);
      } else if (trimmed.includes('PACKET RECEIVED') || trimmed.includes('AQMS RECEIVER')) {
        console.log(`[ESP32] ${trimmed}`);
      }
    });

    port.on('error', (err) => {
      console.error('❌ Serial port error:', err.message);
    });

    port.on('close', () => {
      console.warn('⚠️ Serial port closed.');
    });
  }

  startSerial();
}
