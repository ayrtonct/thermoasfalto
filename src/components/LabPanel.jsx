export const LabPanel = ({ reading, history, loading, error, retry, periodo, setPeriodo }) => (
  <section aria-label="Teste de bateria" style={{ padding: '24px', border: '1px solid var(--border2)', borderRadius: '12px' }}>
    <h2>Laboratório — teste de bateria</h2>
    <p>Sem sensores conectados · transmissão esperada a cada 8 horas.</p>
    <p>Último contato: {reading?.data_hora ? new Date(reading.data_hora).toLocaleString('pt-BR') : 'Aguardando'}.</p>
    <p>RSSI do último pacote: {typeof reading?.rssi === 'number' ? `${reading.rssi.toFixed(1)} dBm` : 'Indisponível'}.</p>
    <p>Este teste acompanha a comunicação. A tensão da bateria não é enviada pelo firmware.</p>
    <label>Histórico de atividade <select value={periodo} onChange={(event) => setPeriodo(event.target.value)}>
      <option value="GERAL">Geral</option><option value="24H">Últimas 24 horas</option><option value="6H">Últimas 6 horas</option>
    </select></label>
    {loading && !history.length && <p role="status">Carregando atividade...</p>}
    {error && <p role="alert">{error} <button onClick={retry}>Tentar novamente</button></p>}
    <p>Horários estimados dos ciclos armazenados no buffer; cada grupo pode reunir várias amostras. Não são contagens de transmissões.</p>
    <div style={{ maxHeight: 320, overflow: 'auto' }}>
      <table><thead><tr><th>Horário</th><th>RSSI do pacote (dBm)</th><th>Amostras no intervalo</th></tr></thead>
        <tbody>{[...history].reverse().map((row) => <tr key={row.id}>
          <td>{new Date(row.data_hora).toLocaleString('pt-BR')}</td>
          <td>{typeof row.rssi === 'number' ? row.rssi.toFixed(1) : '—'}</td><td>{row.sample_count}</td>
        </tr>)}</tbody></table>
    </div>
  </section>
);
