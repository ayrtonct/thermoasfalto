import { useState, useEffect, useCallback, useMemo } from 'react';
import { getNodeProfile } from '../constants/sensors';
import { safeValue } from '../utils/dataHelpers';
import { buildApiUrl, getAvailableCollectionPoints, getRecordsForCollectionPoint,
  resolveValidatedCollectionPoint } from '../utils/collectionPoints';
import { fetchJsonWithTimeout } from '../utils/apiRequest';
import { effectiveNodeStatus } from '../utils/nodeStatus';
import { historyParams } from '../utils/historyScope';
import { POINTS_TIMEOUT_MS, HISTORY_TIMEOUT_MS } from '../utils/requestPolicy';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const STORAGE_KEY = 'rssf.selectedSensorId';
const savedPoint = () => { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } };

// Independent loading/error states; obsolete requests cannot replace current data.
const useResource = (key, loader, interval = 0) => {
  const [state, setState] = useState({ key: null, data: null, error: null, loading: true });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!key) return undefined;
    let disposed = false, pending = false;
    const controllers = new Set();
    const load = async () => {
      if (pending) return;
      pending = true;
      const controller = new AbortController();
      controllers.add(controller);
      setState((previous) => ({ key, data: previous.key === key ? previous.data : null,
        error: previous.key === key ? previous.error : null, loading: true }));
      try {
        const data = await loader(controller.signal);
        if (!disposed) setState({ key, data, error: null, loading: false });
      } catch (error) {
        if (!disposed && error.name !== 'AbortError') setState((previous) => ({ ...previous, loading: false,
          error: error.name === 'ApiTimeoutError' ? 'Tempo limite excedido. Tente novamente.' : error.message }));
      } finally { pending = false; controllers.delete(controller); }
    };
    load();
    const timer = interval ? setInterval(load, interval) : null;
    const visible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', visible);
    return () => {
      disposed = true;
      clearInterval(timer);
      controllers.forEach((controller) => controller.abort());
      document.removeEventListener('visibilitychange', visible);
    };
  }, [key, loader, interval, retry]);
  const retryNow = useCallback(() => setRetry((value) => value + 1), []);
  return { ...(state.key === key ? state : { data: null, error: null, loading: Boolean(key) }), retry: retryNow };
};

const sanitize = (reading) => Object.fromEntries(Object.entries(reading).map(([key, value]) => [
  key, key.startsWith('temp_ds') ? safeValue(value) : value,
]));

export const useSensorData = () => {
  const [selectedId, setSelectedId] = useState(savedPoint);
  const [periodo, setPeriodo] = useState('GERAL');
  const [customRange, setCustomRange] = useState({ de: '', ate: '' });
  const [clock, setClock] = useState(() => performance.now());
  useEffect(() => {
    const tick = setInterval(() => setClock(performance.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  const loadDashboard = useCallback(async (signal) => {
    const result = await fetchJsonWithTimeout(buildApiUrl(API_BASE, '/api/dashboard'), { signal, timeoutMs: POINTS_TIMEOUT_MS });
    if (!Array.isArray(result.readings) || !Array.isArray(result.statuses)) throw new Error('Resposta inválida do dashboard.');
    return { ...result, receivedAt: performance.now() };
  }, []);
  const dashboard = useResource('dashboard', loadDashboard, 30000);
  const points = useMemo(() => dashboard.data ? getAvailableCollectionPoints(dashboard.data.readings) : null, [dashboard.data]);
  const point = useMemo(() => resolveValidatedCollectionPoint(points, selectedId), [points, selectedId]);
  const current = useMemo(() => {
    const reading = getRecordsForCollectionPoint(dashboard.data?.readings || [], point)[0];
    return reading ? sanitize(reading) : null;
  }, [dashboard.data, point]);
  const laboratory = current?.profile?.mode === 'laboratory';
  const profile = useMemo(() => ({ ...getNodeProfile(point?.sensorId), ...current?.profile,
    ...(laboratory ? { displayName: 'Laboratório — teste de bateria', channels: [] } : {}),
  }), [point?.sensorId, current?.profile, laboratory]);
  const nodeStatuses = (dashboard.data?.statuses || []).map((node) => ({ ...node,
    status: effectiveNodeStatus(node, clock - dashboard.data.receivedAt, Boolean(dashboard.error)),
  }));
  const select = useCallback((id) => {
    setSelectedId(id);
    setPeriodo('GERAL');
    setCustomRange({ de: '', ate: '' });
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* storage optional */ }
  }, []);
  const pointKey = point?.pointKey;
  const sensorId = point?.sensorId;
  const gatewayId = point?.gatewayId;
  const revision = current ? `${current.id}|${current.data_hora}` : '';
  const scope = useMemo(() => {
    try { return { params: historyParams(periodo, customRange), error: null }; }
    catch (error) { return { params: {}, error: error.message }; }
  }, [periodo, customRange]);
  const loadHistory = useCallback(async (signal) => {
    const result = await fetchJsonWithTimeout(buildApiUrl(API_BASE, '/api/medicoes/historico', {
      sensor_id: sensorId, gateway_id: gatewayId, ...historyParams(periodo, customRange),
    }), { signal, timeoutMs: HISTORY_TIMEOUT_MS });
    if (!Array.isArray(result.readings)) throw new Error('Histórico inválido.');
    if (getRecordsForCollectionPoint(result.readings, { pointKey }).length !== result.readings.length) throw new Error('Histórico de outro ponto.');
    return { ...result, readings: result.readings.map(sanitize) };
  }, [sensorId, gatewayId, pointKey, periodo, customRange]);
  const loadStats = useCallback(async (signal) => {
    const result = await fetchJsonWithTimeout(buildApiUrl(API_BASE, '/api/medicoes/estatisticas', {
      sensor_id: sensorId, gateway_id: gatewayId, ...historyParams(periodo, customRange),
    }), { signal, timeoutMs: HISTORY_TIMEOUT_MS });
    if (!Array.isArray(result)) throw new Error('Estatísticas inválidas.');
    return result.map((row) => ({ ...row, count: Number(row.count),
      avg: row.avg === null ? null : Number(row.avg), max: row.max === null ? null : Number(row.max),
      min: row.min === null ? null : Number(row.min) }));
  }, [sensorId, gatewayId, periodo, customRange]);
  const queryKey = pointKey && !scope.error ? `${pointKey}|${periodo}|${customRange.de}|${customRange.ate}|${revision}` : null;
  const history = useResource(queryKey, loadHistory, 300000);
  const stats = useResource(queryKey, loadStats, 300000);
  const retryChart = history.retry, retryStats = stats.retry;
  const retryHistory = useCallback(() => { retryChart(); retryStats(); }, [retryChart, retryStats]);
  return {
    leituraAtual: current, historico: history.data?.readings || [], recentReadings: current ? [current] : [],
    sensorStats: stats.data || [], nodeStatuses, availableCollectionPoints: points,
    selectedCollectionPoint: point, activeNodeProfile: profile, setSelectedSensorId: select,
    periodo, setPeriodo, customRange, setCustomRange, isDemo: false,
    isPointsLoading: dashboard.loading, isCurrentLoading: dashboard.loading,
    currentHasLoaded: Boolean(dashboard.data), currentError: dashboard.error,
    isHistoryLoading: history.loading, historyHasLoaded: Boolean(history.data),
    historyError: scope.error || history.error, historyMeta: history.data,
    isStatsLoading: stats.loading, statsHasLoaded: Boolean(stats.data), statsError: scope.error || stats.error,
    statsScope: Object.keys(scope.params).length ? 'Período selecionado' : 'Histórico geral do ponto',
    retryCurrent: dashboard.retry, retryPoints: dashboard.retry, retryHistory,
    hasLoadedPoints: Boolean(dashboard.data), pointsError: dashboard.error,
  };
};
