import styles from './StatsTable.module.css';
export const StatsTable = ({ stats, sensors, channelStatuses, isLoading, hasLoaded, error, onRetry }) => {
  const statsBySensor = new Map((stats || []).map((item) => [item.sensor_id, item]));
  const rows = sensors.map((sensor) => {
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

  const hasStats = Boolean(stats?.length);

  if ((!hasLoaded || isLoading) && !hasStats) return <div className={styles.container} role="status">Carregando análise histórica...</div>;
  if (error && !hasStats) return <div className={styles.container} role="alert"><span>{error}</span><button type="button" className={styles.retryButton} onClick={onRetry}>Tentar novamente</button></div>;
  if (hasLoaded && !hasStats) return <div className={styles.container}>Sem dados para o período selecionado.</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Resumo estatístico</span>
          <h3 className={styles.title}>Análise histórica</h3>
        </div>
        <span className={styles.scope}>Período selecionado</span>
      </div>

      {error && <div className={styles.refreshWarning} role="alert"><span>{error} As estatísticas anteriores foram preservadas.</span><button type="button" className={styles.retryButton} onClick={onRetry}>Tentar novamente</button></div>}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <caption className={styles.srOnly}>Estatísticas de temperatura por sensor</caption>
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
                  <td data-label="Sensor">
                    <div className={styles.sensorCell}>
                      <span className={styles.dot} style={{ backgroundColor: sensor.color }}></span>
                      <span className={styles.label}>{sensor.label}</span>
                      {isOffline && <span className={`${styles.statusBadge} ${styles.disconnected}`}>Offline</span>}
                      {sensor.connectionStatus === 'insufficient' && <span className={styles.statusBadge}>Sem dados</span>}
                      {!isOffline && sensor.noData && sensor.connectionStatus !== 'insufficient' && <span className={styles.statusBadge}>Sem dados válidos</span>}
                    </div>
                  </td>
                  <td data-label="Profundidade" className={styles.depth}>{sensor.depth}</td>
                  <td data-label="Média" className={styles.numCol}>{isUnavailable ? '--' : `${sensor.avg.toFixed(1)}°`}</td>
                  <td data-label="Máxima" className={`${styles.numCol} ${!isUnavailable ? styles.high : ''}`}>{isUnavailable ? '--' : `${sensor.max.toFixed(1)}°`}</td>
                  <td data-label="Mínima" className={`${styles.numCol} ${!isUnavailable ? styles.low : ''}`}>{isUnavailable ? '--' : `${sensor.min.toFixed(1)}°`}</td>
                  <td data-label="Amplitude" className={styles.numCol}>{isUnavailable ? '--' : `${sensor.amp.toFixed(1)}°`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
