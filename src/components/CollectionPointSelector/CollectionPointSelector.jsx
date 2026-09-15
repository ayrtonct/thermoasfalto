import { getCollectionPointName } from '../../constants/collectionPoints';
import { formatRssi, getGatewayDisplay } from '../../utils/collectionPoints';
import styles from './CollectionPointSelector.module.css';

export const CollectionPointSelector = ({ points, selectedSensorId, onSelect, leituraAtual, isLoading, error, onRetry }) => {
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
              {getCollectionPointName(point.sensorId)} ({getGatewayDisplay(point.gatewayId, point.sensorId)})
            </option>
          ))}
        </select>
      </div>

      {selectedSensorId && (
        <dl className={styles.details}>
          <div><dt>Nó</dt><dd>{getCollectionPointName(selectedPoint?.sensorId)}</dd></div>
          <div><dt>Gateway</dt><dd>{getGatewayDisplay(gatewayId, selectedPoint?.sensorId)}</dd></div>
          <div><dt>RSSI</dt><dd>{formatRssi(leituraAtual?.rssi)}</dd></div>
        </dl>
      )}

      {error && <div className={styles.error} role="alert"><span>{error}</span> <button type="button" onClick={onRetry}>Tentar novamente</button></div>}
    </section>
  );
};
