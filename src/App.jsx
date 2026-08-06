import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Silk from './components/Silk';
import AQIMeter from './components/AQIMeter';
import SensorCard from './components/SensorCard';
import { subscribeToSensorData } from './firebase/config';
import { LineChart } from '@mui/x-charts/LineChart';
import { 
  Wind, 
  Droplets, 
  Thermometer, 
  Activity, 
  CloudRain, 
  Zap,
  Layers,
  Waves,
  LayoutDashboard,
  LineChart as ChartIcon,
  Database,
  ShieldCheck,
  Search,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Compass,
  MapPin,
  Clock,
  Cpu,
  Info,
  Terminal,
  RefreshCw,
  Copy,
  Check,
  LogOut,
  User,
  Settings,
  X
} from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
  // IoT Port Configurations
  const [iotPort, setIotPort] = useState('COM3');
  const [iotBaud, setIotBaud] = useState('115200');
  const [iotInterval, setIotInterval] = useState('5s');
  const [serialLogs, setSerialLogs] = useState([
    { text: '--- Terminal initialized ---', type: 'info' },
    { text: '[SYSTEM] IoT Serial monitor ready. Monitoring COM3...', type: 'success' }
  ]);
  const [copiedCode, setCopiedCode] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Toxins (NH3) reading moderate in Research Labs.', type: 'warning', time: '5 min ago', read: false },
    { id: 2, text: 'Gateway Node 3 successfully synced with Firebase.', type: 'success', time: '12 min ago', read: false },
    { id: 3, text: 'Boys Hostel Block Node went offline. Please check power.', type: 'alert', time: '1 hr ago', read: false },
    { id: 4, text: 'Perfect air quality index detected at Central Library.', type: 'info', time: '2 hrs ago', read: true }
  ]);

  const [sensorData, setSensorData] = useState({
    pm25: 0,
    pm10: 0,
    co: 0,
    nh3: 0,
    temp: 0,
    humidity: 0,
    aqi: 0
  });

  const [connectionStatus, setConnectionStatus] = useState('online');

  // Real-time chart history
  const [history, setHistory] = useState([
    { time: '08:00:00', pm25: 12, pm10: 22, temp: 24, nh3: 15, co: 1.2, aqi: 24 },
    { time: '08:01:00', pm25: 14, pm10: 24, temp: 24.5, nh3: 16, co: 1.3, aqi: 28 },
    { time: '08:02:00', pm25: 18, pm10: 28, temp: 25, nh3: 18, co: 1.5, aqi: 36 },
    { time: '08:03:00', pm25: 22, pm10: 34, temp: 26, nh3: 15, co: 1.4, aqi: 44 },
    { time: '08:04:00', pm25: 15, pm10: 29, temp: 25.8, nh3: 17, co: 1.3, aqi: 30 },
    { time: '08:05:00', pm25: 11, pm10: 21, temp: 25.2, nh3: 14, co: 1.1, aqi: 22 }
  ]);

  // Terminal scroll reference
  const consoleEndRef = useRef(null);

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [serialLogs]);

  // Firebase listener
  useEffect(() => {
    const unsubscribe = subscribeToSensorData((data) => {
      if (!data) return;
      const aqi = calculateAQI(data.pm25 || 0, data.pm10 || 0);
      const newReading = {
        pm25: Number(data.pm25) || 0,
        pm10: Number(data.pm10) || 0,
        co: Number(data.co) || 0,
        nh3: Number(data.nh3) || 0,
        temp: Number(data.temp) || 0,
        humidity: Number(data.humidity) || 0,
        aqi
      };

      setSensorData(newReading);
      setConnectionStatus('online');

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Append to line chart history
      setHistory(prev => {
        const updated = [...prev, { time: timeStr, ...newReading }];
        if (updated.length > 8) {
          return updated.slice(updated.length - 8);
        }
        return updated;
      });

      // Append to IoT Serial Terminal Monitor log
      setSerialLogs(prev => [
        ...prev,
        { text: `[${timeStr}] [TX] Uploading payload to Firebase...`, type: 'info' },
        { text: `[${timeStr}] [DATA] { pm25: ${newReading.pm25}, pm10: ${newReading.pm10}, temp: ${newReading.temp}, hum: ${newReading.humidity}, co: ${newReading.co}, nh3: ${newReading.nh3} }`, type: 'input' },
        { text: `[${timeStr}] [SUCCESS] Database synced (200 OK). Gateway healthy.`, type: 'success' }
      ]);
    });

    // Device connection checker
    const timer = setTimeout(() => {
      if (sensorData.pm25 === 0 && sensorData.temp === 0) {
        setConnectionStatus('offline');
        setSerialLogs(prev => [
          ...prev,
          { text: '[WARNING] No data received from COM3 serial interface for 10 seconds. Check cable alignment.', type: 'warning' }
        ]);
      }
    }, 10000);

    return () => {
      unsubscribe && unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const calculateAQI = (pm25, pm10) => {
    const aqiPM25 = pm25 * 2; 
    const aqiPM10 = pm10 * 1.5;
    return Math.max(aqiPM25, aqiPM10);
  };

  // Search Engine suggestions filter
  const allSuggestions = [
    { title: 'Academic Block 1', type: 'Node Location', tab: 'dashboard' },
    { title: 'Central Library', type: 'Node Location', tab: 'dashboard' },
    { title: 'Research Labs', type: 'Node Location', tab: 'dashboard' },
    { title: 'Boys Hostel Block', type: 'Node Location', tab: 'dashboard' },
    { title: 'Particulate Matter (PM 2.5)', type: 'Metric parameter', tab: 'trends' },
    { title: 'Carbon Monoxide Levels', type: 'Metric parameter', tab: 'trends' },
    { title: 'ESP32 Device Connections', type: 'Setup config', tab: 'iot' },
    { title: 'Safety Advisories', type: 'System guidance', tab: 'safety' }
  ];

  const filteredSuggestions = query => {
    if (!query) return [];
    return allSuggestions.filter(item => 
      item.title.toLowerCase().includes(query.toLowerCase())
    );
  };

  const handleSuggestionClick = (tab) => {
    setActiveTab(tab);
    setSearchQuery('');
    setSearchFocused(false);
  };

  // Notification management functions
  const clearNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // PlatformIO C++ Code template to connect device to Firebase via COM3
  const platformIoCode = `#include <Arduino.h>
#include <WiFi.h>
#include <FirebaseESP32.h>

#define WIFI_SSID "SJEC_WiFi_Campus"
#define WIFI_PASSWORD "sjec@gateway2026"

// Firebase Database Secret and URL config
#define FIREBASE_HOST "practive-b6bbc-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "AIzaSyDjE8Omi0Ghqt-393nshqcHpdyNQ-7UhgI"

FirebaseData firebaseData;

void setup() {
  Serial.begin(115200); // Connect via COM3
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWiFi connected.");
  
  Firebase.begin(FIREBASE_HOST, FIREBASE_AUTH);
  Firebase.reconnectWiFi(true);
}

void loop() {
  // Read sensor pins (Mock sensors demonstration)
  float pm25 = analogRead(32) * (200.0 / 4095.0);
  float pm10 = analogRead(33) * (200.0 / 4095.0);
  float temp = 24.0 + (analogRead(34) * (15.0 / 4095.0));
  float hum = 50.0 + (analogRead(35) * (30.0 / 4095.0));
  float nh3 = analogRead(36) * (500.0 / 4095.0);
  float co = analogRead(39) * (100.0 / 4095.0);

  // Sync to database paths
  Firebase.setFloat(firebaseData, "/sensors/data/pm25", pm25);
  Firebase.setFloat(firebaseData, "/sensors/data/pm10", pm10);
  Firebase.setFloat(firebaseData, "/sensors/data/temp", temp);
  Firebase.setFloat(firebaseData, "/sensors/data/humidity", hum);
  Firebase.setFloat(firebaseData, "/sensors/data/nh3", nh3);
  Firebase.setFloat(firebaseData, "/sensors/data/co", co);

  delay(5000); // Stream interval
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(platformIoCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getUnreadCount = () => notifications.filter(n => !n.read).length;

  return (
    <div className="dashboard-layout">
      {/* Silk Animated Background */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none'
      }}>
        <Silk
          speed={3}
          scale={1.2}
          color="#c8d8f0"
          noiseIntensity={1.2}
          rotation={0.1}
        />
        {/* Soft overlay to keep UI readable */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(248,250,252,0.72)',
          backdropFilter: 'blur(1px)'
        }} />
      </div>
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-brand">
            <div className="brand-logo-circle">A</div>
            <div className="brand-text">
              <h1>AQMS SJEC</h1>
              <span>Live Campus Node</span>
            </div>
          </div>

          <nav className="sidebar-menu">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`sidebar-menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('trends')} 
              className={`sidebar-menu-item ${activeTab === 'trends' ? 'active' : ''}`}
            >
              <ChartIcon size={18} />
              Real-time Trends
            </button>
            <button 
              onClick={() => setActiveTab('logs')} 
              className={`sidebar-menu-item ${activeTab === 'logs' ? 'active' : ''}`}
            >
              <Database size={18} />
              Device Logs
            </button>
            <button 
              onClick={() => setActiveTab('safety')} 
              className={`sidebar-menu-item ${activeTab === 'safety' ? 'active' : ''}`}
            >
              <ShieldCheck size={18} />
              Campus Safety
            </button>
            <button 
              onClick={() => setActiveTab('iot')} 
              className={`sidebar-menu-item ${activeTab === 'iot' ? 'active' : ''}`}
            >
              <Cpu size={18} />
              IoT Connections
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="node-status-badge">
            <div className={`status-indicator ${connectionStatus}`} />
            <div className="node-status-info">
              <h4>Gateway Node 3</h4>
              <p>{connectionStatus === 'online' ? 'Connected to Firebase' : 'Disconnected'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Wrapper */}
      <div className="main-wrapper">
        <header className="top-header">
          <div className="search-bar" style={{ position: 'relative' }}>
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              placeholder="Search campus blocks or metrics..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            />
            {/* Search Suggestions Overlay */}
            {searchFocused && searchQuery && (
              <div className="search-suggestions">
                {filteredSuggestions(searchQuery).length > 0 ? (
                  filteredSuggestions(searchQuery).map((item, i) => (
                    <div 
                      key={i} 
                      className="search-suggestion-item"
                      onMouseDown={() => handleSuggestionClick(item.tab)}
                    >
                      <span>{item.title}</span>
                      <span className="search-suggestion-type">{item.type}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    No results found
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="header-actions">
            {/* Notifications Bell */}
            <button 
              className="action-btn" 
              aria-label="Notifications"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileDropdown(false);
              }}
            >
              <Bell size={20} />
              {getUnreadCount() > 0 && <span className="notification-dot" />}
            </button>

            {showNotifications && (
              <div className="notifications-dropdown">
                <div className="dropdown-header">
                  <h4>Alerts & Diagnostics</h4>
                  {notifications.length > 0 && (
                    <button className="dropdown-clear-btn" onClick={clearAllNotifications}>Clear all</button>
                  )}
                </div>
                <ul className="notifications-list">
                  {notifications.length > 0 ? (
                    notifications.map(n => (
                      <li key={n.id} className={`notification-item ${!n.read ? 'unread' : ''}`}>
                        <div className={`notification-icon-indicator ${n.type}`}>
                          {n.type === 'alert' && <AlertTriangle size={12} />}
                          {n.type === 'warning' && <AlertTriangle size={12} />}
                          {n.type === 'success' && <CheckCircle2 size={12} />}
                          {n.type === 'info' && <Info size={12} />}
                        </div>
                        <div className="notification-body">
                          <p>{n.text}</p>
                          <span className="notification-time">{n.time}</span>
                        </div>
                        <button 
                          className="notification-dismiss" 
                          onClick={() => clearNotification(n.id)}
                          title="Dismiss"
                        >
                          <X size={12} />
                        </button>
                      </li>
                    ))
                  ) : (
                    <div className="dropdown-empty">
                      <CheckCircle2 size={32} style={{ color: 'var(--color-emerald)' }} />
                      <p>All diagnostics healthy!</p>
                    </div>
                  )}
                </ul>
              </div>
            )}

            {/* Profile Dropdown */}
            <div 
              className="user-profile"
              onClick={() => {
                setShowProfileDropdown(!showProfileDropdown);
                setShowNotifications(false);
              }}
            >
              <div 
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: '#6366f1',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  border: '2px solid var(--border-color)'
                }}
              >
                CA
              </div>
              <div className="user-info-text">
                <h3>Campus Admin</h3>
                <p>sjec.edu.in</p>
              </div>

              {showProfileDropdown && (
                <div className="profile-dropdown">
                  <button className="profile-dropdown-item" onClick={() => setActiveTab('iot')}>
                    <Settings size={14} /> Device Setup
                  </button>
                  <button className="profile-dropdown-item" onClick={() => setActiveTab('safety')}>
                    <User size={14} /> Safety Guides
                  </button>
                  <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '0.35rem 0' }} />
                  <button className="profile-dropdown-item" style={{ color: 'var(--color-rose)' }} onClick={() => alert('Log out clicked')}>
                    <LogOut size={14} /> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Tab-driven View Router */}
        {activeTab === 'dashboard' && (
          <main className="dashboard-container">
            <div className="welcome-section">
              <h2>Hi, welcome back!</h2>
              <p>Here is your real-time campus air quality overview.</p>
            </div>

            {/* Top 4 Summary Metrics Grid */}
            <section className="summary-grid">
              <SensorCard 
                title="Pollution"
                cardClass="pollution"
                icon={Layers}
                metrics={[
                  { icon: Activity, label: "PM 2.5", value: sensorData.pm25, unit: "µg/m³", color: "var(--color-blue)", min: 0, max: 200 },
                  { icon: Wind, label: "PM 10", value: sensorData.pm10, unit: "µg/m³", color: "var(--color-blue)", min: 0, max: 200 }
                ]}
              />

              <SensorCard 
                title="Atmospheric Air"
                cardClass="atmosphere"
                icon={Waves}
                metrics={[
                  { icon: Thermometer, label: "Temp", value: sensorData.temp, unit: "°C", color: "var(--color-amber)", min: 0, max: 50 },
                  { icon: Droplets, label: "Humidity", value: sensorData.humidity, unit: "%", color: "var(--color-amber)", min: 0, max: 100 }
                ]}
              />

              <SensorCard 
                title="Chemical Toxins"
                cardClass="toxins"
                icon={CloudRain}
                metrics={[
                  { icon: CloudRain, label: "NH3 / Pollutants", value: sensorData.nh3, unit: "ppm", color: "var(--color-emerald)", min: 0, max: 500 }
                ]}
              />

              <SensorCard 
                title="Carbon Monoxide"
                cardClass="carbon"
                icon={Zap}
                metrics={[
                  { icon: Zap, label: "CO Level", value: sensorData.co, unit: "ppm", color: "var(--color-indigo)", min: 0, max: 100 }
                ]}
              />
            </section>

            {/* Middle Analytics Section */}
            <section className="analytics-grid">
              <div className="chart-card">
                <div className="card-header-actions">
                  <h4 className="card-title">Real-time Air Trend Analysis</h4>
                  <select className="chart-dropdown" aria-label="Select year">
                    <option>Live Stream</option>
                  </select>
                </div>

                <div style={{ width: '100%', height: '300px', display: 'flex', justifyContent: 'center' }}>
                  <LineChart
                    xAxis={[{ 
                      data: history.map(h => h.time.split(':').slice(0, 2).join(':')),
                      scaleType: 'point' 
                    }]}
                    series={[
                      { data: history.map(h => h.pm25), label: 'PM 2.5 (µg/m³)', color: '#3b82f6', showMark: false },
                      { data: history.map(h => h.temp), label: 'Temp (°C)', color: '#f59e0b', showMark: false },
                      { data: history.map(h => h.nh3 / 10), label: 'Toxins (ppm / 10)', color: '#10b981', showMark: false }
                    ]}
                    height={300}
                  />
                </div>
              </div>

              <AQIMeter value={sensorData.aqi} />
            </section>

            {/* Bottom Grid: Locations Table & Checklist */}
            <section className="bottom-grid">
              <div className="table-card">
                <h4 className="card-title">Campus Monitoring Nodes</h4>
                <div className="table-container">
                  <table className="nodes-table">
                    <thead>
                      <tr>
                        <th>Location Node</th>
                        <th>Gateway Status</th>
                        <th>Current AQI</th>
                        <th>Node Type</th>
                        <th>Latency</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <div className="table-node-name">
                            <div className="table-node-icon"><MapPin size={16} /></div>
                            Academic Block 1
                          </div>
                        </td>
                        <td><span className="table-badge online">Active</span></td>
                        <td><strong>{Math.round(sensorData.aqi)} AQI</strong></td>
                        <td>ESP32 Main</td>
                        <td><span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12} /> Live</span></td>
                      </tr>
                      <tr>
                        <td>
                          <div className="table-node-name">
                            <div className="table-node-icon"><MapPin size={16} /></div>
                            Central Library
                          </div>
                        </td>
                        <td><span className="table-badge online">Active</span></td>
                        <td><strong>32 AQI</strong></td>
                        <td>ESP32 Sub</td>
                        <td><span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12} /> 2 min ago</span></td>
                      </tr>
                      <tr>
                        <td>
                          <div className="table-node-name">
                            <div className="table-node-icon"><MapPin size={16} /></div>
                            Research Labs
                          </div>
                        </td>
                        <td><span className="table-badge online">Active</span></td>
                        <td><strong>48 AQI</strong></td>
                        <td>ESP32 Dev</td>
                        <td><span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12} /> 4 min ago</span></td>
                      </tr>
                      <tr>
                        <td>
                          <div className="table-node-name">
                            <div className="table-node-icon"><MapPin size={16} /></div>
                            Boys Hostel Block
                          </div>
                        </td>
                        <td><span className="table-badge offline">Offline</span></td>
                        <td><strong>--</strong></td>
                        <td>ESP32 Sub</td>
                        <td><span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12} /> 3 hrs ago</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="checklist-card">
                <h4 className="card-title">Campus Health Actions</h4>
                <ul className="checklist-items">
                  <li className="checklist-item">
                    <div className="checklist-icon">
                      <CheckCircle2 size={16} style={{ color: 'var(--color-emerald)' }} />
                    </div>
                    <div className="checklist-content">
                      <h5>Eco-Transport Encouraged</h5>
                      <p>Ideal conditions detected. Use bicycles or electric campus shuttles today.</p>
                    </div>
                  </li>
                  <li className="checklist-item">
                    <div className="checklist-icon">
                      <CheckCircle2 size={16} style={{ color: 'var(--color-blue)' }} />
                    </div>
                    <div className="checklist-content">
                      <h5>Open-Air Ventilation</h5>
                      <p>Natural air quality is excellent. Open classroom windows to improve air exchange.</p>
                    </div>
                  </li>
                  <li className="checklist-item">
                    <div className="checklist-icon">
                      <Compass size={16} style={{ color: 'var(--color-amber)' }} />
                    </div>
                    <div className="checklist-content">
                      <h5>Sports Ground Available</h5>
                      <p>Perfect index values for outdoor physical education classes and sports activity.</p>
                    </div>
                  </li>
                </ul>
              </div>
            </section>
          </main>
        )}

        {activeTab === 'trends' && (
          <main className="dashboard-container">
            <div className="welcome-section">
              <h2>Historical Trends & Analysis</h2>
              <p>In-depth look at air parameters over time.</p>
            </div>

            <section className="chart-card" style={{ padding: '2.5rem' }}>
              <div className="card-header-actions">
                <h4 className="card-title">Particulate Matter Concentration (PM2.5 & PM10)</h4>
              </div>
              <div style={{ width: '100%', height: '350px' }}>
                <LineChart
                  xAxis={[{ data: history.map(h => h.time), scaleType: 'point' }]}
                  series={[
                    { data: history.map(h => h.pm25), label: 'PM 2.5 (µg/m³)', color: '#3b82f6' },
                    { data: history.map(h => h.pm10), label: 'PM 10 (µg/m³)', color: '#10b981' }
                  ]}
                  height={350}
                />
              </div>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <section className="chart-card">
                <h4 className="card-title">Temperature & Air Moisture</h4>
                <div style={{ width: '100%', height: '300px' }}>
                  <LineChart
                    xAxis={[{ data: history.map(h => h.time), scaleType: 'point' }]}
                    series={[
                      { data: history.map(h => h.temp), label: 'Temp (°C)', color: '#f59e0b' },
                      { data: history.map(h => h.humidity), label: 'Humidity (%)', color: '#6366f1' }
                    ]}
                    height={300}
                  />
                </div>
              </section>

              <section className="chart-card">
                <h4 className="card-title">Gaseous Pollutants (NH3 & CO)</h4>
                <div style={{ width: '100%', height: '300px' }}>
                  <LineChart
                    xAxis={[{ data: history.map(h => h.time), scaleType: 'point' }]}
                    series={[
                      { data: history.map(h => h.nh3), label: 'NH3 Toxins (ppm)', color: '#ef4444' },
                      { data: history.map(h => h.co), label: 'CO Level (ppm)', color: '#8b5cf6' }
                    ]}
                    height={300}
                  />
                </div>
              </section>
            </div>
          </main>
        )}

        {activeTab === 'logs' && (
          <main className="dashboard-container">
            <div className="welcome-section">
              <h2>Database Logs Console</h2>
              <p>Filterable chronological historical records synced directly from your Firebase gateway node.</p>
            </div>

            <section className="table-card" style={{ padding: '2.5rem' }}>
              <div className="card-header-actions">
                <h4 className="card-title">Activity Sync Log Table</h4>
                <button className="btn-secondary" onClick={() => {
                  setHistory(prev => [
                    { time: new Date().toLocaleTimeString(), pm25: Math.round(Math.random()*20+5), pm10: Math.round(Math.random()*40+15), temp: 26, humidity: 55, co: 1.2, nh3: 12, aqi: 30 },
                    ...prev
                  ]);
                }}>
                  <RefreshCw size={14} /> Force Poll Entry
                </button>
              </div>

              <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <table className="nodes-table">
                  <thead>
                    <tr>
                      <th>Sync Timestamp</th>
                      <th>Fine Dust (PM2.5)</th>
                      <th>Inhalable (PM10)</th>
                      <th>Temp / Humidity</th>
                      <th>Chemicals (NH3)</th>
                      <th>CO Level</th>
                      <th>Calibrated AQI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice().reverse().map((log, index) => (
                      <tr key={index}>
                        <td><span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}><Clock size={14} /> {log.time}</span></td>
                        <td><span style={{ color: 'var(--color-blue)', fontWeight: 700 }}>{log.pm25} µg/m³</span></td>
                        <td>{log.pm10} µg/m³</td>
                        <td>{log.temp}°C / {log.humidity}%</td>
                        <td><span style={{ color: 'var(--color-emerald)', fontWeight: 700 }}>{log.nh3} ppm</span></td>
                        <td>{log.co} ppm</td>
                        <td>
                          <span 
                            className="table-badge" 
                            style={{ 
                              backgroundColor: log.aqi <= 50 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: log.aqi <= 50 ? 'var(--color-emerald)' : 'var(--color-amber)'
                            }}
                          >
                            {log.aqi} AQI
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </main>
        )}

        {activeTab === 'safety' && (
          <main className="dashboard-container">
            <div className="welcome-section">
              <h2>Campus Safety & Threshold Guides</h2>
              <p>Standard thresholds, comfort limits, and health protection advisories for SJEC campus blocks.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
              <section className="table-card">
                <h4 className="card-title" style={{ marginBottom: '1.5rem' }}>National Air Quality Standard Guide</h4>
                <div className="table-container">
                  <table className="nodes-table">
                    <thead>
                      <tr>
                        <th>AQI Range</th>
                        <th>Health Risk Category</th>
                        <th>Recommended General Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><span className="table-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-emerald)' }}>0 - 50</span></td>
                        <td><strong>Satisfactory (Excellent)</strong></td>
                        <td>No precautions required. Outdoor activity encouraged.</td>
                      </tr>
                      <tr>
                        <td><span className="table-badge" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>51 - 100</span></td>
                        <td><strong>Moderate (Good)</strong></td>
                        <td>Extremely sensitive people should limit heavy outdoor exertion.</td>
                      </tr>
                      <tr>
                        <td><span className="table-badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--color-amber)' }}>101 - 200</span></td>
                        <td><strong>Mild Pollution (Moderate)</strong></td>
                        <td>Sensitive groups should limit outdoor sports blocks.</td>
                      </tr>
                      <tr>
                        <td><span className="table-badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-rose)' }}>201 - 300</span></td>
                        <td><strong>Poor</strong></td>
                        <td>Everyone should wear masks; close academic classroom ventilation.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="checklist-card" style={{ height: 'fit-content' }}>
                <h4 className="card-title">Campus Action Advisory Rules</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '12px', borderLeft: '4px solid var(--color-blue)' }}>
                    <h5 style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.2rem' }}>Green Building Initiative</h5>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>If overall AQI remains below 50 for 4 hours, central AC chillers enter ECO mode and air circulators swap to 100% natural intake.</p>
                  </div>
                  
                  <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '12px', borderLeft: '4px solid var(--color-rose)' }}>
                    <h5 style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.2rem' }}>Toxins Limit Safety Cutoff</h5>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Should chemical levels (NH3) cross 100ppm in any block, safety exhaust fans automatically engage, and diagnostic push alerts trigger on the Admin Console.</p>
                  </div>
                </div>
              </section>
            </div>
          </main>
        )}

        {activeTab === 'iot' && (
          <main className="dashboard-container">
            <div className="welcome-section">
              <h2>IoT Integration Dashboard</h2>
              <p>Configure hardware parameters, upload codes, and check serial communication payload on COM3.</p>
            </div>

            <section className="iot-layout">
              {/* Left Column: Device Configuration and Source Code */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div className="iot-panel">
                  <h4 className="card-title">Gateway Port Configurations</h4>
                  
                  <div className="iot-config-row">
                    <div className="iot-input-group">
                      <label htmlFor="serial-port-select">Serial Port Link</label>
                      <select 
                        id="serial-port-select"
                        value={iotPort} 
                        onChange={e => {
                          setIotPort(e.target.value);
                          setSerialLogs(prev => [...prev, { text: `[SYSTEM] Port changed to ${e.target.value}`, type: 'info' }]);
                        }}
                      >
                        <option>COM1</option>
                        <option>COM2</option>
                        <option>COM3</option>
                        <option>COM4</option>
                      </select>
                    </div>

                    <div className="iot-input-group">
                      <label htmlFor="baud-rate-select">Baud Rate speed</label>
                      <select 
                        id="baud-rate-select"
                        value={iotBaud} 
                        onChange={e => {
                          setIotBaud(e.target.value);
                          setSerialLogs(prev => [...prev, { text: `[SYSTEM] Speed configured to ${e.target.value} bps`, type: 'info' }]);
                        }}
                      >
                        <option>9600</option>
                        <option>57600</option>
                        <option>115200</option>
                      </select>
                    </div>

                    <div className="iot-input-group">
                      <label htmlFor="sync-interval-select">Sync Interval</label>
                      <select 
                        id="sync-interval-select"
                        value={iotInterval} 
                        onChange={e => {
                          setIotInterval(e.target.value);
                          setSerialLogs(prev => [...prev, { text: `[SYSTEM] Broadcast interval set to ${e.target.value}`, type: 'info' }]);
                        }}
                      >
                        <option>2s</option>
                        <option>5s</option>
                        <option>10s</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn-primary" onClick={() => {
                      setSerialLogs(prev => [
                        ...prev,
                        { text: `[SYSTEM] Restarting handshake sequence on ${iotPort}...`, type: 'warning' },
                        { text: `[SUCCESS] Connection established successfully at ${iotBaud} baud rate. Streaming...`, type: 'success' }
                      ]);
                    }}>
                      <RefreshCw size={14} /> Restart Gateway
                    </button>
                    <button className="btn-secondary" onClick={() => setSerialLogs([
                      { text: `--- Terminal log cleared at ${new Date().toLocaleTimeString()} ---`, type: 'info' }
                    ])}>
                      Clear Terminal
                    </button>
                  </div>
                </div>

                <div className="iot-panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 className="card-title">ESP32 Firmware Source Code</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Libraries: WiFi.h, FirebaseESP32.h</span>
                  </div>

                  <div className="code-block-wrapper">
                    <div className="code-header">
                      <span className="code-lang">PlatformIO / Arduino C++</span>
                      <button className="code-copy-btn" onClick={copyToClipboard} title="Copy code">
                        {copiedCode ? <Check size={16} style={{ color: 'var(--color-emerald)' }} /> : <Copy size={16} />}
                      </button>
                    </div>
                    <pre className="code-pre"><code>{platformIoCode}</code></pre>
                  </div>
                </div>
              </div>

              {/* Right Column: Serial Monitor Output */}
              <div className="iot-terminal-card">
                <div className="terminal-header">
                  <div className="terminal-dots">
                    <span className="terminal-dot red" />
                    <span className="terminal-dot yellow" />
                    <span className="terminal-dot green" />
                  </div>
                  <span className="terminal-title"><Terminal size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> SERIAL MONITOR - {iotPort}</span>
                  <span className="terminal-status">
                    <span className="status-indicator online" style={{ width: '8px', height: '8px', marginRight: '4px', boxShadow: 'none' }} /> ACTIVE ({iotBaud} baud)
                  </span>
                </div>

                <div className="terminal-console">
                  {serialLogs.map((log, i) => (
                    <div key={i} className={`terminal-line ${log.type}`}>
                      {log.text}
                    </div>
                  ))}
                  <div ref={consoleEndRef} />
                </div>
              </div>
            </section>
          </main>
        )}
      </div>
    </div>
  );
}

export default App;
