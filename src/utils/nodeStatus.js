// Server clock + elapsed time, never the workstation's wall clock.
export const effectiveNodeStatus = (node, elapsedMs = 0, queryUnavailable = false) => {
  if (!node || queryUnavailable) return 'unknown';
  const server = Date.parse(node.server_time);
  const last = Date.parse(node.ultima_transmissao);
  const online = node.profile?.online_minutes;
  const offline = node.profile?.offline_minutes;
  if (![server, last, online, offline].every(Number.isFinite) || !(online > 0 && offline > online)) return 'unknown';
  const age = (server + Math.max(0, elapsedMs) - last) / 60000;
  if (age < -1) return 'unknown';
  return age < online ? 'online' : age < offline ? 'instavel' : 'offline';
};
