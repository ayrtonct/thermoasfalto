import { useState, useEffect, useCallback } from 'react';
import { generateThermalData, generateHistory } from '../utils/thermalModel';
import { safeValue, buildSensorStats } from '../utils/dataHelpers';
import { SENSORS } from '../constants/sensors';

const sanitizeData = (item) => {
  if (!item) return null;
  const sanitized = { ...item };
  ['ds1', 'ds2', 'ds3', 'ds4', 'ds5', 'ds6'].forEach(id => {
    const key = `temp_${id}`;
    if (sanitized[key] !== undefined) {
      sanitized[key] = safeValue(sanitized[key]);
    }
  });
  return sanitized;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const useSensorData = () => {
  const [leituraAtual, setLeituraAtual] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [sensorStats, setSensorStats] = useState([]);
  const [nodeStatuses, setNodeStatuses] = useState([]);
  
  // Period filter states: '30M', '1H', '3H', '6H', '12H', '24H', 'LIVRE'
  const [periodo, setPeriodo] = useState('6H'); 
  const [customRange, setCustomRange] = useState({ de: '', ate: '' });
  
  const [isDemo, setIsDemo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAtual = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const res = await fetch(`${API_BASE}/api/medicoes/recentes`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!res.ok) throw new Error('Status not OK');
      
      const data = await res.json();
      setLeituraAtual(sanitizeData(Array.isArray(data) && data.length > 0 ? data[0] : null));
      // Determine if it was running demo and recovered? Maybe if we wanted.
      // But user said: "Se a API não responder, cair silenciosamente em modo demo"
      // If we got here, we are not in demo (unless manually forced)
    } catch (err) {
      if (!isDemo) setIsDemo(true);
      // Fallback a modo demo silenciosamente
      const now = new Date();
      // Round down to nearest 30 mins
      const min = now.getMinutes() >= 30 ? 30 : 0;
      now.setMinutes(min, 0, 0);
      
      // Use local ISO format without timezone suffix to match standard string formats
      const mockStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().substring(0, 19);
      setLeituraAtual(sanitizeData(generateThermalData(mockStr)));
    }
  }, [isDemo]);

  const fetchHistorico = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let deDate, ateDate;
      const now = new Date();
      
      if (periodo === 'LIVRE') {
        if (!customRange.de || !customRange.ate) {
          setIsLoading(false);
          return; // need both to fetch
        }
        deDate = new Date(customRange.de);
        ateDate = new Date(customRange.ate);
      } else {
        ateDate = now;
        deDate = new Date(now);
        switch (periodo) {
          case '30M': deDate.setMinutes(deDate.getMinutes() - 30); break;
          case '1H': deDate.setHours(deDate.getHours() - 1); break;
          case '3H': deDate.setHours(deDate.getHours() - 3); break;
          case '6H': deDate.setHours(deDate.getHours() - 6); break;
          case '12H': deDate.setHours(deDate.getHours() - 12); break;
          case '24H': deDate.setHours(deDate.getHours() - 24); break;
          default: deDate.setHours(deDate.getHours() - 6); break;
        }
      }

      // Convert to local ISO format for API query 
      const deStr = new Date(deDate.getTime() - (deDate.getTimezoneOffset() * 60000)).toISOString().substring(0, 19);
      const ateStr = new Date(ateDate.getTime() - (ateDate.getTimezoneOffset() * 60000)).toISOString().substring(0, 19);

      if (isDemo) {
        setHistorico(generateHistory(deStr, ateStr).map(sanitizeData));
        setIsLoading(false);
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const res = await fetch(`${API_BASE}/api/medicoes?inicio=${deStr}&fim=${ateStr}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error('Status not OK');
      
      const data = await res.json();
      setHistorico(data.map(sanitizeData));
    } catch (err) {
      if (!isDemo) setIsDemo(true);
      // Demo fallback
      const now = new Date();
      let deDate;
      if (periodo === 'LIVRE') {
        deDate = new Date(customRange.de || now);
      } else {
        deDate = new Date(now);
        switch (periodo) {
          case '30M': deDate.setMinutes(deDate.getMinutes() - 30); break;
          case '1H': deDate.setHours(deDate.getHours() - 1); break;
          case '3H': deDate.setHours(deDate.getHours() - 3); break;
          case '6H': deDate.setHours(deDate.getHours() - 6); break;
          case '12H': deDate.setHours(deDate.getHours() - 12); break;
          case '24H': deDate.setHours(deDate.getHours() - 24); break;
          default: deDate.setHours(deDate.getHours() - 6); break;
        }
      }
      const deStr = new Date(deDate.getTime() - (deDate.getTimezoneOffset() * 60000)).toISOString().substring(0, 19);
      const ateStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().substring(0, 19);
      
      setHistorico(generateHistory(periodo === 'LIVRE' ? customRange.de : deStr, periodo === 'LIVRE' ? customRange.ate : ateStr).map(sanitizeData));
    } finally {
      setIsLoading(false);
    }
  }, [periodo, customRange, isDemo]);

  const fetchSensorStats = useCallback(async () => {
    try {
      if (isDemo) {
        const now = new Date();
        const from = new Date(now);
        from.setHours(from.getHours() - 24);

        const deStr = new Date(from.getTime() - (from.getTimezoneOffset() * 60000)).toISOString().substring(0, 19);
        const ateStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().substring(0, 19);
        const demoHistory = generateHistory(deStr, ateStr).map(sanitizeData);
        setSensorStats(buildSensorStats(demoHistory, SENSORS));
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${API_BASE}/api/medicoes/estatisticas`, {
        signal: controller.signal
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
  }, [historico, isDemo]);

  const fetchStatus = useCallback(async () => {
    if (isDemo) return;
    try {
      const res = await fetch(`${API_BASE}/api/status`);
      if (res.ok) {
        const data = await res.json();
        setNodeStatuses(data);
      }
    } catch (err) {
      console.error('Erro ao buscar status dos nós', err);
    }
  }, [isDemo]);

  // Initial fetch and polling for current reading
  useEffect(() => {
    fetchAtual(); // init immediately
    fetchStatus();
    fetchSensorStats();
    const intervalId = setInterval(() => {
      fetchAtual();
      fetchStatus();
      fetchSensorStats();
    }, 30000);
    return () => clearInterval(intervalId);
  }, [fetchAtual, fetchStatus, fetchSensorStats]);

  // Fetch history when period, custom range changes or fallback demo triggers
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
    sensorStats
  };
};
