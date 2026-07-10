export const normalizeSensorId = (sensorId) => {
  if (sensorId === null || sensorId === undefined || sensorId === '') return null;
  return String(sensorId);
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
  const pointsBySensorId = new Map();

  readings.forEach((reading) => {
    const sensorId = normalizeSensorId(reading?.sensor_id);
    if (!sensorId) return;

    const existing = pointsBySensorId.get(sensorId);
    const isNewer = !existing || new Date(reading.data_hora).getTime() > new Date(existing.data_hora).getTime();
    if (isNewer) {
      pointsBySensorId.set(sensorId, {
        sensorId,
        gatewayId: reading.gateway_id || null,
        dataHora: reading.data_hora || null,
      });
    }
  });

  return [...pointsBySensorId.values()].sort((a, b) => a.sensorId.localeCompare(b.sensorId, 'pt-BR', { numeric: true }));
};

export const getReadingForSensor = (readings, sensorId) => {
  const normalizedSensorId = normalizeSensorId(sensorId);
  return readings.find((reading) => normalizeSensorId(reading.sensor_id) === normalizedSensorId) || null;
};

export const getRecordsForSensor = (records, sensorId) => {
  const normalizedSensorId = normalizeSensorId(sensorId);
  return records.filter((record) => normalizeSensorId(record.sensor_id) === normalizedSensorId);
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

export const getGatewayDisplay = (gatewayId) => gatewayId || 'Gateway nao identificado';
