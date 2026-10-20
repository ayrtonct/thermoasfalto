import test from 'node:test';
import assert from 'node:assert/strict';
import { effectiveNodeStatus } from '../src/utils/nodeStatus.js';
import { historyParams } from '../src/utils/historyScope.js';
import { getChannelConnectionStatus } from '../src/utils/channelStatus.js';
import { getSystemState } from '../src/utils/dashboardState.js';

const node = { server_time: '2026-10-19T15:00:00Z', ultima_transmissao: '2026-10-19T14:01:00Z', profile: { online_minutes: 60, offline_minutes: 180 } };
test('status expires without another request using server time', () => {
  assert.equal(effectiveNodeStatus(node), 'online');
  assert.equal(effectiveNodeStatus(node, 60000), 'instavel');
  assert.equal(effectiveNodeStatus(node, 121 * 60000), 'offline');
  assert.equal(effectiveNodeStatus({ ...node, profile: { online_minutes: 540, offline_minutes: 1440 } }, 121 * 60000), 'online');
});
test('failed query, future timestamp and absent profile never imply online', () => {
  assert.equal(effectiveNodeStatus(node, 0, true), 'unknown');
  assert.equal(effectiveNodeStatus({ ...node, ultima_transmissao: '2026-10-20T00:00:00Z' }), 'unknown');
  assert.equal(effectiveNodeStatus({ ...node, profile: undefined }), 'unknown');
  assert.equal(getSystemState({ hasReading: true }), 'unknown');
});
test('old valid temperatures do not mark stale nodes channels active', () => {
  const records = [{ temp_ds1: 25 }];
  assert.equal(getChannelConnectionStatus(records, 'ds1', 'offline'), 'offline');
  assert.equal(getChannelConnectionStatus(records, 'ds1', 'unknown'), 'stale');
  assert.equal(getChannelConnectionStatus(records, 'ds1', 'online'), 'online');
});
test('general scope and cleared free range have no hidden six-hour filter', () => {
  assert.deepEqual(historyParams('GERAL', {}), {});
  assert.deepEqual(historyParams('LIVRE', { de: '', ate: '' }), {});
  assert.throws(() => historyParams('LIVRE', { de: '2026-10-19', ate: '' }));
  assert.throws(() => historyParams('LIVRE', { de: '2026-10-20', ate: '2026-10-19' }));
});
test('relative periods are serialized as absolute UTC instants', () => {
  assert.deepEqual(historyParams('1H', {}, new Date('2026-10-19T15:00:00Z')), {
    inicio: '2026-10-19T14:00:00.000Z', fim: '2026-10-19T15:00:00.000Z',
  });
});
