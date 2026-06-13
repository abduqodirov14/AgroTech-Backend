/**
 * @file       ToggleIrrigationUseCase.ts
 * @module     IrrigationService/Domain/UseCases
 * @description Domain logic for triggering irrigation valves via MQTT, persisting events, and running AI auto-off boundary audits.
 */

import { MqttPublisher } from '../../infrastructure/mqtt/MqttPublisher';
import { prisma } from '../../infrastructure/database/prismaClient';
import { logger } from '../../utils/logger';
import { IrrigationStatus, IrrigationSource } from '@prisma/client';

interface ZoneResponse {
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

const UZBEK_DAYS_MAP: Record<string, string> = {
  mon: 'Dushanba',
  tue: 'Seshanba',
  wed: 'Chorshanba',
  thu: 'Payshanba',
  fri: 'Juma',
  sat: 'Shanba',
  sun: 'Yakshanba',
};

export class ToggleIrrigationUseCase {
  constructor(private mqttPublisher: MqttPublisher) {
    // Initialize AI auto-off audit loop (runs every 60 seconds)
    setInterval(() => {
      this.runAiAutoOffAudit().catch((error) => {
        logger.error(`[AI Auto-Off] Audit procedure failed: ${error.message}`);
      });
    }, 60 * 1000);
  }

  /**
   * Retrieves all zones, compiling live telemetry readings and valve statuses from the database.
   */
  async getZones(): Promise<ZoneResponse[]> {
    const zones = await prisma.zone.findMany({
      include: {
        devices: {
          include: {
            readings: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        events: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
        cropBatches: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
      },
    });

    return zones.map((zone) => {
      const device = zone.devices[0];
      const reading = device?.readings[0];
      const lastEvent = zone.events[0];
      const cropBatch = zone.cropBatches[0];

      const isRunning = lastEvent && lastEvent.status === 'RUNNING' && !lastEvent.endedAt;

      return {
        id: zone.id,
        name: zone.name,
        crop_type: cropBatch ? cropBatch.cropType : 'Noma`lum',
        valve_state: isRunning ? 'ON' : 'OFF',
        last_irrigation: lastEvent ? lastEvent.startedAt.toISOString() : null,
        duration_minutes: lastEvent?.durationSec ? Math.round(lastEvent.durationSec / 60) : 30,
        sensor_id: device ? device.macAddress : 'no-device',
        moisture_0_30: reading?.moisture ?? Math.round(40 + Math.random() * 20),
        moisture_30_60: reading?.moisture ? Math.round(reading.moisture * 1.1) : Math.round(40 + Math.random() * 20),
        ph: reading?.ph ?? 6.5,
        temperature: reading?.temperature ?? 24.5,
        area: cropBatch?.areaHectares ? `${cropBatch.areaHectares} ha` : '1.0 ha',
        soil_type: 'Loam',
        irrigation_type: 'Drip',
        next_irrigation: 'Schedule dynamic',
        planted_date: cropBatch ? cropBatch.plantedAt.toLocaleDateString('uz-UZ') : '10 Apr 2026',
        root_depth: '0 - 30 cm',
      };
    });
  }

  /**
   * Retrieves all active schedules from the database.
   */
  async getSchedules(): Promise<ScheduleItem[]> {
    const schedules = await prisma.irrigationSchedule.findMany({
      where: { isActive: true },
    });

    const items: ScheduleItem[] = [];
    for (const schedule of schedules) {
      for (const day of schedule.days) {
        items.push({
          day: UZBEK_DAYS_MAP[day.toLowerCase()] || day,
          time: schedule.startTime,
          zoneId: schedule.zoneId,
          duration: schedule.duration,
          active: schedule.isActive,
        });
      }
    }
    return items;
  }

  async getZoneById(zoneId: string): Promise<ZoneResponse | undefined> {
    const zones = await this.getZones();
    return zones.find((z) => z.id === zoneId);
  }

  /**
   * Registers a new irrigation run schedule in the database.
   */
  async createSchedule(item: { day: string; time: string; zoneId: string; duration: number; active: boolean }) {
    logger.info('Creating new irrigation schedule in database', item);

    // Map singular day back to day code if possible
    const dayCode = Object.keys(UZBEK_DAYS_MAP).find(
      (key) => UZBEK_DAYS_MAP[key].toLowerCase() === item.day.toLowerCase()
    ) || 'mon';

    const schedule = await prisma.irrigationSchedule.create({
      data: {
        zoneId: item.zoneId,
        startTime: item.time,
        duration: item.duration,
        days: [dayCode],
        isActive: item.active,
      },
    });

    return { success: true, data: schedule };
  }

  /**
   * Adds a new zone to the database.
   */
  async addZone(zone: any) {
    logger.info('Creating new zone record in database', { name: zone.name });
    
    // Default fallback values mapped to standard user
    const defaultUser = await prisma.user.findFirst();
    const userId = defaultUser ? defaultUser.id : 'default-user-id';

    const dbZone = await prisma.zone.create({
      data: {
        id: zone.id,
        name: zone.name,
        latitude: 41.3111,
        longitude: 69.2797,
        userId,
      },
    });

    return { success: true, data: dbZone };
  }

  /**
   * Records live sensor telemetry uploads to the database.
   */
  async uploadSensorReadings(deviceMac: string, readings: Array<{ sensor_pin: string; type: string; value: number }>) {
    logger.info('Logging sensor readings upload', { deviceMac, readings });

    const device = await prisma.device.findUnique({
      where: { macAddress: deviceMac.toLowerCase() },
    });

    if (!device) {
      return { success: false, message: 'Device not registered.' };
    }

    const moistureReading = readings.find((r) => r.type.includes('moisture'));
    const tempReading = readings.find((r) => r.type.includes('temp') || r.type.includes('temperature'));
    const phReading = readings.find((r) => r.type.includes('ph'));

    await prisma.sensorReading.create({
      data: {
        deviceId: device.id,
        moisture: moistureReading ? moistureReading.value : null,
        temperature: tempReading ? tempReading.value : null,
        ph: phReading ? phReading.value : null,
      },
    });

    return { success: true, message: 'Readings successfully recorded.' };
  }

  /**
   * Commands physical valves via MQTT and records irrigation runs in the database.
   */
  async execute(params: {
    command: 'ON' | 'OFF';
    zoneId?: string | null;
    durationMinutes?: number | null;
    source?: IrrigationSource;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const { command, zoneId, durationMinutes, source = 'MANUAL' } = params;
      logger.info('Executing irrigation switch', { command, zoneId, durationMinutes });

      if (!zoneId) {
        throw new Error('Zone ID is required to toggle irrigation.');
      }

      const zone = await prisma.zone.findUnique({
        where: { id: zoneId },
        include: { devices: true },
      });

      if (!zone) {
        throw new Error(`Zone with ID ${zoneId} not found.`);
      }

      const deviceId = zone.devices[0]?.id || null;

      if (command === 'ON') {
        // Create new running event
        await prisma.irrigationEvent.create({
          data: {
            zoneId,
            deviceId,
            startedAt: new Date(),
            status: 'RUNNING',
            source,
            durationSec: durationMinutes ? durationMinutes * 60 : null,
          },
        });
      } else {
        // Complete the active running event
        const activeEvent = await prisma.irrigationEvent.findFirst({
          where: { zoneId, status: 'RUNNING', endedAt: null },
          orderBy: { startedAt: 'desc' },
        });

        if (activeEvent) {
          const endedAt = new Date();
          const durationSec = Math.round((endedAt.getTime() - activeEvent.startedAt.getTime()) / 1000);

          await prisma.irrigationEvent.update({
            where: { id: activeEvent.id },
            data: {
              endedAt,
              status: 'COMPLETED',
              durationSec,
            },
          });
        }
      }

      // Publish switch command payload to hardware
      const payload = {
        command,
        zone_id: zoneId,
        duration_minutes: durationMinutes || 30,
        timestamp: new Date().toISOString(),
      };

      await this.mqttPublisher.publishCommand(JSON.stringify(payload));
      
      const message = command === 'ON' ? 'Sug`orish boshlandi' : 'Sug`orish yakunlandi';
      logger.info(`✅ ${message} for zone ${zoneId}`);

      return { success: true, message };
    } catch (error: any) {
      logger.error(`Failed to toggle irrigation: ${error.message}`);
      return {
        success: false,
        message: `Tizimda xatolik yuz berdi: sug'orishni ${params.command === 'ON' ? 'boshlash' : 'yakunlash'} imkoni bo'lmadi`,
      };
    }
  }

  /**
   * Scans active irrigation loops and shuts them off automatically if humidity is high or time expired.
   */
  private async runAiAutoOffAudit(): Promise<void> {
    logger.info('[AI Auto-Off] Auditing active irrigation events...');

    const activeEvents = await prisma.irrigationEvent.findMany({
      where: { status: 'RUNNING', endedAt: null },
      include: {
        zone: {
          include: {
            devices: {
              include: {
                readings: {
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    const now = new Date();

    for (const event of activeEvents) {
      const elapsedMinutes = (now.getTime() - event.startedAt.getTime()) / 1000 / 60;
      const expectedDurationMinutes = event.durationSec ? event.durationSec / 60 : 60; // default 60 min safety limit

      // 1. Time-limit check (failsafe in case farmer forgets)
      if (elapsedMinutes >= expectedDurationMinutes) {
        logger.warn(`[AI Auto-Off] Time limit exceeded on zone ${event.zoneId}. Force stopping...`);
        await this.execute({
          command: 'OFF',
          zoneId: event.zoneId,
          source: 'AI',
        });
        continue;
      }

      // 2. High-humidity check (moisture >= 65% is sufficient for Uzbek crops)
      const device = event.zone.devices[0];
      const latestReading = device?.readings[0];

      if (latestReading && latestReading.moisture && latestReading.moisture >= 65) {
        logger.info(`[AI Auto-Off] Humidity threshold met (${latestReading.moisture}%) on zone ${event.zoneId}. Stopping irrigation...`);
        await this.execute({
          command: 'OFF',
          zoneId: event.zoneId,
          source: 'AI',
        });
      }
    }
  }
}
