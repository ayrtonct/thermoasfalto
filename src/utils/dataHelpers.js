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
