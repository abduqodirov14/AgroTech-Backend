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
  moisture: number;
  ph: number;
  temperature: number;
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
      moisture: 38,
      ph: 6.5,
      temperature: 24.2,
    },
    {
      id: 'ZONE-02',
      name: 'Pomidor issiqxonasi',
      crop_type: 'Pomidor',
      valve_state: 'OFF',
      last_irrigation: null,
      duration_minutes: 40,
      sensor_id: 'SN-AGRO-002',
      moisture: 45,
      ph: 6.8,
      temperature: 25.1,
    },
    {
      id: 'ZONE-03',
      name: 'Bog‘ yonidagi maydon',
      crop_type: 'Sabzavotlar',
      valve_state: 'OFF',
      last_irrigation: null,
      duration_minutes: 35,
      sensor_id: 'SN-AGRO-003',
      moisture: 52,
      ph: 6.4,
      temperature: 23.8,
    },
    {
      id: 'ZONE-04',
      name: 'Shimoliy dalalar',
      crop_type: 'Bug‘doy',
      valve_state: 'OFF',
      last_irrigation: null,
      duration_minutes: 45,
      sensor_id: 'SN-AGRO-004',
      moisture: 70,
      ph: 6.2,
      temperature: 22.5,
    },
  ];

  constructor(private mqttPublisher: MqttPublisher) {}

  async getZones(): Promise<Zone[]> {
    return this.zones.map((z) => ({
      ...z,
      moisture: Math.round(40 + Math.random() * 35),
      temperature: Math.round((22 + Math.random() * 4) * 10) / 10,
      ph: Math.round((6.0 + Math.random() * 1.0) * 100) / 100,
    }));
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
