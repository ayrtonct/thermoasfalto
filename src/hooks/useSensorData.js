import { useState, useEffect, useCallback } from 'react';
import { generateThermalData, generateHistory } from '../utils/thermalModel';
import { safeValue, buildSensorStats } from '../utils/dataHelpers';
import { SENSORS } from '../constants/sensors';

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const DEMO_FALLBACK_ENABLED = import.meta.env.VITE_ENABLE_DEMO_FALLBACK === 'true';

const sanitizeData = (item) => {
  if (!item) return null;

  const sanitized = { ...item };
  ['ds1', 'ds2', 'ds3', 'ds4', 'ds5', 'ds6'].forEach((id) => {
    const key = `temp_${id}`;
    if (sanitized[key] !== undefined) {
      sanitized[key] = safeValue(sanitized[key]);
    }
  });

  return sanitized;
};

const toLocalApiDate = (date) => {
  return new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
    .toISOString()
    .substring(0, 19);
};

const getRangeDates = (periodo, customRange) => {
  const now = new Date();

  if (periodo === 'LIVRE') {
    if (!customRange.de || !customRange.ate) return null;

    return {
      deDate: new Date(customRange.de),
      ateDate: new Date(customRange.ate),
    };
  }

  const ateDate = now;
  const deDate = new Date(now);

  switch (periodo) {
    case '30M': deDate.setMinutes(deDate.getMinutes() - 30); break;
    case '1H': deDate.setHours(deDate.getHours() - 1); break;
    case '3H': deDate.setHours(deDate.getHours() - 3); break;
    case '6H': deDate.setHours(deDate.getHours() - 6); break;
    case '12H': deDate.setHours(deDate.getHours() - 12); break;
    case '24H': deDate.setHours(deDate.getHours() - 24); break;
    default: deDate.setHours(deDate.getHours() - 6); break;
  }

  return { deDate, ateDate };
};

export const useSensorData = () => {
  const [leituraAtual, setLeituraAtual] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [sensorStats, setSensorStats] = useState([]);
  const [nodeStatuses, setNodeStatuses] = useState([]);

  const [periodo, setPeriodo] = useState('6H');
  const [customRange, setCustomRange] = useState({ de: '', ate: '' });

  const [isDemo, setIsDemo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const buildDemoCurrentReading = useCallback(() => {
    const now = new Date();
    const minuteMark = now.getMinutes() >= 30 ? 30 : 0;

    now.setMinutes(minuteMark, 0, 0);
    return sanitizeData(generateThermalData(toLocalApiDate(now)));
  }, []);

  const buildDemoHistoryRange = useCallback((deStr, ateStr) => {
    if (!deStr || !ateStr) return [];
    return generateHistory(deStr, ateStr).map(sanitizeData);
  }, []);

  const fetchAtual = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${API_BASE}/api/medicoes/recentes`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error('Status not OK');

      const data = await res.json();
      setIsDemo(false);
      setLeituraAtual(sanitizeData(Array.isArray(data) && data.length > 0 ? data[0] : null));
    } catch (err) {
      if (DEMO_FALLBACK_ENABLED) {
        setIsDemo(true);
        setLeituraAtual(buildDemoCurrentReading());
        return;
      }

      setIsDemo(false);
      setError('Nao foi possivel carregar a leitura atual.');
    }
  }, [buildDemoCurrentReading]);

  const fetchHistorico = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const range = getRangeDates(periodo, customRange);
      if (!range) {
        setIsLoading(false);
        return;
      }

      const deStr = toLocalApiDate(range.deDate);
      const ateStr = toLocalApiDate(range.ateDate);

      if (isDemo && DEMO_FALLBACK_ENABLED) {
        setHistorico(buildDemoHistoryRange(deStr, ateStr));
        setIsLoading(false);
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${API_BASE}/api/medicoes?inicio=${deStr}&fim=${ateStr}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error('Status not OK');

      const data = await res.json();
      setIsDemo(false);
      setHistorico(data.map(sanitizeData));
    } catch (err) {
      if (DEMO_FALLBACK_ENABLED) {
        const range = getRangeDates(periodo, customRange);
        const deStr = range ? toLocalApiDate(range.deDate) : null;
        const ateStr = range ? toLocalApiDate(range.ateDate) : null;

        setIsDemo(true);
        setHistorico(buildDemoHistoryRange(deStr, ateStr));
      } else {
        setIsDemo(false);
        setError('Nao foi possivel carregar o historico.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [buildDemoHistoryRange, customRange, isDemo, periodo]);

  const fetchSensorStats = useCallback(async () => {
    try {
      if (isDemo && DEMO_FALLBACK_ENABLED) {
        const now = new Date();
        const from = new Date(now);
        from.setHours(from.getHours() - 24);

        const demoHistory = buildDemoHistoryRange(toLocalApiDate(from), toLocalApiDate(now));
        setSensorStats(buildSensorStats(demoHistory, SENSORS));
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${API_BASE}/api/medicoes/estatisticas`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error('Status not OK');

      const data = await res.json();
      setSensorStats(
        Array.isArray(data) && data.length > 0
          ? data
          : buildSensorStats(historico, SENSORS)
      );
    } catch (err) {
      setSensorStats(buildSensorStats(historico, SENSORS));
    }
  }, [buildDemoHistoryRange, historico, isDemo]);

  const fetchStatus = useCallback(async () => {
    if (isDemo && DEMO_FALLBACK_ENABLED) return;

    try {
      const res = await fetch(`${API_BASE}/api/status`);
      if (res.ok) {
        const data = await res.json();
        setNodeStatuses(data);
      }
    } catch (err) {
      console.error('Erro ao buscar status dos nos', err);
    }
  }, [isDemo]);

  useEffect(() => {
    fetchAtual();
    fetchStatus();
    fetchSensorStats();

    const intervalId = setInterval(() => {
      fetchAtual();
      fetchStatus();
      fetchSensorStats();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [fetchAtual, fetchSensorStats, fetchStatus]);

  useEffect(() => {
    fetchHistorico();
  }, [fetchHistorico]);

  return {
    leituraAtual,
    historico,
    periodo,
    setPeriodo,
    customRange,
    setCustomRange,
    isDemo,
    isLoading,
    error,
    nodeStatuses,
    sensorStats,
  };
};
