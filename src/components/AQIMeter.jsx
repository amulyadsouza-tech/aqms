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
      <circle cx={cx} cy={cy} r={6} fill="#0f172a" />
      <path
        d={`M ${cx} ${cy} L ${target.x} ${target.y}`}
        stroke="#0f172a"
        strokeWidth={3}
        strokeLinecap="round"
      />
    </g>
  );
}

const AQIMeter = ({ value }) => {
  const getAQIInfo = (val) => {
    if (val <= 50) return { label: 'Excellent', color: '#10b981', desc: 'Air quality is satisfactory, and air pollution poses little or no risk.', advice: 'Perfect day for outdoor exercises and campus walks!' };
    if (val <= 100) return { label: 'Good', color: '#22c55e', desc: 'Air quality is acceptable; however, there may be some risk for sensitive people.', advice: 'Great day to enjoy outdoor activities.' };
    if (val <= 200) return { label: 'Moderate', color: '#f59e0b', desc: 'Members of sensitive groups may experience health effects.', advice: 'Sensitive individuals should reduce heavy outdoor work.' };
    if (val <= 300) return { label: 'Poor', color: '#f97316', desc: 'Everyone may begin to experience health effects.', advice: 'Consider wearing masks and close classroom windows.' };
    if (val <= 400) return { label: 'Very Poor', color: '#ef4444', desc: 'Health alert: everyone may experience more serious health effects.', advice: 'Limit outdoor exposure. Academic block ventilation active.' };
    return { label: 'Severe', color: '#7f1d1d', desc: 'Health warning of emergency conditions: everyone is more likely to be affected.', advice: 'Avoid outdoor activities. High-efficiency filtration on.' };
  };

  const { label, color, desc, advice } = getAQIInfo(value);

  return (
    <div className="aqi-gauge-card" style={{ width: '100%', height: '100%' }}>
      <div className="card-header-actions" style={{ width: '100%', marginBottom: '1rem' }}>
        <h4 className="card-title">Atmospheric Health (AQI)</h4>
      </div>
      
      <div className="aqi-meter-wrapper">
        {/* Soft colored glow background behind the gauge */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '75%',
          height: '75%',
          borderRadius: '50%',
          backgroundColor: color,
          opacity: 0.08,
          filter: 'blur(35px)',
          transition: 'all 0.5s ease',
          pointerEvents: 'none'
        }} />

        <GaugeContainer
          width={220}
          height={220}
          startAngle={-110}
          endAngle={110}
          value={value}
          min={0}
          max={500}
        >
          <GaugeReferenceArc stroke="#f1f5f9" strokeWidth={14} />
          <GaugeValueArc stroke={color} strokeWidth={14} />
          <GaugePointer />
        </GaugeContainer>

        {/* Central Metric Value */}
        <div className="aqi-gauge-center">
          <span className="aqi-gauge-value">{Math.round(value)}</span>
          <span className="aqi-gauge-label">AQI INDEX</span>
        </div>
      </div>
      
      {/* Dynamic Status Badge */}
      <motion.div 
        className="aqi-card-badge"
        style={{ 
          backgroundColor: color,
          boxShadow: `0 4px 12px ${color}35`
        }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        key={label}
      >
        {label}
      </motion.div>

      {/* Humanized Health & Safety Box */}
      <div className="aqi-recommendation-box">
        <h4>{desc}</h4>
        <p>{advice}</p>
      </div>
    </div>
  );
};

export default AQIMeter;
