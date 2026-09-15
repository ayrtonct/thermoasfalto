const CHANNEL_COLORS = {
  ds1: '#ef4444',
  ds2: '#f87171',
  ds3: '#3b82f6',
  ds4: '#60a5fa',
  ds5: '#f97316',
  ds6: '#fb923c',
};

const channel = (id, depthCm, layer, layerLabel) => ({
  id,
  label: id.toUpperCase(),
  depthCm,
  depth: `${depthCm} cm`,
  layer,
  layerLabel,
  color: CHANNEL_COLORS[id],
});

export const NODE_PROFILES = {
  '1': {
    technicalId: '1',
    displayName: 'Nó sensor 1',
    gatewayId: 'gateway_node_1',
    gatewayName: 'Gateway do nó sensor 1',
    channels: [
      channel('ds5', 0, 'superficie', 'Superfície'),
      channel('ds6', 0, 'superficie', 'Superfície'),
      channel('ds3', 2, 'revestimento', 'Revestimento'),
      channel('ds4', 2, 'revestimento', 'Revestimento'),
      channel('ds1', 4, 'base', 'Base'),
      channel('ds2', 4, 'base', 'Base'),
    ],
    analyticalInvalidValues: [85],
  },
  '44204': {
    technicalId: '44204',
    displayName: 'Nó sensor 2',
    gatewayId: 'gateway_node_2',
    gatewayName: 'Gateway do nó sensor 2',
    channels: [
      channel('ds1', 2, 'depth-2', 'Profundidade 2 cm'),
      channel('ds2', 2, 'depth-2', 'Profundidade 2 cm'),
      channel('ds3', 4, 'depth-4', 'Profundidade 4 cm'),
      channel('ds4', 4, 'depth-4', 'Profundidade 4 cm'),
      channel('ds5', 6, 'depth-6', 'Profundidade 6 cm'),
      channel('ds6', 6, 'depth-6', 'Profundidade 6 cm'),
    ],
    analyticalInvalidValues: [],
  },
};

const FALLBACK_PROFILE = {
  technicalId: null,
  displayName: 'Nó sensor',
  gatewayId: null,
  gatewayName: 'Gateway não identificado',
  channels: NODE_PROFILES['1'].channels,
  analyticalInvalidValues: [],
};

export const getNodeProfile = (sensorId) => {
  const profile = NODE_PROFILES[String(sensorId)] || FALLBACK_PROFILE;
  return profile.technicalId === null
    ? { ...profile, technicalId: sensorId == null ? null : String(sensorId), displayName: `Nó sensor ${sensorId}` }
    : profile;
};

export const getDepthGroups = (profile) => {
  const groups = new Map();
  profile.channels.forEach((sensor) => {
    if (!groups.has(sensor.depthCm)) {
      groups.set(sensor.depthCm, {
        depthCm: sensor.depthCm,
        label: sensor.layerLabel,
        layer: sensor.layer,
        color: sensor.color,
        channelIds: [],
      });
    }
    groups.get(sensor.depthCm).channelIds.push(sensor.id);
  });
  return [...groups.values()].sort((a, b) => a.depthCm - b.depthCm);
};

export const SENSORS = NODE_PROFILES['1'].channels;
export const ALERT_THRESHOLD = 52;
export const GAUGE_MIN = 20;
export const GAUGE_MAX = 70;
