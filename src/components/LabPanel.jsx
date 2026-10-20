import styles from './LabPanel.module.css';

const formatTime = (value) => (value ? new Date(value).toLocaleString('pt-BR') : 'Aguardando primeira transmissão');

export const LabPanel = ({ reading, history, loading, error, retry, periodo, setPeriodo, status = 'unknown' }) => {
  const statusLabels = { online: 'Conectado', instavel: 'Aguardando próxima janela', offline: 'Sem contato recente', unknown: 'Status não confirmado' };
  return (
    <section className={styles.panel} aria-label="Ambiente de teste de bateria">
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>AMBIENTE DE TESTE</span>
          <h2>Teste de autonomia do nó</h2>
          <p>O nó opera sem sensores conectados e envia os dados armazenados em buffer a cada 8 horas.</p>
        </div>
        <span className={styles.badge}>SOMENTE COMUNICAÇÃO</span>
      </div>

      <div className={styles.metrics}>
        <article className={styles.metric}>
          <span className={styles.metricLabel}>Estado da conexão</span>
          <strong className={styles.connection} data-state={status}>{statusLabels[status] || statusLabels.unknown}</strong>
          <span className={styles.metricHint}>A janela de envio é longa durante o teste.</span>
        </article>
        <article className={styles.metric}>
          <span className={styles.metricLabel}>Última transmissão recebida</span>
          <strong>{formatTime(reading?.data_hora)}</strong>
          <span className={styles.metricHint}>Horário registrado pelo servidor.</span>
        </article>
        <article className={styles.metric}>
          <span className={styles.metricLabel}>Sinal do último pacote</span>
          <strong>{typeof reading?.rssi === 'number' ? `${reading.rssi.toFixed(1)} dBm` : 'Indisponível'}</strong>
          <span className={styles.metricHint}>RSSI informado pelo receptor.</span>
        </article>
      </div>

      <div className={styles.historyHeader}>
        <div>
          <h3>Atividade recebida</h3>
          <p>Os horários representam amostras do buffer agrupadas pelo backend.</p>
        </div>
        <label className={styles.periodControl}>Período
          <select value={periodo} onChange={(event) => setPeriodo(event.target.value)}>
            <option value="GERAL">Histórico geral</option>
            <option value="24H">Últimas 24 horas</option>
            <option value="6H">Últimas 6 horas</option>
          </select>
        </label>
      </div>
      {loading && !history.length && <p className={styles.message} role="status">Carregando atividade...</p>}
      {error && <p className={styles.error} role="alert">{error} <button type="button" onClick={retry}>Tentar novamente</button></p>}
      {!loading && !error && history.length === 0 && <p className={styles.message}>Nenhuma transmissão no período selecionado.</p>}
      {history.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Horário do pacote</th><th>Sinal (dBm)</th><th>Amostras agrupadas</th></tr></thead>
            <tbody>{[...history].reverse().map((row) => (
              <tr key={row.id}>
                <td>{formatTime(row.data_hora)}</td>
                <td>{typeof row.rssi === 'number' ? row.rssi.toFixed(1) : '—'}</td>
                <td>{row.sample_count ?? 1}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <p className={styles.note}>A tensão da bateria não é enviada pelo firmware; este painel acompanha conectividade, horário e intensidade do sinal.</p>
    </section>
  );
};
