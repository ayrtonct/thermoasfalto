import test from 'node:test';
import assert from 'node:assert/strict';
import { historyParams } from '../src/utils/historyScope.js';

test('a featured local day includes its last second independently of the current date', () => {
  assert.deepEqual(historyParams('CENARIO', {
    de: '2026-04-10T00:00:00', ate: '2026-04-10T23:59:59',
  }), { inicio: '2026-04-10T03:00:00.000Z', fim: '2026-04-11T02:59:59.000Z' });
});
