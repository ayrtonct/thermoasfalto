import styles from './Header.module.css';

const LABELS = {
  online: 'ATIVO',
  instavel: 'INSTÁVEL',
  offline: 'OFFLINE',
  unknown: 'STATUS NÃO CONFIRMADO'
};

export const Header = ({ isDemo, isLaboratory = false, systemState, lastUpdate, nodeStatuses = [] }) => {
  const formattedTime = lastUpdate 
    ? new Date(lastUpdate).toLocaleString('pt-BR') 
    : '--/--/---- --:--:--';
  const fallbackStatus = {
    online: { label: 'SISTEMA ATIVO', style: 'online' },
    loading: { label: 'CARREGANDO', style: 'instavel' },
    unavailable: { label: 'CONSULTA INDISPONÍVEL', style: 'instavel' },
    empty: { label: 'SEM DADOS', style: 'instavel' },
    unknown: { label: 'STATUS NÃO CONFIRMADO', style: 'instavel' },
    offline: { label: 'OFFLINE', style: 'offline' },
    instavel: { label: 'INSTÁVEL', style: 'instavel' },
  }[systemState] || { label: 'SEM DADOS', style: 'instavel' };

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
        {isLaboratory && (
          <div className={styles.labBadge} role="status">AMBIENTE DE TESTE · SEM SENSORES</div>
        )}
        <div className={styles.statusGroup}>
          {nodeStatuses.length > 0 ? (
            <div className={styles.nodesGroup}>
              {nodeStatuses.map(node => (
                <div 
                  key={`${node.gateway_id || 'gateway'}::${node.sensor_id}`}
                  className={`${styles.statusPill} ${styles[node.status] || styles.instavel}`}
                  title={`Última transmissão: ${new Date(node.ultima_transmissao).toLocaleString('pt-BR')}`}
                >
                  <span className={styles.dot}></span>
                  {(node.display_name || `Nó sensor ${node.sensor_id}`).toUpperCase()}: {LABELS[node.status] || 'OFFLINE'}
                </div>
              ))}
            </div>
          ) : (
            <div className={`${styles.statusPill} ${styles[fallbackStatus.style]}`}>
              <span className={styles.dot}></span>
              {fallbackStatus.label}
            </div>
          )}
          <div className={styles.timestamp}>
            {nodeStatuses.length > 0 ? "Atualização mais recente:" : "Última leitura:"} {formattedTime}
          </div>
        </div>
      </div>
    </header>
  );
};
