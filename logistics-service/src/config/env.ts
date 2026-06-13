import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '3008', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://agrohub:agrohub_secret@localhost:5432/agrohub',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_LOGISTICS_BOT_TOKEN || '',
  MARKETPLACE_SERVICE_URL: process.env.MARKETPLACE_SERVICE_URL || 'http://localhost:3007',
  COLD_CHAIN_MAX_TEMP: parseFloat(process.env.COLD_CHAIN_MAX_TEMP || '5'),
};
