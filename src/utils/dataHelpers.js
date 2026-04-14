// Retorna true se o valor é uma leitura válida
export function isValidReading(value) {
  return value !== null &&
         value !== undefined &&
         value !== -127 &&
         !isNaN(value)
}

// Calcula média ignorando leituras inválidas
// Retorna null se nenhum valor for válido
export function safeAvg(...values) {
  const valid = values.filter(isValidReading)
  if (!valid.length) return null
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

// Retorna valor ou null se inválido
export function safeValue(value) {
  return isValidReading(value) ? value : null
}

export function buildSensorStats(records, sensors) {
  if (!records || records.length === 0) return []

  return sensors.map((sensor) => {
    const key = `temp_${sensor.id}`
    const validValues = records
      .map((record) => record[key])
      .filter(isValidReading)

    if (!validValues.length) {
      return {
        sensor_id: sensor.id,
        avg: null,
        max: null,
        min: null,
        count: 0,
      }
    }

    const sum = validValues.reduce((acc, value) => acc + value, 0)

    return {
      sensor_id: sensor.id,
      avg: sum / validValues.length,
      max: Math.max(...validValues),
      min: Math.min(...validValues),
      count: validValues.length,
    }
  })
}
