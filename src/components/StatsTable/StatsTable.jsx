import styles from './StatsTable.module.css';
import { SENSORS } from '../../constants/sensors';

export const StatsTable = ({ stats, channelStatuses, isLoading, error }) => {
  const statsBySensor = new Map((stats || []).map((item) => [item.sensor_id, item]));
  const rows = SENSORS.map((sensor) => {
    const sensorStats = statsBySensor.get(sensor.id);
    const connectionStatus = channelStatuses?.[sensor.id] || 'insufficient';

    if (!sensorStats || !sensorStats.count) {
      return { ...sensor, connectionStatus, noData: true };
    }

    return {
      ...sensor,
      connectionStatus,
      avg: sensorStats.avg,
      max: sensorStats.max,
      min: sensorStats.min,
      amp: sensorStats.max - sensorStats.min,
    };
  });

  if (isLoading) return <div className={styles.container}>Carregando analise historica...</div>;
  if (error) return <div className={styles.container}>{error}</div>;
  if (!stats || stats.length === 0) return <div className={styles.container}>Sem historico disponivel para este ponto.</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Analise Historica</h3>
        <span className={styles.scope}>Historico completo do ponto</span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Sensor</th>
              <th>Profundidade</th>
              <th className={styles.numCol}>Media</th>
              <th className={styles.numCol}>Maxima</th>
              <th className={styles.numCol}>Minima</th>
              <th className={styles.numCol}>Amplitude</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((sensor) => {
              const isOffline = sensor.connectionStatus === 'offline';
              const isUnavailable = isOffline || sensor.noData;
              return (
                <tr key={sensor.id} className={isUnavailable ? styles.offlineRow : ''}>
                  <td>
                    <div className={styles.sensorCell}>
                      <span className={styles.dot} style={{ backgroundColor: sensor.color }}></span>
                      <span className={styles.label}>{sensor.label}</span>
                      {isOffline && <span className={styles.offlineBadge}>DESCONECTADO</span>}
                      {sensor.connectionStatus === 'insufficient' && <span className={styles.offlineBadge}>SEM DADOS</span>}
                    </div>
                  </td>
                  <td className={styles.depth}>{sensor.depth}</td>
                  <td className={styles.numCol}>{isUnavailable ? '--' : `${sensor.avg.toFixed(1)}°`}</td>
                  <td className={`${styles.numCol} ${!isUnavailable ? styles.high : ''}`}>{isUnavailable ? '--' : `${sensor.max.toFixed(1)}°`}</td>
                  <td className={`${styles.numCol} ${!isUnavailable ? styles.low : ''}`}>{isUnavailable ? '--' : `${sensor.min.toFixed(1)}°`}</td>
                  <td className={styles.numCol}>{isUnavailable ? '--' : `${sensor.amp.toFixed(1)}°`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
