/**
 * @file       alertEngine.ts
 * @module     SensorService/Services
 * @description Background worker that audits soil sensors and device heartbeats, raising alerts for anomalies.
 */

import prisma from '../infrastructure/database/prismaClient';
import { logger } from '../utils/logger';

export class AlertEngine {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  start(intervalMs: number = 60000): void {
    logger.info('Starting Alert Engine background worker...');
    this.intervalId = setInterval(() => this.runAudit(), intervalMs);
    this.runAudit().catch((err) => {
      logger.error(`[AlertEngine] Initial audit failed: ${err.message}`);
    });
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Alert Engine background worker stopped.');
    }
  }

  private async runAudit(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    logger.info('[AlertEngine] Auditing device statuses and telemetry bounds...');
    try {
      const zones = await prisma.zone.findMany({
        include: {
          user: true,
          devices: {
            include: {
              readings: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      });

      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

      for (const zone of zones) {
        const userId = zone.userId;
        const ownerName = zone.user.fullName;

        for (const device of zone.devices) {
          // 1. Check Device Heartbeat
          if (device.lastSeen && device.lastSeen < thirtyMinutesAgo && device.status !== 'OFFLINE') {
            logger.warn(`[AlertEngine] Device ${device.name || device.macAddress} went offline.`);
            
            // Update device status to OFFLINE
            await prisma.device.update({
              where: { id: device.id },
              data: { status: 'OFFLINE' },
            });

            // Send System Notification
            const title = `Qurilma aloqadan uzildi: ${device.name || device.macAddress}`;
            const message = `Hurmatli ${ownerName}, sizning "${zone.name}" zonangizdagi "${device.name || device.macAddress}" qurilmangiz oxirgi 30 daqiqa ichida ma'lumot yubormadi va OFFLINE holatga o'tdi.`;
            
            if (await this.shouldSendNotification(userId, 'SYSTEM', title)) {
              await prisma.notification.create({
                data: {
                  userId,
                  type: 'SYSTEM',
                  title,
                  message,
                },
              });
            }
          }

          // 2. Check Telemetry Bounds (only if device has recent readings)
          const latestReading = device.readings[0];
          if (latestReading && latestReading.createdAt > thirtyMinutesAgo) {
            // Check Soil Moisture (Moisture < 20% is critical dry)
            if (latestReading.moisture !== null && latestReading.moisture < 20) {
              const title = `Kritik quruqlik: ${zone.name}`;
              const message = `Diqqat! "${zone.name}" zonangizdagi namlik ko'rsatkichi juda past: ${latestReading.moisture}%. Ekinlarni zudlik bilan sug'orish tavsiya etiladi.`;

              if (await this.shouldSendNotification(userId, 'ALERT', title)) {
                await prisma.notification.create({
                  data: {
                    userId,
                    type: 'ALERT',
                    title,
                    message,
                  },
                });
              }
            }

            // Check Soil pH (pH < 5.5 or pH > 8.0)
            if (latestReading.ph !== null && (latestReading.ph < 5.5 || latestReading.ph > 8.0)) {
              const title = `Tuproq kislotaligi me'yordan chiqdi: ${zone.name}`;
              const message = `Diqqat! "${zone.name}" zonangizda tuproq pH darajasi me'yordan chetlashdi: ${latestReading.ph}. Agrotexnik choralar ko'rish tavsiya etiladi.`;

              if (await this.shouldSendNotification(userId, 'ALERT', title)) {
                await prisma.notification.create({
                  data: {
                    userId,
                    type: 'ALERT',
                    title,
                    message,
                  },
                });
              }
            }
          }
        }
      }
    } catch (error: any) {
      logger.error(`[AlertEngine] Audit error: ${error.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  private async shouldSendNotification(userId: string, type: 'SYSTEM' | 'ALERT', title: string): Promise<boolean> {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        type,
        title,
        createdAt: {
          gte: twoHoursAgo,
        },
      },
    });
    return !existing;
  }
}
