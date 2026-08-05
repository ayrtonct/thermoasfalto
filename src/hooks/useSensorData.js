import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { generateThermalData, generateHistory } from '../utils/thermalModel';
import { safeValue, buildSensorStats } from '../utils/dataHelpers';
import { SENSORS } from '../constants/sensors';
import {
  buildApiUrl,
  getAvailableCollectionPoints,
  getReadingForCollectionPoint,
  getRecordsForCollectionPoint,
  normalizeReadingsResponse,
  resolveValidatedCollectionPoint,
} from '../utils/collectionPoints';
import { fetchJsonWithTimeout } from '../utils/apiRequest';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const DEMO_FALLBACK_ENABLED = import.meta.env.VITE_ENABLE_DEMO_FALLBACK === 'true';
const DEMO_SENSOR_ID = 'demo';
const REFRESH_INTERVAL_MS = 30000;
const STORAGE_KEY = 'rssf.selectedSensorId';
const FULL_HISTORY_START = '1970-01-01T00:00:00';

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

export const useSensorData = () => {
  const [leituraAtual, setLeituraAtual] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [sensorStats, setSensorStats] = useState([]);
  const [fullHistory, setFullHistory] = useState([]);
  const [fullHistoryStats, setFullHistoryStats] = useState([]);
  const [nodeStatuses, setNodeStatuses] = useState([]);
  const [availableCollectionPoints, setAvailableCollectionPoints] = useState(null);
  const [selectedSensorId, setSelectedSensorId] = useState(getSavedSensorId);
  const [periodo, setPeriodo] = useState('6H');
  const [customRange, setCustomRange] = useState({ de: '', ate: '' });
  const [isDemo, setIsDemo] = useState(false);
  const [isPointsLoading, setIsPointsLoading] = useState(true);
  const [isCurrentLoading, setIsCurrentLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [pointsError, setPointsError] = useState(null);
  const [currentError, setCurrentError] = useState(null);
  const [historyError, setHistoryError] = useState(null);
  const [fullHistoryError, setFullHistoryError] = useState(null);
  const [isFullHistoryLoading, setIsFullHistoryLoading] = useState(false);
  const dataRequestId = useRef(0);
  const fullHistoryRequestId = useRef(0);
  const hasLoadedPointsRef = useRef(false);

  const activeSelectedPoint = useMemo(
    () => resolveValidatedCollectionPoint(availableCollectionPoints, selectedSensorId),
    [availableCollectionPoints, selectedSensorId],
  );

  useEffect(() => {
    if (!activeSelectedPoint) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, activeSelectedPoint.pointKey);
    } catch {
      // Storage can be unavailable in private browsing contexts.
    }
  }, [activeSelectedPoint]);

  const selectCollectionPoint = useCallback((sensorId) => {
    // Clear the old point synchronously so its values cannot be painted under the new label.
    setLeituraAtual(null);
    setHistorico([]);
    setSensorStats([]);
    setFullHistory([]);
    setFullHistoryStats([]);
    setIsCurrentLoading(true);
    setIsHistoryLoading(true);
    setSelectedSensorId(sensorId);
    try {
      window.localStorage.setItem(STORAGE_KEY, sensorId);
    } catch {
      // Storage can be unavailable in private browsing contexts.
    }
  }, []);

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
      const payload = await fetchJsonWithTimeout(buildApiUrl(API_BASE, '/api/medicoes/recentes'), { signal, timeoutMs: 5000 });
      const readings = normalizeReadingsResponse(payload, '/api/medicoes/recentes');
      setAvailableCollectionPoints(getAvailableCollectionPoints(readings));
      hasLoadedPointsRef.current = true;
      setIsDemo(false);
    } catch (error) {
      if (error.name === 'AbortError') return;
      if (DEMO_FALLBACK_ENABLED) {
        setIsDemo(true);
        setAvailableCollectionPoints(getAvailableCollectionPoints([{
          sensor_id: DEMO_SENSOR_ID,
          gateway_id: 'demo',
          data_hora: null,
        }]));
      } else {
        setPointsError(error.name === 'ApiTimeoutError'
          ? 'Tempo limite excedido ao consultar os pontos de coleta.'
          : 'Nao foi possivel carregar os pontos de coleta.');
      }
    } finally {
      if (!signal.aborted) setIsPointsLoading(false);
    }
  }, []);

  const loadStatus = useCallback(async (signal) => {
    if (isDemo && DEMO_FALLBACK_ENABLED) return;
    try {
      const payload = await fetchJsonWithTimeout(buildApiUrl(API_BASE, '/api/status'), { signal, timeoutMs: 5000 });
      if (!Array.isArray(payload)) throw new Error('Resposta invalida em /api/status');
      setNodeStatuses(payload);
    } catch (error) {
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
    const controller = new AbortController();
    const requestId = fullHistoryRequestId.current + 1;
    fullHistoryRequestId.current = requestId;

    if (!activeSelectedPoint) {
      setFullHistory([]);
      setFullHistoryStats([]);
      setIsFullHistoryLoading(false);
      setFullHistoryError(null);
      return () => controller.abort();
    }

    const loadFullHistory = async () => {
      setFullHistory([]);
      setFullHistoryStats([]);
      setFullHistoryError(null);
      setIsFullHistoryLoading(true);

      try {
        const payload = await fetchJsonWithTimeout(buildApiUrl(API_BASE, '/api/medicoes', {
          inicio: FULL_HISTORY_START,
          fim: toLocalApiDate(new Date()),
          sensor_id: activeSelectedPoint.sensorId,
          gateway_id: activeSelectedPoint.gatewayId,
        }), { signal: controller.signal });
        const records = normalizeReadingsResponse(payload, '/api/medicoes');
        const pointRecords = getRecordsForCollectionPoint(records, activeSelectedPoint);
        if (records.length !== pointRecords.length) {
          throw new Error('O historico completo retornou dados de outro ponto de coleta.');
        }
        if (fullHistoryRequestId.current !== requestId || controller.signal.aborted) return;

        const sanitizedRecords = pointRecords.map(sanitizeData);
        setFullHistory(sanitizedRecords);
        setFullHistoryStats(buildSensorStats(sanitizedRecords, SENSORS));
      } catch (error) {
        if (error.name !== 'AbortError' && fullHistoryRequestId.current === requestId) {
          setFullHistoryError(error.name === 'ApiTimeoutError'
            ? 'Tempo limite excedido ao consultar a analise historica.'
            : 'Nao foi possivel carregar a analise historica.');
        }
      } finally {
        if (fullHistoryRequestId.current === requestId && !controller.signal.aborted) {
          setIsFullHistoryLoading(false);
        }
      }
    };

    loadFullHistory();
    return () => controller.abort();
  }, [activeSelectedPoint, leituraAtual?.data_hora]);

  useEffect(() => {
    const activeControllers = new Set();

    if (!activeSelectedPoint) {
      setLeituraAtual(null);
      setHistorico([]);
      setSensorStats([]);
      setIsCurrentLoading(false);
      setIsHistoryLoading(false);
      return () => activeControllers.forEach((controller) => controller.abort());
    }

    const range = getRangeDates(periodo, customRange);
    const loadData = async (clearPreviousData) => {
      const controller = new AbortController();
      activeControllers.add(controller);
      const requestId = dataRequestId.current + 1;
      dataRequestId.current = requestId;
      if (clearPreviousData) {
        setLeituraAtual(null);
        setHistorico([]);
        setSensorStats([]);
      }
      setCurrentError(null);
      setHistoryError(null);
      setIsCurrentLoading(true);
      setIsHistoryLoading(Boolean(range));

      if (isDemo && DEMO_FALLBACK_ENABLED && activeSelectedPoint.sensorId === DEMO_SENSOR_ID) {
        const current = buildDemoCurrentReading();
        const demoHistory = range ? buildDemoHistoryRange(toLocalApiDate(range.deDate), toLocalApiDate(range.ateDate)) : [];
        if (dataRequestId.current === requestId) {
          setLeituraAtual(current);
          setHistorico(demoHistory);
          setSensorStats(buildSensorStats(demoHistory, SENSORS));
          setIsCurrentLoading(false);
          setIsHistoryLoading(false);
        }
        activeControllers.delete(controller);
        return;
      }

      const currentPromise = fetchJsonWithTimeout(
        buildApiUrl(API_BASE, '/api/medicoes/recentes', {
          sensor_id: activeSelectedPoint.sensorId,
          gateway_id: activeSelectedPoint.gatewayId,
        }),
        { signal: controller.signal, timeoutMs: 5000 },
      ).then((payload) => getReadingForCollectionPoint(
        normalizeReadingsResponse(payload, '/api/medicoes/recentes'),
        activeSelectedPoint,
      ));

      const historyPromise = range
        ? fetchJsonWithTimeout(buildApiUrl(API_BASE, '/api/medicoes', {
          inicio: toLocalApiDate(range.deDate),
          fim: toLocalApiDate(range.ateDate),
          sensor_id: activeSelectedPoint.sensorId,
          gateway_id: activeSelectedPoint.gatewayId,
        }), { signal: controller.signal }).then((payload) => {
          const records = normalizeReadingsResponse(payload, '/api/medicoes');
          const filteredRecords = getRecordsForCollectionPoint(records, activeSelectedPoint);
          if (records.length !== filteredRecords.length) {
            throw new Error('O historico retornou dados de outro ponto de coleta.');
          }
          return filteredRecords.map(sanitizeData);
        })
        : Promise.resolve([]);

      try {
        const [currentResult, historyResult] = await Promise.allSettled([currentPromise, historyPromise]);
        if (dataRequestId.current !== requestId || controller.signal.aborted) return;

        if (currentResult.status === 'fulfilled') setLeituraAtual(sanitizeData(currentResult.value));
        else if (currentResult.reason.name !== 'AbortError') {
          setCurrentError(currentResult.reason.name === 'ApiTimeoutError'
            ? 'Tempo limite excedido ao consultar a leitura atual deste ponto.'
            : 'Nao foi possivel carregar a leitura atual deste ponto.');
        }

        if (historyResult.status === 'fulfilled') {
          setHistorico(historyResult.value);
          setSensorStats(buildSensorStats(historyResult.value, SENSORS));
        } else if (historyResult.reason.name !== 'AbortError') {
          setHistoryError(historyResult.reason.name === 'ApiTimeoutError'
            ? 'Tempo limite excedido ao consultar o historico deste ponto.'
            : 'Nao foi possivel carregar o historico deste ponto.');
        }
        setIsCurrentLoading(false);
        setIsHistoryLoading(false);
      } finally {
        activeControllers.delete(controller);
      }
    };

    loadData(true);
    const intervalId = setInterval(() => loadData(false), REFRESH_INTERVAL_MS);

    return () => {
      activeControllers.forEach((controller) => controller.abort());
      clearInterval(intervalId);
    };
  }, [activeSelectedPoint, buildDemoCurrentReading, buildDemoHistoryRange, customRange, isDemo, periodo]);

  return {
    leituraAtual,
    historico,
    sensorStats,
    fullHistory,
    fullHistoryStats,
    isFullHistoryLoading,
    fullHistoryError,
    nodeStatuses,
    availableCollectionPoints,
    selectedCollectionPoint: activeSelectedPoint,
    setSelectedSensorId: selectCollectionPoint,
    periodo,
    setPeriodo,
    customRange,
    setCustomRange,
    isDemo,
    isLoading: isPointsLoading || isCurrentLoading || isHistoryLoading,
    isPointLoading: isCurrentLoading || isHistoryLoading,
    hasLoadedPoints: availableCollectionPoints !== null,
    error: currentError || historyError,
    pointsError,
  };
};
