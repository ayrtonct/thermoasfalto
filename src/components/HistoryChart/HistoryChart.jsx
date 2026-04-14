import { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import styles from './HistoryChart.module.css';
import { SENSORS } from '../../constants/sensors';
import { exportHistoryToCsv } from '../../utils/exportHelpers';

const formatTimeLabel = (value, includeDate = false) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '--:--';

  return date.toLocaleString(
    'pt-BR',
    includeDate
      ? { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }
      : { hour: '2-digit', minute: '2-digit' }
  );
};

ChartJS.register(
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
  setCustomRange,
}) => {
  const [localRange, setLocalRange] = useState({ de: customRange.de, ate: customRange.ate });
  const [hiddenDatasets, setHiddenDatasets] = useState({});

  const getExportFileName = () => {
    if (periodo === 'LIVRE' && customRange.de && customRange.ate) {
      const de = customRange.de.replace(/[:T]/g, '-');
      const ate = customRange.ate.replace(/[:T]/g, '-');
      return `historico_${de}_a_${ate}`;
    }

    return `historico_${periodo.toLowerCase()}`;
  };

  const toggleDataset = (id) => {
    setHiddenDatasets((prev) => ({
      ...prev,
      [id]: !prev[id],
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
      return { datasets: [], hasMultiDayRange: false, minX: null, maxX: null };
    }

    const orderedHistory = [...historico]
      .filter((record) => !Number.isNaN(new Date(record.data_hora).getTime()))
      .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());

    if (orderedHistory.length === 0) {
      return { datasets: [], hasMultiDayRange: false, minX: null, maxX: null };
    }

    const firstTimestamp = new Date(orderedHistory[0].data_hora);
    const lastTimestamp = new Date(orderedHistory[orderedHistory.length - 1].data_hora);
    const hasMultiDayRange = firstTimestamp.toDateString() !== lastTimestamp.toDateString();
    const minX = firstTimestamp.getTime();
    const maxX = lastTimestamp.getTime();

    const datasets = SENSORS.filter((sensor) => sensor.active).map((sensor) => {
      const dataKey = `temp_${sensor.id}`;

      return {
        label: sensor.label,
        data: orderedHistory.map((record) => ({
          x: new Date(record.data_hora).getTime(),
          y: record[dataKey],
        })),
        borderColor: sensor.color,
        backgroundColor: sensor.color,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0,
        spanGaps: false,
        hidden: hiddenDatasets[sensor.id] || false,
        sensorId: sensor.id,
      };
    });

    return { datasets, hasMultiDayRange, minX, maxX };
  }, [historico, hiddenDatasets]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      axis: 'x',
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
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
        callbacks: {
          title: (items) => {
            if (!items.length) return '';
            return formatTimeLabel(items[0].parsed.x, true);
          },
          label: (item) => {
            if (item.parsed.y === null || item.parsed.y === undefined) {
              return `${item.dataset.label}: --`;
            }

            return `${item.dataset.label}: ${item.parsed.y.toFixed(3)}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'linear',
        bounds: 'data',
        offset: false,
        min: chartData.minX ?? undefined,
        max: chartData.maxX ?? undefined,
        grid: {
          color: '#1f2330',
          drawBorder: false,
        },
        ticks: {
          color: '#8b92a8',
          font: { family: 'Space Mono', size: 10 },
          maxTicksLimit: 8,
          maxRotation: 0,
          callback: (value) => formatTimeLabel(Number(value), chartData.hasMultiDayRange),
        },
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
          callback: (value) => `${value}°C`,
        },
      },
    },
  };

  const periods = ['30M', '1H', '3H', '6H', '12H', '24H'];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Histórico Térmico</h3>
        <div className={styles.controls}>
          <div className={styles.topControls}>
            <div className={styles.periodGroup}>
              {periods.map((p) => (
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
                onChange={(e) => setLocalRange((prev) => ({ ...prev, de: e.target.value }))}
              />
              <span className={styles.rangeSep}>ate</span>
              <input
                type="datetime-local"
                className={styles.dateInput}
                value={localRange.ate}
                onChange={(e) => setLocalRange((prev) => ({ ...prev, ate: e.target.value }))}
              />
              <button className={styles.applyBtn} onClick={handleApplyCustom}>
                Aplicar
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.chartWrapper}>
        <Line data={chartData} options={chartOptions} />
      </div>

      <div className={styles.legend}>
        {SENSORS.filter((sensor) => sensor.active).map((sensor) => {
          const isHidden = hiddenDatasets[sensor.id];

          return (
            <div
              key={sensor.id}
              className={`${styles.legendItem} ${isHidden ? styles.hidden : ''}`}
              onClick={() => toggleDataset(sensor.id)}
            >
              <span
                className={styles.legendDot}
                style={{ backgroundColor: isHidden ? '#2a2f3e' : sensor.color }}
              />
              <span className={styles.legendLabel}>
                {sensor.label} ({sensor.depth})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
