# Dashboard misto

Depende do backend RSSF com `/api/dashboard` e `/api/medicoes/historico`. Publique o backend antes deste frontend. Configure VITE_API_BASE_URL no build conforme o ambiente existente.

O perfil do backend identifica o laboratorio por gateway e ID. O painel desse ponto mostra contato, RSSI e atividade dos ciclos, sem sensores ficticios nem estimativa de carga da bateria. Outros pontos preservam a visualizacao termica.

Status expira localmente a partir do horario do servidor, mesmo sem nova resposta. Erros de atualizacao tornam a conectividade desconhecida; leituras antigas permanecem identificadas. O historico inicia em Geral, sem limite de periodo implicito; limpar o intervalo restaura Geral. Estatisticas historicas nao dependem de o no estar online agora.

O snapshot atualiza a cada 30 segundos; historico e estatisticas a cada 5 minutos, ao chegar leitura nova, ao trocar ponto/periodo ou ao retornar a aba. Respostas de selecoes antigas sao descartadas. Grafico/CSV usam serie analitica limitada a 1000 intervalos, com aviso quando houver medias. Estatisticas usam todas as amostras validas. Nao ha fallback automatico para dados ficticios.

Validacao: npm ci, npm test, npm run lint, npm run build. O teste real requer o ID do laboratorio, receptor com gateway_id explicito e backend configurado; publicar a branch nao implanta o ambiente.
