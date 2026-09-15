import { getDepthGroups, getNodeProfile } from '../constants/sensors.js';

export function isValidReading(value) {
  return typeof value === 'number' && Number.isFinite(value) && value !== -127;
}
export function isAnalyticallyValidReading(value, sensorId) {
  if (!isValidReading(value)) return false;
  return !getNodeProfile(sensorId).analyticalInvalidValues.includes(value);
}

export function isExcludedFromAnalytics(value, sensorId) {
  return isValidReading(value) && !isAnalyticallyValidReading(value, sensorId);
}

export function safeAvgForNode(sensorId, ...values) {
  const valid = values.filter((value) => isAnalyticallyValidReading(value, sensorId));
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export function safeAvg(...values) {
  const valid = values.filter(isValidReading);
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export function safeValue(value) {
  return isValidReading(value) ? value : null;
}

export function getDepthTemperature(reading, group, sensorId) {
  if (!reading) return null;
  return safeAvgForNode(sensorId, ...group.channelIds.map((id) => reading[`temp_${id}`]));
}

export function getVerticalGradient(reading, profile) {
  const groups = getDepthGroups(profile);
  if (groups.length < 2) return null;
  const shallow = groups[0];
  const deep = groups[groups.length - 1];
  const distanceCm = deep.depthCm - shallow.depthCm;
  if (distanceCm <= 0) return null;
  const shallowTemperature = getDepthTemperature(reading, shallow, profile.technicalId);
  const deepTemperature = getDepthTemperature(reading, deep, profile.technicalId);
  if (shallowTemperature === null || deepTemperature === null) return null;
  return (shallowTemperature - deepTemperature) / distanceCm;
}

export function getRawChartMaximum(records, sensors) {
  const values = (records || []).flatMap((record) => sensors
    .map((sensor) => record[`temp_${sensor.id}`])
    .filter(isValidReading));
  return values.length ? Math.max(...values) : null;
}

export function buildSensorStats(records, sensors, sensorId) {
  if (!records || records.length === 0) return [];
  return sensors.map((sensor) => {
    const key = `temp_${sensor.id}`;
    const validValues = records
      .map((record) => record[key])
      .filter((value) => isAnalyticallyValidReading(value, sensorId));
    if (!validValues.length) {
      return { sensor_id: sensor.id, avg: null, max: null, min: null, count: 0 };
    }
    const sum = validValues.reduce((acc, value) => acc + value, 0);
    return {
      sensor_id: sensor.id,
      avg: sum / validValues.length,
      max: Math.max(...validValues),
      min: Math.min(...validValues),
      count: validValues.length,
    };
  });
}
