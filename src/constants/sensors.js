export const SENSORS = [
  { id: 'ds5', label: 'DS5', depth: '0 cm', layer: 'superficie',   color: '#f97316', active: false },
  { id: 'ds6', label: 'DS6', depth: '0 cm', layer: 'superficie',   color: '#fb923c', active: false },
  { id: 'ds3', label: 'DS3', depth: '2 cm', layer: 'revestimento', color: '#3b82f6', active: true  },
  { id: 'ds4', label: 'DS4', depth: '2 cm', layer: 'revestimento', color: '#60a5fa', active: true  },
  { id: 'ds1', label: 'DS1', depth: '4 cm', layer: 'base',         color: '#ef4444', active: true  },
  { id: 'ds2', label: 'DS2', depth: '4 cm', layer: 'base',         color: '#f87171', active: true  },
];

export const ALERT_THRESHOLD = 52;    // °C
export const GAUGE_MIN       = 20;    // °C
export const GAUGE_MAX       = 70;    // °C
