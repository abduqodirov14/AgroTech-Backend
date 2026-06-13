/**
 * @file       farmStatusService.ts
 * @module     FarmService/Services
 * @description Provides high-level summary KPIs and real-time status details of the agricultural zones and deployed IoT devices.
 */

import prismaClient from '../infrastructure/database/prismaClient';
import farmServiceLogger from '../utils/logger';

export interface FarmOverviewStatus {
  totalZonesCount: number;
  totalDevicesCount: number;
  onlineDevicesCount: number;
  offlineDevicesCount: number;
  activeIrrigationsCount: number;
  recentAlertsCount: number;
  zoneSummaries: Array<{
    zoneId: string;
    zoneName: string;
    latitude: number;
    longitude: number;
    devicesCount: number;
    latestSensorReading: {
      moisture: number | null;
      temperature: number | null;
      ph: number | null;
      battery: number | null;
      recordedAt: Date | null;
    } | null;
  }>;
}

/**
 * Aggregates farm metrics including zones, devices, active irrigation runs, and alert counts.
 * @param authenticatedUserId The unique identifier of the user invoking the status fetch.
 */
export async function fetchFarmOverviewForUser(authenticatedUserId: string): Promise<FarmOverviewStatus> {
  farmServiceLogger.info('Fetching farm overview status metrics from database', { authenticatedUserId });

  const userZones = await prismaClient.zone.findMany({
    where: { userId: authenticatedUserId },
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
  });

  const totalZonesCount = userZones.length;
  let totalDevicesCount = 0;
  let onlineDevicesCount = 0;
  let offlineDevicesCount = 0;

  const zoneSummaries = [];

  for (const zoneRecord of userZones) {
    const devicesInZone = zoneRecord.devices;
    totalDevicesCount += devicesInZone.length;

    let latestReadingForZone: {
      moisture: number | null;
      temperature: number | null;
      ph: number | null;
      battery: number | null;
      createdAt: Date;
    } | null = null;

    for (const deviceRecord of devicesInZone) {
      if (deviceRecord.status === 'ONLINE') {
        onlineDevicesCount++;
      } else {
        offlineDevicesCount++;
      }

      const deviceLatestReading = deviceRecord.readings[0];
      if (!deviceLatestReading) {
        continue;
      }

      if (!latestReadingForZone || deviceLatestReading.createdAt > latestReadingForZone.createdAt) {
        latestReadingForZone = deviceLatestReading;
      }
    }

    zoneSummaries.push({
      zoneId: zoneRecord.id,
      zoneName: zoneRecord.name,
      latitude: zoneRecord.latitude,
      longitude: zoneRecord.longitude,
      devicesCount: devicesInZone.length,
      latestSensorReading: latestReadingForZone
        ? {
            moisture: latestReadingForZone.moisture,
            temperature: latestReadingForZone.temperature,
            ph: latestReadingForZone.ph,
            battery: latestReadingForZone.battery,
            recordedAt: latestReadingForZone.createdAt,
          }
        : null,
    });
  }

  const activeIrrigationsCount = await prismaClient.irrigationEvent.count({
    where: {
      zone: { userId: authenticatedUserId },
      status: 'RUNNING',
      endedAt: null,
    },
  });

  const SEVEN_DAYS_IN_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;
  const pastSevenDaysTimestamp = new Date(Date.now() - SEVEN_DAYS_IN_MILLISECONDS);

  const recentAlertsCount = await prismaClient.notification.count({
    where: {
      userId: authenticatedUserId,
      type: 'ALERT',
      isRead: false,
      createdAt: { gte: pastSevenDaysTimestamp },
    },
  });

  return {
    totalZonesCount,
    totalDevicesCount,
    onlineDevicesCount,
    offlineDevicesCount,
    activeIrrigationsCount,
    recentAlertsCount,
    zoneSummaries,
  };
}
