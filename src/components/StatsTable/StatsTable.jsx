import { useMemo } from 'react';
import styles from './StatsTable.module.css';
import { SENSORS } from '../../constants/sensors';

export const StatsTable = ({ historico }) => {
  const stats = useMemo(() => {
    if (!historico || historico.length === 0) return [];

    return SENSORS.map(sensor => {
      const key = `temp_${sensor.id}`;
      const values = historico.map(d => d[key]);
      
      const max = Math.max(...values);
      const min = Math.min(...values);
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const amp = max - min;

      return {
        ...sensor,
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
              <tr key={s.id}>
                <td>
                  <div className={styles.sensorCell}>
                    <span className={styles.dot} style={{ backgroundColor: s.color }}></span>
                    <span className={styles.label}>{s.label}</span>
                  </div>
                </td>
                <td className={styles.depth}>{s.depth}</td>
                <td className={styles.numCol}>{s.avg.toFixed(1)}°</td>
                <td className={`${styles.numCol} ${styles.high}`}>{s.max.toFixed(1)}°</td>
                <td className={`${styles.numCol} ${styles.low}`}>{s.min.toFixed(1)}°</td>
                <td className={styles.numCol}>{s.amp.toFixed(1)}°</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
