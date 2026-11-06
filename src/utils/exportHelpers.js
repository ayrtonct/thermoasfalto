import { buildApiUrl } from './collectionPoints.js'
import { historyParams } from './historyScope.js'
const CSV_SEPARATOR = ';'

function formatCell(value) {
  if (value === null || value === undefined) return ''

  if (typeof value === 'number') {
    return value.toFixed(2).replace('.', ',')
  }

  const text = String(value)

  if (text.includes('"') || text.includes('\n') || text.includes(CSV_SEPARATOR)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

function formatTimestamp(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' })
}

export function buildHistoryCsv(records, sensors = SENSORS) {
  const orderedRecords = [...records].reverse()
  const orderedSensors = [...sensors].sort((a, b) => a.id.localeCompare(b.id, 'pt-BR', { numeric: true }))
  const headers = [
    'Data/Hora',
    ...orderedSensors.map((sensor) => `${sensor.label} (${sensor.depth})`),
    'RSSI',
  ]

  const rows = orderedRecords.map((record) => [
    formatTimestamp(record.data_hora),
    ...orderedSensors.map((sensor) => record[`temp_${sensor.id}`]),
    record.rssi,
  ])

  return [
    headers.map(formatCell).join(CSV_SEPARATOR),
    ...rows.map((row) => row.map(formatCell).join(CSV_SEPARATOR)),
  ].join('\r\n')
}

export function exportHistoryToCsv(records, fileLabel = 'historico', sensors = SENSORS) {
  if (!records || records.length === 0) return false

  const csvContent = buildHistoryCsv(records, sensors)

  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const safeLabel = fileLabel.replace(/[^\w-]+/g, '_')

  link.href = url
  link.download = `${safeLabel}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  return true
}
import { SENSORS } from '../constants/sensors.js'


// Always request individual stored readings, never the chart's aggregated series.
export async function downloadRawHistory({ baseUrl = '', sensorId, gatewayId, period, custom = {}, filename }) {
  const url = buildApiUrl(baseUrl, '/api/medicoes/csv', {
    sensor_id: sensorId, gateway_id: gatewayId, ...historyParams(period, custom),
  })
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 120000)
  let objectUrl
  let link
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error('Não foi possível exportar as medições.')
    const blob = await response.blob()
    objectUrl = URL.createObjectURL(blob)
    link = document.createElement('a')
    link.href = objectUrl
    link.download = `${filename.replace(/[^\w-]+/g, '_')}.csv`
    document.body.appendChild(link)
    link.click()
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Tempo limite da exportação excedido. Tente um intervalo menor.')
    throw error
  } finally {
    clearTimeout(timer)
    link?.remove()
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }
}
