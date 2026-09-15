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
import { getRawChartMaximum, isExcludedFromAnalytics } from '../../utils/dataHelpers';
import { exportHistoryToCsv } from '../../utils/exportHelpers';
import { getLoadPhase } from '../../utils/loadState';

const CHART_THEME = {
  tooltipBackground: '#161e2b',
  tooltipText: '#f3f6fa',
  tooltipBorder: '#35445a',
  grid: 'rgba(156, 169, 186, 0.10)',
  tick: '#8d9aac',
  monoFont: 'SFMono-Regular, Consolas, Liberation Mono, monospace',
};

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
  isLoading,
  hasLoaded,
  error,
  onRetry,
  collectionPointName,
  collectionPointId,
  sensors,
  nodeId,
}) => {
  const [localRange, setLocalRange] = useState({ de: customRange.de, ate: customRange.ate });
  const [hiddenDatasets, setHiddenDatasets] = useState({});

  const getExportFileName = () => {
    if (periodo === 'LIVRE' && customRange.de && customRange.ate) {
      const de = customRange.de.replace(/[:T]/g, '-');
      const ate = customRange.ate.replace(/[:T]/g, '-');
      return `historico_${collectionPointId}_${de}_a_${ate}`;
    }

    return `historico_${collectionPointId}_${periodo.toLowerCase()}`;
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
    exportHistoryToCsv(historico, getExportFileName(), sensors);
  };

  const chartData = useMemo(() => {
    if (!historico || historico.length === 0) {
      return { datasets: [], hasMultiDayRange: false, minX: null, maxX: null, maxY: null };
    }

    const orderedHistory = [...historico]
      .filter((record) => !Number.isNaN(new Date(record.data_hora).getTime()))
      .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());

    if (orderedHistory.length === 0) {
      return { datasets: [], hasMultiDayRange: false, minX: null, maxX: null, maxY: null };
    }

    const firstTimestamp = new Date(orderedHistory[0].data_hora);
    const lastTimestamp = new Date(orderedHistory[orderedHistory.length - 1].data_hora);
    const hasMultiDayRange = firstTimestamp.toDateString() !== lastTimestamp.toDateString();
    const minX = firstTimestamp.getTime();
    const maxX = lastTimestamp.getTime();
    const maxY = getRawChartMaximum(orderedHistory, sensors);

    const datasets = sensors.map((sensor) => {
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

    return { datasets, hasMultiDayRange, minX, maxX, maxY };
  }, [historico, hiddenDatasets, sensors]);

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
        backgroundColor: CHART_THEME.tooltipBackground,
        titleColor: CHART_THEME.tooltipText,
        bodyColor: CHART_THEME.tooltipText,
        borderColor: CHART_THEME.tooltipBorder,
        borderWidth: 1,
        titleFont: { family: CHART_THEME.monoFont },
        bodyFont: { family: CHART_THEME.monoFont },
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

            const exclusion = isExcludedFromAnalytics(item.parsed.y, nodeId)
              ? ' — excluída dos cálculos'
              : '';
            return `${item.dataset.label}: ${item.parsed.y.toFixed(3)} °C${exclusion}`;
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
          color: CHART_THEME.grid,
          drawBorder: false,
        },
        ticks: {
          color: CHART_THEME.tick,
          font: { family: CHART_THEME.monoFont, size: 10 },
          maxTicksLimit: 8,
          maxRotation: 0,
          callback: (value) => formatTimeLabel(Number(value), chartData.hasMultiDayRange),
        },
      },
      y: {
        min: 20,
        max: chartData.maxY > 65 ? Math.ceil((chartData.maxY + 1) / 5) * 5 : 65,
        grid: {
          color: CHART_THEME.grid,
          drawBorder: false,
        },
        ticks: {
          color: CHART_THEME.tick,
          font: { family: CHART_THEME.monoFont, size: 11 },
          callback: (value) => `${value}°C`,
        },
      },
    },
  };

  const periods = ['30M', '1H', '3H', '6H', '12H', '24H'];
  const loadPhase = getLoadPhase(
    { data: historico, isLoading, hasLoaded, error },
    chartData.datasets.length > 0
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.eyebrow}>Série temporal</span>
          <h3 className={styles.title}>Histórico térmico</h3>
          {collectionPointName && <span className={styles.pointName}>{collectionPointName}</span>}
        </div>
        <div className={styles.controls}>
          <div className={styles.topControls}>
            <div className={styles.periodGroup}>
              {periods.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={periodo === p}
                  className={`${styles.periodBtn} ${periodo === p ? styles.active : ''}`}
                  onClick={() => setPeriodo(p)}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={periodo === 'LIVRE'}
                className={`${styles.periodBtn} ${periodo === 'LIVRE' ? styles.active : ''}`}
                onClick={() => setPeriodo('LIVRE')}
              >
                LIVRE
              </button>
            </div>

            <button
              type="button"
              className={styles.exportBtn}
              onClick={handleExport}
              disabled={!historico || historico.length === 0}
              title="Baixar histórico atual em CSV compatível com Excel"
            >
              Exportar CSV
            </button>
          </div>

          {periodo === 'LIVRE' && (
            <div className={styles.customRange} aria-label="Período personalizado">
              <label className={styles.dateField}>
                <span>Início</span>
                <input
                  type="datetime-local"
                  className={styles.dateInput}
                  value={localRange.de}
                  onChange={(e) => setLocalRange((prev) => ({ ...prev, de: e.target.value }))}
                />
              </label>
              <span className={styles.rangeSep}>ate</span>
              <label className={styles.dateField}>
                <span>Fim</span>
                <input
                  type="datetime-local"
                  className={styles.dateInput}
                  value={localRange.ate}
                  onChange={(e) => setLocalRange((prev) => ({ ...prev, ate: e.target.value }))}
                />
              </label>
              <button type="button" className={styles.applyBtn} onClick={handleApplyCustom}>
                Aplicar
              </button>
            </div>
          )}
        </div>
      </div>

      {error && loadPhase === 'data' && (
        <div className={styles.refreshWarning} role="alert">
          <span>{error} O histórico exibido foi preservado.</span>
          <button type="button" className={styles.retryBtn} onClick={onRetry}>Tentar novamente</button>
        </div>
      )}

      <div className={styles.chartWrapper}>
        {loadPhase === 'loading' || loadPhase === 'idle'
          ? <div className={styles.emptyMessage}>Carregando histórico...</div>
          : loadPhase === 'error'
            ? <div className={styles.errorMessage} role="alert"><span>{error}</span><button type="button" className={styles.retryBtn} onClick={onRetry}>Tentar novamente</button></div>
            : loadPhase === 'empty'
              ? <div className={styles.emptyMessage}>Sem dados para o período selecionado.</div>
              : <Line data={chartData} options={chartOptions} role="img" aria-label="Gráfico do histórico térmico dos sensores" />}
      </div>

      <div className={styles.legend}>
        {sensors.map((sensor) => {
          const isHidden = hiddenDatasets[sensor.id];

          return (
            <button
              type="button"
              key={sensor.id}
              aria-pressed={!isHidden}
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
            </button>
          );
        })}
      </div>
    </div>
  );
};
