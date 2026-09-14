import test from 'node:test';
import assert from 'node:assert/strict';
import {
  beginLoad,
  completeLoad,
  createLatestRequestTracker,
  createLoadState,
  failLoad,
  getLoadPhase,
} from '../src/utils/loadState.js';

test('resposta com dados encerra o carregamento e fica pronta para renderização', () => {
  const reading = { sensor_id: 44204, temp_ds1: 31.5 };
  const state = completeLoad(reading);

  assert.deepEqual(state.data, reading);
  assert.equal(state.isLoading, false);
  assert.equal(state.hasLoaded, true);
  assert.equal(getLoadPhase(state, true), 'data');
});

test('resposta vazia encerra o carregamento e produz estado vazio', () => {
  const state = completeLoad([]);

  assert.equal(state.isLoading, false);
  assert.equal(state.hasLoaded, true);
  assert.equal(getLoadPhase(state, state.data.length > 0), 'empty');
});

test('erro inicial encerra o carregamento e produz estado de erro', () => {
  const loading = beginLoad(createLoadState([]), { clear: true, emptyData: [] });
  const state = failLoad(loading, 'Falha HTTP');

  assert.equal(state.isLoading, false);
  assert.equal(state.error, 'Falha HTTP');
  assert.equal(getLoadPhase(state, false), 'error');
});

test('nova tentativa sem dados volta a mostrar carregamento', () => {
  const failed = failLoad(createLoadState([]), 'Falha HTTP');
  const retrying = beginLoad(failed);

  assert.equal(getLoadPhase(retrying, false), 'loading');
});

test('troca de seleção invalida uma resposta que ainda estava pendente', () => {
  const tracker = createLatestRequestTracker();
  const previousSelectionRequest = tracker.begin();

  tracker.invalidate();
  const currentSelectionRequest = tracker.begin();

  assert.equal(tracker.isCurrent(previousSelectionRequest), false);
  assert.equal(tracker.isCurrent(currentSelectionRequest), true);
});

test('falha de atualização preserva dados carregados e sai do carregamento', () => {
  const records = [{ sensor_id: 44204, temp_ds1: 31.5 }];
  const loaded = completeLoad(records);
  const refreshing = beginLoad(loaded);
  const failedRefresh = failLoad(refreshing, 'Tempo limite excedido');

  assert.strictEqual(failedRefresh.data, records);
  assert.equal(failedRefresh.isLoading, false);
  assert.equal(failedRefresh.hasLoaded, true);
  assert.equal(failedRefresh.error, 'Tempo limite excedido');
  assert.equal(getLoadPhase(failedRefresh, true), 'data');
});
