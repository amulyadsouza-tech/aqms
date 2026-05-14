import React from 'react';
import { motion } from 'framer-motion';

const SensorCard = ({ title, icon: TitleIcon, metrics }) => {
  return (
    <motion.div 
      className="glass-card sensor-card"
      whileHover={{ scale: 1.02 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="card-title">
        {TitleIcon && <TitleIcon size={18} />}
        {title}
      </div>
      
      <div className="sensor-items">
        {metrics.map((metric, index) => (
          <div key={index} className="sensor-item">
            <div className="sensor-icon" style={{ color: metric.color }}>
              <metric.icon size={32} />
            </div>
            <div className="sensor-info">
              <span className="sensor-label">{metric.label}</span>
              <div className="sensor-value-group">
                <span className="sensor-value">{metric.value}</span>
                <span className="sensor-unit">{metric.unit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default SensorCard;


