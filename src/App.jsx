import { useState, useMemo } from 'react';
import { useSensorData } from './hooks/useSensorData';
import { ALERT_THRESHOLD } from './constants/sensors';
import { getCollectionPointName } from './constants/collectionPoints';
import { getChannelConnectionStatuses } from './utils/channelStatus';
import { isAnalyticallyValidReading } from './utils/dataHelpers';
import { getSystemState } from './utils/dashboardState';
import { LabPanel } from './components/LabPanel';
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
    activeNodeProfile, retryPoints, historyMeta, isStatsLoading, statsHasLoaded, statsError, statsScope,
    setSelectedSensorId: setSelectedCollectionPointId,
  } = useSensorData();

  const activeCollectionPointId = selectedCollectionPoint?.pointKey || null;
  const sensors = activeNodeProfile.channels;
  const selectedNodeStatus = nodeStatuses.find((node) => (
    String(node.sensor_id) === selectedCollectionPoint?.sensorId
      && node.gateway_id === selectedCollectionPoint?.gatewayId
  ));
  const nodeStatus = selectedNodeStatus?.status || 'unknown';
  const channelStatuses = useMemo(() => getChannelConnectionStatuses(recentReadings, nodeStatus), [recentReadings, nodeStatus]);

  const alerts = useMemo(() => leituraAtual && nodeStatus === 'online'
    ? sensors.filter((sensor) => leituraAtual[`temp_${sensor.id}`] > ALERT_THRESHOLD
      && isAnalyticallyValidReading(leituraAtual[`temp_${sensor.id}`], activeNodeProfile.technicalId))
      .map((sensor) => ({ sensor: sensor.label, temp: leituraAtual[`temp_${sensor.id}`] }))
    : [], [activeNodeProfile.technicalId, leituraAtual, sensors, nodeStatus]);

  const activeSensorId = useMemo(() => {
    const selected = sensors.find((sensor) => sensor.id === selectedSensorId);
    if (selected && channelStatuses[selectedSensorId] === 'online' && leituraAtual?.[`temp_${selectedSensorId}`] !== null) return selectedSensorId;
    return sensors.find((sensor) => channelStatuses[sensor.id] === 'online' && leituraAtual?.[`temp_${sensor.id}`] !== null)?.id || selectedSensorId;
  }, [channelStatuses, leituraAtual, selectedSensorId, sensors]);
  const selectedSensorValue = leituraAtual ? leituraAtual[`temp_${activeSensorId}`] : null;
  const pointName = selectedCollectionPoint ? getCollectionPointName(selectedCollectionPoint.sensorId) : null;
  const systemState = getSystemState({
    pointsError,
    currentError,
    isPointsLoading,
    isCurrentLoading,
    currentHasLoaded,
    hasReading: Boolean(leituraAtual), nodeStatus,
  });

  const renderDashboard = () => {
    if (!hasLoadedPoints) return <div className={styles.emptyState}>{pointsError || 'Carregando pontos de coleta...'}</div>;
    if (availableCollectionPoints?.length === 0) return <div className={styles.emptyState}>Nenhum ponto de coleta encontrado.</div>;
    if (!activeCollectionPointId) return <div className={styles.emptyState}>Carregando dados do ponto selecionado...</div>;
    if (activeNodeProfile.mode === 'laboratory') return <LabPanel reading={leituraAtual} history={historico} loading={isHistoryLoading} error={currentError || historyError} retry={() => { retryCurrent(); retryHistory(); }} periodo={periodo} setPeriodo={setPeriodo} status={nodeStatus} />;
    return <>
      {nodeStatus !== 'online' && <p role="status">Conectividade: {nodeStatus === 'offline' ? 'offline' : nodeStatus === 'instavel' ? 'instável' : 'não confirmada'}. Os valores abaixo são as últimas leituras recebidas.</p>}
      <KpiCards leituraAtual={leituraAtual} historico={historico} profile={activeNodeProfile} stats={sensorStats} statsScope={statsScope} isLoading={isCurrentLoading} hasLoaded={currentHasLoaded} error={currentError} onRetry={retryCurrent} />
      <div className={styles.middleRow}>
        <div className={styles.chartWrapper}>
          <HistoryChart historyMeta={historyMeta} historico={historico} sensors={sensors} nodeId={activeNodeProfile.technicalId} periodo={periodo} setPeriodo={setPeriodo} customRange={customRange} setCustomRange={setCustomRange} isLoading={isHistoryLoading} hasLoaded={historyHasLoaded} error={historyError} onRetry={retryHistory} collectionPointName={pointName} collectionPointId={activeCollectionPointId} />
        </div>
        <div className={styles.gaugeWrapper}><Gauge value={selectedSensorValue} sensors={sensors} nodeId={activeNodeProfile.technicalId} selectedSensorId={activeSensorId} onSelectSensor={setSelectedSensorId} leituraAtual={leituraAtual} channelStatuses={channelStatuses} /></div>
      </div>
      <div className={styles.bottomRow}>
        <div className={styles.bottomCol}><GradientProfile leituraAtual={leituraAtual} historico={historico} profile={activeNodeProfile} /></div>
        <div className={styles.bottomCol}><StatsTable stats={sensorStats} sensors={sensors} channelStatuses={channelStatuses} scope={statsScope} isLoading={isStatsLoading} hasLoaded={statsHasLoaded} error={statsError} onRetry={retryHistory} /></div>
      </div>
    </>;
  };

  return <div className={styles.appWrapper}>
    <Header isDemo={isDemo} isLaboratory={activeNodeProfile.mode === 'laboratory'} systemState={systemState} lastUpdate={leituraAtual?.data_hora || null} nodeStatuses={selectedNodeStatus ? [{ ...selectedNodeStatus, display_name: activeNodeProfile.displayName }] : []} />
    <AlertStrip alerts={alerts} />
    <main className={styles.mainContent}>
      <CollectionPointSelector points={availableCollectionPoints || []} selectedSensorId={activeCollectionPointId} onSelect={setSelectedCollectionPointId} leituraAtual={leituraAtual} isLoading={isPointsLoading && !hasLoadedPoints} error={pointsError} onRetry={retryPoints} />
      {renderDashboard()}
    </main>
    <Footer />
  </div>;
}

export default App;
