import { DevicePayload } from '../types';

export interface AQMSWebSocketOptions {
  url: string;
  onReading?: (message: DevicePayload | any) => void;
  onStatus?: (status: 'connecting' | 'connected' | 'disconnected') => void;
  onError?: (error: Error) => void;
}

export interface AQMSWebSocketHandle {
  disconnect: () => void;
  send: (payload: any) => boolean;
  getSocket: () => WebSocket | null;
}

export function connectAQMSWebSocket(options: AQMSWebSocketOptions): AQMSWebSocketHandle;
