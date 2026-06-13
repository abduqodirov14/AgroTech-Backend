"use strict";
/**
 * @file       farmStatusService.ts
 * @module     FarmService/Services
 * @description Provides high-level summary KPIs and real-time status details of the agricultural zones and deployed IoT devices.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchFarmOverviewForUser = fetchFarmOverviewForUser;
const prismaClient_1 = __importDefault(require("../infrastructure/database/prismaClient"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Aggregates farm metrics including zones, devices, active irrigation runs, and alert counts.
 * @param authenticatedUserId The unique identifier of the user invoking the status fetch.
 */
async function fetchFarmOverviewForUser(authenticatedUserId) {
    logger_1.default.info('Fetching farm overview status metrics from database', { authenticatedUserId });
    const userZones = await prismaClient_1.default.zone.findMany({
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
        let latestReadingForZone = null;
        for (const deviceRecord of devicesInZone) {
            if (deviceRecord.status === 'ONLINE') {
                onlineDevicesCount++;
            }
            else {
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
    const activeIrrigationsCount = await prismaClient_1.default.irrigationEvent.count({
        where: {
            zone: { userId: authenticatedUserId },
            status: 'RUNNING',
            endedAt: null,
        },
    });
    const SEVEN_DAYS_IN_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;
    const pastSevenDaysTimestamp = new Date(Date.now() - SEVEN_DAYS_IN_MILLISECONDS);
    const recentAlertsCount = await prismaClient_1.default.notification.count({
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
//# sourceMappingURL=farmStatusService.js.map