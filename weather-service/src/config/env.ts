export const env = {
  PORT: parseInt(process.env.PORT || '3003'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  
  OPEN_METEO_API_URL: process.env.OPEN_METEO_API_URL || 'https://api.open-meteo.com/v1/forecast',
  
  DEFAULT_LATITUDE: parseFloat(process.env.DEFAULT_LATITUDE || '41.3111'),
  DEFAULT_LONGITUDE: parseFloat(process.env.DEFAULT_LONGITUDE || '69.2797'),
};
