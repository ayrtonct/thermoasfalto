import { useState, useMemo } from 'react';
import { useSensorData } from './hooks/useSensorData';
import { ALERT_THRESHOLD } from './constants/sensors';
import { getCollectionPointName } from './constants/collectionPoints';
import { getChannelConnectionStatuses } from './utils/channelStatus';
import { isAnalyticallyValidReading } from './utils/dataHelpers';
import { getSystemState } from './utils/dashboardState';
import { Header } from './components/Header/Header';
import { AlertStrip } from './components/AlertStrip/AlertStrip';
import { CollectionPointSelector } from './components/CollectionPointSelector/CollectionPointSelector';
import { KpiCards } from './components/KpiCards/KpiCards';
import { Gauge } from './components/Gauge/Gauge';
import { HistoryChart } from './components/HistoryChart/HistoryChart';
import { GradientProfile } from './components/GradientProfile/GradientProfile';
import { StatsTable } from './components/StatsTable/StatsTable';
import { Footer } from './components/Footer/Footer';
import styles from './App.module.css';

function App() {
  const [selectedSensorId, setSelectedSensorId] = useState('ds5');
  const {
    leituraAtual, historico, recentReadings, sensorStats,
    nodeStatuses, availableCollectionPoints, isPointsLoading,
    periodo, setPeriodo, customRange, setCustomRange, isDemo,
    isCurrentLoading, currentHasLoaded, currentError, retryCurrent,
    isHistoryLoading, historyHasLoaded, historyError, retryHistory,
    hasLoadedPoints, pointsError, selectedCollectionPoint,
    activeNodeProfile, retryPoints,
    setSelectedSensorId: setSelectedCollectionPointId,
  } = useSensorData();

  const activeCollectionPointId = selectedCollectionPoint?.pointKey || null;
  const sensors = activeNodeProfile.channels;
  const channelStatuses = useMemo(() => getChannelConnectionStatuses(recentReadings), [recentReadings]);

  const alerts = useMemo(() => leituraAtual
    ? sensors.filter((sensor) => leituraAtual[`temp_${sensor.id}`] > ALERT_THRESHOLD
      && isAnalyticallyValidReading(leituraAtual[`temp_${sensor.id}`], activeNodeProfile.technicalId))
      .map((sensor) => ({ sensor: sensor.label, temp: leituraAtual[`temp_${sensor.id}`] }))
    : [], [activeNodeProfile.technicalId, leituraAtual, sensors]);

  const activeSensorId = useMemo(() => {
    const selected = sensors.find((sensor) => sensor.id === selectedSensorId);
    if (selected && channelStatuses[selectedSensorId] !== 'offline' && leituraAtual?.[`temp_${selectedSensorId}`] !== null) return selectedSensorId;
    return sensors.find((sensor) => channelStatuses[sensor.id] !== 'offline' && leituraAtual?.[`temp_${sensor.id}`] !== null)?.id || selectedSensorId;
  }, [channelStatuses, leituraAtual, selectedSensorId, sensors]);
  const selectedNodeStatus = nodeStatuses.find((node) => (
    String(node.sensor_id) === selectedCollectionPoint?.sensorId
      && (!node.gateway_id || node.gateway_id === selectedCollectionPoint?.gatewayId)
  ));
  const selectedSensorValue = leituraAtual ? leituraAtual[`temp_${activeSensorId}`] : null;
  const pointName = selectedCollectionPoint ? getCollectionPointName(selectedCollectionPoint.sensorId) : null;
  const systemState = getSystemState({
    pointsError,
    currentError,
    isPointsLoading,
    isCurrentLoading,
    currentHasLoaded,
    hasReading: Boolean(leituraAtual),
  });

  const renderDashboard = () => {
    if (!hasLoadedPoints) return <div className={styles.emptyState}>{pointsError || 'Carregando pontos de coleta...'}</div>;
    if (availableCollectionPoints?.length === 0) return <div className={styles.emptyState}>Nenhum ponto de coleta encontrado.</div>;
    if (!activeCollectionPointId) return <div className={styles.emptyState}>Carregando dados do ponto selecionado...</div>;
    return <>
      <KpiCards leituraAtual={leituraAtual} historico={historico} profile={activeNodeProfile} isLoading={isCurrentLoading} hasLoaded={currentHasLoaded} error={currentError} onRetry={retryCurrent} />
      <div className={styles.middleRow}>
        <div className={styles.chartWrapper}>
          <HistoryChart historico={historico} sensors={sensors} nodeId={activeNodeProfile.technicalId} periodo={periodo} setPeriodo={setPeriodo} customRange={customRange} setCustomRange={setCustomRange} isLoading={isHistoryLoading} hasLoaded={historyHasLoaded} error={historyError} onRetry={retryHistory} collectionPointName={pointName} collectionPointId={activeCollectionPointId} />
        </div>
        <div className={styles.gaugeWrapper}><Gauge value={selectedSensorValue} sensors={sensors} nodeId={activeNodeProfile.technicalId} selectedSensorId={activeSensorId} onSelectSensor={setSelectedSensorId} leituraAtual={leituraAtual} channelStatuses={channelStatuses} /></div>
      </div>
      <div className={styles.bottomRow}>
        <div className={styles.bottomCol}><GradientProfile leituraAtual={leituraAtual} historico={historico} profile={activeNodeProfile} /></div>
        <div className={styles.bottomCol}><StatsTable stats={sensorStats} sensors={sensors} channelStatuses={channelStatuses} isLoading={isHistoryLoading} hasLoaded={historyHasLoaded} error={historyError} onRetry={retryHistory} /></div>
      </div>
    </>;
  };

  return <div className={styles.appWrapper}>
    <Header isDemo={isDemo} systemState={systemState} lastUpdate={leituraAtual?.data_hora || null} nodeStatuses={selectedNodeStatus ? [{ ...selectedNodeStatus, display_name: activeNodeProfile.displayName }] : []} />
    <AlertStrip alerts={alerts} />
    <main className={styles.mainContent}>
      <CollectionPointSelector points={availableCollectionPoints || []} selectedSensorId={activeCollectionPointId} onSelect={setSelectedCollectionPointId} leituraAtual={leituraAtual} isLoading={isPointsLoading && !hasLoadedPoints} error={pointsError} onRetry={retryPoints} />
      {renderDashboard()}
    </main>
    <Footer />
  </div>;
}

export default App;
