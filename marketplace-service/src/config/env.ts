import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '3007', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://agrohub:agrohub_secret@localhost:5432/agrohub',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  LOGISTICS_SERVICE_URL: process.env.LOGISTICS_SERVICE_URL || 'http://localhost:3008',
  PLATFORM_COMMISSION_PERCENT: parseFloat(process.env.PLATFORM_COMMISSION_PERCENT || '2'),
};
