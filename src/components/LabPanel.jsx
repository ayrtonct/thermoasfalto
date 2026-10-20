import styles from './LabPanel.module.css';

const formatTime = (value) => (value ? new Date(value).toLocaleString('pt-BR') : 'Aguardando primeira transmiss�o');

export const LabPanel = ({ reading, history, loading, error, retry, periodo, setPeriodo, status = 'unknown' }) => {
  const statusLabels = { online: 'Conectado', instavel: 'Aguardando pr�xima janela', offline: 'Sem contato recente', unknown: 'Status n�o confirmado' };
  return (
    <section className={styles.panel} aria-label="Ambiente de teste de bateria">
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>AMBIENTE DE TESTE</span>
          <h2>Teste de autonomia do n�</h2>
          <p>O n� opera sem sensores conectados e envia os dados armazenados em buffer a cada 8 horas.</p>
        </div>
        <span className={styles.badge}>SOMENTE COMUNICA��O</span>
      </div>

      <div className={styles.metrics}>
        <article className={styles.metric}>
          <span className={styles.metricLabel}>Estado da conex�o</span>
          <strong className={styles.connection} data-state={status}>{statusLabels[status] || statusLabels.unknown}</strong>
          <span className={styles.metricHint}>A janela de envio � longa durante o teste.</span>
        </article>
        <article className={styles.metric}>
          <span className={styles.metricLabel}>�ltima transmiss�o recebida</span>
          <strong>{formatTime(reading?.data_hora)}</strong>
          <span className={styles.metricHint}>Hor�rio registrado pelo servidor.</span>
        </article>
        <article className={styles.metric}>
          <span className={styles.metricLabel}>Sinal do �ltimo pacote</span>
          <strong>{typeof reading?.rssi === 'number' ? `${reading.rssi.toFixed(1)} dBm` : 'Indispon�vel'}</strong>
          <span className={styles.metricHint}>RSSI informado pelo receptor.</span>
        </article>
      </div>

      <div className={styles.historyHeader}>
        <div>
          <h3>Atividade recebida</h3>
          <p>Os hor�rios representam amostras do buffer agrupadas pelo backend.</p>
        </div>
        <label className={styles.periodControl}>Per�odo
          <select value={periodo} onChange={(event) => setPeriodo(event.target.value)}>
            <option value="GERAL">Hist�rico geral</option>
            <option value="24H">�ltimas 24 horas</option>
            <option value="6H">�ltimas 6 horas</option>
          </select>
        </label>
      </div>
      {loading && !history.length && <p className={styles.message} role="status">Carregando atividade...</p>}
      {error && <p className={styles.error} role="alert">{error} <button type="button" onClick={retry}>Tentar novamente</button></p>}
      {!loading && !error && history.length === 0 && <p className={styles.message}>Nenhuma transmiss�o no per�odo selecionado.</p>}
      {history.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Hor�rio do pacote</th><th>Sinal (dBm)</th><th>Amostras agrupadas</th></tr></thead>
            <tbody>{[...history].reverse().map((row) => (
              <tr key={row.id}>
                <td>{formatTime(row.data_hora)}</td>
                <td>{typeof row.rssi === 'number' ? row.rssi.toFixed(1) : '-'}</td>
                <td>{row.sample_count ?? 1}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <p className={styles.note}>A tens�o da bateria n�o � enviada pelo firmware; este painel acompanha conectividade, hor�rio e intensidade do sinal.</p>
    </section>
  );
};

