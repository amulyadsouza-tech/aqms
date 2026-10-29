/**
 * AQMS Live WebSocket Client
 * St. Joseph Engineering College, Vamanjoor, Mangaluru
 * Reference architecture adapted from Nexathon Web Telemetry Client:
 * Robust IP/URL normalization, periodic 4s ping heartbeat with real-time
 * round-trip latency tracking, resilient reconnection, and non-fatal payload parsing.
 */

import { DevicePayload } from '../types';

export interface AQMSWebSocketOptions {
  url: string;
  onReading?: (message: DevicePayload | any) => void;
  onStatus?: (status: 'connecting' | 'connected' | 'disconnected') => void;
  onError?: (error: Error) => void;
  onLatency?: (latencyMs: number) => void;
}

export interface AQMSWebSocketHandle {
  disconnect: () => void;
  send: (payload: any) => boolean;
  ping: () => void;
  getSocket: () => WebSocket | null;
  getLatency: () => number | null;
}

/**
 * Normalizes user input (IP, hostname, port, or full ws:// URL)
 * into a valid WebSocket URL.
 */
export function normalizeWsUrl(rawInput: string, defaultPort: number = 81): string {
  if (!rawInput || typeof rawInput !== 'string') {
    throw new Error('Please enter an IP address or WebSocket URL.');
  }

  let cleaned = rawInput.trim();

  // Strip trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');

  // Strip protocol prefix if present
  if (cleaned.startsWith('ws://')) cleaned = cleaned.slice(5);
  else if (cleaned.startsWith('wss://')) cleaned = cleaned.slice(6);
  else if (cleaned.startsWith('http://')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('https://')) cleaned = cleaned.slice(8);

  // Strip trailing slashes again
  cleaned = cleaned.replace(/\/+$/, '');

  // Extract host and port
  let host = cleaned;
  let port = '';

  if (host.includes(':')) {
    const parts = host.split(':');
    host = parts[0];
    port = parts[1].replace(/[^0-9]/g, '');
  }

  if (!port) {
    if (host === 'localhost' || host === '127.0.0.1') {
      port = '8080';
    } else {
      port = String(defaultPort || 81);
    }
  }

  return `ws://${host}:${port}`;
}

export function connectAQMSWebSocket({
  url,
  onReading,
  onStatus,
  onError,
  onLatency,
}: AQMSWebSocketOptions): AQMSWebSocketHandle {
  let socket: WebSocket | null = null;
  let closedByUser = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let pingIntervalTimer: ReturnType<typeof setInterval> | null = null;
  let retryCount = 0;
  let pingStartTime = 0;
  let currentLatency: number | null = null;

  function sendPing() {
    if (socket && socket.readyState === WebSocket.OPEN) {
      pingStartTime = performance.now();
      try {
        socket.send('ping');
      } catch {
        pingStartTime = 0;
      }
    }
  }

  function startPingHeartbeat() {
    stopPingHeartbeat();
    // 4-second ping interval taken directly from Nexathon measurePing() pattern
    pingIntervalTimer = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN && pingStartTime === 0) {
        sendPing();
      }
    }, 4000);
  }

  function stopPingHeartbeat() {
    if (pingIntervalTimer) {
      clearInterval(pingIntervalTimer);
      pingIntervalTimer = null;
    }
    pingStartTime = 0;
  }

  function connect() {
    if (closedByUser) return;

    let targetUrl: string;
    try {
      targetUrl = normalizeWsUrl(url);
      socket = new WebSocket(targetUrl);
      onStatus?.('connecting');
    } catch (error: any) {
      onStatus?.('disconnected');
      onError?.(error instanceof Error ? error : new Error(String(error)));
      return;
    }

    socket.onopen = () => {
      retryCount = 0;
      onStatus?.('connected');
      // Immediate ping on connect to calculate initial latency
      sendPing();
      startPingHeartbeat();
    };

    socket.onmessage = (event) => {
      const rawData = typeof event.data === 'string' ? event.data.trim() : '';

      // 1. Check for raw 'pong' or '{"pong":true}' from Nexathon-style firmware or relay
      if (rawData === 'pong' || rawData === '{"pong":true}' || rawData === '{"type":"pong"}') {
        if (pingStartTime > 0) {
          currentLatency = Math.max(1, Math.round(performance.now() - pingStartTime));
          pingStartTime = 0;
          onLatency?.(currentLatency);
        }
        return;
      }

      try {
        const message = JSON.parse(rawData);

        // Check if JSON object is a pong payload
        if (message && (message.type === 'pong' || message.pong === true)) {
          if (pingStartTime > 0) {
            currentLatency = Math.max(1, Math.round(performance.now() - pingStartTime));
            pingStartTime = 0;
            onLatency?.(currentLatency);
          }
          return;
        }

        // Validate if message contains sensor readings
        if (
          message &&
          typeof message === 'object' &&
          !Array.isArray(message) &&
          typeof message.deviceId === 'string' &&
          message.deviceId.trim().length > 0 &&
          message.sensors &&
          typeof message.sensors === 'object'
        ) {
          // If we had a pending ping, receiving valid telemetry also confirms active round-trip
          if (pingStartTime > 0) {
            currentLatency = Math.max(1, Math.round(performance.now() - pingStartTime));
            pingStartTime = 0;
            onLatency?.(currentLatency);
          }
          onReading?.(message);
        } else {
          // Non-telemetry message (e.g. system status / handshake) - log gracefully without crashing connection
          console.debug('[AQMS WS] Non-telemetry frame received:', message);
        }
      } catch {
        // If not valid JSON, check if it was a plain pong or ignore
        if (rawData.toLowerCase().includes('pong')) {
          if (pingStartTime > 0) {
            currentLatency = Math.max(1, Math.round(performance.now() - pingStartTime));
            pingStartTime = 0;
            onLatency?.(currentLatency);
          }
        }
      }
    };

    socket.onerror = (err) => {
      stopPingHeartbeat();
      console.warn('[AQMS WS] Connection error encountered:', err);
      onError?.(new Error('WebSocket connection error. Verify host IP, port, and gateway status.'));
    };

    socket.onclose = () => {
      stopPingHeartbeat();
      onStatus?.('disconnected');

      if (closedByUser || retryTimer) return;

      // Resilient reconnection backoff (1s -> 2s -> 4s -> max 10s)
      const delay = Math.min(1000 * Math.pow(1.5, retryCount), 10000);
      retryCount += 1;

      retryTimer = setTimeout(() => {
        retryTimer = null;
        connect();
      }, delay);
    };
  }

  connect();

  return {
    disconnect() {
      closedByUser = true;
      stopPingHeartbeat();
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }

      if (socket) {
        socket.onclose = null;
        socket.onerror = null;
        socket.onmessage = null;
        try {
          socket.close();
        } catch {}
        socket = null;
      }

      currentLatency = null;
      onStatus?.('disconnected');
    },
    send(payload: any): boolean {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
        return true;
      }
      return false;
    },
    ping() {
      sendPing();
    },
    getSocket() {
      return socket;
    },
    getLatency() {
      return currentLatency;
    },
  };
}
