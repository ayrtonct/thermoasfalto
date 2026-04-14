import { useState, useEffect } from 'react';
import { useSensorData } from './hooks/useSensorData';
import { SENSORS, ALERT_THRESHOLD } from './constants/sensors';

import { Header } from './components/Header/Header';
import { AlertStrip } from './components/AlertStrip/AlertStrip';
import { KpiCards } from './components/KpiCards/KpiCards';
import { Gauge } from './components/Gauge/Gauge';
import { HistoryChart } from './components/HistoryChart/HistoryChart';
import { GradientProfile } from './components/GradientProfile/GradientProfile';
import { StatsTable } from './components/StatsTable/StatsTable';
import { Footer } from './components/Footer/Footer';

import styles from './App.module.css';

function App() {
  const {
    leituraAtual,
    historico,
    sensorStats,
    periodo,
    setPeriodo,
    customRange,
    setCustomRange,
    isDemo,
    isLoading,
    nodeStatuses
  } = useSensorData();

  const [selectedSensorId, setSelectedSensorId] = useState('ds5'); // Default to DS5 (superfície)

  // Auto select active sensor
  useEffect(() => {
    if (leituraAtual) {
      const selected = SENSORS.find(s => s.id === selectedSensorId);
      if (!selected || !selected.active || leituraAtual[`temp_${selectedSensorId}`] === null) {
        const firstActive = SENSORS.find(s => s.active && leituraAtual[`temp_${s.id}`] !== null);
        if (firstActive) setSelectedSensorId(firstActive.id);
      }
    }
  }, [leituraAtual, selectedSensorId]);

  // Check alerts
  const alerts = [];
  if (leituraAtual) {
    if (leituraAtual.temp_ds1 > ALERT_THRESHOLD) alerts.push({ sensor: 'DS1', temp: leituraAtual.temp_ds1 });
    if (leituraAtual.temp_ds2 > ALERT_THRESHOLD) alerts.push({ sensor: 'DS2', temp: leituraAtual.temp_ds2 });
    if (leituraAtual.temp_ds3 > ALERT_THRESHOLD) alerts.push({ sensor: 'DS3', temp: leituraAtual.temp_ds3 });
    if (leituraAtual.temp_ds4 > ALERT_THRESHOLD) alerts.push({ sensor: 'DS4', temp: leituraAtual.temp_ds4 });
    if (leituraAtual.temp_ds5 > ALERT_THRESHOLD) alerts.push({ sensor: 'DS5', temp: leituraAtual.temp_ds5 });
    if (leituraAtual.temp_ds6 > ALERT_THRESHOLD) alerts.push({ sensor: 'DS6', temp: leituraAtual.temp_ds6 });
  }

  const selectedSensorValue = leituraAtual ? leituraAtual[`temp_${selectedSensorId}`] : 0;

  return (
    <div className={styles.appWrapper}>
      <Header 
        isDemo={isDemo} 
        isOnline={leituraAtual !== null} 
        lastUpdate={leituraAtual ? leituraAtual.data_hora : null} 
        nodeStatuses={nodeStatuses}
      />
      
      <AlertStrip alerts={alerts} />

      <main className={styles.mainContent}>
        <KpiCards 
          leituraAtual={leituraAtual} 
          historico={historico} 
        />

        <div className={styles.middleRow}>
          <div className={styles.gaugeWrapper}>
            <Gauge 
              value={selectedSensorValue} 
              selectedSensorId={selectedSensorId} 
              onSelectSensor={setSelectedSensorId} 
              leituraAtual={leituraAtual}
            />
          </div>
          <div className={styles.chartWrapper}>
            <HistoryChart 
              historico={historico}
              periodo={periodo}
              setPeriodo={setPeriodo}
              customRange={customRange}
              setCustomRange={setCustomRange}
            />
          </div>
        </div>

        <div className={styles.bottomRow}>
          <div className={styles.bottomCol}>
            <GradientProfile 
              leituraAtual={leituraAtual} 
              historico={historico} 
            />
          </div>
          <div className={styles.bottomCol}>
            <StatsTable 
              stats={sensorStats}
            />
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default App;
