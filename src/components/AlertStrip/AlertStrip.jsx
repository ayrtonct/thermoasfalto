import styles from './AlertStrip.module.css';

export const AlertStrip = ({ alerts }) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className={styles.alertStrip}>
      <span className={styles.icon}>⚠️</span>
      <div className={styles.message}>
        <strong>ALERTA DE TEMPERATURA CRÍTICA:</strong> {alerts.map(a => `${a.sensor} atingiu ${a.temp}°C`).join(' | ')}
      </div>
    </div>
  );
};
