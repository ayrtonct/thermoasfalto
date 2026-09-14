import { useState, useMemo } from 'react';
import { useSensorData } from './hooks/useSensorData';
import { SENSORS, ALERT_THRESHOLD } from './constants/sensors';
import { getCollectionPointName } from './constants/collectionPoints';
import { getChannelConnectionStatuses } from './utils/channelStatus';
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
    setSelectedSensorId: setSelectedCollectionPointId,
  } = useSensorData();

  const activeCollectionPointId = selectedCollectionPoint?.pointKey || null;
  const channelStatuses = useMemo(() => getChannelConnectionStatuses(recentReadings), [recentReadings]);

  const alerts = useMemo(() => leituraAtual
    ? SENSORS.filter((sensor) => leituraAtual[`temp_${sensor.id}`] > ALERT_THRESHOLD)
      .map((sensor) => ({ sensor: sensor.label, temp: leituraAtual[`temp_${sensor.id}`] }))
    : [], [leituraAtual]);

  const activeSensorId = useMemo(() => {
    const selected = SENSORS.find((sensor) => sensor.id === selectedSensorId);
    if (selected && channelStatuses[selectedSensorId] !== 'offline' && leituraAtual?.[`temp_${selectedSensorId}`] !== null) return selectedSensorId;
    return SENSORS.find((sensor) => channelStatuses[sensor.id] !== 'offline' && leituraAtual?.[`temp_${sensor.id}`] !== null)?.id || selectedSensorId;
  }, [channelStatuses, leituraAtual, selectedSensorId]);
  const hasAmbiguousNodeStatus = selectedCollectionPoint && availableCollectionPoints
    ?.filter((point) => point.sensorId === selectedCollectionPoint.sensorId).length > 1;
  const selectedNodeStatus = hasAmbiguousNodeStatus
    ? undefined
    : nodeStatuses.find((node) => String(node.sensor_id) === selectedCollectionPoint?.sensorId);
  const selectedSensorValue = leituraAtual ? leituraAtual[`temp_${activeSensorId}`] : null;
  const pointName = selectedCollectionPoint ? getCollectionPointName(selectedCollectionPoint.sensorId) : null;
  const systemState = currentError
    ? 'unavailable'
    : isCurrentLoading && !currentHasLoaded
      ? 'loading'
      : leituraAtual
        ? 'online'
        : 'empty';

  const renderDashboard = () => {
    if (!hasLoadedPoints) return <div className={styles.emptyState}>{pointsError || 'Carregando pontos de coleta...'}</div>;
    if (availableCollectionPoints?.length === 0) return <div className={styles.emptyState}>Nenhum ponto de coleta encontrado.</div>;
    if (!activeCollectionPointId) return <div className={styles.emptyState}>Carregando dados do ponto selecionado...</div>;
    return <>
      <KpiCards leituraAtual={leituraAtual} historico={historico} isLoading={isCurrentLoading} hasLoaded={currentHasLoaded} error={currentError} onRetry={retryCurrent} />
      <div className={styles.middleRow}>
        <div className={styles.chartWrapper}>
          <HistoryChart historico={historico} periodo={periodo} setPeriodo={setPeriodo} customRange={customRange} setCustomRange={setCustomRange} isLoading={isHistoryLoading} hasLoaded={historyHasLoaded} error={historyError} onRetry={retryHistory} collectionPointName={pointName} collectionPointId={activeCollectionPointId} />
        </div>
        <div className={styles.gaugeWrapper}><Gauge value={selectedSensorValue} selectedSensorId={activeSensorId} onSelectSensor={setSelectedSensorId} leituraAtual={leituraAtual} channelStatuses={channelStatuses} /></div>
      </div>
      <div className={styles.bottomRow}>
        <div className={styles.bottomCol}><GradientProfile leituraAtual={leituraAtual} historico={historico} /></div>
        <div className={styles.bottomCol}><StatsTable stats={sensorStats} channelStatuses={channelStatuses} isLoading={isHistoryLoading} hasLoaded={historyHasLoaded} error={historyError} onRetry={retryHistory} /></div>
      </div>
    </>;
  };

  return <div className={styles.appWrapper}>
    <Header isDemo={isDemo} systemState={systemState} lastUpdate={leituraAtual?.data_hora || null} nodeStatuses={selectedNodeStatus ? [selectedNodeStatus] : []} />
    <AlertStrip alerts={alerts} />
    <main className={styles.mainContent}>
      <CollectionPointSelector points={availableCollectionPoints || []} selectedSensorId={activeCollectionPointId} onSelect={setSelectedCollectionPointId} leituraAtual={leituraAtual} isLoading={isPointsLoading && !hasLoadedPoints} error={pointsError} />
      {renderDashboard()}
    </main>
    <Footer />
  </div>;
}

export default App;
