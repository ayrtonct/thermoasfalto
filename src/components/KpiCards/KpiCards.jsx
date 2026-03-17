import { useState, useEffect } from 'react';
import styles from './KpiCards.module.css';

const KpiCard = ({ title, value, unit, previousValue }) => {
  const delta = previousValue !== null && value !== null ? value - previousValue : 0;
  
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.valueGroup}>
        <span className={styles.value}>{value !== null ? value.toFixed(1) : '--'}</span>
        <span className={styles.unit}>{unit}</span>
      </div>
      {previousValue !== null && (
        <div className={`${styles.delta} ${delta > 0 ? styles.up : delta < 0 ? styles.down : ''}`}>
          {delta > 0 ? '▲' : delta < 0 ? '▼' : '▬'} {Math.abs(delta).toFixed(1)}
        </div>
      )}
    </div>
  );
};

export const KpiCards = ({ leituraAtual, historico }) => {
  const [prevLeitura, setPrevLeitura] = useState(null);

  // Guard the previous reading for deltass
  useEffect(() => {
    if (leituraAtual) {
      setPrevLeitura((prev) => {
        // Only update prev if timestamp is different
        if (prev && prev.data_hora !== leituraAtual.data_hora) return leituraAtual;
        if (!prev) return leituraAtual; // initialize
        return prev;
      });
    }
  }, [leituraAtual]);

  // If no data yet
  if (!leituraAtual) return <div className={styles.container}>Carregando KPIs...</div>;

  const currentSurf = (leituraAtual.temp_ds5 + leituraAtual.temp_ds6) / 2;
  const currentMed = (leituraAtual.temp_ds3 + leituraAtual.temp_ds4) / 2;
  const currentBase = (leituraAtual.temp_ds1 + leituraAtual.temp_ds2) / 2;
  const gradient = currentSurf - currentBase;

  const prevSurf = prevLeitura ? (prevLeitura.temp_ds5 + prevLeitura.temp_ds6) / 2 : null;
  const prevMed = prevLeitura ? (prevLeitura.temp_ds3 + prevLeitura.temp_ds4) / 2 : null;
  const prevBase = prevLeitura ? (prevLeitura.temp_ds1 + prevLeitura.temp_ds2) / 2 : null;
  const prevGradient = prevSurf !== null && prevBase !== null ? prevSurf - prevBase : null;

  // Calculate global min/max over historico
  let maxPeriod = null;
  let minPeriod = null;

  if (historico && historico.length > 0) {
    let allTemps = [];
    historico.forEach(l => {
      allTemps.push(l.temp_ds1, l.temp_ds2, l.temp_ds3, l.temp_ds4, l.temp_ds5, l.temp_ds6);
    });
    maxPeriod = Math.max(...allTemps);
    minPeriod = Math.min(...allTemps);
  }

  return (
    <div className={styles.container}>
      <KpiCard title="Superfície Atual" value={currentSurf} unit="°C" previousValue={prevSurf} />
      <KpiCard title="Revestimento Atual" value={currentMed} unit="°C" previousValue={prevMed} />
      <KpiCard title="Base Atual" value={currentBase} unit="°C" previousValue={prevBase} />
      <KpiCard title="Gradiente (Sup - Base)" value={gradient} unit="°C" previousValue={prevGradient} />
      <KpiCard title="Máxima no Período" value={maxPeriod} unit="°C" previousValue={null} />
      <KpiCard title="Mínima no Período" value={minPeriod} unit="°C" previousValue={null} />
    </div>
  );
};
