import React from 'react';
import { motion } from 'framer-motion';
import { 
  GaugeContainer, 
  GaugeValueArc, 
  GaugeReferenceArc, 
  useGaugeState 
} from '@mui/x-charts/Gauge';

function GaugePointer() {
  const { valueAngle, outerRadius, cx, cy } = useGaugeState();

  if (valueAngle === null) {
    return null;
  }

  const target = {
    x: cx + outerRadius * Math.sin(valueAngle),
    y: cy - outerRadius * Math.cos(valueAngle),
  };
  return (
    <g>
      <circle cx={cx} cy={cy} r={8} fill="currentColor" />
      <path
        d={`M ${cx} ${cy} L ${target.x} ${target.y}`}
        stroke="currentColor"
        strokeWidth={4}
      />
    </g>
  );
}

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

  return (
    <div className="aqi-meter-container">
      <div style={{ position: 'relative', width: '300px', height: '300px' }}>
        {/* Glow Effect Layer */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '80%',
          height: '80%',
          borderRadius: '50%',
          background: color,
          opacity: 0.15,
          filter: 'blur(50px)',
          transition: 'all 0.5s ease',
          pointerEvents: 'none'
        }} />

        <GaugeContainer
          width={300}
          height={300}
          startAngle={-110}
          endAngle={110}
          value={value}
          min={0}
          max={500}
        >
          <GaugeReferenceArc stroke="rgba(255,255,255,0.08)" strokeWidth={12} />
          <GaugeValueArc stroke={color} strokeWidth={12} />
          <GaugePointer />
        </GaugeContainer>

        {/* Central Display */}
        <div style={{
          position: 'absolute',
          top: '55%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          pointerEvents: 'none'
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
            marginTop: '0.5rem',
            textTransform: 'uppercase'
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



