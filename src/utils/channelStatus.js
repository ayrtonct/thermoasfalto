import { SENSORS } from '../constants/sensors.js';
import { isValidReading } from './dataHelpers.js';

export const SENSOR_OFFLINE_CONSECUTIVE_READINGS = 3;

const sortNewestFirst = (records) => [...(records || [])].sort(
  (a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime(),
);

export const getChannelConnectionStatus = (records, sensorId, nodeStatus) => {
  const recentReadings = sortNewestFirst(records).slice(0, SENSOR_OFFLINE_CONSECUTIVE_READINGS);
  if (nodeStatus !== undefined) {
    if (nodeStatus === 'offline') return 'offline';
    if (nodeStatus !== 'online') return 'stale';
    return isValidReading(recentReadings[0]?.[`temp_${sensorId}`]) ? 'online' : 'insufficient';
  }
  if (recentReadings.length < SENSOR_OFFLINE_CONSECUTIVE_READINGS) return 'insufficient';

  return recentReadings.every((reading) => !isValidReading(reading[`temp_${sensorId}`]))
    ? 'offline'
    : 'online';
};

export const getChannelConnectionStatuses = (records, nodeStatus) => Object.fromEntries(
  SENSORS.map((sensor) => [sensor.id, getChannelConnectionStatus(records, sensor.id, nodeStatus)]),
);
