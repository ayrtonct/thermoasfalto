import { useMemo } from 'react';
import styles from './GradientProfile.module.css';
import { GAUGE_MIN, GAUGE_MAX, getDepthGroups } from '../../constants/sensors';
import { getDepthTemperature } from '../../utils/dataHelpers';

export const GradientProfile = ({ leituraAtual, historico, profile }) => {
  const groups = useMemo(() => getDepthGroups(profile), [profile]);
  const currentValues = groups.map((group) => getDepthTemperature(leituraAtual, group, profile.technicalId));

  const amplitudes = useMemo(() => {
    const values = groups.map((group) => {
      const temperatures = (historico || [])
        .map((reading) => getDepthTemperature(reading, group, profile.technicalId))
        .filter((value) => value !== null);
      return temperatures.length ? Math.max(...temperatures) - Math.min(...temperatures) : null;
    });
    const valid = values.filter((value) => value !== null);
    return { values, max: valid.length ? Math.max(...valid, 1) : 1 };
  }, [groups, historico, profile.technicalId]);

  const getWidth = (value) => `${Math.max(0, Math.min(100, ((value - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN)) * 100))}%`;
  const getAmpWidth = (value) => `${(value / amplitudes.max) * 100}%`;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Estrutura do pavimento</span>
        <h3 className={styles.title}>Perfil térmico</h3>
      </div>

      <div className={styles.section}>
        <h4 className={styles.subtitle}>Temperatura atual</h4>
        <div className={styles.bars}>
          {groups.map((group, index) => {
            const value = currentValues[index];
            return (
              <div key={group.depthCm} className={styles.barItem} style={{ opacity: value === null ? 0.5 : 1 }}>
                <div className={styles.labelGroup}>
                  <span className={styles.depth}>{group.depthCm} cm</span>
                  <span className={styles.layer}>{group.label}</span>
                </div>
                {value !== null ? (<>
                  <div className={styles.track}><div className={styles.fill} style={{ '--bar-width': getWidth(value), '--bar-color': group.color }} /></div>
                  <div className={styles.value}>{value.toFixed(1)}°</div>
                </>) : <div className={styles.noDataMsg}>Sem dados válidos</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <h4 className={styles.subtitle}>Amplitude no período</h4>
        <div className={styles.bars}>
          {groups.map((group, index) => {
            const value = amplitudes.values[index];
            return (
              <div key={group.depthCm} className={styles.barItem} style={{ opacity: value === null ? 0.5 : 1 }}>
                <div className={styles.labelGroup}><span className={styles.depth}>{group.depthCm} cm</span></div>
                {value !== null ? (<>
                  <div className={styles.trackAmp}><div className={styles.fillAmp} style={{ '--bar-width': getAmpWidth(value), '--bar-color': group.color }} /></div>
                  <div className={styles.value}>Δ {value.toFixed(1)}°</div>
                </>) : <div className={styles.noDataMsg}>Sem dados válidos</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
