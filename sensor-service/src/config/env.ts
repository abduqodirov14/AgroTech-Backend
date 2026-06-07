import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3004', 10),
  database: {
    url: process.env.DATABASE_URL!,
  },
  mqtt: {
    broker: process.env.MQTT_BROKER || 'mqtt://localhost:1883',
    topic: process.env.MQTT_TOPIC || 'v1/sensors/data',
  },
};
