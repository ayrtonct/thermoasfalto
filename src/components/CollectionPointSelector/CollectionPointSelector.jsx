import { getCollectionPointName } from '../../constants/collectionPoints';
import { formatRssi, getGatewayDisplay } from '../../utils/collectionPoints';
import styles from './CollectionPointSelector.module.css';

export const CollectionPointSelector = ({ points, selectedSensorId, onSelect, leituraAtual, isLoading, error }) => {
  const selectedPoint = points.find((point) => point.sensorId === selectedSensorId);
  const gatewayId = leituraAtual?.gateway_id || selectedPoint?.gatewayId;

  return (
    <section className={styles.container} aria-label="Ponto de coleta">
      <div className={styles.field}>
        <label className={styles.label} htmlFor="collection-point">Ponto de coleta</label>
        <select
          id="collection-point"
          className={styles.select}
          value={selectedSensorId || ''}
          onChange={(event) => onSelect(event.target.value)}
          disabled={isLoading || points.length === 0}
        >
          {points.map((point) => (
            <option key={point.sensorId} value={point.sensorId}>
              {getCollectionPointName(point.sensorId)}
            </option>
          ))}
        </select>
      </div>

      {selectedSensorId && (
        <div className={styles.details}>
          <span>Sensor: <strong>{selectedSensorId}</strong></span>
          <span>Gateway: <strong>{getGatewayDisplay(gatewayId)}</strong></span>
          <span>RSSI: <strong>{formatRssi(leituraAtual?.rssi)}</strong></span>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </section>
  );
};
