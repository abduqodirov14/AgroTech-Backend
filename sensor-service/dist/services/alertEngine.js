"use strict";
/**
 * @file       alertEngine.ts
 * @module     SensorService/Services
 * @description Background worker that audits soil sensors and device heartbeats, raising alerts for anomalies.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertEngine = void 0;
const prismaClient_1 = __importDefault(require("../infrastructure/database/prismaClient"));
const logger_1 = require("../utils/logger");
class AlertEngine {
    intervalId = null;
    start(intervalMs = 60000) {
        logger_1.logger.info('Starting Alert Engine background worker...');
        this.intervalId = setInterval(() => this.runAudit(), intervalMs);
        // Run initial audit asynchronously
        this.runAudit().catch((err) => {
            logger_1.logger.error(`[AlertEngine] Initial audit failed: ${err.message}`);
        });
    }
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            logger_1.logger.info('Alert Engine background worker stopped.');
        }
    }
    async runAudit() {
        logger_1.logger.info('[AlertEngine] Auditing device statuses and telemetry bounds...');
        try {
            const zones = await prismaClient_1.default.zone.findMany({
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
                        logger_1.logger.warn(`[AlertEngine] Device ${device.name || device.macAddress} went offline.`);
                        // Update device status to OFFLINE
                        await prismaClient_1.default.device.update({
                            where: { id: device.id },
                            data: { status: 'OFFLINE' },
                        });
                        // Send System Notification
                        const title = `Qurilma aloqadan uzildi: ${device.name || device.macAddress}`;
                        const message = `Hurmatli ${ownerName}, sizning "${zone.name}" zonangizdagi "${device.name || device.macAddress}" qurilmangiz oxirgi 30 daqiqa ichida ma'lumot yubormadi va OFFLINE holatga o'tdi.`;
                        if (await this.shouldSendNotification(userId, 'SYSTEM', title)) {
                            await prismaClient_1.default.notification.create({
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
                                await prismaClient_1.default.notification.create({
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
                                await prismaClient_1.default.notification.create({
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
        }
        catch (error) {
            logger_1.logger.error(`[AlertEngine] Audit error: ${error.message}`);
        }
    }
    async shouldSendNotification(userId, type, title) {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const existing = await prismaClient_1.default.notification.findFirst({
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
exports.AlertEngine = AlertEngine;
