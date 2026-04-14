import { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import styles from './HistoryChart.module.css';
import { SENSORS } from '../../constants/sensors';
import { exportHistoryToCsv } from '../../utils/exportHelpers';

const HALF_HOUR_MS = 30 * 60 * 1000;

const getHalfHourBucket = (value) => {
  const date = new Date(value);
  const timestamp = date.getTime();

  if (Number.isNaN(timestamp)) return null;

  return Math.round(timestamp / HALF_HOUR_MS) * HALF_HOUR_MS;
};

const normalizeHistoryToHalfHour = (records) => {
  const grouped = new Map();

  records.forEach((record) => {
    const bucket = getHalfHourBucket(record.data_hora);
    if (bucket === null) return;

    const current = grouped.get(bucket);
    const currentTime = current ? new Date(current.data_hora).getTime() : -Infinity;
    const recordTime = new Date(record.data_hora).getTime();

    if (!current || recordTime >= currentTime) {
      grouped.set(bucket, {
        ...record,
        data_hora: new Date(bucket).toISOString(),
      });
    }
  });

  return Array.from(grouped.values()).sort(
    (a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()
  );
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export const HistoryChart = ({ 
  historico, 
  periodo, 
  setPeriodo, 
  customRange, 
  setCustomRange 
}) => {
  const [localRange, setLocalRange] = useState({ de: customRange.de, ate: customRange.ate });
  const [hiddenDatasets, setHiddenDatasets] = useState({});

  const getExportFileName = () => {
    if (periodo === 'LIVRE' && customRange.de && customRange.ate) {
      const de = customRange.de.replace(/[:T]/g, '-')
      const ate = customRange.ate.replace(/[:T]/g, '-')
      return `historico_${de}_a_${ate}`
    }

    return `historico_${periodo.toLowerCase()}`
  }

  const toggleDataset = (id) => {
    setHiddenDatasets(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleApplyCustom = () => {
    setCustomRange(localRange);
  };

  const handleExport = () => {
    exportHistoryToCsv(historico, getExportFileName());
  };

  const chartData = useMemo(() => {
    if (!historico || historico.length === 0) {
      return { labels: [], datasets: [] };
    }

    const normalizedHistory = normalizeHistoryToHalfHour(historico);

    const labels = normalizedHistory.map(d => {
      const date = new Date(d.data_hora);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    });

    const activeSensors = SENSORS.filter(s => s.active);
    const datasets = activeSensors.map(sensor => {
      const dataKey = `temp_${sensor.id}`;
      return {
        label: sensor.label,
        data: normalizedHistory.map(d => d[dataKey]),
        borderColor: sensor.color,
        backgroundColor: sensor.color,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 4,
        tension: 0,
        spanGaps: false,
        hidden: hiddenDatasets[sensor.id] || false,
        sensorId: sensor.id, // custom prop
      };
    });

    return { labels, datasets };
  }, [historico, hiddenDatasets]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: false // We use custom interactive legend
      },
      tooltip: {
        backgroundColor: '#181b22',
        titleColor: '#e8ecf5',
        bodyColor: '#e8ecf5',
        borderColor: '#2a2f3e',
        borderWidth: 1,
        titleFont: { family: 'Space Mono' },
        bodyFont: { family: 'Space Mono' },
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
      }
    },
    scales: {
      x: {
        grid: {
          color: '#1f2330',
          drawBorder: false,
        },
        ticks: {
          color: '#8b92a8',
          font: { family: 'Space Mono', size: 10 },
          maxTicksLimit: 8,
          maxRotation: 0,
        }
      },
      y: {
        min: 20,
        max: 65,
        grid: {
          color: '#1f2330',
          drawBorder: false,
        },
        ticks: {
          color: '#8b92a8',
          font: { family: 'Space Mono', size: 11 },
          callback: (value) => `${value}°C`
        }
      }
    }
  };

  const periods = ['30M', '1H', '3H', '6H', '12H', '24H'];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Histórico Térmico</h3>
        <div className={styles.controls}>
          <div className={styles.topControls}>
            <div className={styles.periodGroup}>
              {periods.map(p => (
                <button
                  key={p}
                  className={`${styles.periodBtn} ${periodo === p ? styles.active : ''}`}
                  onClick={() => setPeriodo(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className={`${styles.periodBtn} ${periodo === 'LIVRE' ? styles.active : ''}`}
                onClick={() => setPeriodo('LIVRE')}
              >
                LIVRE
              </button>
            </div>

            <button
              className={styles.exportBtn}
              onClick={handleExport}
              disabled={!historico || historico.length === 0}
              title="Baixar histórico atual em CSV compatível com Excel"
            >
              Exportar CSV
            </button>
          </div>
          
          {periodo === 'LIVRE' && (
            <div className={styles.customRange}>
              <input 
                type="datetime-local" 
                className={styles.dateInput}
                value={localRange.de}
                onChange={(e) => setLocalRange(prev => ({...prev, de: e.target.value}))}
              />
              <span className={styles.rangeSep}>ate</span>
              <input 
                type="datetime-local" 
                className={styles.dateInput}
                value={localRange.ate}
                onChange={(e) => setLocalRange(prev => ({...prev, ate: e.target.value}))}
              />
              <button className={styles.applyBtn} onClick={handleApplyCustom}>Aplicar</button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.chartWrapper}>
        <Line data={chartData} options={chartOptions} />
      </div>

      <div className={styles.legend}>
        {SENSORS.filter(s => s.active).map(s => {
          const isHidden = hiddenDatasets[s.id];
          return (
            <div 
              key={s.id} 
              className={`${styles.legendItem} ${isHidden ? styles.hidden : ''}`}
              onClick={() => toggleDataset(s.id)}
            >
              <span 
                className={styles.legendDot} 
                style={{ backgroundColor: isHidden ? '#2a2f3e' : s.color }} 
              />
              <span className={styles.legendLabel}>{s.label} ({s.depth})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
