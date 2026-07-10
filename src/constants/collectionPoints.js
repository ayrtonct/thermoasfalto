// Configure friendly names here while the backend has no collection-point catalog.
export const COLLECTION_POINT_METADATA = {};

export const getCollectionPointMetadata = (sensorId) => {
  return COLLECTION_POINT_METADATA[String(sensorId)] || {};
};

export const getCollectionPointName = (sensorId) => {
  return getCollectionPointMetadata(sensorId).name || `Sensor ${sensorId}`;
};
