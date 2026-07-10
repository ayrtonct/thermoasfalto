import { useState, useMemo } from 'react';
import { useSensorData } from './hooks/useSensorData';
import { SENSORS, ALERT_THRESHOLD } from './constants/sensors';
import { getCollectionPointName } from './constants/collectionPoints';
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
    leituraAtual, historico, sensorStats, nodeStatuses, availableCollectionPoints,
    periodo, setPeriodo, customRange, setCustomRange, isDemo, isPointLoading,
    hasLoadedPoints, error, pointsError, selectedSensorId: selectedCollectionPointId,
    setSelectedSensorId: setSelectedCollectionPointId,
  } = useSensorData();

  const activeCollectionPointId = selectedCollectionPointId;

  const alerts = useMemo(() => leituraAtual
    ? SENSORS.filter((sensor) => leituraAtual[`temp_${sensor.id}`] > ALERT_THRESHOLD)
      .map((sensor) => ({ sensor: sensor.label, temp: leituraAtual[`temp_${sensor.id}`] }))
    : [], [leituraAtual]);

  const activeSensorId = useMemo(() => {
    const selected = SENSORS.find((sensor) => sensor.id === selectedSensorId);
    if (selected?.active && leituraAtual?.[`temp_${selectedSensorId}`] !== null) return selectedSensorId;
    return SENSORS.find((sensor) => sensor.active && leituraAtual?.[`temp_${sensor.id}`] !== null)?.id || selectedSensorId;
  }, [leituraAtual, selectedSensorId]);
  const selectedNodeStatus = nodeStatuses.find((node) => String(node.sensor_id) === activeCollectionPointId);
  const selectedSensorValue = leituraAtual ? leituraAtual[`temp_${activeSensorId}`] : null;
  const pointName = activeCollectionPointId ? getCollectionPointName(activeCollectionPointId) : null;

  const renderDashboard = () => {
    if (!hasLoadedPoints) return <div className={styles.emptyState}>{pointsError || 'Carregando pontos de coleta...'}</div>;
    if (availableCollectionPoints?.length === 0) return <div className={styles.emptyState}>Nenhum ponto de coleta encontrado.</div>;
    if (!activeCollectionPointId || isPointLoading) return <div className={styles.emptyState}>Carregando dados do ponto selecionado...</div>;
    if (!leituraAtual) return <div className={styles.emptyState}>{error || 'Este ponto ainda nao possui leitura recente.'}</div>;
    return <>
      <KpiCards leituraAtual={leituraAtual} historico={historico} />
      <div className={styles.middleRow}>
        <div className={styles.gaugeWrapper}><Gauge value={selectedSensorValue} selectedSensorId={activeSensorId} onSelectSensor={setSelectedSensorId} leituraAtual={leituraAtual} /></div>
        <div className={styles.chartWrapper}>
          <HistoryChart historico={historico} periodo={periodo} setPeriodo={setPeriodo} customRange={customRange} setCustomRange={setCustomRange} isLoading={isPointLoading} error={error} collectionPointName={pointName} collectionPointId={activeCollectionPointId} />
        </div>
      </div>
      <div className={styles.bottomRow}>
        <div className={styles.bottomCol}><GradientProfile leituraAtual={leituraAtual} historico={historico} /></div>
        <div className={styles.bottomCol}><StatsTable stats={sensorStats} /></div>
      </div>
    </>;
  };

  return <div className={styles.appWrapper}>
    <Header isDemo={isDemo} isOnline={leituraAtual !== null} lastUpdate={leituraAtual?.data_hora || null} nodeStatuses={selectedNodeStatus ? [selectedNodeStatus] : []} />
    <AlertStrip alerts={alerts} />
    <main className={styles.mainContent}>
      <CollectionPointSelector points={availableCollectionPoints || []} selectedSensorId={activeCollectionPointId} onSelect={setSelectedCollectionPointId} leituraAtual={leituraAtual} isLoading={isPointLoading} error={pointsError} />
      {renderDashboard()}
    </main>
    <Footer />
  </div>;
}

export default App;
