import { MqttPublisher } from '../../infrastructure/mqtt/MqttPublisher';
import { logger } from '../../utils/logger';

interface Zone {
  id: string;
  name: string;
  crop_type: string;
  valve_state: 'ON' | 'OFF';
  last_irrigation: string | null;
  duration_minutes: number;
  sensor_id: string;
  moisture_0_30: number;
  moisture_30_60: number;
  ph: number;
  temperature: number;
  area: string;
  soil_type: string;
  irrigation_type: string;
  next_irrigation: string;
  planted_date: string;
  root_depth: string;
}

interface ScheduleItem {
  day: string;
  time: string;
  zoneId: string;
  duration: number;
  active: boolean;
}

export class ToggleIrrigationUseCase {
  private zones: Zone[] = [
    {
      id: 'ZONE-01',
      name: 'Gilos bog‘i',
      crop_type: 'Olcha',
      valve_state: 'OFF',
      last_irrigation: null,
      duration_minutes: 30,
      sensor_id: 'SN-AGRO-001',
      moisture_0_30: 38,
      moisture_30_60: 42,
      ph: 6.5,
      temperature: 24.2,
      area: '2.5 ha',
      soil_type: 'Loam',
      irrigation_type: 'Drip',
      next_irrigation: 'Today, 18:30',
      planted_date: '10 Apr 2025',
      root_depth: '0 - 30 cm',
    },
    {
      id: 'ZONE-02',
      name: 'Pomidor issiqxonasi',
      crop_type: 'Pomidor',
      valve_state: 'OFF',
      last_irrigation: null,
      duration_minutes: 40,
      sensor_id: 'SN-AGRO-002',
      moisture_0_30: 45,
      moisture_30_60: 48,
      ph: 6.8,
      temperature: 25.1,
      area: '2.3 ha',
      soil_type: 'Sandy Loam',
      irrigation_type: 'Drip',
      next_irrigation: 'Today, 19:15',
      planted_date: '12 Apr 2025',
      root_depth: '0 - 30 cm',
    },
    {
      id: 'ZONE-03',
      name: 'Bog‘ yonidagi maydon',
      crop_type: 'Sabzavotlar',
      valve_state: 'OFF',
      last_irrigation: null,
      duration_minutes: 35,
      sensor_id: 'SN-AGRO-003',
      moisture_0_30: 52,
      moisture_30_60: 55,
      ph: 6.4,
      temperature: 23.8,
      area: '1.8 ha',
      soil_type: 'Loam',
      irrigation_type: 'Sprinkler',
      next_irrigation: 'Tomorrow, 06:00',
      planted_date: '15 Apr 2025',
      root_depth: '0 - 30 cm',
    },
    {
      id: 'ZONE-04',
      name: 'Shimoliy dalalar',
      crop_type: 'Bug‘doy',
      valve_state: 'OFF',
      last_irrigation: null,
      duration_minutes: 45,
      sensor_id: 'SN-AGRO-004',
      moisture_0_30: 70,
      moisture_30_60: 68,
      ph: 6.2,
      temperature: 22.5,
      area: '2.0 ha',
      soil_type: 'Clay Loam',
      irrigation_type: 'Drip',
      next_irrigation: 'Tomorrow, 06:15',
      planted_date: '08 Apr 2025',
      root_depth: '0 - 30 cm',
    },
  ];

  private schedules: ScheduleItem[] = [
    { day: 'Dushanba', time: '05:00', zoneId: 'ZONE-01', duration: 30, active: true },
    { day: 'Payshanba', time: '05:00', zoneId: 'ZONE-02', duration: 35, active: true },
    { day: 'Seshanba', time: '17:00', zoneId: 'ZONE-03', duration: 40, active: true },
    { day: 'Juma', time: '06:30', zoneId: 'ZONE-01', duration: 25, active: true },
  ];

  constructor(private mqttPublisher: MqttPublisher) {}

  async getZones(): Promise<Zone[]> {
    return this.zones.map((z) => ({
      ...z,
      moisture_0_30: Math.round(40 + Math.random() * 35),
      moisture_30_60: Math.round(40 + Math.random() * 35),
      temperature: Math.round((22 + Math.random() * 4) * 10) / 10,
      ph: Math.round((6.0 + Math.random() * 1.0) * 100) / 100,
    }));
  }

  async getSchedules() {
    return this.schedules;
  }

  async createSchedule(item: ScheduleItem) {
    this.schedules.push(item);
    logger.info('📅 Schedule created', item);
    return { success: true, data: item };
  }

  addZone(zone: Zone) {
    this.zones.push(zone);
    logger.info('➕ Zone added', zone);
    return { success: true, data: zone };
  }

  async uploadSensorReadings(deviceMac: string, readings: Array<{ sensor_pin: string; type: string; value: number }>) {
    const zone = this.zones.find((z) => z.sensor_id === deviceMac);
    if (!zone) {
      return { success: false, message: 'Zone not found for device' };
    }
    readings.forEach((reading) => {
      if (reading.type === 'soil_moisture_shallow') {
        zone.moisture_0_30 = reading.value;
      } else if (reading.type === 'soil_moisture_deep') {
        zone.moisture_30_60 = reading.value;
      }
    });
    logger.info('📊 Sensor readings updated', { deviceMac, readings });
    return { success: true, message: 'Readings updated' };
  }

  async execute(params: { command: 'ON' | 'OFF'; zoneId?: string | null; durationMinutes?: number | null }): Promise<{ success: boolean; message: string }> {
    try {
      const { command, zoneId, durationMinutes } = params;
      const targetZone = this.zones.find((z) => z.id === zoneId);
      if (targetZone) {
        targetZone.valve_state = command;
        targetZone.last_irrigation = new Date().toISOString();
        if (typeof durationMinutes === 'number') targetZone.duration_minutes = durationMinutes;
      }

      const payload: Record<string, unknown> = { command, timestamp: new Date().toISOString() };
      if (zoneId) payload.zone_id = zoneId;
      if (typeof durationMinutes === 'number') payload.duration_minutes = durationMinutes;

      const commandStr = JSON.stringify(payload);
      await this.mqttPublisher.publishCommand(commandStr);
      const message = command === 'ON' ? 'Irrigation started' : 'Irrigation stopped';
      logger.info(`✅ ${message}`, payload);

      return {
        success: true,
        message,
      };
    } catch (error: any) {
      logger.error(`Failed to toggle irrigation: ${error.message}`);
      return {
        success: false,
        message: `Failed to ${params.command === 'ON' ? 'start' : 'stop'} irrigation`,
      };
    }
  }
}
