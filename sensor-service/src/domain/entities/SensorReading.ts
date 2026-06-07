export interface SensorReading {
  id: string;
  sensorId: string;
  soilMoisture: number;
  pH: number;
  temperature: number;
  valveState: string;
  timestamp: Date;
  createdAt: Date;
}

export interface CreateSensorReadingDTO {
  sensorId: string;
  soilMoisture: number;
  pH: number;
  temperature: number;
  valveState: string;
  timestamp: Date;
}
