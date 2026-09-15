import { getNodeProfile } from './sensors.js';

export const getCollectionPointMetadata = (sensorId) => getNodeProfile(sensorId);
export const getCollectionPointName = (sensorId) => getNodeProfile(sensorId).displayName;

export const getGatewayName = (sensorId, gatewayId) => {
  const profile = getNodeProfile(sensorId);
  return gatewayId === profile.gatewayId ? profile.gatewayName : (gatewayId || profile.gatewayName);
};
