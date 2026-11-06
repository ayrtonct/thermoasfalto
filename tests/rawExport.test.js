import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadRawHistory } from '../src/utils/exportHelpers.js';

test('raw export fetches individual CSV with the selected point and local date range', async (t) => {
  let requested;
  let clicked = false;
  let removed = false;
  const link = { click() { clicked = true; }, remove() { removed = true; } };
  t.mock.method(globalThis, 'fetch', async (url) => {
    requested = new URL(url);
    return { ok: true, blob: async () => new Blob(['ID;Data/Hora\n1;2026-07-31 16:00:00-03:00']) };
  });
  const priorDocument = globalThis.document;
  globalThis.document = { createElement: () => link, body: { appendChild() {} } };
  t.after(() => { if (priorDocument === undefined) delete globalThis.document; else globalThis.document = priorDocument; });
  await downloadRawHistory({ baseUrl: 'https://example.test', sensorId: 44204,
    gatewayId: 'gateway_node_2', period: 'LIVRE',
    custom: { de: '2026-07-31T16:00', ate: '2026-07-31T17:00' }, filename: 'no_2' });
  assert.equal(requested.pathname, '/api/medicoes/csv');
  assert.equal(requested.searchParams.get('sensor_id'), '44204');
  assert.equal(requested.searchParams.get('gateway_id'), 'gateway_node_2');
  assert.equal(requested.searchParams.get('inicio'), '2026-07-31T19:00:00.000Z');
  assert.equal(requested.searchParams.has('limite'), false);
  assert.equal(link.download, 'no_2.csv');
  assert.ok(clicked && removed);
});

test('CSV HTTP failure is reported instead of saving an error document', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 503 }));
  await assert.rejects(downloadRawHistory({ baseUrl: 'https://example.test', sensorId: 8900,
    gatewayId: 'gateway_lab_01', period: 'GERAL', filename: 'lab' }), /Não foi possível/);
});
