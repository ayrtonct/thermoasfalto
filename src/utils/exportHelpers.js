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

  return date.toLocaleString('pt-BR')
}

export function exportHistoryToCsv(records, fileLabel = 'historico') {
  if (!records || records.length === 0) return false

  const orderedRecords = [...records].reverse()
  const headers = [
    'Data/Hora',
    'DS1 (4 cm)',
    'DS2 (4 cm)',
    'DS3 (2 cm)',
    'DS4 (2 cm)',
    'DS5 (0 cm)',
    'DS6 (0 cm)',
    'RSSI',
  ]

  const rows = orderedRecords.map((record) => [
    formatTimestamp(record.data_hora),
    record.temp_ds1,
    record.temp_ds2,
    record.temp_ds3,
    record.temp_ds4,
    record.temp_ds5,
    record.temp_ds6,
    record.rssi,
  ])

  const csvContent = [
    headers.map(formatCell).join(CSV_SEPARATOR),
    ...rows.map((row) => row.map(formatCell).join(CSV_SEPARATOR)),
  ].join('\r\n')

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
