// Tema mínimo (colores y tipografías). Pensado para uso al aire libre,
// con buen contraste y tipografía grande.

export const colors = {
  bg: '#FAFAF7',
  card: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  primary: '#3F7B3F', // verde campo
  primaryDark: '#2C5A2C',
  accent: '#C58B3B', // marrón cálido
  intensityL: '#A7D08E', // leve
  intensityM: '#E0B85B', // moderado
  intensityI: '#C66A56', // intenso
  danger: '#B22222',
  success: '#2F7A4F',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
};

export const intensityColor = (i: 'L' | 'M' | 'I' | null | undefined) =>
  i === 'L' ? colors.intensityL : i === 'M' ? colors.intensityM : i === 'I' ? colors.intensityI : colors.textMuted;
