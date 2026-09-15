export const getSystemState = ({
  pointsError,
  currentError,
  isPointsLoading,
  isCurrentLoading,
  currentHasLoaded,
  hasReading,
}) => {
  if (pointsError || currentError) return 'unavailable';
  if (isPointsLoading || (isCurrentLoading && !currentHasLoaded)) return 'loading';
  return hasReading ? 'online' : 'empty';
};
