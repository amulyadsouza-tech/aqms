import React, { useState, useEffect } from 'react';
import { DeviceMetadata, IngestedReading, TransportType, ManualReadingInput } from '../../types';
import { formatRelativeTime, formatTimestamp } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { 
  Cpu, 
  Save, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Activity,
  Radio,
  Wifi,
  Send,
  Plug,
  Unplug,
  KeyRound,
  FileEdit,
  Globe,
  Sliders,
  Check,
  RadioTower,
  ShieldCheck,
  Info
} from 'lucide-react';
import { saveDeviceMetadata, saveManualReading, setActiveDeviceId } from '../../services/firebase';
import { deviceConnection, ConnectionStatus } from '../../services/deviceConnection';

interface DeviceSetupTabProps {
  metadata: DeviceMetadata | null;
  latestReading: IngestedReading | null;
  isOnline: boolean;
  onMetadataUpdated: (updated: DeviceMetadata) => void;
  isFirebaseReady: boolean;
}

interface ConnectionCheckStep {
  id: string;
  label: string;
  status: 'passed' | 'failed' | 'warning' | 'pending';
  detail: string;
  checkedAt: number;
}

export const DeviceSetupTab: React.FC<DeviceSetupTabProps> = ({
  metadata,
  latestReading,
  isOnline,
  onMetadataUpdated,
  isFirebaseReady,
}) => {
  const { currentUser } = useAuth();

  // Load saved non-secret configuration when available; otherwise empty fields with placeholders
  const [formData, setFormData] = useState<{
    deviceId: string;
    name: string;
    locationName: string;
    esp32Model: string;
    radioModel: string;
    transport: TransportType;
    expectedIntervalSeconds: number | string;
    offlineTimeoutSeconds: number | string;
    firmwareVersion: string;
    enabled: boolean;
    ipAddress: string;
    wsUrl: string;
    ingestionUrl: string;
    ingestionRootCa: string;
    port: string;
    path: string;
    wifiSsid: string;
    loraFrequencyMhz: string;
    loraSpreadingFactor: string;
    loraBandwidthKhz: string;
    loraCodingRate: string;
    loraSyncWord: string;
  }>(() => {
    return {
      deviceId: metadata?.deviceId || '',
      name: metadata?.name || '',
      locationName: metadata?.locationName || '',
      esp32Model: metadata?.esp32Model || '',
      radioModel: metadata?.radioModel || '',
      transport: metadata?.transport || 'unconfigured',
      expectedIntervalSeconds: metadata?.expectedIntervalSeconds || '',
      offlineTimeoutSeconds: metadata?.offlineTimeoutSeconds || '',
      firmwareVersion: metadata?.firmwareVersion || '',
      enabled: metadata?.enabled ?? false,
      ipAddress: metadata?.ipAddress || '',
      wsUrl: metadata?.wsUrl || '',
      ingestionUrl: metadata?.ingestionUrl || '',
      ingestionRootCa: metadata?.ingestionRootCa || '',
      port: metadata?.port ? String(metadata.port) : '',
      path: metadata?.path || '',
      wifiSsid: metadata?.wifiSsid || '',
      loraFrequencyMhz: metadata?.loraFrequencyMhz || '',
      loraSpreadingFactor: metadata?.loraSpreadingFactor ? String(metadata.loraSpreadingFactor) : '',
      loraBandwidthKhz: metadata?.loraBandwidthKhz ? String(metadata.loraBandwidthKhz) : '',
      loraCodingRate: metadata?.loraCodingRate || '',
      loraSyncWord: metadata?.loraSyncWord || '',
    };
  });

  // Wi-Fi Provisioning State (password stored only in volatile memory, never persisted)
  const [wifiPassword, setWifiPassword] = useState<string>('');
  const [deviceToken, setDeviceToken] = useState<string>('');
  const [isProvisioning, setIsProvisioning] = useState<boolean>(false);
  const [provisionResult, setProvisionResult] = useState<{ success: boolean; message: string } | null>(null);

  // Live WebSocket Connection State
  const [connState, setConnState] = useState(deviceConnection.getState());
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);
  const [isTestingConn, setIsTestingConn] = useState<boolean>(false);

  // Persistence State
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Diagnostics State
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [connectionChecks, setConnectionChecks] = useState<ConnectionCheckStep[] | null>(null);

  // Section 5: Manual Raw Sensor Entry State
  const [manualForm, setManualForm] = useState<ManualReadingInput>({
    deviceId: formData.deviceId || '',
    pm1_0: null,
    pm2_5: null,
    pm10: null,
    mq3_raw: null,
    temperature_c: null,
    humidity_percent: null,
    latitude: null,
    longitude: null,
    notes: '',
  });
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [manualSuccessMsg, setManualSuccessMsg] = useState<string | null>(null);
  const [manualErrorMsg, setManualErrorMsg] = useState<string | null>(null);

  // Subscribe to live connection manager
  useEffect(() => {
    const unsubStatus = deviceConnection.subscribeStatus((status, error) => {
      setConnState(deviceConnection.getState());
    });
    const unsubReading = deviceConnection.subscribeReading(() => {
      setConnState(deviceConnection.getState());
    });

    return () => {
      unsubStatus();
      unsubReading();
    };
  }, []);

  useEffect(() => {
    if (!metadata) return;
    setFormData({
      deviceId: metadata.deviceId || '',
      name: metadata.name || '',
      locationName: metadata.locationName || '',
      esp32Model: metadata.esp32Model || '',
      radioModel: metadata.radioModel || '',
      transport: metadata.transport || 'unconfigured',
      expectedIntervalSeconds: metadata.expectedIntervalSeconds ?? '',
      offlineTimeoutSeconds: metadata.offlineTimeoutSeconds ?? '',
      firmwareVersion: metadata.firmwareVersion || '',
      enabled: metadata.enabled ?? false,
      ipAddress: metadata.ipAddress || '',
      wsUrl: metadata.wsUrl || '',
      ingestionUrl: metadata.ingestionUrl || '',
      ingestionRootCa: metadata.ingestionRootCa || '',
      port: metadata.port != null ? String(metadata.port) : '',
      path: metadata.path || '',
      wifiSsid: metadata.wifiSsid || '',
      loraFrequencyMhz: metadata.loraFrequencyMhz || '',
      loraSpreadingFactor: metadata.loraSpreadingFactor != null ? String(metadata.loraSpreadingFactor) : '',
      loraBandwidthKhz: metadata.loraBandwidthKhz != null ? String(metadata.loraBandwidthKhz) : '',
      loraCodingRate: metadata.loraCodingRate || '',
      loraSyncWord: metadata.loraSyncWord || '',
    });
    setManualForm((prev) => ({ ...prev, deviceId: metadata.deviceId || '' }));
  }, [metadata]);

  // Update manual form deviceId when formData.deviceId changes
  useEffect(() => {
    if (formData.deviceId && !manualForm.deviceId) {
      setManualForm((prev) => ({ ...prev, deviceId: formData.deviceId }));
    }
  }, [formData.deviceId]);

  const handleInputChange = (field: string, val: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: val,
    }));
    setSaveSuccess(false);
  };

  // Helper to compose a URL from explicitly entered gateway details.
  const handleComposeWsUrl = () => {
    if (!formData.ipAddress) return;
    const cleanIp = formData.ipAddress.replace(/^https?:\/\//i, '').replace(/^wss?:\/\//i, '').replace(/\/+$/, '');
    const portPart = formData.port ? `:${formData.port}` : '';
    let pathPart = formData.path || '';
    if (pathPart && !pathPart.startsWith('/')) {
      pathPart = `/${pathPart}`;
    }
    const scheme = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const constructed = `${scheme}${cleanIp}${portPart}${pathPart}`;
    handleInputChange('wsUrl', constructed);
  };

  // Save Configuration (non-secret only)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      if (!formData.deviceId.trim()) {
        throw new Error('Device identifier is required.');
      }
      if (!formData.name.trim()) {
        throw new Error('Device name is required.');
      }

      const intervalSec = Number(formData.expectedIntervalSeconds);
      const timeoutSec = Number(formData.offlineTimeoutSeconds);
      if (!Number.isInteger(intervalSec) || intervalSec < 1 || intervalSec > 3600) {
        throw new Error('Enter a reporting interval from 1 to 3600 seconds.');
      }
      if (!Number.isInteger(timeoutSec) || timeoutSec < 1 || timeoutSec > 7200) {
        throw new Error('Enter a connection timeout from 1 to 7200 seconds.');
      }

      const nonSecretPayload: DeviceMetadata = {
        deviceId: formData.deviceId.trim(),
        name: formData.name.trim(),
        locationName: formData.locationName.trim(),
        esp32Model: formData.esp32Model.trim(),
        radioModel: formData.radioModel.trim(),
        transport: formData.transport,
        expectedIntervalSeconds: intervalSec,
        offlineTimeoutSeconds: timeoutSec,
        firmwareVersion: formData.firmwareVersion.trim(),
        enabled: formData.enabled,
        createdAt: metadata?.createdAt || Date.now(),
        updatedAt: Date.now(),
        // Dynamic non-secret connection fields
        ipAddress: formData.ipAddress.trim() || undefined,
        wsUrl: formData.wsUrl.trim() || undefined,
        ingestionUrl: formData.ingestionUrl.trim() || undefined,
        ingestionRootCa: formData.ingestionRootCa.trim() || undefined,
        port: formData.port ? Number(formData.port) : undefined,
        path: formData.path.trim() || undefined,
        wifiSsid: formData.wifiSsid.trim() || undefined,
        // LoRa parameters
        loraFrequencyMhz: formData.loraFrequencyMhz.trim() || undefined,
        loraSpreadingFactor: formData.loraSpreadingFactor ? Number(formData.loraSpreadingFactor) : undefined,
        loraBandwidthKhz: formData.loraBandwidthKhz ? Number(formData.loraBandwidthKhz) : undefined,
        loraCodingRate: formData.loraCodingRate.trim() || undefined,
        loraSyncWord: formData.loraSyncWord.trim() || undefined,
      };

      if (!isFirebaseReady) {
        throw new Error('Firebase must be configured and authenticated before saving device configuration.');
      }
      await saveDeviceMetadata(nonSecretPayload, deviceToken || undefined);
      await setActiveDeviceId(nonSecretPayload.deviceId);

      onMetadataUpdated(nonSecretPayload);
      setSaveSuccess(true);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to persist device configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  // Test Connection
  const handleTestConnection = async () => {
    setIsTestingConn(true);
    setTestResult(null);

    const target = formData.wsUrl || formData.ipAddress;
    if (!target) {
      setTestResult({
        success: false,
        message: 'Enter a WebSocket URL or IP address in the fields above first.',
      });
      setIsTestingConn(false);
      return;
    }

    try {
      const res = await deviceConnection.testConnection(target);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Connection test encountered an error.',
      });
    } finally {
      setIsTestingConn(false);
    }
  };

  // Connect WebSocket
  const handleConnect = () => {
    if (!formData.deviceId.trim() || !formData.wsUrl) {
      setTestResult({
        success: false,
        message: 'Enter the configured device ID and WebSocket URL to initiate connection.',
      });
      return;
    }
    const intervalSec = Number(formData.expectedIntervalSeconds);
    if (!Number.isInteger(intervalSec) || intervalSec < 1) {
      setTestResult({ success: false, message: 'Enter and save a valid reporting interval first.' });
      return;
    }
    deviceConnection.connect({
      url: formData.wsUrl,
      deviceId: formData.deviceId,
      reportingIntervalSeconds: intervalSec,
    });
  };

  // Disconnect WebSocket
  const handleDisconnect = () => {
    deviceConnection.disconnect();
  };

  // Wi-Fi Provisioning (Section 1: Wi-Fi credentials sent ONLY through verified provisioning)
  const handleProvisionWifi = async () => {
    if (!formData.wifiSsid.trim()) {
      setProvisionResult({ success: false, message: 'Please enter a Wi-Fi SSID.' });
      return;
    }
    if (!isFirebaseReady || !deviceToken || !saveSuccess) {
      setProvisionResult({ success: false, message: 'Configure Firebase, generate a device token, save the configuration, and then provision.' });
      return;
    }

    setIsProvisioning(true);
    setProvisionResult(null);

    try {
      const res = await deviceConnection.provisionDeviceConfig({
        ssid: formData.wifiSsid,
        password: wifiPassword,
        deviceId: formData.deviceId,
        ingestionUrl: formData.ingestionUrl,
        ingestionRootCa: formData.ingestionRootCa,
        deviceToken,
        reportingIntervalSeconds: Number(formData.expectedIntervalSeconds),
      });

      setProvisionResult(res);
      if (res.success) setWifiPassword('');
    } catch (err: any) {
      setProvisionResult({
        success: false,
        message: err?.message || 'Provisioning failed.',
      });
    } finally {
      setWifiPassword('');
      setIsProvisioning(false);
    }
  };

  // Section 5: Manual Raw Sensor Entry Submission
  const handleManualEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingManual(true);
    setManualSuccessMsg(null);
    setManualErrorMsg(null);

    const adminIdentity = currentUser?.email || currentUser?.uid || '';
    const targetId = manualForm.deviceId.trim() || formData.deviceId.trim();

    if (!targetId) {
      setManualErrorMsg('Please provide a Device ID for this manual record.');
      setIsSavingManual(false);
      return;
    }

    try {
      const { recordId, reading } = await saveManualReading(
        {
          ...manualForm,
          deviceId: targetId,
        },
        adminIdentity
      );

      setManualSuccessMsg(
        `Manual reading recorded with ID ${recordId} at ${new Date(reading.timestamp).toLocaleTimeString()} (Source: manual).`
      );

      // Clear the numerical fields after successful submission
      setManualForm({
        deviceId: targetId,
        pm1_0: null,
        pm2_5: null,
        pm10: null,
        mq3_raw: null,
        temperature_c: null,
        humidity_percent: null,
        latitude: null,
        longitude: null,
        notes: '',
      });
    } catch (err: any) {
      setManualErrorMsg(err.message || 'Failed to submit manual reading.');
    } finally {
      setIsSavingManual(false);
    }
  };

  // Run Transparent Diagnostics
  const runHonestDiagnostics = () => {
    setIsRunningTests(true);

    setTimeout(() => {
      const now = Date.now();
      const currentReading = connState.latestReading || latestReading;
      const readingAge = currentReading?.timestamp
        ? Math.floor((now - currentReading.timestamp) / 1000)
        : null;

      const results: ConnectionCheckStep[] = [
        {
          id: 'ws',
          label: 'Hardware WebSocket Client Link',
          status: connState.status === 'connected' ? 'passed' : connState.status === 'connecting' ? 'warning' : 'failed',
          detail:
            connState.status === 'connected'
              ? `Connected to ${connState.url}. Packets received: ${connState.packetsReceived}`
              : connState.status === 'connecting'
              ? 'Attempting socket handshake...'
              : connState.error
              ? `Socket error: ${connState.error}`
              : 'WebSocket is currently disconnected.',
          checkedAt: now,
        },
        {
          id: 'endpoint',
          label: 'Firebase RTDB Telemetry Storage',
          status: isFirebaseReady ? 'warning' : 'failed',
          detail: isFirebaseReady
            ? 'Firebase SDK is configured; a successful save or live listener is required to confirm database access.'
            : 'Firebase is not configured. Live readings and configuration cannot be persisted.',
          checkedAt: now,
        },
        {
          id: 'packet',
          label: 'Recent Telemetry Packet Received',
          status:
            currentReading && readingAge !== null && readingAge <= Number(formData.offlineTimeoutSeconds || 120)
              ? 'passed'
              : currentReading
              ? 'warning'
              : 'failed',
          detail: currentReading
            ? `Last packet received ${formatRelativeTime(currentReading.timestamp)} (Age: ${readingAge}s). Source: ${currentReading.source || 'hardware'}`
            : 'No telemetry packets ever recorded for this device.',
          checkedAt: now,
        },
        {
          id: 'sensors',
          label: 'Sensor Payloads Integrity',
          status:
            currentReading?.sensors &&
            Object.values(currentReading.sensors).some((value) => value !== null)
              ? 'passed'
              : 'failed',
          detail:
            currentReading?.sensors &&
            Object.values(currentReading.sensors).some((value) => value !== null)
              ? 'Valid numerical metrics found for core particulate/temp channels.'
              : 'Sensors object missing or all channel values are null.',
          checkedAt: now,
        },
        {
          id: 'online',
          label: 'Hardware Online Evaluation',
          status: isOnline ? 'passed' : 'failed',
          detail:
            isOnline
              ? 'A recent valid reading is within the configured offline timeout.'
              : 'No recent valid reading is within the configured offline timeout.',
          checkedAt: now,
        },
      ];

      setConnectionChecks(results);
      setIsRunningTests(false);
    }, 600);
  };

  return (
    <div className="space-y-8">

      {/* ── 1. REAL-TIME HARDWARE CONNECTION CONSOLE ───────────────────────── */}
      <div className="bg-surface-cardLight dark:bg-surface-cardDark p-6 rounded-2xl border border-surface-borderLight dark:border-surface-borderDark shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-borderLight dark:border-surface-borderDark">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <RadioTower className="w-5 h-5 text-institute-blue dark:text-sky-400" />
              <span>Live Device Connection &amp; Gateway Link</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Connect to your physical ESP32 node or LoRa gateway via live WebSocket. No assumed IP addresses or ports.
            </p>
          </div>

          {/* Actual Connection Status Badge */}
          <div className="flex items-center space-x-2">
            <span
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                connState.status === 'connected'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                  : connState.status === 'connecting'
                  ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                  : connState.status === 'error'
                  ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                  : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  connState.status === 'connected'
                    ? 'bg-emerald-500'
                    : connState.status === 'connecting'
                    ? 'bg-amber-500 animate-pulse'
                    : connState.status === 'error'
                    ? 'bg-rose-500'
                    : 'bg-slate-400'
                }`}
              />
              <span className="capitalize">
                {connState.status === 'connected'
                  ? 'WebSocket Connected'
                  : connState.status === 'connecting'
                  ? 'Connecting...'
                  : connState.status === 'error'
                  ? 'Connection Error'
                  : 'Disconnected'}
              </span>
            </span>
          </div>
        </div>

        {/* Real-time stats & test feedback */}
        {testResult && (
          <div
            className={`mt-4 p-3.5 rounded-xl border text-xs flex items-center space-x-2 ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        {connState.status === 'connected' && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 flex flex-wrap items-center justify-between gap-2">
            <span>
              Streaming live packets from: <strong className="font-mono">{connState.url}</strong>
            </span>
            <span className="font-mono">
              Packets Received: <strong>{connState.packetsReceived}</strong>
              {connState.lastPacketTimestamp && ` · Last: ${formatRelativeTime(connState.lastPacketTimestamp)}`}
            </span>
            {connState.error && <span className="basis-full text-amber-700 dark:text-amber-300">{connState.error}</span>}
          </div>
        )}

        {/* Dynamic Connection Controls */}
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* IP Address */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                ESP32 / Gateway IP Address
              </label>
              <input
                type="text"
                value={formData.ipAddress}
                onChange={(e) => handleInputChange('ipAddress', e.target.value)}
                placeholder="Enter the assigned device or gateway IP"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Local IP of the ESP32 server or LoRa bridge.
              </span>
            </div>

            {/* Port */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Port
              </label>
              <input
                type="text"
                value={formData.port}
                onChange={(e) => handleInputChange('port', e.target.value)}
                placeholder="Enter the gateway's actual port"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Leave empty if the gateway does not require a port in its URL.
              </span>
            </div>

            {/* Path */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Path
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.path}
                  onChange={(e) => handleInputChange('path', e.target.value)}
                  placeholder="Enter the gateway's actual path"
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
                <button
                  type="button"
                  onClick={handleComposeWsUrl}
                  title="Compose full WebSocket URL from IP, Port, and Path"
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 whitespace-nowrap"
                >
                  Build URL
                </button>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                WebSocket endpoint path.
              </span>
            </div>

          </div>

          {/* Full WebSocket URL */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Active WebSocket URL
            </label>
            <input
              type="text"
              value={formData.wsUrl}
              onChange={(e) => handleInputChange('wsUrl', e.target.value)}
              placeholder="Enter the actual ws:// or wss:// endpoint"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Direct connection URL used by the WebSocket client. HTTPS browsers require wss://.
            </span>
          </div>

          {/* Connection Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTestingConn || (!formData.wsUrl && !formData.ipAddress)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center space-x-1.5 border border-slate-300 dark:border-slate-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingConn ? 'animate-spin' : ''}`} />
                <span>{isTestingConn ? 'Testing Handshake...' : 'Test Connection'}</span>
              </button>

              {connState.status !== 'connected' ? (
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={!formData.wsUrl}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
                >
                  <Plug className="w-3.5 h-3.5" />
                  <span>Connect</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors flex items-center space-x-1.5 shadow-sm"
                >
                  <Unplug className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              )}
            </div>

            <span className="text-xs text-slate-400 italic">
              *A successful button click does not fabricate a connection; actual socket state is shown above.
            </span>
          </div>
        </div>
      </div>


      {/* ── 2. SECURE WI-FI PROVISIONING WORKFLOW ─────────────────────────── */}
      <div className="bg-surface-cardLight dark:bg-surface-cardDark p-6 rounded-2xl border border-surface-borderLight dark:border-surface-borderDark shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-surface-borderLight dark:border-surface-borderDark">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Wifi className="w-5 h-5 text-institute-blue dark:text-sky-400" />
              <span>Secure Hardware Wi-Fi Provisioning</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Provision over an explicitly selected USB serial port. Credentials are not sent over the network or saved in browser storage.
            </p>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              USB serial only
          </span>
        </div>

        {provisionResult && (
          <div
            className={`mt-4 p-3.5 rounded-xl border text-xs flex items-center space-x-2 ${
              provisionResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
            }`}
          >
            {provisionResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{provisionResult.message}</span>
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Wi-Fi Network Name (SSID)
            </label>
            <input
              type="text"
              value={formData.wifiSsid}
              onChange={(e) => handleInputChange('wifiSsid', e.target.value)}
              placeholder="Enter the SSID configured for the device"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Wi-Fi Password
            </label>
            <input
              type="password"
              value={wifiPassword}
              onChange={(e) => setWifiPassword(e.target.value)}
              placeholder="Enter Wi-Fi network password"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
            />
            <span className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 block">
              *Sent only after selecting the physically attached device's serial port; cleared after the attempt.
            </span>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleProvisionWifi}
            disabled={isProvisioning || !formData.wifiSsid}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-institute-blue hover:bg-institute-accent dark:bg-sky-600 dark:hover:bg-sky-500 transition-colors flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isProvisioning ? 'Waiting for device acknowledgement...' : 'Provision over USB'}</span>
          </button>
        </div>
      </div>

      <div className="bg-surface-cardLight dark:bg-surface-cardDark p-6 rounded-2xl border border-surface-borderLight dark:border-surface-borderDark shadow-sm">
        <div className="pb-4 border-b border-surface-borderLight dark:border-surface-borderDark">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-institute-blue dark:text-sky-400" />
            <span>Authenticated HTTPS Ingestion</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Required by the included ESP32 firmware. A device token is kept only in this page and its hash is stored privately in Firebase.
          </p>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              HTTPS Ingestion URL
            </label>
            <input
              type="url"
              value={formData.ingestionUrl}
              onChange={(e) => handleInputChange('ingestionUrl', e.target.value)}
              placeholder="Enter the deployed HTTPS ingestion endpoint"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              TLS Root CA Certificate (PEM)
            </label>
            <textarea
              value={formData.ingestionRootCa}
              onChange={(e) => handleInputChange('ingestionRootCa', e.target.value)}
              placeholder="Paste the CA certificate that validates the ingestion server"
              rows={4}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Device Ingestion Token
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                autoComplete="new-password"
                value={deviceToken}
                onChange={(e) => {
                  setDeviceToken(e.target.value);
                  setSaveSuccess(false);
                }}
                placeholder="Generate a new token or enter the current device token"
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  const bytes = crypto.getRandomValues(new Uint8Array(32));
                  setDeviceToken(Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(''));
                  setSaveSuccess(false);
                }}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
              >
                Generate Token
              </button>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Save after generating. Only a one-way hash is stored in Firebase; provision the token to the device over USB.
            </span>
          </div>
        </div>
      </div>


      {/* ── 3. HARDWARE PROFILE & LORA CONFIGURATION (ALL DYNAMIC) ─────────── */}
      <div className="bg-surface-cardLight dark:bg-surface-cardDark p-6 rounded-2xl border border-surface-borderLight dark:border-surface-borderDark shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-surface-borderLight dark:border-surface-borderDark">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-institute-blue dark:text-sky-400" />
              <span>Hardware Profile &amp; LoRa Configuration</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Enter the actual hardware specifications and radio frequencies for this node.
            </p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
            formData.enabled 
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
          }`}>
            {formData.enabled ? 'Device Enabled' : 'Device Disabled'}
          </span>
        </div>

        {saveSuccess && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Device configuration saved successfully.</span>
          </div>
        )}

        {saveError && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-300 flex items-center space-x-2">
            <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Device ID */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Device Identifier (Unique Hardware ID) *
              </label>
              <input
                type="text"
                required
                value={formData.deviceId}
                onChange={(e) => handleInputChange('deviceId', e.target.value)}
                placeholder="Enter the device ID configured in firmware"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Must match the deviceId in hardware messages.
              </span>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Node Friendly Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter a name for this device"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Physical Installation Location
              </label>
              <input
                type="text"
                value={formData.locationName}
                onChange={(e) => handleInputChange('locationName', e.target.value)}
                placeholder="Enter the installation location"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            {/* Microcontroller Type */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Microcontroller Core
              </label>
              <input
                type="text"
                value={formData.esp32Model}
                onChange={(e) => handleInputChange('esp32Model', e.target.value)}
                placeholder="Enter the verified ESP32 board model"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            {/* Transport Mode */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Primary Communication Transport
              </label>
              <select
                value={formData.transport}
                onChange={(e) => handleInputChange('transport', e.target.value as TransportType)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                <option value="wifi">Direct Wi-Fi / WebSocket</option>
                <option value="lora_gateway">LoRa Gateway Bridge</option>
                <option value="cellular">Cellular GSM / NB-IoT</option>
                <option value="other">Other / Hybrid</option>
                <option value="unconfigured">Not Configured / Unverified</option>
              </select>
            </div>

            {/* Firmware Version */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Firmware Version
              </label>
              <input
                type="text"
                value={formData.firmwareVersion}
                onChange={(e) => handleInputChange('firmwareVersion', e.target.value)}
                placeholder="Enter the firmware-reported version"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            {/* Expected Interval */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Data Reporting Interval (seconds)
              </label>
              <input
                type="number"
                min="5"
                max="3600"
                value={formData.expectedIntervalSeconds}
                onChange={(e) => handleInputChange('expectedIntervalSeconds', e.target.value)}
                placeholder="Enter the configured reporting interval"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Historical records in Firebase are persisted at this interval.
              </span>
            </div>

            {/* Offline Timeout */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Connection Timeout (seconds)
              </label>
              <input
                type="number"
                min="10"
                max="7200"
                value={formData.offlineTimeoutSeconds}
                onChange={(e) => handleInputChange('offlineTimeoutSeconds', e.target.value)}
                placeholder="Enter the offline timeout"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Mark device as offline if no packets arrive within this window.
              </span>
            </div>

          </div>

          {/* ── LoRa Configuration Section ── */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5 mb-3">
              <Radio className="w-4 h-4 text-institute-blue dark:text-sky-400" />
              <span>LoRa Radio Configuration (Actual Hardware Fields)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Radio Module Model
                </label>
                <input
                  type="text"
                  value={formData.radioModel}
                  onChange={(e) => handleInputChange('radioModel', e.target.value)}
                  placeholder="Enter the verified radio model"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Frequency (MHz)
                </label>
                <input
                  type="text"
                  value={formData.loraFrequencyMhz}
                  onChange={(e) => handleInputChange('loraFrequencyMhz', e.target.value)}
                  placeholder="Enter the verified radio frequency"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Spreading Factor
                </label>
                <input
                  type="text"
                  value={formData.loraSpreadingFactor}
                  onChange={(e) => handleInputChange('loraSpreadingFactor', e.target.value)}
                  placeholder="Enter the configured spreading factor"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Bandwidth (kHz)
                </label>
                <input
                  type="text"
                  value={formData.loraBandwidthKhz}
                  onChange={(e) => handleInputChange('loraBandwidthKhz', e.target.value)}
                  placeholder="Enter the configured bandwidth"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Coding Rate
                </label>
                <input
                  type="text"
                  value={formData.loraCodingRate}
                  onChange={(e) => handleInputChange('loraCodingRate', e.target.value)}
                  placeholder="Enter the configured coding rate"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Sync Word
                </label>
                <input
                  type="text"
                  value={formData.loraSyncWord}
                  onChange={(e) => handleInputChange('loraSyncWord', e.target.value)}
                  placeholder="Enter the configured sync word"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enableDevice"
                checked={formData.enabled}
                onChange={(e) => handleInputChange('enabled', e.target.checked)}
                className="rounded border-slate-300 text-institute-blue focus:ring-institute-blue h-4 w-4"
              />
              <label htmlFor="enableDevice" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Authorize device to ingest telemetry packets
              </label>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-institute-blue hover:bg-institute-accent dark:bg-sky-600 dark:hover:bg-sky-500 transition-colors flex items-center space-x-2 shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Profile...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>


      {/* ── 4. SECTION 5: MANUAL RAW SENSOR ENTRY ─────────────────────────── */}
      <div className="bg-surface-cardLight dark:bg-surface-cardDark p-6 rounded-2xl border border-surface-borderLight dark:border-surface-borderDark shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-surface-borderLight dark:border-surface-borderDark">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <FileEdit className="w-5 h-5 text-institute-blue dark:text-sky-400" />
              <span>Manual Raw Sensor Entry (Authorized Admin)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Enter verified manual reference readings. Saved distinctly as <code className="font-mono text-purple-600 dark:text-purple-400 font-semibold">source: "manual"</code> with administrator identity stamp.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            User: {currentUser?.email || currentUser?.uid || 'Not authenticated'}
          </span>
        </div>

        {manualSuccessMsg && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{manualSuccessMsg}</span>
          </div>
        )}

        {manualErrorMsg && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center space-x-2">
            <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{manualErrorMsg}</span>
          </div>
        )}

        <form onSubmit={handleManualEntrySubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* PM1.0 */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                PM1.0 (µg/m³)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={manualForm.pm1_0 ?? ''}
                onChange={(e) =>
                  setManualForm((p) => ({
                    ...p,
                    pm1_0: e.target.value === '' ? null : parseFloat(e.target.value),
                  }))
                }
                placeholder="Enter measured value"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            {/* PM2.5 */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                PM2.5 (µg/m³)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={manualForm.pm2_5 ?? ''}
                onChange={(e) =>
                  setManualForm((p) => ({
                    ...p,
                    pm2_5: e.target.value === '' ? null : parseFloat(e.target.value),
                  }))
                }
                placeholder="Enter measured value"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            {/* PM10 */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                PM10 (µg/m³)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={manualForm.pm10 ?? ''}
                onChange={(e) =>
                  setManualForm((p) => ({
                    ...p,
                    pm10: e.target.value === '' ? null : parseFloat(e.target.value),
                  }))
                }
                placeholder="Enter measured value"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            {/* MQ-3 Raw ADC */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                MQ-3 Raw ADC (0-4095)
              </label>
              <input
                type="number"
                min="0"
                max="4095"
                value={manualForm.mq3_raw ?? ''}
                onChange={(e) =>
                  setManualForm((p) => ({
                    ...p,
                    mq3_raw: e.target.value === '' ? null : parseInt(e.target.value, 10),
                  }))
                }
                placeholder="Enter measured value"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            {/* Temperature */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Temperature (°C)
              </label>
              <input
                type="number"
                step="0.1"
                min="-40"
                max="85"
                value={manualForm.temperature_c ?? ''}
                onChange={(e) =>
                  setManualForm((p) => ({
                    ...p,
                    temperature_c: e.target.value === '' ? null : parseFloat(e.target.value),
                  }))
                }
                placeholder="Enter measured value"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            {/* Humidity */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Humidity (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={manualForm.humidity_percent ?? ''}
                onChange={(e) =>
                  setManualForm((p) => ({
                    ...p,
                    humidity_percent: e.target.value === '' ? null : parseFloat(e.target.value),
                  }))
                }
                placeholder="Enter measured value"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            {/* GPS Latitude */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                GPS Latitude (deg)
              </label>
              <input
                type="number"
                step="0.000001"
                min="-90"
                max="90"
                value={manualForm.latitude ?? ''}
                onChange={(e) =>
                  setManualForm((p) => ({
                    ...p,
                    latitude: e.target.value === '' ? null : parseFloat(e.target.value),
                  }))
                }
                placeholder="Enter measured latitude"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            {/* GPS Longitude */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                GPS Longitude (deg)
              </label>
              <input
                type="number"
                step="0.000001"
                min="-180"
                max="180"
                value={manualForm.longitude ?? ''}
                onChange={(e) =>
                  setManualForm((p) => ({
                    ...p,
                    longitude: e.target.value === '' ? null : parseFloat(e.target.value),
                  }))
                }
                placeholder="Enter measured longitude"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

          </div>

          <div className="flex items-center justify-between pt-3">
            <span className="text-[11px] text-slate-500 italic">
              All fields are optional, but at least one numerical reading must be provided.
            </span>

            <button
              type="submit"
              disabled={isSavingManual}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSavingManual ? 'Submitting...' : 'Save Manual Record'}</span>
            </button>
          </div>
        </form>
      </div>


      {/* ── 5. TRANSPARENT DIAGNOSTICS & TELEMETRY VERIFICATION ─────────────── */}
      <div className="bg-surface-cardLight dark:bg-surface-cardDark p-6 rounded-2xl border border-surface-borderLight dark:border-surface-borderDark shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-surface-borderLight dark:border-surface-borderDark">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Activity className="w-5 h-5 text-institute-blue dark:text-sky-400" />
              <span>Real-Time Telemetry Pipeline Verification</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Executes transparent, factual checks. A browser cannot fabricate a connection to an unpowered PCB.
            </p>
          </div>
          <button
            onClick={runHonestDiagnostics}
            disabled={isRunningTests}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunningTests ? 'animate-spin' : ''}`} />
            <span>{isRunningTests ? 'Testing...' : 'Run Diagnostics'}</span>
          </button>
        </div>

        {connectionChecks ? (
          <div className="mt-4 space-y-3">
            {connectionChecks.map((check) => (
              <div
                key={check.id}
                className="p-3 rounded-xl border flex items-start space-x-3 text-xs bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800"
              >
                {check.status === 'passed' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                )}
                {check.status === 'warning' && (
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                )}
                {check.status === 'failed' && (
                  <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900 dark:text-white font-semibold">
                      {check.label}
                    </strong>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(check.checkedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">{check.detail}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
            Click <strong>"Run Diagnostics"</strong> above to perform live telemetry and authentication verification.
          </div>
        )}
      </div>

    </div>
  );
};

export default DeviceSetupTab;
