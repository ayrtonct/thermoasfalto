import styles from './KpiCards.module.css';
import { safeAvg, isValidReading } from '../../utils/dataHelpers';
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
      {previousValue !== null && (
        <div className={`${styles.delta} ${delta > 0 ? styles.up : delta < 0 ? styles.down : ''}`}>
          {delta > 0 ? '▲' : delta < 0 ? '▼' : '▬'} {Math.abs(delta).toFixed(1)}
        </div>
      )}
    </article>
  );
};

export const KpiCards = ({ leituraAtual, historico, isLoading, hasLoaded, error, onRetry }) => {
  const phase = getLoadPhase(
    { data: leituraAtual, isLoading, hasLoaded, error },
    Boolean(leituraAtual)
  );

  if (phase === 'loading' || phase === 'idle') {
    return <div className={styles.loading} role="status">Carregando indicadores...</div>;
  }

  if (phase === 'error') {
    return (
      <div className={styles.loading} role="alert">
        <span>{error}</span>
        <button type="button" className={styles.retryButton} onClick={onRetry}>Tentar novamente</button>
      </div>
    );
  }

  if (phase === 'empty') {
    return (
      <div className={styles.loading} role="status">
        <span>Sem leitura atual para este ponto.</span>
        <button type="button" className={styles.retryButton} onClick={onRetry}>Tentar novamente</button>
      </div>
    );
  }

  const prevLeitura = [...(historico || [])]
    .filter((reading) => reading.data_hora !== leituraAtual.data_hora)
    .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime())[0] || null;

  const currentSurf = safeAvg(leituraAtual.temp_ds5, leituraAtual.temp_ds6);
  const currentMed = safeAvg(leituraAtual.temp_ds3, leituraAtual.temp_ds4);
  const currentBase = safeAvg(leituraAtual.temp_ds1, leituraAtual.temp_ds2);
  const gradient = currentSurf !== null && currentBase !== null ? currentSurf - currentBase : null;

  const prevSurf = prevLeitura ? safeAvg(prevLeitura.temp_ds5, prevLeitura.temp_ds6) : null;
  const prevMed = prevLeitura ? safeAvg(prevLeitura.temp_ds3, prevLeitura.temp_ds4) : null;
  const prevBase = prevLeitura ? safeAvg(prevLeitura.temp_ds1, prevLeitura.temp_ds2) : null;
  const prevGradient = prevSurf !== null && prevBase !== null ? prevSurf - prevBase : null;

  const allTemps = (historico || []).flatMap((reading) => [
    reading.temp_ds1,
    reading.temp_ds2,
    reading.temp_ds3,
    reading.temp_ds4,
    reading.temp_ds5,
    reading.temp_ds6,
  ]).filter(isValidReading);
  const maxPeriod = allTemps.length > 0 ? Math.max(...allTemps) : null;
  const minPeriod = allTemps.length > 0 ? Math.min(...allTemps) : null;

  return (<>
    {error && (
      <div className={styles.refreshWarning} role="alert">
        <span>{error} Os últimos indicadores foram preservados.</span>
        <button type="button" className={styles.retryButton} onClick={onRetry}>Tentar novamente</button>
      </div>
    )}
    <section className={styles.container} aria-label="Indicadores térmicos principais">
      <KpiCard title="Superfície Atual" value={currentSurf} unit="°C" previousValue={prevSurf} />
      <KpiCard title="Revestimento Atual" value={currentMed} unit="°C" previousValue={prevMed} />
      <KpiCard title="Base Atual" value={currentBase} unit="°C" previousValue={prevBase} />
      <KpiCard title="Gradiente (Sup - Base)" value={gradient} unit="°C" previousValue={prevGradient} />
      <KpiCard title="Máxima no Período" value={maxPeriod} unit="°C" previousValue={null} />
      <KpiCard title="Mínima no Período" value={minPeriod} unit="°C" previousValue={null} />
    </section>
  </>);
};
