import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildApiUrl,
  formatRssi,
  getGatewayDisplay,
  getAvailableCollectionPoints,
  getReadingForSensor,
  getRecordsForSensor,
  resolveValidatedSensorId,
} from '../src/utils/collectionPoints.js';
import { getCollectionPointName } from '../src/constants/collectionPoints.js';

const e220 = { sensor_id: 12345, gateway_id: 'gateway_e220_01', data_hora: '2026-07-10T14:00:00', rssi: -87.4 };
const e32 = { sensor_id: 44204, gateway_id: 'gateway_e32_01', data_hora: '2026-07-10T14:30:00', rssi: null };

test('discovers one sensor and uses a friendly-name fallback', () => {
  const points = getAvailableCollectionPoints([e32]);
  assert.deepEqual(points, [{ sensorId: '44204', gatewayId: 'gateway_e32_01', dataHora: '2026-07-10T14:30:00' }]);
  assert.equal(getCollectionPointName(44204), 'Sensor 44204');
});

test('discovers, deduplicates and deterministically orders multiple sensors', () => {
  const points = getAvailableCollectionPoints([e32, e220, { ...e32, gateway_id: 'gateway_legacy', data_hora: '2026-07-10T13:00:00' }]);
  assert.deepEqual(points.map((point) => point.sensorId), ['12345', '44204']);
  assert.equal(points[1].gatewayId, 'gateway_e32_01');
});

test('validates the persisted selection only after points are available', () => {
  const points = getAvailableCollectionPoints([e220, e32]);
  assert.equal(resolveValidatedSensorId(null, '44204'), null);
  assert.equal(resolveValidatedSensorId(points, '44204'), '44204');
  assert.equal(resolveValidatedSensorId(points, 44204), '44204');
  assert.equal(resolveValidatedSensorId(points, '99999'), '12345');
  assert.equal(resolveValidatedSensorId(points, 'invalido'), '12345');
  assert.equal(resolveValidatedSensorId(points, ''), '12345');
});

test('selects and filters records by sensor id without mixing histories', () => {
  const records = [{ ...e220, temp_ds1: 28 }, { ...e32, temp_ds1: 31 }];
  assert.equal(getReadingForSensor(records, '44204').gateway_id, 'gateway_e32_01');
  assert.deepEqual(getRecordsForSensor(records, 12345), [{ ...e220, temp_ds1: 28 }]);
});

test('builds URLs with sensor filters and formats supported or unavailable RSSI', () => {
  assert.equal(buildApiUrl('', '/api/medicoes', { inicio: '2026-07-10T10:00:00', fim: '2026-07-10T11:00:00', sensor_id: 44204 }), '/api/medicoes?inicio=2026-07-10T10%3A00%3A00&fim=2026-07-10T11%3A00%3A00&sensor_id=44204');
  assert.equal(formatRssi(-87.4), '-87.4 dBm');
  assert.equal(formatRssi(null), 'Indisponivel');
  assert.equal(formatRssi(undefined), 'Indisponivel');
  assert.equal(getGatewayDisplay('gateway_legacy'), 'gateway_legacy');
  assert.equal(getGatewayDisplay(null), 'Gateway nao identificado');
});
