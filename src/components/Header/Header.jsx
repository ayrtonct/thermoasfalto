import styles from './Header.module.css';

export const Header = ({ isDemo, isOnline, lastUpdate }) => {
  const formattedTime = lastUpdate 
    ? new Date(lastUpdate).toLocaleString('pt-BR') 
    : '--/--/---- --:--:--';

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.logoGroup}>
          <span className={styles.icon}>🌡️</span>
          <h1 className={styles.title}>THERMOASFALTO</h1>
        </div>
        <p className={styles.subtitle}>UEMA · CCT · Engenharia da Computação · PIBIC 2025/26</p>
      </div>

      <div className={styles.right}>
        {isDemo && (
          <div className={styles.demoBadge}>MODO DEMO</div>
        )}
        <div className={styles.statusGroup}>
          <div className={`${styles.statusPill} ${isOnline ? styles.online : styles.offline}`}>
            <span className={styles.dot}></span>
            {isOnline ? 'SISTEMA ATIVO' : 'OFFLINE'}
          </div>
          <div className={styles.timestamp}>
            Última leitura: {formattedTime}
          </div>
        </div>
      </div>
    </header>
  );
};
