import { getCollectionPointName } from '../../constants/collectionPoints';
import { formatRssi, getGatewayDisplay } from '../../utils/collectionPoints';
import styles from './CollectionPointSelector.module.css';

export const CollectionPointSelector = ({ points, selectedSensorId, onSelect, leituraAtual, isLoading, error }) => {
  const selectedPoint = points.find((point) => point.pointKey === selectedSensorId);
  const gatewayId = leituraAtual?.gateway_id || selectedPoint?.gatewayId;

  return (
    <section className={styles.container} aria-label="Ponto de coleta">
      <div className={styles.heading}>
        <span className={styles.eyebrow}>Contexto de monitoramento</span>
        <h2 className={styles.title}>Ponto de coleta</h2>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="collection-point">Gateway e sensor</label>
        <select
          id="collection-point"
          className={styles.select}
          value={selectedSensorId || ''}
          onChange={(event) => onSelect(event.target.value)}
          disabled={isLoading || points.length === 0}
        >
          {points.map((point) => (
            <option key={point.pointKey} value={point.pointKey}>
              {getCollectionPointName(point.sensorId)} ({getGatewayDisplay(point.gatewayId)})
            </option>
          ))}
        </select>
      </div>

      {selectedSensorId && (
        <dl className={styles.details}>
          <div><dt>Sensor</dt><dd>{selectedPoint?.sensorId}</dd></div>
          <div><dt>Gateway</dt><dd>{getGatewayDisplay(gatewayId)}</dd></div>
          <div><dt>RSSI</dt><dd>{formatRssi(leituraAtual?.rssi)}</dd></div>
        </dl>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </section>
  );
};
