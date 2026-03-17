import { useMemo } from 'react';
import styles from './GradientProfile.module.css';
import { GAUGE_MIN, GAUGE_MAX } from '../../constants/sensors';

export const GradientProfile = ({ leituraAtual, historico }) => {
  // Calculando valores atuais
  const currentSurf = leituraAtual ? (leituraAtual.temp_ds5 + leituraAtual.temp_ds6) / 2 : 0;
  const currentMed = leituraAtual ? (leituraAtual.temp_ds3 + leituraAtual.temp_ds4) / 2 : 0;
  const currentBase = leituraAtual ? (leituraAtual.temp_ds1 + leituraAtual.temp_ds2) / 2 : 0;

  // Calculando amplitude no histórico
  const amplitudes = useMemo(() => {
    if (!historico || historico.length === 0) return { surf: 0, med: 0, base: 0 };

    let sMax = -Infinity, sMin = Infinity;
    let mMax = -Infinity, mMin = Infinity;
    let bMax = -Infinity, bMin = Infinity;

    historico.forEach(d => {
      const s = (d.temp_ds5 + d.temp_ds6) / 2;
      const m = (d.temp_ds3 + d.temp_ds4) / 2;
      const b = (d.temp_ds1 + d.temp_ds2) / 2;

      if (s > sMax) sMax = s; if (s < sMin) sMin = s;
      if (m > mMax) mMax = m; if (m < mMin) mMin = m;
      if (b > bMax) bMax = b; if (b < bMin) bMin = b;
    });

    return {
      surf: sMax - sMin,
      med: mMax - mMin,
      base: bMax - bMin,
      maxAmp: Math.max(sMax - sMin, mMax - mMin, bMax - bMin, 1) // prevent div by zero
    };
  }, [historico]);

  const getWidth = (val) => {
    const p = Math.max(0, Math.min(100, ((val - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN)) * 100));
    return `${p}%`;
  };

  const getAmpWidth = (val) => {
    return `${(val / amplitudes.maxAmp) * 100}%`;
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Perfil de Gradiente</h3>

      <div className={styles.section}>
        <h4 className={styles.subtitle}>Temperatura Atual</h4>
        <div className={styles.bars}>
          
          <div className={styles.barItem}>
            <div className={styles.labelGroup}>
              <span className={styles.depth}>4 cm</span>
              <span className={styles.layer}>Superfície</span>
            </div>
            <div className={styles.track}>
              <div 
                className={styles.fill} 
                style={{ width: getWidth(currentSurf), backgroundColor: 'var(--accent)' }}
              ></div>
            </div>
            <div className={styles.value}>{currentSurf.toFixed(1)}°</div>
          </div>

          <div className={styles.barItem}>
            <div className={styles.labelGroup}>
              <span className={styles.depth}>2 cm</span>
              <span className={styles.layer}>Revestimento</span>
            </div>
            <div className={styles.track}>
              <div 
                className={styles.fill} 
                style={{ width: getWidth(currentMed), backgroundColor: 'var(--blue)' }}
              ></div>
            </div>
            <div className={styles.value}>{currentMed.toFixed(1)}°</div>
          </div>

          <div className={styles.barItem}>
            <div className={styles.labelGroup}>
              <span className={styles.depth}>0 cm</span>
              <span className={styles.layer}>Base</span>
            </div>
            <div className={styles.track}>
              <div 
                className={styles.fill} 
                style={{ width: getWidth(currentBase), backgroundColor: 'var(--red)' }}
              ></div>
            </div>
            <div className={styles.value}>{currentBase.toFixed(1)}°</div>
          </div>

        </div>
      </div>

      <div className={styles.divider}></div>

      <div className={styles.section}>
        <h4 className={styles.subtitle}>Amplitude (Período)</h4>
        <div className={styles.bars}>
          
          <div className={styles.barItem}>
            <div className={styles.labelGroup}>
              <span className={styles.depth}>Superfície</span>
            </div>
            <div className={styles.trackAmp}>
              <div 
                className={styles.fillAmp} 
                style={{ width: getAmpWidth(amplitudes.surf), backgroundColor: 'var(--accent)' }}
              ></div>
            </div>
            <div className={styles.value}>Δ {amplitudes.surf.toFixed(1)}°</div>
          </div>

          <div className={styles.barItem}>
            <div className={styles.labelGroup}>
              <span className={styles.depth}>Médio</span>
            </div>
            <div className={styles.trackAmp}>
              <div 
                className={styles.fillAmp} 
                style={{ width: getAmpWidth(amplitudes.med), backgroundColor: 'var(--blue)' }}
              ></div>
            </div>
            <div className={styles.value}>Δ {amplitudes.med.toFixed(1)}°</div>
          </div>

          <div className={styles.barItem}>
            <div className={styles.labelGroup}>
              <span className={styles.depth}>Base</span>
            </div>
            <div className={styles.trackAmp}>
              <div 
                className={styles.fillAmp} 
                style={{ width: getAmpWidth(amplitudes.base), backgroundColor: 'var(--red)' }}
              ></div>
            </div>
            <div className={styles.value}>Δ {amplitudes.base.toFixed(1)}°</div>
          </div>

        </div>
      </div>

    </div>
  );
};
