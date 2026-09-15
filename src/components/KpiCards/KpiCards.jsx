import styles from './KpiCards.module.css';
import {
  getDepthTemperature,
  getVerticalGradient,
  isAnalyticallyValidReading,
} from '../../utils/dataHelpers';
import { getDepthGroups } from '../../constants/sensors';
import { getLoadPhase } from '../../utils/loadState';

const KpiCard = ({ title, value, unit, previousValue }) => {
  const delta = previousValue !== null && value !== null ? value - previousValue : 0;

  return (
    <article className={styles.card}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.valueGroup}>
        <span className={`${styles.value} ${value === null ? styles.unavailable : ''}`}>
          {value !== null ? value.toFixed(1) : '--'}
        </span>
        <span className={styles.unit}>{unit}</span>
      </div>
      {previousValue !== null && value !== null && (
        <div className={`${styles.delta} ${delta > 0 ? styles.up : delta < 0 ? styles.down : ''}`}>
          {delta > 0 ? '▲' : delta < 0 ? '▼' : '▬'} {Math.abs(delta).toFixed(1)}
        </div>
      )}
    </article>
  );
};
export const KpiCards = ({ leituraAtual, historico, profile, isLoading, hasLoaded, error, onRetry }) => {
  const phase = getLoadPhase(
    { data: leituraAtual, isLoading, hasLoaded, error },
    Boolean(leituraAtual),
  );

  if (phase === 'loading' || phase === 'idle') {
    return <div className={styles.loading} role="status">Carregando indicadores...</div>;
  }
  if (phase === 'error') {
    return <div className={styles.loading} role="alert"><span>{error}</span><button type="button" className={styles.retryButton} onClick={onRetry}>Tentar novamente</button></div>;
  }
  if (phase === 'empty') {
    return <div className={styles.loading} role="status"><span>Sem leitura atual para este ponto.</span><button type="button" className={styles.retryButton} onClick={onRetry}>Tentar novamente</button></div>;
  }

  const groups = getDepthGroups(profile);
  const prevLeitura = [...(historico || [])]
    .filter((reading) => reading.data_hora !== leituraAtual.data_hora)
    .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime())[0] || null;
  const currentByDepth = groups.map((group) => getDepthTemperature(leituraAtual, group, profile.technicalId));
  const previousByDepth = groups.map((group) => getDepthTemperature(prevLeitura, group, profile.technicalId));
  const gradient = getVerticalGradient(leituraAtual, profile);
  const prevGradient = getVerticalGradient(prevLeitura, profile);

  const allTemps = (historico || []).flatMap((reading) => profile.channels
    .map((sensor) => reading[`temp_${sensor.id}`]))
    .filter((value) => isAnalyticallyValidReading(value, profile.technicalId));
  const maxPeriod = allTemps.length ? Math.max(...allTemps) : null;
  const minPeriod = allTemps.length ? Math.min(...allTemps) : null;
  const shallowDepth = groups[0]?.depthCm;
  const deepDepth = groups[groups.length - 1]?.depthCm;

  return (<>
    {error && (
      <div className={styles.refreshWarning} role="alert">
        <span>{error} Os últimos indicadores foram preservados.</span>
        <button type="button" className={styles.retryButton} onClick={onRetry}>Tentar novamente</button>
      </div>
    )}
    <section className={styles.container} aria-label="Indicadores térmicos principais">
      {groups.map((group, index) => (
        <KpiCard
          key={group.depthCm}
          title={`${group.label} Atual`}
          value={currentByDepth[index]}
          unit="°C"
          previousValue={previousByDepth[index]}
        />
      ))}
      <KpiCard
        title={`Gradiente ${shallowDepth}–${deepDepth} cm`}
        value={gradient}
        unit="°C/cm"
        previousValue={prevGradient}
      />
      <KpiCard title="Máxima no Período" value={maxPeriod} unit="°C" previousValue={null} />
      <KpiCard title="Mínima no Período" value={minPeriod} unit="°C" previousValue={null} />
    </section>
  </>);
};
