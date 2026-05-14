import React, { useState, useEffect } from 'react';
import './App.css';
import ScrollSequenceCanvas from './components/ScrollSequenceCanvas';
import AQIMeter from './components/AQIMeter';
import SensorCard from './components/SensorCard';
import { SunOutlineIcon, Moon02Icon } from './components/Icons';
import { subscribeToSensorData } from './firebase/config';
import { 
  Wind, 
  Droplets, 
  Thermometer, 
  Activity, 
  CloudRain, 
  Zap,
  Cpu,
  Layers,
  Waves,
  Gauge
} from 'lucide-react';

function App() {
  const [theme, setTheme] = useState('dark');
  const [sensorData, setSensorData] = useState({
    pm25: 45,
    pm10: 82,
    co: 1.2,
    nh3: 12,
    temp: 28,
    humidity: 65,
    aqi: 95
  });

  useEffect(() => {
    const unsubscribe = subscribeToSensorData((data) => {
      const aqi = calculateAQI(data.pm25, data.pm10);
      setSensorData({ ...data, aqi });
    });

    return () => unsubscribe && unsubscribe();
  }, []);

  const calculateAQI = (pm25, pm10) => {
    const aqiPM25 = pm25 * 2; 
    const aqiPM10 = pm10 * 1.5;
    return Math.max(aqiPM25, aqiPM10);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'day' ? 'dark' : 'day');
  };

  return (
    <div className={`app ${theme}`}>
      <ScrollSequenceCanvas theme={theme} />
      
      <div className="scroll-container">
        <header className="header">
          <div className="header-left">
            {/* Empty space for grid alignment */}
          </div>

          <div className="title-container">
            <h1>AQMS SJEC</h1>
          </div>

          <div className="header-right">
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme">
              {theme === 'day' ? (
                <SunOutlineIcon size={22} />
              ) : (
                <Moon02Icon size={22} />
              )}
            </button>
          </div>
        </header>

        <main className="dashboard-container">
          <div className="welcome-msg">
            <h2>Live Air Quality</h2>
            <p>Real-time environmental monitoring for a sustainable campus.</p>
          </div>

          <div className="main-content">
            {/* Main Gauge Section */}
            <section className="glass-card aqi-card">
              <div className="card-title">
                <Gauge size={18} />
                Atmospheric Health
              </div>
              <AQIMeter value={sensorData.aqi} />
              <div className="location-tag">
                St. Joseph Engineering College
                <span>Campus Node • Vamanjoor, Mangaluru</span>
              </div>
            </section>

            {/* Detailed Sensor Grid */}
            <div className="sensor-grid">
              <SensorCard 
                title="PMS7003 Core"
                icon={Layers}
                metrics={[
                  { icon: Activity, label: "PM 2.5", value: sensorData.pm25, unit: "µg/m³", color: "#38bdf8" },
                  { icon: Wind, label: "PM 10", value: sensorData.pm10, unit: "µg/m³", color: "#10b981" }
                ]}
              />

              <SensorCard 
                title="DHT22 Atmosphere"
                icon={Waves}
                metrics={[
                  { icon: Thermometer, label: "Temperature", value: sensorData.temp, unit: "°C", color: "#f59e0b" },
                  { icon: Droplets, label: "Humidity", value: sensorData.humidity, unit: "%", color: "#6366f1" }
                ]}
              />

              <SensorCard 
                title="MQ135 Toxins"
                icon={Cpu}
                metrics={[
                  { icon: CloudRain, label: "NH3 / Pollutants", value: sensorData.nh3, unit: "ppm", color: "#ef4444" }
                ]}
              />

              <SensorCard 
                title="MQ7 Carbon"
                icon={Zap}
                metrics={[
                  { icon: Zap, label: "CO Concentration", value: sensorData.co, unit: "ppm", color: "#facc15" }
                ]}
              />
            </div>
          </div>
        </main>

        <footer className="footer-credits" style={{ padding: '4rem 0', textAlign: 'center', opacity: 0.4, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
          <p>© 2024 SJEC Sustainable Campus Initiative • Real-time Data Analytics</p>
        </footer>
      </div>
    </div>
  );
}

export default App;




