import React, { useState, useEffect } from 'react';
import { Radio, WifiOff, Activity, Settings2 } from 'lucide-react';
import { deviceConnection, ConnectionState } from '../../services/deviceConnection';

interface WebSocketStatusBarProps {
  onPacketReceived?: () => void;
}

export const WebSocketStatusBar: React.FC<WebSocketStatusBarProps> = ({ onPacketReceived }) => {
  const [connState, setConnState] = useState<ConnectionState>(deviceConnection.getState());
  const [isOpen, setIsOpen] = useState(false);
  const [inputUrl, setInputUrl] = useState(() => {
    return (
      localStorage.getItem('aqms_ws_url') ||
      (window.location.protocol === 'https:'
        ? 'wss://your-aqms-relay.onrender.com'
        : 'ws://localhost:8080')
    );
  });
  const [autoConnected, setAutoConnected] = useState(false);

  useEffect(() => {
    const unsubStatus = deviceConnection.subscribeStatus(() => {
      setConnState(deviceConnection.getState());
    });
    const unsubReading = deviceConnection.subscribeReading(() => {
      setConnState(deviceConnection.getState());
      onPacketReceived?.();
    });

    // Auto-connect on initial load if saved URL exists or local dev
    if (!autoConnected) {
      setAutoConnected(true);
      const savedUrl = localStorage.getItem('aqms_ws_url');
      const defaultUrl = window.location.protocol === 'https:'
        ? savedUrl || ''
        : savedUrl || 'ws://localhost:8080';

      if (defaultUrl) {
        deviceConnection.connect({ url: defaultUrl });
      }
    }

    return () => {
      unsubStatus();
      unsubReading();
    };
  }, [autoConnected, onPacketReceived]);

  const handleConnect = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputUrl.trim()) return;

    localStorage.setItem('aqms_ws_url', inputUrl.trim());
    deviceConnection.connect({ url: inputUrl.trim() });
    setIsOpen(false);
  };

  const handleDisconnect = () => {
    deviceConnection.disconnect();
  };

  const isConnected = connState.status === 'connected';
  const isConnecting = connState.status === 'connecting';
  const isError = connState.status === 'error';

  return (
    <div className="w-full bg-white/90 dark:bg-[#151515]/90 backdrop-blur-md rounded-2xl border border-sky-200/80 dark:border-[#303030] shadow-sm p-4 transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Indicator & Connection status */}
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
              isConnected
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                : isConnecting
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 animate-pulse'
                : isError
                ? 'bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300'
                : 'bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-slate-400'
            }`}
          >
            {isConnected ? (
              <Radio className="w-5 h-5 animate-pulse" />
            ) : isConnecting ? (
              <Activity className="w-5 h-5 animate-spin" />
            ) : (
              <WifiOff className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-[#24272D] dark:text-white">
                LoRa Ground Station Live WebSocket
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  isConnected
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : isConnecting
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                    : 'bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-slate-300 border border-slate-300 dark:border-neutral-700'
                }`}
              >
                {isConnected ? 'LIVE STREAMING' : isConnecting ? 'CONNECTING...' : 'DISCONNECTED'}
              </span>
            </div>

            <p className="text-xs text-[#687583] dark:text-[#A0A0A0] font-mono mt-0.5 truncate max-w-md">
              {connState.url ? connState.url : 'No WebSocket server connected.'}
              {connState.error && (
                <span className="text-red-500 ml-2">({connState.error})</span>
              )}
            </p>
          </div>
        </div>

        {/* Right: Metrics & Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {isConnected && (
            <div className="flex items-center gap-2 text-xs font-mono bg-sky-50 dark:bg-neutral-800/80 border border-sky-100 dark:border-[#303030] px-3 py-1.5 rounded-xl">
              <span className="text-sky-700 dark:text-sky-300 font-bold">
                Packets: {connState.packetsReceived}
              </span>
              {connState.latestReading?.connectivity?.rssi_dbm != null && (
                <span className="text-[#687583] dark:text-slate-400 border-l border-slate-200 dark:border-neutral-700 pl-2">
                  RSSI: {connState.latestReading.connectivity.rssi_dbm} dBm
                </span>
              )}
              {connState.latestReading?.connectivity?.snr_db != null && (
                <span className="text-[#687583] dark:text-slate-400 border-l border-slate-200 dark:border-neutral-700 pl-2">
                  SNR: {connState.latestReading.connectivity.snr_db} dB
                </span>
              )}
            </div>
          )}

          {isConnected ? (
            <button
              onClick={handleDisconnect}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-700 dark:text-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/80 border border-red-200 dark:border-red-900 transition-colors"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={() => handleConnect()}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#397FC0] hover:bg-[#2b6ba7] transition-colors shadow-sm"
            >
              Connect
            </button>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors border border-slate-200 dark:border-neutral-700"
            title="Configure WebSocket URL"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable Configuration Drawer */}
      {isOpen && (
        <form
          onSubmit={handleConnect}
          className="mt-4 pt-4 border-t border-slate-200 dark:border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
        >
          <div className="flex-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#687583] dark:text-slate-400 mb-1">
              WebSocket Server URL (e.g. ws://localhost:8080 or wss://relay.onrender.com)
            </label>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="ws://localhost:8080"
              className="w-full px-3 py-1.5 rounded-xl text-xs font-mono bg-white dark:bg-[#1D1D1D] border border-slate-300 dark:border-[#303030] text-[#24272D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#397FC0]"
            />
          </div>

          <div className="flex items-end gap-2 pt-2 sm:pt-0">
            <button
              type="button"
              onClick={() => setInputUrl('ws://localhost:8080')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 transition-colors"
            >
              Local
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Save &amp; Connect
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
