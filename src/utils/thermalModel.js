const generateGaussianNoise = (mean, stdDev) => {
  let u = 0, v = 0;
  while(u === 0) u = Math.random(); // Converting [0,1) to (0,1)
  while(v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdDev + mean;
};

// Gera dados simulados realistas baseados nos valores reais coletados no campo (fevereiro 2026, São Luís - MA)
// DS1/DS2 (0 cm / base): 29,9°C – 53,1°C, amplitude ~8,2°C, pico ~16h  (wait, amplitude is max - min? 53.1 - 29.9 = 23.2. User said amplitude ~8.2, maybe daily amplitude)
// Let's use a sinusoidal curve centered at appropriate times
// Pico DS5/DS6: ~13:30 (13.5) -> superficial
// Pico DS3/DS4: ~15:00 (15.0) -> revestimento
// Pico DS1/DS2: ~16:00 (16.0) -> base

export const generateThermalData = (timestampStr) => {
  const date = new Date(timestampStr);
  const hour = date.getHours() + date.getMinutes() / 60;
  
  // Base parameters
  // DS5/DS6 (superfície): min 27.6, max 54.8, pico 13.5
  const t_surf_min = 27.6, t_surf_max = 54.8, p_surf = 13.5;
  const a_surf = (t_surf_max - t_surf_min) / 2;
  const m_surf = t_surf_min + a_surf;
  
  // DS3/DS4 (revestimento): min 28.4, max 54.6, pico 15.0
  const t_med_min = 28.4, t_med_max = 54.6, p_med = 15.0;
  const a_med = (t_med_max - t_med_min) / 2;
  const m_med = t_med_min + a_med;

  // DS1/DS2 (base): min 29.9, max 53.1, pico 16.0
  const t_base_min = 29.9, t_base_max = 53.1, p_base = 16.0;
  const a_base = (t_base_max - t_base_min) / 2;
  const m_base = t_base_min + a_base;
  
  // Calculate temps with cosine (pico = max) + noise
  const temp_ds1_base = m_base - a_base * Math.cos((hour - p_base) * (Math.PI / 12));
  const temp_ds3_base = m_med - a_med * Math.cos((hour - p_med) * (Math.PI / 12));
  const temp_ds5_base = m_surf - a_surf * Math.cos((hour - p_surf) * (Math.PI / 12));

  // Add small variations between sensors at same depth
  return {
    data_hora: timestampStr,
    temp_ds1: Number(generateGaussianNoise(temp_ds1_base, 0.2).toFixed(1)),
    temp_ds2: Number(generateGaussianNoise(temp_ds1_base, 0.2).toFixed(1)),
    temp_ds3: Number(generateGaussianNoise(temp_ds3_base, 0.3).toFixed(1)),
    temp_ds4: Number(generateGaussianNoise(temp_ds3_base, 0.3).toFixed(1)),
    temp_ds5: Number(generateGaussianNoise(temp_ds5_base, 0.5).toFixed(1)),
    temp_ds6: Number(generateGaussianNoise(temp_ds5_base, 0.5).toFixed(1))
  };
};

// Generate historical sequence 
export const generateHistory = (deStr, ateStr) => {
  const de = new Date(deStr).getTime();
  const ate = new Date(ateStr).getTime();
  const result = [];
  
  // Coletas a cada 30 min (1800000 ms)
  const interval = 30 * 60 * 1000;
  
  // Sync to nearest 30min for neatness
  let current = Math.ceil(de / interval) * interval;
  while(current <= ate) {
    const ts = new Date(current).toISOString().split('.')[0]; // Remove millis
    result.push(generateThermalData(ts));
    current += interval;
  }
  return result;
};
