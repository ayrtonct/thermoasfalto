import test from 'node:test';
import assert from 'node:assert/strict';
import { historyParams } from '../src/utils/historyScope.js';

test('custom range is interpreted in São Luís regardless of browser timezone', () => {
  assert.deepEqual(historyParams('LIVRE', { de: '2026-07-31T16:00', ate: '2026-07-31T17:00' }), {
    inicio: '2026-07-31T19:00:00.000Z', fim: '2026-07-31T20:00:00.000Z',
  });
});
