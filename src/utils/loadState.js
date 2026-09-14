export const createLoadState = (data) => ({
  data,
  isLoading: false,
  hasLoaded: false,
  error: null,
});

export const beginLoad = (state, { clear = false, emptyData = state.data } = {}) => ({
  data: clear ? emptyData : state.data,
  isLoading: true,
  hasLoaded: clear ? false : state.hasLoaded,
  error: null,
});

export const completeLoad = (data) => ({
  data,
  isLoading: false,
  hasLoaded: true,
  error: null,
});

export const failLoad = (state, error) => ({
  ...state,
  isLoading: false,
  hasLoaded: true,
  error,
});

export const getLoadPhase = (state, hasData) => {
  if (state.isLoading && !hasData) return 'loading';
  if (state.error && !hasData) return 'error';
  if (state.hasLoaded && !hasData) return 'empty';
  if (!state.hasLoaded && !hasData) return 'idle';
  return 'data';
};

export const createLatestRequestTracker = () => {
  let latestRequestId = 0;

  return {
    begin() {
      latestRequestId += 1;
      return latestRequestId;
    },
    invalidate() {
      latestRequestId += 1;
    },
    isCurrent(requestId) {
      return requestId === latestRequestId;
    },
  };
};
