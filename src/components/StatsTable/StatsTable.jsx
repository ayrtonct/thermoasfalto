import styles from './StatsTable.module.css';
import { SENSORS } from '../../constants/sensors';

export const StatsTable = ({ stats }) => {
  const statsBySensor = new Map((stats || []).map((item) => [item.sensor_id, item]));

  const rows = SENSORS.map((sensor) => {
    if (!sensor.active) {
      return { ...sensor, isOffline: true };
    }

    const sensorStats = statsBySensor.get(sensor.id);

    if (!sensorStats || !sensorStats.count) {
      return { ...sensor, isOffline: false, noData: true };
    }

    return {
      ...sensor,
      isOffline: false,
      avg: sensorStats.avg,
      max: sensorStats.max,
      min: sensorStats.min,
      amp: sensorStats.max - sensorStats.min,
    };
  });

  if (!stats || stats.length === 0) {
    return <div className={styles.container}>Aguardando dados...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Estatísticas por Sensor</h3>
        <span className={styles.scope}>Histórico completo do banco</span>
      </div>

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
            {rows.map((sensor) => (
              <tr
                key={sensor.id}
                className={sensor.isOffline || sensor.noData ? styles.offlineRow : ''}
              >
                <td>
                  <div className={styles.sensorCell}>
                    <span className={styles.dot} style={{ backgroundColor: sensor.color }}></span>
                    <span className={styles.label}>{sensor.label}</span>
                    {sensor.isOffline && <span className={styles.offlineBadge}>OFFLINE</span>}
                  </div>
                </td>
                <td className={styles.depth}>{sensor.depth}</td>
                <td className={styles.numCol}>
                  {sensor.isOffline || sensor.noData ? '--' : `${sensor.avg.toFixed(1)}°`}
                </td>
                <td
                  className={`${styles.numCol} ${(!sensor.isOffline && !sensor.noData) ? styles.high : ''}`}
                >
                  {sensor.isOffline || sensor.noData ? '--' : `${sensor.max.toFixed(1)}°`}
                </td>
                <td
                  className={`${styles.numCol} ${(!sensor.isOffline && !sensor.noData) ? styles.low : ''}`}
                >
                  {sensor.isOffline || sensor.noData ? '--' : `${sensor.min.toFixed(1)}°`}
                </td>
                <td className={styles.numCol}>
                  {sensor.isOffline || sensor.noData ? '--' : `${sensor.amp.toFixed(1)}°`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
