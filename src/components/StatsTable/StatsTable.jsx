import { useMemo } from 'react';
import styles from './StatsTable.module.css';
import { SENSORS } from '../../constants/sensors';
import { isValidReading } from '../../utils/dataHelpers';

export const StatsTable = ({ historico }) => {
  const stats = useMemo(() => {
    if (!historico || historico.length === 0) return [];

    return SENSORS.map(sensor => {
      if (!sensor.active) {
        return { ...sensor, isOffline: true };
      }

      const key = `temp_${sensor.id}`;
      const values = historico.map(d => d[key]);
      const validValues = values.filter(isValidReading);
      
      if (validValues.length === 0) {
        return { ...sensor, isOffline: false, noData: true };
      }

      const max = Math.max(...validValues);
      const min = Math.min(...validValues);
      const sum = validValues.reduce((a, b) => a + b, 0);
      const avg = sum / validValues.length;
      const amp = max - min;

      return {
        ...sensor,
        isOffline: false,
        max,
        min,
        avg,
        amp
      };
    });
  }, [historico]);

  if (!historico || historico.length === 0) {
    return <div className={styles.container}>Aguardando dados...</div>;
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Estatísticas por Sensor</h3>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Sensor</th>
              <th>Profundidade</th>
              <th className={styles.numCol}>Média</th>
              <th className={styles.numCol}>Máxima</th>
              <th className={styles.numCol}>Mínima</th>
              <th className={styles.numCol}>Amplitude</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(s => (
              <tr key={s.id} className={s.isOffline || s.noData ? styles.offlineRow : ''}>
                <td>
                  <div className={styles.sensorCell}>
                    <span className={styles.dot} style={{ backgroundColor: s.color }}></span>
                    <span className={styles.label}>{s.label}</span>
                    {s.isOffline && <span className={styles.offlineBadge}>OFFLINE</span>}
                  </div>
                </td>
                <td className={styles.depth}>{s.depth}</td>
                <td className={styles.numCol}>{s.isOffline || s.noData ? '--' : `${s.avg.toFixed(1)}°`}</td>
                <td className={`${styles.numCol} ${(!s.isOffline && !s.noData) ? styles.high : ''}`}>{s.isOffline || s.noData ? '--' : `${s.max.toFixed(1)}°`}</td>
                <td className={`${styles.numCol} ${(!s.isOffline && !s.noData) ? styles.low : ''}`}>{s.isOffline || s.noData ? '--' : `${s.min.toFixed(1)}°`}</td>
                <td className={styles.numCol}>{s.isOffline || s.noData ? '--' : `${s.amp.toFixed(1)}°`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
