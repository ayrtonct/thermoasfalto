import styles from './Header.module.css';

const LABELS = {
  online: 'ATIVO',
  instavel: 'INSTÁVEL',
  offline: 'OFFLINE'
};

export const Header = ({ isDemo, systemState, lastUpdate, nodeStatuses = [] }) => {
  const formattedTime = lastUpdate 
    ? new Date(lastUpdate).toLocaleString('pt-BR') 
    : '--/--/---- --:--:--';
  const fallbackStatus = {
    online: { label: 'SISTEMA ATIVO', style: 'online' },
    loading: { label: 'CARREGANDO', style: 'instavel' },
    unavailable: { label: 'CONSULTA INDISPONÍVEL', style: 'instavel' },
    empty: { label: 'SEM DADOS', style: 'instavel' },
  }[systemState] || { label: 'SEM DADOS', style: 'instavel' };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.logoGroup}>
          <span className={styles.brandMark} aria-hidden="true">TA</span>
          <div>
            <h1 className={styles.title}>THERMOASFALTO</h1>
            <p className={styles.description}>Monitoramento térmico de pavimentos</p>
          </div>
        </div>
        <p className={styles.subtitle}>UEMA · CCT · Engenharia da Computação · PIBIC 2025/26</p>
      </div>

      <div className={styles.right}>
        {isDemo && (
          <div className={styles.demoBadge}>MODO DEMO</div>
        )}
        <div className={styles.statusGroup} aria-live="polite">
          {nodeStatuses.length > 0 ? (
            <div className={styles.nodesGroup}>
              {nodeStatuses.map(node => (
                <div 
                  key={node.sensor_id} 
                  className={`${styles.statusPill} ${styles[node.status] || styles.offline}`}
                  title={`Última transmissão: ${node.ultima_transmissao} (${node.minutos_desde_ultima} min atrás)`}
                >
                  <span className={styles.dot}></span>
                  NÓ {node.sensor_id}: {LABELS[node.status] || 'OFFLINE'}
                </div>
              ))}
            </div>
          ) : (
            <div className={`${styles.statusPill} ${styles[fallbackStatus.style]}`}>
              <span className={styles.dot}></span>
              {fallbackStatus.label}
            </div>
          )}
          <time className={styles.timestamp} dateTime={lastUpdate || undefined}>
            <span>{nodeStatuses.length > 0 ? "Atualização mais recente" : "Última leitura"}</span>
            {formattedTime}
          </time>
        </div>
      </div>
    </header>
  );
};
