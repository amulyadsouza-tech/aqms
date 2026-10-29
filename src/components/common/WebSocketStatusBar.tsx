import React, { useState, useEffect } from 'react';
import { Zap, WifiOff, RefreshCw, Radio } from 'lucide-react';
import { deviceConnection, ConnectionState } from '../../services/deviceConnection';
import { normalizeWsUrl } from '../../services/aqmsWebSocket';

interface WebSocketStatusBarProps {
  onPacketReceived?: () => void;
}

export const WebSocketStatusBar: React.FC<WebSocketStatusBarProps> = ({ onPacketReceived }) => {
  const [connState, setConnState] = useState<ConnectionState>(deviceConnection.getState());
  const [ipAddress, setIpAddress] = useState<string>(() => {
    const saved = localStorage.getItem('aqms_robot_ip');
    if (saved) return saved;
    const oldUrl = localStorage.getItem('aqms_ws_url');
    if (oldUrl) {
      return oldUrl.replace(/^wss?:\/\//i, '').replace(/:\d+.*$/, '').replace(/\/.*$/, '');
    }
    // Default to the current ESP32 network IP address
    return '10.245.210.144';
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

    // Auto-connect on page load if saved IP exists
    if (!autoConnected) {
      setAutoConnected(true);
      const targetIp = localStorage.getItem('aqms_robot_ip') || '10.245.210.144';
      if (targetIp && targetIp.trim()) {
        try {
          const resolved = normalizeWsUrl(targetIp.trim(), 81);
          deviceConnection.connect({ url: resolved });
        } catch {
          // ignore
        }
      }
    }

    return () => {
      unsubStatus();
      unsubReading();
    };
  }, [autoConnected, onPacketReceived]);

  // Clean and set IP input (strips any accidental ws://, http://, ports, or slashes)
  const handleIpChange = (val: string) => {
    let clean = val.trim();
    // Strip protocols if pasted
    clean = clean.replace(/^wss?:\/\//i, '').replace(/^https?:\/\//i, '');
    // Strip trailing slashes
    clean = clean.replace(/\/.*$/, '');
    // If user pasted port e.g. 10.245.210.144:81, keep it clean
    if (clean.includes(':')) {
      const parts = clean.split(':');
      clean = parts[0];
    }
    setIpAddress(clean);
  };

  const toggleConnection = () => {
    if (isConnected) {
      deviceConnection.disconnect();
    } else {
      const clean = ipAddress.trim() || '10.245.210.144';
      localStorage.setItem('aqms_robot_ip', clean);
      try {
        const resolved = normalizeWsUrl(clean, 81);
        localStorage.setItem('aqms_ws_url', resolved);
        deviceConnection.connect({ url: resolved });
      } catch (err: any) {
        alert(err?.message || 'Invalid IP address.');
      }
    }
  };

  const isConnected = connState.status === 'connected';
  const isConnecting = connState.status === 'connecting';
  const isError = connState.status === 'error';

  return (
    <div className="w-full bg-[#0a0f1d]/90 dark:bg-[#060911]/90 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg p-3 sm:p-4 transition-all mb-4 text-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        
        {/* Left: Nexathon Connection Manager Bar */}
        <div className="flex flex-1 items-center gap-2 max-w-xl">
          <div className="flex items-center flex-1 bg-black/40 border border-white/10 rounded-full px-3.5 py-1.5 font-mono text-xs text-slate-300 focus-within:border-[#7c6df0] focus-within:ring-2 focus-within:ring-[#7c6df0]/30 transition-all shadow-inner">
            <span className="text-slate-500 select-none font-semibold">ws://</span>
            <input
              type="text"
              id="robotIpInput"
              value={ipAddress}
              onChange={(e) => handleIpChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && toggleConnection()}
              placeholder="Robot IP (e.g. 10.245.210.144)"
              spellCheck={false}
              autoComplete="off"
              className="w-full bg-transparent border-none outline-none text-white px-2 font-mono text-xs placeholder:text-slate-600"
            />
            <span className="text-slate-500 select-none font-semibold">:81</span>
          </div>

          {/* Nexathon-style Connect / Disconnect button */}
          <button
            id="connectBtn"
            onClick={toggleConnection}
            disabled={isConnecting}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full font-bold text-xs tracking-wide transition-all shadow-sm cursor-pointer select-none whitespace-nowrap ${
              isConnected
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                : isConnecting
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-wait'
                : 'bg-[#7c6df0] hover:bg-[#6d5ceb] text-white shadow-[0_0_15px_rgba(124,109,240,0.4)] hover:-translate-y-0.5'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                  : isConnecting
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-white'
              }`}
            />
            <span className="btn-label">
              {isConnected ? 'Disconnect' : isConnecting ? 'Connecting...' : 'Connect'}
            </span>
          </button>
        </div>

        {/* Right: Nexathon-style Status Pills */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* WebSocket Status Pill */}
          <div
            id="wsPill"
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-sm transition-all ${
              isConnected
                ? 'bg-emerald-950/40 text-emerald-200 border-emerald-500/30'
                : isConnecting
                ? 'bg-amber-950/40 text-amber-200 border-amber-500/30 animate-pulse'
                : isError
                ? 'bg-red-950/40 text-red-200 border-red-500/30'
                : 'bg-white/5 text-slate-400 border-white/10'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected
                  ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]'
                  : isConnecting
                  ? 'bg-amber-400'
                  : isError
                  ? 'bg-red-400'
                  : 'bg-slate-600'
              }`}
            />
            <span id="wsStatusText">
              {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : isError ? 'Offline (Error)' : 'Disconnected'}
            </span>
          </div>

          {/* Latency Pill (Realtime roundtrip ping) */}
          <div className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-xs font-mono font-medium text-slate-300">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span id="latencyText">
              {isConnected && connState.latencyMs != null ? `${connState.latencyMs} ms` : '-- ms'}
            </span>
          </div>

          {/* Live Packet Counter */}
          {isConnected && (
            <div className="inline-flex items-center gap-1.5 bg-sky-950/40 border border-sky-500/30 px-3 py-1.5 rounded-full text-xs font-mono font-bold text-sky-300">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Packets: {connState.packetsReceived}</span>
            </div>
          )}
        </div>
      </div>

      {/* Target status note below */}
      <div className="mt-2 text-[11px] font-mono text-slate-400 flex items-center justify-between">
        <span>
          Target: <strong className="text-slate-200">{connState.url || `ws://${ipAddress || '10.245.210.144'}:81`}</strong>
        </span>
        {connState.error && !isConnected && (
          <span className="text-rose-400">({connState.error})</span>
        )}
      </div>
    </div>
  );
};
