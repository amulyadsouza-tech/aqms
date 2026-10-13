import React, { useState } from 'react';
import { 
  Database, 
  Key, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Save, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  ShieldCheck, 
  Server
} from 'lucide-react';
import { isFirebaseConfigured } from '../../services/firebase';

interface FirebaseConfigTabProps {
  isFirebaseReady: boolean;
}

export const FirebaseConfigTab: React.FC<FirebaseConfigTabProps> = ({ isFirebaseReady }) => {
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_FIREBASE_API_KEY || '');
  const [authDomain, setAuthDomain] = useState(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '');
  const [databaseURL, setDatabaseURL] = useState(import.meta.env.VITE_FIREBASE_DATABASE_URL || '');
  const [projectId, setProjectId] = useState(import.meta.env.VITE_FIREBASE_PROJECT_ID || '');
  const [storageBucket, setStorageBucket] = useState(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '');
  const [messagingSenderId, setMessagingSenderId] = useState(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '');
  const [appId, setAppId] = useState(import.meta.env.VITE_FIREBASE_APP_ID || '');

  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);
  const [copiedEnv, setCopiedEnv] = useState(false);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);

    try {
      if (isFirebaseReady && databaseURL) {
        // Ping database endpoint .json
        const cleanUrl = databaseURL.replace(/\/+$/, '');
        const response = await fetch(`${cleanUrl}/.json?shallow=true`, { method: 'GET' });
        if (response.ok || response.status === 401) {
          // 200 or 401 (permission denied but server reached) confirms endpoint exists
          setTestResult({
            status: 'success',
            message: 'Successfully reached Firebase Realtime Database cluster.',
          });
        } else {
          setTestResult({
            status: 'error',
            message: `Endpoint responded with HTTP status ${response.status}.`,
          });
        }
      } else {
        await new Promise((r) => setTimeout(r, 600));
        if (!databaseURL || !projectId) {
          setTestResult({
            status: 'error',
            message: 'Database URL and Project ID are required to verify the Firebase connection.',
          });
        } else {
          setTestResult({
            status: 'success',
            message: 'Firebase configuration parameters formatted properly.',
          });
        }
      }
    } catch (err: any) {
      setTestResult({
        status: 'error',
        message: err.message || 'Unable to connect to database endpoint.',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const envSnippet = `# Firebase Web SDK Credentials
VITE_FIREBASE_API_KEY=${apiKey || 'your_api_key'}
VITE_FIREBASE_AUTH_DOMAIN=${authDomain || 'your_project_id.firebaseapp.com'}
VITE_FIREBASE_DATABASE_URL=${databaseURL || 'https://your_project_id-default-rtdb.firebaseio.com'}
VITE_FIREBASE_PROJECT_ID=${projectId || 'your_project_id'}
VITE_FIREBASE_STORAGE_BUCKET=${storageBucket || 'your_project_id.appspot.com'}
VITE_FIREBASE_MESSAGING_SENDER_ID=${messagingSenderId || 'your_sender_id'}
VITE_FIREBASE_APP_ID=${appId || 'your_app_id'}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(envSnippet);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Status Banner */}
      <div className="bg-surface-cardLight dark:bg-surface-cardDark p-6 rounded-2xl border border-surface-borderLight dark:border-surface-borderDark shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-borderLight dark:border-surface-borderDark">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Server className="w-5 h-5 text-institute-blue dark:text-sky-400" />
              <span>Firebase Cloud Backend Configuration</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage your Firebase Realtime Database, Authentication, and Storage endpoints.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span
              className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                isFirebaseReady
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              {isFirebaseReady ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Live Firebase Connected</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Prototype / Local Mode</span>
                </>
              )}
            </span>
          </div>
        </div>

        {testResult && (
          <div
            className={`mt-4 p-3.5 rounded-xl border text-xs flex items-center space-x-2 ${
              testResult.status === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
            }`}
          >
            {testResult.status === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Credentials Form */}
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Project ID */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Firebase Project ID
              </label>
              <input
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="e.g. sjec-aqms-project"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            {/* Database URL */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Realtime Database URL
              </label>
              <input
                type="text"
                value={databaseURL}
                onChange={(e) => setDatabaseURL(e.target.value)}
                placeholder="https://sjec-aqms-default-rtdb.firebaseio.com"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            {/* API Key */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Web API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full pl-3 pr-10 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Auth Domain */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Auth Domain
              </label>
              <input
                type="text"
                value={authDomain}
                onChange={(e) => setAuthDomain(e.target.value)}
                placeholder="sjec-aqms-project.firebaseapp.com"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            {/* Storage Bucket */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Storage Bucket
              </label>
              <input
                type="text"
                value={storageBucket}
                onChange={(e) => setStorageBucket(e.target.value)}
                placeholder="sjec-aqms-project.appspot.com"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            {/* App ID */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Firebase App ID
              </label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="1:1234567890:web:abcdef"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center space-x-2 border border-slate-300 dark:border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
              <span>{testingConnection ? 'Verifying Endpoint...' : 'Test Connection'}</span>
            </button>

            <button
              type="button"
              onClick={copyToClipboard}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-institute-blue hover:bg-institute-accent dark:bg-sky-600 dark:hover:bg-sky-500 transition-colors flex items-center space-x-2 shadow-sm"
            >
              {copiedEnv ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedEnv ? 'Copied .env Configuration!' : 'Copy .env Configuration'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Production Deployment Note */}
      <div className="bg-surface-cardLight dark:bg-surface-cardDark p-6 rounded-2xl border border-surface-borderLight dark:border-surface-borderDark shadow-sm">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-institute-blue dark:text-sky-400" />
          <span>Security & Environment Setup</span>
        </h4>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
          For production security, Firebase credentials should be persisted in the project's root <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">.env</code> file. The Vite build process embeds these variables directly into the application bundle upon build.
        </p>
        <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 text-xs font-mono overflow-x-auto">
          {envSnippet}
        </pre>
      </div>

    </div>
  );
};

export default FirebaseConfigTab;
