/**
 * Device Connection & Telemetry Orchestrator
 * St. Joseph Engineering College, Vamanjoor, Mangaluru
 * Handles dynamic WebSocket connectivity, testing, secure Wi-Fi provisioning,
 * and routing live telemetry packets to listeners and Firebase.
 */

import { IngestedReading } from '../types';
import { connectAQMSWebSocket, AQMSWebSocketHandle } from './aqmsWebSocket';
import { saveIncomingReading, validateAndParseSensorMessage } from './firebase';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ConnectionState {
  status: ConnectionStatus;
  url: string | null;
  error: string | null;
  packetsReceived: number;
  lastPacketTimestamp: number | null;
  latestReading: IngestedReading | null;
}

type StatusListener = (status: ConnectionStatus, error: string | null) => void;
type ReadingListener = (reading: IngestedReading) => void;

class DeviceConnectionManager {
  private activeHandle: AQMSWebSocketHandle | null = null;
  private currentUrl: string | null = null;
  private currentDeviceId: string | null = null;
  private reportingIntervalSeconds: number = 30;
  private status: ConnectionStatus = 'disconnected';
  private lastError: string | null = null;
  private packetCount: number = 0;
  private lastPacketTime: number | null = null;
  private latestReading: IngestedReading | null = null;

  private statusListeners: Set<StatusListener> = new Set();
  private readingListeners: Set<ReadingListener> = new Set();

  /**
   * Get current connection snapshot
   */
  getState(): ConnectionState {
    return {
      status: this.status,
      url: this.currentUrl,
      error: this.lastError,
      packetsReceived: this.packetCount,
      lastPacketTimestamp: this.lastPacketTime,
      latestReading: this.latestReading,
    };
  }

  /**
   * Subscribe to connection status updates
   */
  subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status, this.lastError);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /**
   * Subscribe to incoming parsed readings
   */
  subscribeReading(listener: ReadingListener): () => void {
    this.readingListeners.add(listener);
    if (this.latestReading) {
      listener(this.latestReading);
    }
    return () => {
      this.readingListeners.delete(listener);
    };
  }

  private setStatus(status: ConnectionStatus, error: string | null = null) {
    this.status = status;
    this.lastError = error;
    this.statusListeners.forEach((fn) => fn(status, error));
  }

  /**
   * Connect to an ESP32 or Gateway WebSocket server dynamically
   */
  connect({
    url,
    deviceId,
    reportingIntervalSeconds = 30,
  }: {
    url: string;
    deviceId?: string;
    reportingIntervalSeconds?: number;
  }) {
    if (!url || typeof url !== 'string' || !url.trim()) {
      this.setStatus('error', 'Please provide a valid WebSocket URL.');
      return;
    }

    const cleanUrl = url.trim();

    // Disconnect any existing session first
    if (this.activeHandle) {
      this.activeHandle.disconnect();
      this.activeHandle = null;
    }

    this.currentUrl = cleanUrl;
    this.currentDeviceId = deviceId?.trim() || null;
    this.reportingIntervalSeconds = reportingIntervalSeconds;
    this.setStatus('connecting');

    try {
      this.activeHandle = connectAQMSWebSocket({
        url: cleanUrl,
        onStatus: (wsStatus) => {
          if (wsStatus === 'connected') {
            this.setStatus('connected', null);
          } else if (wsStatus === 'connecting') {
            this.setStatus('connecting', null);
          } else {
            this.setStatus('disconnected', null);
          }
        },
        onError: (err) => {
          const errMsg = err?.message || 'WebSocket connection error';
          this.setStatus('error', errMsg);
        },
        onReading: (rawMessage) => {
          this.handleIncomingRaw(rawMessage);
        },
      });
    } catch (err: any) {
      this.setStatus('error', err?.message || 'Failed to initialize WebSocket client.');
    }
  }

  /**
   * Disconnect current WebSocket session
   */
  disconnect() {
    if (this.activeHandle) {
      this.activeHandle.disconnect();
      this.activeHandle = null;
    }
    this.currentUrl = null;
    this.setStatus('disconnected', null);
  }

  /**
   * Test reachability of a WebSocket or HTTP device endpoint.
   * Does NOT fabricate success.
   */
  async testConnection(targetUrlOrIp: string): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
  }> {
    if (!targetUrlOrIp || !targetUrlOrIp.trim()) {
      return { success: false, message: 'Please enter a WebSocket URL or IP address to test.' };
    }

    const input = targetUrlOrIp.trim();
    const startTime = performance.now();

    if (/^wss?:\/\//i.test(input)) {
      return new Promise((resolve) => {
        let finished = false;
        let testWs: WebSocket | null = null;
        const timer = setTimeout(() => {
          if (finished) return;
          finished = true;
          if (testWs) {
            testWs.onopen = null;
            testWs.onerror = null;
            testWs.close();
          }
          resolve({
            success: false,
            message: `Connection test timed out after 5000ms. Verify device is online and port is open.`,
          });
        }, 5000);

        try {
          const parsedUrl = new URL(input);
          if (!['ws:', 'wss:'].includes(parsedUrl.protocol)) {
            throw new Error('Enter a valid WebSocket URL.');
          }
          if (window.location.protocol === 'https:' && parsedUrl.protocol !== 'wss:') {
            throw new Error('HTTPS websites require a secure WSS connection.');
          }

          testWs = new WebSocket(parsedUrl.href);
          testWs.onopen = () => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            const latencyMs = Math.round(performance.now() - startTime);
            testWs?.close();
            resolve({
              success: true,
              message: `Handshake successful! WebSocket responded in ${latencyMs}ms.`,
              latencyMs,
            });
          };

          testWs.onerror = () => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            resolve({
              success: false,
              message: `WebSocket handshake failed. Check URL, IP address, and gateway port.`,
            });
          };
        } catch (e: any) {
          clearTimeout(timer);
          resolve({
            success: false,
            message: `Invalid WebSocket URL: ${e?.message || 'Malformed address'}`,
          });
        }
      });
    }

    if (!/^https?:\/\//i.test(input)) {
      return {
        success: false,
        message: 'Enter the actual WebSocket URL, or a complete HTTP(S) health-check URL. A browser cannot reliably probe a bare IP address.',
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const resp = await fetch(input, {
        method: 'GET',
        mode: 'cors',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - startTime);
      if (!resp.ok) {
        return {
          success: false,
          message: `Endpoint responded with HTTP ${resp.status}.`,
          latencyMs,
        };
      }
      return {
        success: true,
        message: `Endpoint returned HTTP ${resp.status} in ${latencyMs}ms.`,
        latencyMs,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          success: false,
          message: 'Connection timed out. Device IP is unreachable or unresponsive.',
        };
      }
      return {
        success: false,
        message: `Failed to reach device: ${err?.message || 'Network unreachable'}`,
      };
    }
  }

  /**
   * Provision a physically attached ESP32 over Web Serial. The firmware must
   * acknowledge the exact protocol before this reports success.
   */
  async provisionDeviceConfig({
    ssid,
    password,
    deviceId,
    ingestionUrl,
    ingestionRootCa,
    deviceToken,
    reportingIntervalSeconds,
  }: {
    ssid: string;
    password: string;
    deviceId: string;
    ingestionUrl: string;
    ingestionRootCa: string;
    deviceToken: string;
    reportingIntervalSeconds: number;
  }): Promise<{ success: boolean; message: string }> {
    if (!ssid || !ssid.trim()) {
      return { success: false, message: 'Wi-Fi SSID cannot be empty.' };
    }
    if (!deviceId.trim() || !ingestionUrl.trim() || !ingestionRootCa.trim() || !deviceToken.trim()) {
      return { success: false, message: 'Save a device ID, HTTPS ingestion URL, TLS CA certificate, and device token before provisioning.' };
    }

    type ProvisionPort = {
      open: (options: { baudRate: number }) => Promise<void>;
      close: () => Promise<void>;
      readable: ReadableStream<Uint8Array> | null;
      writable: WritableStream<Uint8Array> | null;
    };
    type SerialApi = { requestPort: () => Promise<ProvisionPort> };
    const serial = (navigator as Navigator & { serial?: SerialApi }).serial;
    if (!serial) {
      return { success: false, message: 'USB provisioning requires a browser with Web Serial support on a secure origin.' };
    }

    let port: ProvisionPort | null = null;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
    try {
      port = await serial.requestPort();
      await port.open({ baudRate: 115200 });
      if (!port.readable || !port.writable) throw new Error('The selected serial port is not readable and writable.');

      reader = port.readable.getReader();
      writer = port.writable.getWriter();
      const requestId = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
      let payload = JSON.stringify({
        type: 'aqms_config',
        requestId,
        deviceId: deviceId.trim(),
        ssid: ssid.trim(),
        password,
        ingestionUrl: ingestionUrl.trim(),
        ingestionRootCa: ingestionRootCa.trim(),
        deviceToken: deviceToken.trim(),
        reportingIntervalSeconds,
      });
      await writer.write(new TextEncoder().encode(`AQMS_CONFIG:${payload}\n`));
      payload = '';

      const decoder = new TextDecoder();
      let response = '';
      const deadline = Date.now() + 10000;
      while (Date.now() < deadline) {
        const remainingMs = deadline - Date.now();
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const result = await Promise.race([
          reader.read(),
          new Promise<{ timeout: true }>((resolve) => {
            timeoutId = setTimeout(() => resolve({ timeout: true }), remainingMs);
          }),
        ]);
        if (timeoutId) clearTimeout(timeoutId);
        if ('timeout' in result) break;
        if (result.done) break;
        response += decoder.decode(result.value, { stream: true });
        if (response.includes(`AQMS_CONFIG_OK:${requestId}`)) {
          return { success: true, message: 'Device acknowledged and stored the configuration over USB serial.' };
        }
        if (response.includes('AQMS_CONFIG_ERROR')) {
          return { success: false, message: 'The device rejected the configuration. Check the firmware response and fields.' };
        }
      }
      return { success: false, message: 'No provisioning acknowledgement received. Configuration was not confirmed.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'USB serial provisioning failed.' };
    } finally {
      if (writer) {
        writer.releaseLock();
      }
      if (reader) {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
      if (port) await port.close().catch(() => undefined);
    }
  }

  /**
   * Handle incoming raw message from hardware
   */
  private async handleIncomingRaw(raw: any) {
    // Validate fields dynamically
    const validated = validateAndParseSensorMessage(raw, 'websocket');
    if (!validated) {
      console.warn('[AQMS WebSocket] Discarding invalid packet:', raw);
      return;
    }

    if (this.currentDeviceId && validated.deviceId !== this.currentDeviceId) {
      this.setStatus('connected', `Discarded packet for unconfigured device "${validated.deviceId}".`);
      return;
    }

    this.packetCount += 1;
    this.lastPacketTime = Date.now();
    this.latestReading = validated;

    // Persist to Firebase Realtime Database
    try {
      await saveIncomingReading(validated, this.reportingIntervalSeconds, false);
      this.setStatus('connected', null);
    } catch (err) {
      console.error('[AQMS] Failed to persist reading to Firebase:', err);
      this.setStatus(
        'connected',
        `WebSocket packet received, but Firebase persistence failed: ${err instanceof Error ? err.message : 'unknown error'}`
      );
    }

    // Notify registered in-memory listeners
    this.readingListeners.forEach((fn) => fn(validated));
  }
}

export const deviceConnection = new DeviceConnectionManager();
