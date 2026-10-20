export const historyParams = (period, custom, now = new Date()) => {
  if (period === 'GERAL') return {};
  if (period === 'LIVRE') {
    if (!custom.de && !custom.ate) return {};
    if (!custom.de || !custom.ate) throw new Error('Informe início e fim, ou limpe o filtro para ver o histórico geral.');
    const start = new Date(custom.de), end = new Date(custom.ate);
    if (!Number.isFinite(+start) || !Number.isFinite(+end) || start > end) throw new Error('Período inválido. Verifique as datas.');
    return { inicio: start.toISOString(), fim: end.toISOString() };
  }
  const minutes = { '30M': 30, '1H': 60, '3H': 180, '6H': 360, '12H': 720, '24H': 1440 }[period];
  if (!minutes) throw new Error('Período inválido.');
  return { inicio: new Date(+now - minutes * 60000).toISOString(), fim: now.toISOString() };
};
