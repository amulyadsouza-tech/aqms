import React from 'react';
import { motion } from 'framer-motion';

const SensorCard = ({ title, icon: TitleIcon, metrics, cardClass }) => {
  // Helper to calculate humanized status descriptor for air quality metrics
  const getHumanizedStatus = (label, value) => {
    const val = Number(value) || 0;
    switch (label) {
      case 'PM 2.5':
        if (val <= 12) return 'Clean & Healthy';
        if (val <= 35.4) return 'Moderate Dust';
        return 'High Dust Alert';
      case 'PM 10':
        if (val <= 54) return 'Good Clarity';
        if (val <= 154) return 'Mild Dust';
        return 'High Particulates';
      case 'Temp':
        if (val <= 18) return 'Cool';
        if (val <= 28) return 'Comfortable Temp';
        return 'Warm Atmosphere';
      case 'Humidity':
        if (val <= 40) return 'Dry Air';
        if (val <= 65) return 'Optimal Moisture';
        return 'Sticky/Humid';
      case 'NH3 / Pollutants':
        if (val <= 25) return 'Clean & Fresh';
        if (val <= 50) return 'Acceptable Toxins';
        return 'Toxin Warning';
      case 'CO Level':
        if (val <= 4.4) return 'Trace Levels';
        if (val <= 9.0) return 'Moderate CO';
        return 'CO Warning';
      default:
        return 'Online';
    }
  };

  return (
    <motion.div 
      className={`summary-card ${cardClass}`}
      whileHover={{ y: -4 }}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="summary-card-header">
        <span className="summary-card-title">{title}</span>
        <div className="summary-icon-wrapper">
          {TitleIcon && <TitleIcon size={20} />}
        </div>
      </div>
      
      <div className="summary-metrics-container">
        {metrics.map((metric, index) => {
          const val = Number(metric.value) || 0;
          const max = Number(metric.max) || 100;
          const min = Number(metric.min) || 0;
          
          // Calculate percentage width of the bar
          const range = max - min;
          const progressPercent = Math.max(0, Math.min(100, ((val - min) / range) * 100));

          return (
            <div key={index} style={{ marginBottom: index < metrics.length - 1 ? '1rem' : 0 }}>
              <div className="metric-row">
                <span className="metric-label-small">{metric.label}</span>
                <div>
                  <span className="metric-value-large">{metric.value}</span>
                  <span className="metric-unit-label"> {metric.unit}</span>
                </div>
              </div>
              
              <div className="metric-bar-track">
                <div 
                  className="metric-bar-fill" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                <span className="metric-descriptor" style={{ color: metric.color }}>
                  {getHumanizedStatus(metric.label, metric.value)}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Max: {max}{metric.unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default SensorCard;
