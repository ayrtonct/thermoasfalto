import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiTimeoutError, fetchJsonWithTimeout } from '../src/utils/apiRequest.js';

const abortablePendingFetch = (_url, { signal }) => new Promise((_resolve, reject) => {
  signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
});

const withMockFetch = async (mockFetch, callback) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;
  try {
    await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
};

test('returns JSON for a normal API response', async () => {
  await withMockFetch(async () => ({ ok: true, json: async () => ({ sensor_id: 44204 }) }), async () => {
    assert.deepEqual(await fetchJsonWithTimeout('/api/medicoes', { timeoutMs: 20 }), { sensor_id: 44204 });
  });
});

test('reports a timeout as a distinct error', async () => {
  await withMockFetch(abortablePendingFetch, async () => {
    await assert.rejects(
      fetchJsonWithTimeout('/api/medicoes', { timeoutMs: 5 }),
      ApiTimeoutError,
    );
  });
});

test('preserves intentional cleanup and sensor-change aborts', async () => {
  await withMockFetch(abortablePendingFetch, async () => {
    const cleanupController = new AbortController();
    const cleanupRequest = fetchJsonWithTimeout('/api/medicoes', { signal: cleanupController.signal, timeoutMs: 50 });
    cleanupController.abort();
    await assert.rejects(cleanupRequest, { name: 'AbortError' });

    const sensorChangeController = new AbortController();
    const sensorChangeRequest = fetchJsonWithTimeout('/api/medicoes', { signal: sensorChangeController.signal, timeoutMs: 50 });
    sensorChangeController.abort();
    await assert.rejects(sensorChangeRequest, { name: 'AbortError' });
  });
});

test('preserves HTTP and network failures', async () => {
  await withMockFetch(async () => ({ ok: false, status: 503 }), async () => {
    await assert.rejects(fetchJsonWithTimeout('/api/medicoes'), /Status HTTP 503/);
  });
  await withMockFetch(async () => { throw new Error('Network unavailable'); }, async () => {
    await assert.rejects(fetchJsonWithTimeout('/api/medicoes'), /Network unavailable/);
  });
});
