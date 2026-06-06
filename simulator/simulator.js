const mqtt = require('mqtt');

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
const SENSOR_TOPIC = 'v1/sensors/data';
const IRRIGATION_COMMAND_TOPIC = 'v1/irrigation/command';

const client = mqtt.connect(MQTT_BROKER, {
  clientId: `virtual_sensor_${Math.random().toString(16).slice(2, 10)}`,
  clean: true,
  reconnectPeriod: 1000,
});

let valveState = 'OFF';

client.on('connect', () => {
  console.log('\x1b[32m%s\x1b[0m', '✅ [SIMULATOR]: Connected to MQTT Broker');
  console.log('\x1b[36m%s\x1b[0m', `📡 [SIMULATOR]: Publishing to topic: ${SENSOR_TOPIC}`);
  console.log('\x1b[36m%s\x1b[0m', `👂 [SIMULATOR]: Listening to topic: ${IRRIGATION_COMMAND_TOPIC}`);
  
  client.subscribe(IRRIGATION_COMMAND_TOPIC, (err) => {
    if (err) {
      console.error('\x1b[31m%s\x1b[0m', '❌ [SIMULATOR]: Failed to subscribe to irrigation commands');
    } else {
      console.log('\x1b[32m%s\x1b[0m', '✅ [SIMULATOR]: Subscribed to irrigation commands');
    }
  });

  startSensorSimulation();
});

client.on('message', (topic, message) => {
  if (topic === IRRIGATION_COMMAND_TOPIC) {
    const command = message.toString().toUpperCase();
    
    if (command === 'ON') {
      valveState = 'ON';
      console.log('\x1b[42m\x1b[30m%s\x1b[0m', ' 💧 [VIRTUAL KRAN]: Suv ochildi ');
    } else if (command === 'OFF') {
      valveState = 'OFF';
      console.log('\x1b[41m\x1b[37m%s\x1b[0m', ' 🚫 [VIRTUAL KRAN]: Suv yopildi ');
    } else {
      console.log('\x1b[33m%s\x1b[0m', `⚠️  [VIRTUAL KRAN]: Unknown command: ${command}`);
    }
  }
});

client.on('error', (err) => {
  console.error('\x1b[31m%s\x1b[0m', '❌ [SIMULATOR]: Connection error:', err.message);
});

client.on('close', () => {
  console.log('\x1b[33m%s\x1b[0m', '⚠️  [SIMULATOR]: Connection closed');
});

function generateSensorData() {
  const soilMoisture = (60 + Math.random() * 10).toFixed(2);
  const pH = (6.0 + Math.random() * 1.0).toFixed(2);
  const temperature = (22 + Math.random() * 4).toFixed(2);
  
  return {
    sensorId: 'SENS-VIRTUAL-001',
    timestamp: new Date().toISOString(),
    data: {
      soilMoisture: parseFloat(soilMoisture),
      pH: parseFloat(pH),
      temperature: parseFloat(temperature),
      valveState: valveState,
    },
  };
}

function startSensorSimulation() {
  console.log('\x1b[35m%s\x1b[0m', '🔄 [SIMULATOR]: Starting sensor data stream...\n');
  
  setInterval(() => {
    const payload = generateSensorData();
    
    client.publish(SENSOR_TOPIC, JSON.stringify(payload), { qos: 1 }, (err) => {
      if (err) {
        console.error('\x1b[31m%s\x1b[0m', '❌ [SIMULATOR]: Failed to publish data');
      } else {
        console.log(
          '\x1b[36m%s\x1b[0m',
          `📊 [SIMULATOR]: Published → Moisture: ${payload.data.soilMoisture}% | pH: ${payload.data.pH} | Temp: ${payload.data.temperature}°C | Valve: ${payload.data.valveState}`
        );
      }
    });
  }, 5000);
}

process.on('SIGINT', () => {
  console.log('\x1b[33m%s\x1b[0m', '\n⚠️  [SIMULATOR]: Shutting down gracefully...');
  client.end();
  process.exit(0);
});
