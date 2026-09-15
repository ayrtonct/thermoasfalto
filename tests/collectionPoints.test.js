import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildApiUrl,
  formatRssi,
  getGatewayDisplay,
  getAvailableCollectionPoints,
  getRecordsForCollectionPoint,
  getReadingForSensor,
  getRecordsForSensor,
  resolveValidatedCollectionPoint,
  resolveValidatedSensorId,
} from '../src/utils/collectionPoints.js';
import { getCollectionPointName } from '../src/constants/collectionPoints.js';

const node1 = { sensor_id: 1, gateway_id: 'gateway_node_1', data_hora: '2026-07-10T14:00:00', rssi: -87.4 };
const node2 = { sensor_id: 44204, gateway_id: 'gateway_node_2', data_hora: '2026-07-10T14:30:00', rssi: null };

test('uses stable names and identities for both nodes', () => {
  const points = getAvailableCollectionPoints([node2, node1]);
  assert.deepEqual(points.map((point) => point.pointKey), ['gateway_node_1::1', 'gateway_node_2::44204']);
  assert.equal(getCollectionPointName(1), 'Nó sensor 1');
  assert.equal(getCollectionPointName(44204), 'Nó sensor 2');
});
test('maps legacy rows by old identity plus node and deduplicates the transition', () => {
  const points = getAvailableCollectionPoints([
    node1,
    node2,
    { ...node1, gateway_id: 'gateway_legacy', data_hora: '2026-07-10T13:00:00' },
    { ...node2, gateway_id: 'gateway_legacy', data_hora: '2026-07-10T13:30:00' },
  ]);
  assert.deepEqual(points.map((point) => point.pointKey), ['gateway_node_1::1', 'gateway_node_2::44204']);
});

test('validates the persisted selection only after points are available', () => {
  const points = getAvailableCollectionPoints([node1, node2]);
  assert.equal(resolveValidatedSensorId(null, '44204'), null);
  assert.equal(resolveValidatedSensorId(points, '44204'), '44204');
  assert.equal(resolveValidatedSensorId(points, '99999'), '1');
  assert.equal(resolveValidatedCollectionPoint(points, 'gateway_node_2::44204').sensorId, '44204');
});

test('filters records by the complete collection-point identity', () => {
  const records = [{ ...node1, temp_ds1: 28 }, { ...node2, temp_ds1: 31 }];
  assert.equal(getReadingForSensor(records, '44204').gateway_id, 'gateway_node_2');
  assert.deepEqual(getRecordsForSensor(records, 1), [{ ...node1, temp_ds1: 28 }]);
  assert.deepEqual(getRecordsForCollectionPoint(records, getAvailableCollectionPoints([node1])[0]), [{ ...node1, temp_ds1: 28 }]);
});

test('does not merge distinct explicit gateways for the same node', () => {
  const gatewayA = { ...node1, gateway_id: 'gateway_a' };
  const gatewayB = { ...node1, gateway_id: 'gateway_b' };
  const points = getAvailableCollectionPoints([gatewayA, gatewayB]);
  assert.equal(points.length, 2);
  assert.deepEqual(getRecordsForCollectionPoint([gatewayA, gatewayB], points[0]), [gatewayA]);
});

test('builds canonical filtered URLs and friendly gateway labels', () => {
  assert.equal(
    buildApiUrl('', '/api/medicoes', { sensor_id: 44204, gateway_id: 'gateway_node_2' }),
    '/api/medicoes?sensor_id=44204&gateway_id=gateway_node_2',
  );
  assert.equal(formatRssi(-87.4), '-87.4 dBm');
  assert.equal(formatRssi(null), 'Indisponivel');
  assert.equal(getGatewayDisplay('gateway_legacy', 1), 'Gateway do nó sensor 1');
  assert.equal(getGatewayDisplay('gateway_legacy', 44204), 'Gateway do nó sensor 2');
});
