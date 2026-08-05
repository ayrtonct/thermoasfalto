import test from 'node:test';
import assert from 'node:assert/strict';
import { SENSORS } from '../src/constants/sensors.js';
import {
  SENSOR_OFFLINE_CONSECUTIVE_READINGS,
  getChannelConnectionStatus,
  getChannelConnectionStatuses,
} from '../src/utils/channelStatus.js';
import { isValidReading } from '../src/utils/dataHelpers.js';
import { buildSensorStats } from '../src/utils/dataHelpers.js';

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
  const e220History = readings([-127, -127, -127]);
  const e32History = readings([30, 31, 32]);
  assert.equal(getChannelConnectionStatus(e220History, 'ds5'), 'offline');
  assert.equal(getChannelConnectionStatus(e32History, 'ds5'), 'online');
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
