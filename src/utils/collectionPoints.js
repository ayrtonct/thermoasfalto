import { getNodeProfile } from '../constants/sensors.js';
import { getGatewayName } from '../constants/collectionPoints.js';

export const normalizeSensorId = (sensorId) => {
  if (sensorId === null || sensorId === undefined || sensorId === '') return null;
  return String(sensorId);
};

export const normalizeGatewayId = (sensorId, gatewayId) => {
  const profile = getNodeProfile(sensorId);
  if (profile.gatewayId && (!gatewayId || gatewayId === 'gateway_legacy')) return profile.gatewayId;
  return gatewayId || 'gateway_unknown';
};

export const getCollectionPointKey = (sensorId, gatewayId) => {
  const normalizedSensorId = normalizeSensorId(sensorId);
  if (!normalizedSensorId) return null;
  return `${normalizeGatewayId(normalizedSensorId, gatewayId)}::${normalizedSensorId}`;
};

export const resolveValidatedSensorId = (availableCollectionPoints, persistedSensorId) => {
  if (availableCollectionPoints === null) return null;

  const normalizedPersistedId = normalizeSensorId(persistedSensorId);
  const persistedPoint = availableCollectionPoints.find(
    (point) => normalizeSensorId(point.sensorId) === normalizedPersistedId,
  );

  return persistedPoint?.sensorId || availableCollectionPoints[0]?.sensorId || null;
};

export const normalizeReadingsResponse = (payload, endpoint) => {
  if (!Array.isArray(payload)) {
    throw new Error(`Resposta invalida em ${endpoint}: era esperado um array.`);
  }

  return payload;
};

export const getAvailableCollectionPoints = (readings) => {
  const pointsByKey = new Map();

  readings.forEach((reading) => {
    const sensorId = normalizeSensorId(reading?.sensor_id);
    if (!sensorId) return;
    const gatewayId = normalizeGatewayId(sensorId, reading.gateway_id);
    const pointKey = getCollectionPointKey(sensorId, gatewayId);

    const existing = pointsByKey.get(pointKey);
    const isNewer = !existing || new Date(reading.data_hora).getTime() > new Date(existing.data_hora).getTime();
    if (isNewer) {
      pointsByKey.set(pointKey, {
        pointKey,
        sensorId,
        gatewayId,
        dataHora: reading.data_hora || null,
      });
    }
  });

  return [...pointsByKey.values()].sort((a, b) => {
    const sensorOrder = a.sensorId.localeCompare(b.sensorId, 'pt-BR', { numeric: true });
    return sensorOrder || (a.gatewayId || '').localeCompare(b.gatewayId || '', 'pt-BR');
  });
};

export const getReadingForSensor = (readings, sensorId) => {
  const normalizedSensorId = normalizeSensorId(sensorId);
  return readings.find((reading) => normalizeSensorId(reading.sensor_id) === normalizedSensorId) || null;
};

export const getRecordsForSensor = (records, sensorId) => {
  const normalizedSensorId = normalizeSensorId(sensorId);
  return records.filter((record) => normalizeSensorId(record.sensor_id) === normalizedSensorId);
};

export const getReadingForCollectionPoint = (readings, collectionPoint) => {
  if (!collectionPoint) return null;
  return readings.find((reading) => getCollectionPointKey(reading.sensor_id, reading.gateway_id) === collectionPoint.pointKey) || null;
};

export const getRecordsForCollectionPoint = (records, collectionPoint) => {
  if (!collectionPoint) return [];
  return records.filter((record) => getCollectionPointKey(record.sensor_id, record.gateway_id) === collectionPoint.pointKey);
};

export const resolveValidatedCollectionPoint = (availableCollectionPoints, persistedPointKey) => {
  if (availableCollectionPoints === null) return null;
  const exactMatch = availableCollectionPoints.find((point) => point.pointKey === persistedPointKey);
  if (exactMatch) return exactMatch;

  const legacyMatches = availableCollectionPoints.filter((point) => point.sensorId === normalizeSensorId(persistedPointKey));
  return legacyMatches.length === 1 ? legacyMatches[0] : availableCollectionPoints[0] || null;
};

export const buildApiUrl = (baseUrl, path, params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') search.set(key, String(value));
  });

  const query = search.toString();
  return `${baseUrl}${path}${query ? `?${query}` : ''}`;
};

export const formatRssi = (rssi) => {
  return typeof rssi === 'number' && Number.isFinite(rssi) ? `${rssi.toFixed(1)} dBm` : 'Indisponivel';
};

export const getGatewayDisplay = (gatewayId, sensorId) => getGatewayName(sensorId, normalizeGatewayId(sensorId, gatewayId));
