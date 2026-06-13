import dotenv from 'dotenv';

// Load .env first to override any pre-existing environment variables
const parsedEnv = dotenv.config({ path: '.env' }).parsed || {};

export const config = {
  port: parseInt(parsedEnv.PORT || process.env.PORT || '3004', 10),
  database: {
    url: process.env.DATABASE_URL!,
  },
  mqtt: {
    broker: process.env.MQTT_BROKER || 'mqtt://localhost:1883',
    topic: process.env.MQTT_TOPIC || 'v1/sensors/data',
  },
};