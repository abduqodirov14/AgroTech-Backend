const mqtt = require('mqtt');
const http = require('http');

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
const SENSOR_TOPIC = 'v1/sensors/data';
const IRRIGATION_COMMAND_TOPIC = 'v1/irrigation/command';
const API_BASE = process.env.IRRIGATION_API || 'http://localhost:3005/api/v1';
const DEVICE_MAC = process.env.DEVICE_MAC || '24:0A:C4:00:11:22';

const client = mqtt.connect(MQTT_BROKER, {
  clientId: `virtual_sensor_${Math.random().toString(16).slice(2, 10)}`,
  clean: true,
  reconnectPeriod: 1000,
});

let valveState = 'OFF';

const zones = [
  { id: 'ZONE-01', name: 'Gilos bog\'i' },
  { id: 'ZONE-02', name: 'Pomidor issiqxonasi' },
  { id: 'ZONE-03', name: 'Bog\' yonidagi maydon' },
  { id: 'ZONE-04', name: 'Shimoliy dalalar' },
];

function buildReadings(baseMoisture) {
  return [
    { sensor_pin: 'A0', type: 'soil_moisture_shallow', value: Math.max(20, Math.min(85, Math.round(baseMoisture + (Math.random() * 6 - 3)))) },
    { sensor_pin: 'A3', type: 'soil_moisture_deep', value: Math.max(25, Math.min(90, Math.round(baseMoisture + 4 + (Math.random() * 6 - 3)))) },
  ];
}

function uploadReadings(deviceMac, readings) {
  const payload = JSON.stringify({ device_mac: deviceMac, readings });
  const options = {
    hostname: 'localhost',
    port: 3005,
    path: '/api/v1/sensors/upload',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      console.log(`\x1b[36m%s\x1b[0m`, `⬆️  [UPLOAD] ${deviceMac} -> ${res.statusCode}: ${body}`);
    });
  });

  req.on('error', (err) => {
    console.log('\x1b[31m%s\x1b[0m', `❌ [UPLOAD] ${deviceMac} -> ${err.message}`);
  });

  req.write(payload);
  req.end();
}

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

function startSensorSimulation() {
  console.log('\x1b[35m%s\x1b[0m', '🔄 [SIMULATOR]: Starting sensor data stream...\n');
  let tick = 0;

  setInterval(() => {
    const baseMoisture = 45 + Math.sin(tick / 8) * 18;
    tick += 1;
    zones.forEach((zone) => {
      const readings = buildReadings(baseMoisture);
      console.log(
        '\x1b[36m%s\x1b[0m',
        `📊 [SIMULATOR] ${zone.id} moisture_0_30=${readings[0].value} moisture_30_60=${readings[1].value} valve=${valveState}`
      );
      uploadReadings(zone.id.replace('ZONE-', 'SN-AGRO-0'), readings);
    });
  }, 5000);
}

process.on('SIGINT', () => {
  console.log('\x1b[33m%s\x1b[0m', '\n⚠️  [SIMULATOR]: Shutting down gracefully...');
  client.end();
  process.exit(0);
});
