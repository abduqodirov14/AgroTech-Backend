// Environment variables configuration
// Bu yerda .env fayldan o'qiladi: BOT_TOKEN, DATABASE_URL, JWT_SECRET, PORT

export const env = {
  // Telegram Bot
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME || 'agrotechbot',
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'mongodb://localhost:27017/agrotech',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'change-this-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30d',
  
  // Server
  PORT: parseInt(process.env.PORT || '3001'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  
  // Auth code
  AUTH_CODE_EXPIRY_MINUTES: parseInt(process.env.AUTH_CODE_EXPIRY_MINUTES || '5'),
};
