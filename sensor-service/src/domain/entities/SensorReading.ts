export interface SensorReading {
  id: string;
  deviceId: string;
  moisture: number | null;
  temperature: number | null;
  ph: number | null;
  ec: number | null;
  npk: number | null;
  battery: number | null;
  createdAt: Date;
}

export interface CreateSensorReadingDTO {
  deviceId: string;
  moisture?: number | null;
  temperature?: number | null;
  ph?: number | null;
  ec?: number | null;
  npk?: number | null;
  battery?: number | null;
  timestamp?: Date;
}
