import React, { useState, useEffect } from 'react';
import './App.css';
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
  Clock
} from 'lucide-react';

function App() {
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

  // Initialize history with realistic default mock points for initial rendering
  const [history, setHistory] = useState([
    { time: '07:40:00', pm25: 12, temp: 24, nh3: 15, aqi: 24 },
    { time: '07:41:00', pm25: 14, temp: 24.5, nh3: 16, aqi: 28 },
    { time: '07:42:00', pm25: 18, temp: 25, nh3: 18, aqi: 36 },
    { time: '07:43:00', pm25: 22, temp: 26, nh3: 15, aqi: 44 },
    { time: '07:44:00', pm25: 15, temp: 25.8, nh3: 17, aqi: 30 },
    { time: '07:45:00', pm25: 11, temp: 25.2, nh3: 14, aqi: 22 }
  ]);

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

      // Append to history
      setHistory(prev => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const updated = [...prev, { time: timeStr, ...newReading }];
        if (updated.length > 8) {
          return updated.slice(updated.length - 8);
        }
        return updated;
      });
    });

    // Timeout check for database connection
    const timer = setTimeout(() => {
      if (sensorData.pm25 === 0 && sensorData.temp === 0) {
        setConnectionStatus('offline');
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

  return (
    <div className="dashboard-layout">
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
            <a href="#dashboard" className="sidebar-menu-item active">
              <LayoutDashboard size={18} />
              Dashboard
            </a>
            <a href="#trends" className="sidebar-menu-item">
              <ChartIcon size={18} />
              Real-time Trends
            </a>
            <a href="#logs" className="sidebar-menu-item">
              <Database size={18} />
              Device Logs
            </a>
            <a href="#safety" className="sidebar-menu-item">
              <ShieldCheck size={18} />
              Campus Safety
            </a>
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
          <div className="search-bar">
            <Search size={18} className="text-muted" />
            <input type="text" placeholder="Search campus blocks or metrics..." />
          </div>

          <div className="header-actions">
            <button className="action-btn" aria-label="Notifications">
              <Bell size={20} />
              <span className="notification-dot" />
            </button>
            <div className="user-profile">
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
            </div>
          </div>
        </header>

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
                  <option>Last 24 Hours</option>
                  <option>Last 7 Days</option>
                </select>
              </div>

              <div style={{ width: '100%', height: '300px', display: 'flex', justifyContent: 'center' }}>
                <LineChart
                  xAxis={[{ 
                    data: history.map(h => h.time.split(':').slice(0, 2).join(':')), // Shorten time to HH:MM
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

        <footer className="footer-credits">
          <p>© 2026 SJEC Sustainable Campus Initiative • Real-time Data Analytics Console</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
