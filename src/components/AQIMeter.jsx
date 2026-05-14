import React from 'react';
import { motion } from 'framer-motion';

const AQIMeter = ({ value }) => {
  const getAQIInfo = (val) => {
    if (val <= 50) return { label: 'Excellent', color: '#10b981' };
    if (val <= 100) return { label: 'Good', color: '#22c55e' };
    if (val <= 200) return { label: 'Moderate', color: '#f59e0b' };
    if (val <= 300) return { label: 'Poor', color: '#f97316' };
    if (val <= 400) return { label: 'Very Poor', color: '#ef4444' };
    return { label: 'Severe', color: '#7f1d1d' };
  };

  const { label, color } = getAQIInfo(value);
  const percentage = Math.min((value / 500) * 100, 100);
  
  // High-visibility Circular Parameters
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="aqi-meter-container">
      <div style={{ position: 'relative', width: '100%', maxWidth: '340px', aspectRatio: '1/1' }}>
        {/* Glow Effect Layer */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          height: '90%',
          borderRadius: '50%',
          background: color,
          opacity: 0.1,
          filter: 'blur(40px)',
          transition: 'all 0.5s ease'
        }} />

        <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
          {/* Background Track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--icon-bg)"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.5"
          />
          
          {/* Main Progress Arc */}
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: strokeDashoffset }}
            transition={{ duration: 2, ease: "circOut" }}
          />
        </svg>

        {/* Central Display */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <span style={{ 
            fontSize: '4.5rem', 
            fontWeight: 800, 
            color: 'var(--text-primary)',
            lineHeight: 1,
            letterSpacing: '-2px'
          }}>
            {Math.round(value)}
          </span>
          <span style={{ 
            fontSize: '0.9rem', 
            fontWeight: 700, 
            color: 'var(--text-secondary)',
            letterSpacing: '2px',
            marginTop: '0.5rem'
          }}>
            AQI INDEX
          </span>
        </div>
      </div>
      
      {/* Dynamic Status Badge */}
      <motion.div 
        className="aqi-status-badge"
        style={{ 
          backgroundColor: color, 
          color: '#fff',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {label}
      </motion.div>
    </div>
  );
};

export default AQIMeter;



