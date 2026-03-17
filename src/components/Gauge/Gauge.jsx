import styles from './Gauge.module.css';
import { SENSORS, GAUGE_MIN, GAUGE_MAX } from '../../constants/sensors';

export const Gauge = ({ value = 0, selectedSensorId, onSelectSensor }) => {
  // SVG Arc calculation for a semi-circle (180 degrees)
  const radius = 80;
  const strokeWidth = 12;
  const center = 100; // viewBox 200x120
  
  // Angle limits (from 180 to 360/0 degrees in SVG coordinates)
  // Let's use standard coordinates where SVG Y is down
  // Arc goes from (-radius, 0) to (radius, 0) relative to center
  const getCoordinatesForPercent = (percent) => {
    // 0 to 1 -> -180 deg to 0 deg
    const degrees = 180 + percent * 180;
    const x = center + radius * Math.cos((degrees * Math.PI) / 180);
    const y = center + radius * Math.sin((degrees * Math.PI) / 180);
    return { x, y };
  };

  const clampedValue = Math.min(Math.max(value, GAUGE_MIN), GAUGE_MAX);
  const percent = (clampedValue - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN);
  const targetPt = getCoordinatesForPercent(percent);

  // Define background arc
  const startBg = getCoordinatesForPercent(0);
  const endBg = getCoordinatesForPercent(1);
  const pathBg = `M ${startBg.x} ${startBg.y} A ${radius} ${radius} 0 0 1 ${endBg.x} ${endBg.y}`;

  // Define active arc
  const pathActive = `M ${startBg.x} ${startBg.y} A ${radius} ${radius} 0 0 1 ${targetPt.x} ${targetPt.y}`;

  // Color mapping logically
  let colorVar = 'var(--blue)';
  if (clampedValue >= 35 && clampedValue < 45) colorVar = 'var(--teal)';
  else if (clampedValue >= 45 && clampedValue < 52) colorVar = 'var(--accent)';
  else if (clampedValue >= 52) colorVar = 'var(--red)';

  const selectedSensor = SENSORS.find(s => s.id === selectedSensorId);

  return (
    <div className={styles.gaugeContainer}>
      <div className={styles.gaugeViz}>
        <svg viewBox="0 0 200 120" className={styles.svg}>
          <path
            d={pathBg}
            fill="none"
            stroke="var(--border2)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <path
            d={pathActive}
            fill="none"
            stroke={colorVar}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className={styles.arcActive}
          />
        </svg>
        <div className={styles.gaugeValueBox}>
          <div className={styles.gaugeValue}>{value.toFixed(1)}°</div>
          <div className={styles.gaugeLabel}>
            {selectedSensor ? selectedSensor.label : '--'}
          </div>
          <div className={styles.gaugeDepth}>
            {selectedSensor ? selectedSensor.depth : ''}
          </div>
        </div>
      </div>

      <div className={styles.sensorGrid}>
        {SENSORS.map((s) => (
          <button
            key={s.id}
            className={`${styles.sensorBtn} ${selectedSensorId === s.id ? styles.active : ''}`}
            onClick={() => onSelectSensor(s.id)}
            style={{
              '--s-color': s.color,
              borderColor: selectedSensorId === s.id ? 'var(--accent)' : 'transparent'
            }}
          >
            <div className={styles.btnDot}></div>
            <div className={styles.btnMeta}>
              <span className={styles.btnLabel}>{s.label}</span>
              <span className={styles.btnDepth}>{s.depth}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
