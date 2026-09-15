import test from 'node:test';
import assert from 'node:assert/strict';
import { getSystemState } from '../src/utils/dashboardState.js';
import {
  CURRENT_TIMEOUT_MS,
  POINTS_TIMEOUT_MS,
} from '../src/utils/requestPolicy.js';

test('descoberta tem prazo próprio compatível com a latência observada', () => {
  assert.equal(POINTS_TIMEOUT_MS, 12000);
  assert.ok(POINTS_TIMEOUT_MS > CURRENT_TIMEOUT_MS);
});

test('falha da descoberta prevalece sobre uma leitura antiga no cabeçalho', () => {
  assert.equal(getSystemState({
    pointsError: 'Tempo limite excedido',
    currentError: null,
    isPointsLoading: false,
    isCurrentLoading: false,
    currentHasLoaded: true,
    hasReading: true,
  }), 'unavailable');
});

test('carregamento, leitura válida e ausência de dados têm estados distintos', () => {
  const base = { pointsError: null, currentError: null, isCurrentLoading: false };

  assert.equal(getSystemState({ ...base, isPointsLoading: true, currentHasLoaded: false, hasReading: false }), 'loading');
  assert.equal(getSystemState({ ...base, isPointsLoading: false, currentHasLoaded: true, hasReading: true }), 'online');
  assert.equal(getSystemState({ ...base, isPointsLoading: false, currentHasLoaded: true, hasReading: false }), 'empty');
});
