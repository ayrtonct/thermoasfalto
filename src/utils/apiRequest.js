export class ApiTimeoutError extends Error {
  constructor() {
    super('Tempo limite excedido ao consultar a API.');
    this.name = 'ApiTimeoutError';
  }
}

export const fetchJsonWithTimeout = async (url, { signal, timeoutMs = 10000 } = {}) => {
  const requestController = new AbortController();
  let timedOut = false;
  const abortRequest = () => requestController.abort();
  if (signal?.aborted) requestController.abort();
  else signal?.addEventListener('abort', abortRequest, { once: true });
  const timeoutId = setTimeout(() => {
    timedOut = true;
    requestController.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, { signal: requestController.signal });
    if (!response.ok) throw new Error(`Status HTTP ${response.status}`);
    return response.json();
  } catch (error) {
    if (timedOut && error.name === 'AbortError') throw new ApiTimeoutError();
    throw error;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', abortRequest);
  }
};
