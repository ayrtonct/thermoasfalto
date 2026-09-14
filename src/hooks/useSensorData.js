import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { generateThermalData, generateHistory } from '../utils/thermalModel';
import { safeValue, buildSensorStats } from '../utils/dataHelpers';
import { SENSORS } from '../constants/sensors';
import {
  buildApiUrl,
  getAvailableCollectionPoints,
  getRecordsForCollectionPoint,
  normalizeReadingsResponse,
  resolveValidatedCollectionPoint,
} from '../utils/collectionPoints';
import { fetchJsonWithTimeout } from '../utils/apiRequest';
import {
  beginLoad,
  completeLoad,
  createLatestRequestTracker,
  createLoadState,
  failLoad,
} from '../utils/loadState';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const DEMO_FALLBACK_ENABLED = import.meta.env.VITE_ENABLE_DEMO_FALLBACK === 'true';
const DEMO_SENSOR_ID = 'demo';
const REFRESH_INTERVAL_MS = 30000;
const CURRENT_TIMEOUT_MS = 5000;
const HISTORY_TIMEOUT_MS = 15000;
const RECENT_READING_LIMIT = 3;
const STORAGE_KEY = 'rssf.selectedSensorId';

const getSavedSensorId = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const sanitizeData = (item) => {
  if (!item) return null;

  const sanitized = { ...item };
  ['ds1', 'ds2', 'ds3', 'ds4', 'ds5', 'ds6'].forEach((id) => {
    const key = `temp_${id}`;
    if (sanitized[key] !== undefined) sanitized[key] = safeValue(sanitized[key]);
  });
  sanitized.rssi = typeof sanitized.rssi === 'number' && Number.isFinite(sanitized.rssi) ? sanitized.rssi : null;

  return sanitized;
};

const toLocalApiDate = (date) => new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
  .toISOString()
  .substring(0, 19);

const getRangeDates = (periodo, customRange) => {
  const now = new Date();
  if (periodo === 'LIVRE') {
    if (!customRange.de || !customRange.ate) return null;
    return { deDate: new Date(customRange.de), ateDate: new Date(customRange.ate) };
  }

  const ateDate = now;
  const deDate = new Date(now);
  const hoursByPeriod = { '1H': 1, '3H': 3, '6H': 6, '12H': 12, '24H': 24 };

  if (periodo === '30M') deDate.setMinutes(deDate.getMinutes() - 30);
  else deDate.setHours(deDate.getHours() - (hoursByPeriod[periodo] || 6));

  return { deDate, ateDate };
};

const collectionPointsAreEqual = (left, right) => {
  if (left === right) return true;
  if (!Array.isArray(left) || left.length !== right.length) return false;

  return left.every((point, index) => {
    const other = right[index];
    return point.pointKey === other.pointKey
      && point.sensorId === other.sensorId
      && point.gatewayId === other.gatewayId
      && point.dataHora === other.dataHora;
  });
};

const getRequestErrorMessage = (error, timeoutMessage, fallbackMessage) => (
  error.name === 'ApiTimeoutError' ? timeoutMessage : fallbackMessage
);

export const useSensorData = () => {
  const [currentState, setCurrentState] = useState(() => createLoadState(null));
  const [historyState, setHistoryState] = useState(() => createLoadState([]));
  const [recentReadings, setRecentReadings] = useState([]);
  const [nodeStatuses, setNodeStatuses] = useState([]);
  const [availableCollectionPoints, setAvailableCollectionPoints] = useState(null);
  const [selectedSensorId, setSelectedSensorId] = useState(getSavedSensorId);
  const [periodo, setPeriodo] = useState('6H');
  const [customRange, setCustomRange] = useState({ de: '', ate: '' });
  const [isDemo, setIsDemo] = useState(false);
  const [isPointsLoading, setIsPointsLoading] = useState(true);
  const [pointsError, setPointsError] = useState(null);
  const [currentRetryToken, setCurrentRetryToken] = useState(0);
  const [historyRetryToken, setHistoryRetryToken] = useState(0);
  const currentRequestTracker = useRef(createLatestRequestTracker());
  const historyRequestTracker = useRef(createLatestRequestTracker());
  const currentPointKeyRef = useRef(null);
  const historyQueryKeyRef = useRef(null);
  const hasLoadedPointsRef = useRef(false);

  const activeSelectedPoint = useMemo(
    () => resolveValidatedCollectionPoint(availableCollectionPoints, selectedSensorId),
    [availableCollectionPoints, selectedSensorId],
  );
  const activePointKey = activeSelectedPoint?.pointKey || null;
  const activeSensorId = activeSelectedPoint?.sensorId || null;
  const activeGatewayId = activeSelectedPoint?.gatewayId || null;
  const sensorStats = useMemo(
    () => buildSensorStats(historyState.data, SENSORS),
    [historyState.data],
  );

  useEffect(() => {
    if (!activePointKey) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, activePointKey);
    } catch {
      // Storage can be unavailable in private browsing contexts.
    }
  }, [activePointKey]);

  const selectCollectionPoint = useCallback((pointKey) => {
    currentRequestTracker.current.invalidate();
    historyRequestTracker.current.invalidate();
    setCurrentState((state) => beginLoad(state, { clear: true, emptyData: null }));
    setHistoryState((state) => beginLoad(state, { clear: true, emptyData: [] }));
    setRecentReadings([]);
    setSelectedSensorId(pointKey);
    try {
      window.localStorage.setItem(STORAGE_KEY, pointKey);
    } catch {
      // Storage can be unavailable in private browsing contexts.
    }
  }, []);

  const retryCurrent = useCallback(() => setCurrentRetryToken((token) => token + 1), []);
  const retryHistory = useCallback(() => setHistoryRetryToken((token) => token + 1), []);

  const buildDemoCurrentReading = useCallback(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() >= 30 ? 30 : 0, 0, 0);
    return sanitizeData({ ...generateThermalData(toLocalApiDate(now)), sensor_id: DEMO_SENSOR_ID, gateway_id: 'demo' });
  }, []);

  const buildDemoHistoryRange = useCallback((deStr, ateStr) => {
    if (!deStr || !ateStr) return [];
    return generateHistory(deStr, ateStr).map((reading) => sanitizeData({ ...reading, sensor_id: DEMO_SENSOR_ID, gateway_id: 'demo' }));
  }, []);

  const loadCollectionPoints = useCallback(async (signal) => {
    if (!hasLoadedPointsRef.current) setIsPointsLoading(true);
    setPointsError(null);
    try {
      const payload = await fetchJsonWithTimeout(
        buildApiUrl(API_BASE, '/api/medicoes/recentes'),
        { signal, timeoutMs: CURRENT_TIMEOUT_MS },
      );
      const readings = normalizeReadingsResponse(payload, '/api/medicoes/recentes');
      const nextPoints = getAvailableCollectionPoints(readings);
      setAvailableCollectionPoints((currentPoints) => (
        collectionPointsAreEqual(currentPoints, nextPoints) ? currentPoints : nextPoints
      ));
      hasLoadedPointsRef.current = true;
      setIsDemo(false);
    } catch (error) {
      if (error.name === 'AbortError') return;
      if (DEMO_FALLBACK_ENABLED) {
        const demoPoints = getAvailableCollectionPoints([{
          sensor_id: DEMO_SENSOR_ID,
          gateway_id: 'demo',
          data_hora: null,
        }]);
        setIsDemo(true);
        setAvailableCollectionPoints((currentPoints) => (
          collectionPointsAreEqual(currentPoints, demoPoints) ? currentPoints : demoPoints
        ));
        hasLoadedPointsRef.current = true;
      } else {
        setPointsError(getRequestErrorMessage(
          error,
          'Tempo limite excedido ao consultar os pontos de coleta.',
          'Nao foi possivel carregar os pontos de coleta.',
        ));
      }
    } finally {
      if (!signal.aborted) setIsPointsLoading(false);
    }
  }, []);

  const loadStatus = useCallback(async (signal) => {
    if (isDemo && DEMO_FALLBACK_ENABLED) return;
    try {
      const payload = await fetchJsonWithTimeout(
        buildApiUrl(API_BASE, '/api/status'),
        { signal, timeoutMs: CURRENT_TIMEOUT_MS },
      );
      if (!Array.isArray(payload)) throw new Error('Resposta invalida em /api/status');
      setNodeStatuses(payload);
    } catch (error) {
      // A failure to query status is not evidence that a node is offline.
      if (error.name !== 'AbortError') setNodeStatuses([]);
    }
  }, [isDemo]);

  useEffect(() => {
    const activeControllers = new Set();
    let isPolling = false;

    const pollGlobalData = async () => {
      if (isPolling) return;
      isPolling = true;
      const controller = new AbortController();
      activeControllers.add(controller);

      try {
        await Promise.all([
          loadCollectionPoints(controller.signal),
          loadStatus(controller.signal),
        ]);
      } finally {
        activeControllers.delete(controller);
        isPolling = false;
      }
    };

    pollGlobalData();
    const intervalId = setInterval(pollGlobalData, REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
      activeControllers.forEach((controller) => controller.abort());
      activeControllers.clear();
    };
  }, [loadCollectionPoints, loadStatus]);

  useEffect(() => {
    if (!activePointKey || !activeSensorId) {
      currentPointKeyRef.current = null;
      setCurrentState(createLoadState(null));
      setRecentReadings([]);
      return undefined;
    }

    const shouldClearCurrent = currentPointKeyRef.current !== activePointKey;
    currentPointKeyRef.current = activePointKey;

    const activeControllers = new Set();
    let disposed = false;
    let isPolling = false;
    const requestTracker = currentRequestTracker.current;
    const point = {
      pointKey: activePointKey,
      sensorId: activeSensorId,
      gatewayId: activeGatewayId,
    };

    const loadCurrent = async (clearPreviousData) => {
      if (isPolling) return;
      isPolling = true;
      const controller = new AbortController();
      const requestId = requestTracker.begin();
      activeControllers.add(controller);
      setCurrentState((state) => beginLoad(state, {
        clear: clearPreviousData,
        emptyData: null,
      }));
      if (clearPreviousData) setRecentReadings([]);

      try {
        let records;
        if (isDemo && DEMO_FALLBACK_ENABLED && activeSensorId === DEMO_SENSOR_ID) {
          records = [buildDemoCurrentReading()];
        } else {
          const endpoint = `/api/medicoes/${encodeURIComponent(activeSensorId)}`;
          const payload = await fetchJsonWithTimeout(buildApiUrl(API_BASE, endpoint, {
            limite: RECENT_READING_LIMIT,
            gateway_id: activeGatewayId,
          }), { signal: controller.signal, timeoutMs: CURRENT_TIMEOUT_MS });
          records = normalizeReadingsResponse(payload, endpoint);
        }

        const pointRecords = getRecordsForCollectionPoint(records, point);
        if (records.length !== pointRecords.length) {
          throw new Error('A leitura atual retornou dados de outro ponto de coleta.');
        }
        const sanitizedRecords = pointRecords.map(sanitizeData);
        if (disposed || controller.signal.aborted || !requestTracker.isCurrent(requestId)) return;

        setRecentReadings(sanitizedRecords);
        setCurrentState(completeLoad(sanitizedRecords[0] || null));
      } catch (error) {
        if (error.name === 'AbortError' || disposed || !requestTracker.isCurrent(requestId)) return;
        setCurrentState((state) => failLoad(state, getRequestErrorMessage(
          error,
          'Tempo limite excedido ao consultar a leitura atual. Os ultimos dados exibidos foram preservados.',
          'Nao foi possivel atualizar a leitura atual. Os ultimos dados exibidos foram preservados.',
        )));
      } finally {
        activeControllers.delete(controller);
        isPolling = false;
      }
    };

    loadCurrent(shouldClearCurrent);
    const intervalId = setInterval(() => loadCurrent(false), REFRESH_INTERVAL_MS);

    return () => {
      disposed = true;
      requestTracker.invalidate();
      clearInterval(intervalId);
      activeControllers.forEach((controller) => controller.abort());
      activeControllers.clear();
    };
  }, [
    activeGatewayId,
    activePointKey,
    activeSensorId,
    buildDemoCurrentReading,
    currentRetryToken,
    isDemo,
  ]);

  useEffect(() => {
    if (!activePointKey || !activeSensorId) {
      historyQueryKeyRef.current = null;
      setHistoryState(createLoadState([]));
      return undefined;
    }

    const range = getRangeDates(periodo, customRange);
    if (!range) {
      historyQueryKeyRef.current = null;
      setHistoryState(failLoad(
        createLoadState([]),
        'Informe as datas de inicio e fim para consultar o periodo personalizado.',
      ));
      return undefined;
    }
    if (
      Number.isNaN(range.deDate.getTime())
      || Number.isNaN(range.ateDate.getTime())
      || range.deDate > range.ateDate
    ) {
      setHistoryState((state) => failLoad(
        beginLoad(state, { clear: true, emptyData: [] }),
        'Periodo invalido. Verifique as datas de inicio e fim.',
      ));
      return undefined;
    }

    const historyQueryKey = `${activePointKey}|${periodo}|${customRange.de}|${customRange.ate}`;
    const shouldClearHistory = historyQueryKeyRef.current !== historyQueryKey;
    historyQueryKeyRef.current = historyQueryKey;

    const activeControllers = new Set();
    let disposed = false;
    let isPolling = false;
    const requestTracker = historyRequestTracker.current;
    const point = {
      pointKey: activePointKey,
      sensorId: activeSensorId,
      gatewayId: activeGatewayId,
    };

    const loadHistory = async (clearPreviousData) => {
      if (isPolling) return;
      isPolling = true;
      const controller = new AbortController();
      const requestId = requestTracker.begin();
      activeControllers.add(controller);
      setHistoryState((state) => beginLoad(state, {
        clear: clearPreviousData,
        emptyData: [],
      }));

      try {
        const currentRange = periodo === 'LIVRE' ? range : getRangeDates(periodo, customRange);
        let records;
        if (isDemo && DEMO_FALLBACK_ENABLED && activeSensorId === DEMO_SENSOR_ID) {
          records = buildDemoHistoryRange(
            toLocalApiDate(currentRange.deDate),
            toLocalApiDate(currentRange.ateDate),
          );
        } else {
          const endpoint = '/api/medicoes';
          const payload = await fetchJsonWithTimeout(buildApiUrl(API_BASE, endpoint, {
            inicio: toLocalApiDate(currentRange.deDate),
            fim: toLocalApiDate(currentRange.ateDate),
            sensor_id: activeSensorId,
            gateway_id: activeGatewayId,
          }), { signal: controller.signal, timeoutMs: HISTORY_TIMEOUT_MS });
          records = normalizeReadingsResponse(payload, endpoint);
        }

        const pointRecords = getRecordsForCollectionPoint(records, point);
        if (records.length !== pointRecords.length) {
          throw new Error('O historico retornou dados de outro ponto de coleta.');
        }
        const sanitizedRecords = pointRecords.map(sanitizeData);
        if (disposed || controller.signal.aborted || !requestTracker.isCurrent(requestId)) return;

        setHistoryState(completeLoad(sanitizedRecords));
      } catch (error) {
        if (error.name === 'AbortError' || disposed || !requestTracker.isCurrent(requestId)) return;
        setHistoryState((state) => failLoad(state, getRequestErrorMessage(
          error,
          'Tempo limite excedido ao consultar o historico. Os dados anteriores foram preservados.',
          'Nao foi possivel atualizar o historico. Os dados anteriores foram preservados.',
        )));
      } finally {
        activeControllers.delete(controller);
        isPolling = false;
      }
    };

    loadHistory(shouldClearHistory);
    const intervalId = setInterval(() => loadHistory(false), REFRESH_INTERVAL_MS);

    return () => {
      disposed = true;
      requestTracker.invalidate();
      clearInterval(intervalId);
      activeControllers.forEach((controller) => controller.abort());
      activeControllers.clear();
    };
  }, [
    activeGatewayId,
    activePointKey,
    activeSensorId,
    buildDemoHistoryRange,
    customRange,
    historyRetryToken,
    isDemo,
    periodo,
  ]);

  return {
    leituraAtual: currentState.data,
    historico: historyState.data,
    recentReadings,
    sensorStats,
    nodeStatuses,
    availableCollectionPoints,
    selectedCollectionPoint: activeSelectedPoint,
    setSelectedSensorId: selectCollectionPoint,
    periodo,
    setPeriodo,
    customRange,
    setCustomRange,
    isDemo,
    isPointsLoading,
    isCurrentLoading: currentState.isLoading,
    currentHasLoaded: currentState.hasLoaded,
    currentError: currentState.error,
    isHistoryLoading: historyState.isLoading,
    historyHasLoaded: historyState.hasLoaded,
    historyError: historyState.error,
    retryCurrent,
    retryHistory,
    hasLoadedPoints: availableCollectionPoints !== null,
    pointsError,
  };
};
