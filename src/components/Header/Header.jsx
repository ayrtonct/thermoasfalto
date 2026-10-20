import styles from './Header.module.css';

const LABELS = {
  online: 'ATIVO',
  instavel: 'INST�VEL',
  offline: 'OFFLINE',
  unknown: 'STATUS N�O CONFIRMADO'
};

export const Header = ({ isDemo, isLaboratory = false, systemState, lastUpdate, nodeStatuses = [] }) => {
  const formattedTime = lastUpdate 
    ? new Date(lastUpdate).toLocaleString('pt-BR') 
    : '--/--/---- --:--:--';
  const fallbackStatus = {
    online: { label: 'SISTEMA ATIVO', style: 'online' },
    loading: { label: 'CARREGANDO', style: 'instavel' },
    unavailable: { label: 'CONSULTA INDISPON�VEL', style: 'instavel' },
    empty: { label: 'SEM DADOS', style: 'instavel' },
    unknown: { label: 'STATUS N�O CONFIRMADO', style: 'instavel' },
    offline: { label: 'OFFLINE', style: 'offline' },
    instavel: { label: 'INST�VEL', style: 'instavel' },
  }[systemState] || { label: 'SEM DADOS', style: 'instavel' };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.logoGroup}>
          <span className={styles.icon}>???</span>
          <h1 className={styles.title}>THERMOASFALTO</h1>
        </div>
        <p className={styles.subtitle}>UEMA � CCT � Engenharia da Computa��o � PIBIC 2025/26</p>
      </div>

      <div className={styles.right}>
        {isDemo && (
          <div className={styles.demoBadge}>MODO DEMO</div>
        )}
        {isLaboratory && (
          <div className={styles.labBadge} role="status">AMBIENTE DE TESTE � SEM SENSORES</div>
        )}
        <div className={styles.statusGroup}>
          {nodeStatuses.length > 0 ? (
            <div className={styles.nodesGroup}>
              {nodeStatuses.map(node => (
                <div 
                  key={`${node.gateway_id || 'gateway'}::${node.sensor_id}`}
                  className={`${styles.statusPill} ${styles[node.status] || styles.instavel}`}
                  title={`�ltima transmiss�o: ${new Date(node.ultima_transmissao).toLocaleString('pt-BR')}`}
                >
                  <span className={styles.dot}></span>
                  {(node.display_name || `N� sensor ${node.sensor_id}`).toUpperCase()}: {LABELS[node.status] || 'OFFLINE'}
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
            {nodeStatuses.length > 0 ? "Atualiza��o mais recente:" : "�ltima leitura:"} {formattedTime}
          </div>
        </div>
      </div>
    </header>
  );
};

