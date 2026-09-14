import styles from './AlertStrip.module.css';

export const AlertStrip = ({ alerts }) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className={styles.alertStrip} role="alert">
      <span className={styles.icon} aria-hidden="true">!</span>
      <div className={styles.message}>
        <strong>Temperatura crítica</strong> {alerts.map(a => `${a.sensor} atingiu ${a.temp}°C`).join(' · ')}
      </div>
    </div>
  );
};
