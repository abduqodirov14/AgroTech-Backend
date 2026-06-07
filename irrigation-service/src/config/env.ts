import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3005', 10),
  mqtt: {
    broker: process.env.MQTT_BROKER || 'mqtt://localhost:1883',
    commandTopic: process.env.MQTT_COMMAND_TOPIC || 'v1/irrigation/command',
  },
};
