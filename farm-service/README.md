# Farm Service — AgroMind

## Models

- `User`: Farmer or agronomist account
- `Zone`: Named field area belonging to a user
- `Device`: ESP32 hardware unit linked to a zone
- `SensorReading`: Incoming telemetry from ESP32
- `IrrigationEvent`: Log of each irrigation start/stop

## Key Relationships

- User 1──∞ Zone
- User 1──∞ Device
- Zone 1──∞ Device
- Zone 1──∞ IrrigationEvent
- Device 1──∞ SensorReading

## Critical Indexes

- `sensor_readings(deviceId, createdAt)` — top queries by device + time range
- `sensor_readings(createdAt)` — monitoring dashboard last reading
- `devices(mac_address)` unique — ESP32 identity at upload time
