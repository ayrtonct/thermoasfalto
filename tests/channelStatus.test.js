import test from 'node:test';
import assert from 'node:assert/strict';
import { SENSORS, getDepthGroups, getNodeProfile } from '../src/constants/sensors.js';
import {
  SENSOR_OFFLINE_CONSECUTIVE_READINGS,
  getChannelConnectionStatus,
  getChannelConnectionStatuses,
} from '../src/utils/channelStatus.js';
import {
  buildSensorStats,
  getRawChartMaximum,
  getVerticalGradient,
  isAnalyticallyValidReading,
  isValidReading,
  safeAvgForNode,
} from '../src/utils/dataHelpers.js';
import { buildHistoryCsv } from '../src/utils/exportHelpers.js';

const readings = (values) => values.map((value, index) => ({
  data_hora: `2026-07-10T10:0${index}:00`,
  temp_ds5: value,
  temp_ds6: 29,
}));

test('does not globally disable DS5 or DS6', () => {
  assert.equal(SENSORS.find((sensor) => sensor.id === 'ds5').active, undefined);
  assert.equal(SENSORS.find((sensor) => sensor.id === 'ds6').active, undefined);
});

test('marks only DS5 offline after three newest invalid readings', () => {
  const statuses = getChannelConnectionStatuses(readings([-127, -127, -127]));
  assert.equal(SENSOR_OFFLINE_CONSECUTIVE_READINGS, 3);
  assert.equal(statuses.ds5, 'offline');
  assert.equal(statuses.ds6, 'online');
});

test('keeps the channel neutral with fewer than three readings', () => {
  assert.equal(getChannelConnectionStatus(readings([-127, -127]), 'ds5'), 'insufficient');
});

test('returns the channel online when a newer valid reading arrives', () => {
  assert.equal(getChannelConnectionStatus(readings([-127, -127, 31]), 'ds5'), 'online');
});

test('treats null, undefined, missing, NaN and -127 as invalid readings', () => {
  [null, undefined, Number.NaN, -127, '28.4'].forEach((value) => assert.equal(isValidReading(value), false));
  assert.equal(isValidReading(28.4), true);
});

test('does not share channel state between point histories', () => {
  const node1History = readings([-127, -127, -127]);
  const node2History = readings([30, 31, 32]);
  assert.equal(getChannelConnectionStatus(node1History, 'ds5'), 'offline');
  assert.equal(getChannelConnectionStatus(node2History, 'ds5'), 'online');
});

test('full-history statistics stay independent from a chart-filtered subset', () => {
  const fullHistory = [
    { temp_ds1: 20 },
    { temp_ds1: 40 },
    { temp_ds1: 60 },
  ];
  const chartHistory = fullHistory.slice(-1);
  const fullStats = buildSensorStats(fullHistory, [{ id: 'ds1' }]);
  const chartStats = buildSensorStats(chartHistory, [{ id: 'ds1' }]);

  assert.equal(fullStats[0].avg, 40);
  assert.equal(chartStats[0].avg, 60);
});

test('configures channel depths independently for each node', () => {
  const node1 = getNodeProfile(1);
  const node2 = getNodeProfile(44204);
  assert.deepEqual(getDepthGroups(node1).map((group) => group.depthCm), [0, 2, 4]);
  assert.deepEqual(getDepthGroups(node2).map((group) => group.depthCm), [2, 4, 6]);
  assert.equal(node2.channels.find((sensor) => sensor.id === 'ds1').depthCm, 2);
  assert.equal(node2.channels.find((sensor) => sensor.id === 'ds6').depthCm, 6);
});

test('excludes exactly 85 only from node 1 analytics and keeps the raw value valid', () => {
  assert.equal(isValidReading(85), true);
  assert.equal(isAnalyticallyValidReading(85, 1), false);
  assert.equal(isAnalyticallyValidReading(85, 44204), true);
  assert.equal(isAnalyticallyValidReading(85.1, 1), true);

  const node1Stats = buildSensorStats([{ temp_ds1: 85 }, { temp_ds1: 35 }], [{ id: 'ds1' }], 1);
  const node2Stats = buildSensorStats([{ temp_ds1: 85 }, { temp_ds1: 35 }], [{ id: 'ds1' }], 44204);
  assert.equal(node1Stats[0].avg, 35);
  assert.equal(node1Stats[0].count, 1);
  assert.equal(node2Stats[0].avg, 60);
  assert.equal(node2Stats[0].count, 2);
  assert.equal(safeAvgForNode(1, 85, 35), 35);
});

test('computes vertical gradient using distinct effective depths', () => {
  const profile = getNodeProfile(44204);
  const reading = {
    temp_ds1: 40, temp_ds2: 40,
    temp_ds3: 36, temp_ds4: 36,
    temp_ds5: 32, temp_ds6: 32,
  };
  assert.equal(getVerticalGradient(reading, profile), 2);
});

test('raw export keeps 85 and uses the selected node depths', () => {
  const csv = buildHistoryCsv([
    { data_hora: '2026-07-10T10:00:00', temp_ds1: 85, rssi: -80 },
  ], getNodeProfile(44204).channels);
  assert.match(csv, /DS1 \(2 cm\)/);
  assert.match(csv, /85,00/);
  assert.equal(getRawChartMaximum([{ temp_ds1: 85 }], [{ id: 'ds1' }]), 85);
});
