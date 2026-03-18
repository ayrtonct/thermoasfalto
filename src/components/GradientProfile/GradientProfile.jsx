import { useMemo } from 'react';
import styles from './GradientProfile.module.css';
import { GAUGE_MIN, GAUGE_MAX } from '../../constants/sensors';
import { safeAvg } from '../../utils/dataHelpers';

export const GradientProfile = ({ leituraAtual, historico }) => {
  // Calculando valores atuais
  const currentSurf = leituraAtual ? safeAvg(leituraAtual.temp_ds5, leituraAtual.temp_ds6) : null;
  const currentMed = leituraAtual ? safeAvg(leituraAtual.temp_ds3, leituraAtual.temp_ds4) : null;
  const currentBase = leituraAtual ? safeAvg(leituraAtual.temp_ds1, leituraAtual.temp_ds2) : null;

  // Calculando amplitude no histórico
  const amplitudes = useMemo(() => {
    if (!historico || historico.length === 0) return { surf: null, med: null, base: null, maxAmp: 1 };

    let sMax = -Infinity, sMin = Infinity;
    let mMax = -Infinity, mMin = Infinity;
    let bMax = -Infinity, bMin = Infinity;
    let hasS = false, hasM = false, hasB = false;

    historico.forEach(d => {
      const s = safeAvg(d.temp_ds5, d.temp_ds6);
      const m = safeAvg(d.temp_ds3, d.temp_ds4);
      const b = safeAvg(d.temp_ds1, d.temp_ds2);

      if (s !== null) { hasS = true; if (s > sMax) sMax = s; if (s < sMin) sMin = s; }
      if (m !== null) { hasM = true; if (m > mMax) mMax = m; if (m < mMin) mMin = m; }
      if (b !== null) { hasB = true; if (b > bMax) bMax = b; if (b < bMin) bMin = b; }
    });

    const sAmp = hasS ? sMax - sMin : null;
    const mAmp = hasM ? mMax - mMin : null;
    const bAmp = hasB ? bMax - bMin : null;
    
    const amps = [sAmp, mAmp, bAmp].filter(a => a !== null);
    const maxAmp = amps.length > 0 ? Math.max(...amps, 1) : 1;

    return {
      surf: sAmp,
      med: mAmp,
      base: bAmp,
      maxAmp
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
          
          <div className={styles.barItem} style={{ opacity: currentSurf === null ? 0.5 : 1 }}>
            <div className={styles.labelGroup}>
              <span className={styles.depth}>4 cm</span>
              <span className={styles.layer}>Superfície</span>
            </div>
            {currentSurf !== null ? (
              <>
                <div className={styles.track}>
                  <div 
                    className={styles.fill} 
                    style={{ width: getWidth(currentSurf), backgroundColor: 'var(--accent)' }}
                  ></div>
                </div>
                <div className={styles.value}>{currentSurf.toFixed(1)}°</div>
              </>
            ) : (
              <div className={styles.noDataMsg}>Sem leitura</div>
            )}
          </div>

          <div className={styles.barItem} style={{ opacity: currentMed === null ? 0.5 : 1 }}>
            <div className={styles.labelGroup}>
              <span className={styles.depth}>2 cm</span>
              <span className={styles.layer}>Revestimento</span>
            </div>
            {currentMed !== null ? (
              <>
                <div className={styles.track}>
                  <div 
                    className={styles.fill} 
                    style={{ width: getWidth(currentMed), backgroundColor: 'var(--blue)' }}
                  ></div>
                </div>
                <div className={styles.value}>{currentMed.toFixed(1)}°</div>
              </>
            ) : (
              <div className={styles.noDataMsg}>Sem leitura</div>
            )}
          </div>

          <div className={styles.barItem} style={{ opacity: currentBase === null ? 0.5 : 1 }}>
            <div className={styles.labelGroup}>
              <span className={styles.depth}>0 cm</span>
              <span className={styles.layer}>Base</span>
            </div>
            {currentBase !== null ? (
              <>
                <div className={styles.track}>
                  <div 
                    className={styles.fill} 
                    style={{ width: getWidth(currentBase), backgroundColor: 'var(--red)' }}
                  ></div>
                </div>
                <div className={styles.value}>{currentBase.toFixed(1)}°</div>
              </>
            ) : (
              <div className={styles.noDataMsg}>Sem leitura</div>
            )}
          </div>

        </div>
      </div>

      <div className={styles.divider}></div>

      <div className={styles.section}>
        <h4 className={styles.subtitle}>Amplitude (Período)</h4>
        <div className={styles.bars}>
          
          <div className={styles.barItem} style={{ opacity: amplitudes.surf === null ? 0.5 : 1 }}>
            <div className={styles.labelGroup}>
              <span className={styles.depth}>Superfície</span>
            </div>
            {amplitudes.surf !== null ? (
              <>
                <div className={styles.trackAmp}>
                  <div 
                    className={styles.fillAmp} 
                    style={{ width: getAmpWidth(amplitudes.surf), backgroundColor: 'var(--accent)' }}
                  ></div>
                </div>
                <div className={styles.value}>Δ {amplitudes.surf.toFixed(1)}°</div>
              </>
            ) : (
              <div className={styles.noDataMsg}>Sem leitura</div>
            )}
          </div>

          <div className={styles.barItem} style={{ opacity: amplitudes.med === null ? 0.5 : 1 }}>
            <div className={styles.labelGroup}>
              <span className={styles.depth}>Médio</span>
            </div>
            {amplitudes.med !== null ? (
              <>
                <div className={styles.trackAmp}>
                  <div 
                    className={styles.fillAmp} 
                    style={{ width: getAmpWidth(amplitudes.med), backgroundColor: 'var(--blue)' }}
                  ></div>
                </div>
                <div className={styles.value}>Δ {amplitudes.med.toFixed(1)}°</div>
              </>
            ) : (
              <div className={styles.noDataMsg}>Sem leitura</div>
            )}
          </div>

          <div className={styles.barItem} style={{ opacity: amplitudes.base === null ? 0.5 : 1 }}>
            <div className={styles.labelGroup}>
              <span className={styles.depth}>Base</span>
            </div>
            {amplitudes.base !== null ? (
              <>
                <div className={styles.trackAmp}>
                  <div 
                    className={styles.fillAmp} 
                    style={{ width: getAmpWidth(amplitudes.base), backgroundColor: 'var(--red)' }}
                  ></div>
                </div>
                <div className={styles.value}>Δ {amplitudes.base.toFixed(1)}°</div>
              </>
            ) : (
              <div className={styles.noDataMsg}>Sem leitura</div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
};
