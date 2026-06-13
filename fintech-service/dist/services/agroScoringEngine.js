"use strict";
/**
 * @file       agroScoringEngine.ts
 * @module     FintechService/Services
 * @description The core engine that evaluates farmer creditworthiness based on sensor activity, irrigation compliance, alert rate, and data consistency.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeFarmerCreditScore = computeFarmerCreditScore;
const prismaClient_1 = __importDefault(require("../infrastructure/database/prismaClient"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Recalculates the farmer's credit scoring metric based on IoT telemetry and operations.
 * @param authenticatedUserId The user whose score is being evaluated.
 * @param period Billing/scoring period key.
 */
async function computeFarmerCreditScore(authenticatedUserId, period) {
    logger_1.default.info('Computing credit score using AgroScoring algorithm', { authenticatedUserId, period });
    const currentDate = new Date();
    const targetPeriod = period || `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const THIRTY_DAYS_IN_MILLISECONDS = 30 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgoDate = new Date(Date.now() - THIRTY_DAYS_IN_MILLISECONDS);
    const userDevices = await prismaClient_1.default.device.findMany({
        where: { zone: { userId: authenticatedUserId } },
        select: { id: true },
    });
    const deviceIds = userDevices.map((device) => device.id);
    let sensorUptimePercent = 0;
    let consistencyDaysCount = 0;
    if (deviceIds.length > 0) {
        const sensorReadings = await prismaClient_1.default.sensorReading.findMany({
            where: {
                deviceId: { in: deviceIds },
                createdAt: { gte: thirtyDaysAgoDate },
            },
            select: { createdAt: true },
        });
        const uniqueDaysWithReadings = new Set();
        for (const reading of sensorReadings) {
            uniqueDaysWithReadings.add(reading.createdAt.toISOString().slice(0, 10));
        }
        const activeDaysCount = uniqueDaysWithReadings.size;
        sensorUptimePercent = parseFloat(((activeDaysCount / 30) * 100).toFixed(2));
        const sortedActiveDays = Array.from(uniqueDaysWithReadings).sort();
        let currentStreak = 0;
        let longestStreak = 0;
        let previousDayTime = 0;
        for (const dayString of sortedActiveDays) {
            const currentDayTime = new Date(dayString).getTime();
            const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
            if (currentStreak === 0) {
                currentStreak = 1;
            }
            else if (currentDayTime - previousDayTime <= ONE_DAY_IN_MS + 2 * 60 * 60 * 1000) {
                currentStreak++;
            }
            else {
                currentStreak = 1;
            }
            if (currentStreak > longestStreak) {
                longestStreak = currentStreak;
            }
            previousDayTime = currentDayTime;
        }
        consistencyDaysCount = longestStreak;
    }
    let irrigationExecutionPercent = 100;
    const userZones = await prismaClient_1.default.zone.findMany({
        where: { userId: authenticatedUserId },
        select: { id: true },
    });
    const zoneIds = userZones.map((z) => z.id);
    if (zoneIds.length > 0) {
        const activeSchedules = await prismaClient_1.default.irrigationSchedule.findMany({
            where: {
                zoneId: { in: zoneIds },
                isActive: true,
            },
        });
        if (activeSchedules.length > 0) {
            let expectedRunsCount = 0;
            for (const schedule of activeSchedules) {
                const daysPerWeek = schedule.days.length;
                const runsIn30Days = Math.ceil((daysPerWeek * 30) / 7);
                expectedRunsCount += runsIn30Days;
            }
            const completedEventsCount = await prismaClient_1.default.irrigationEvent.count({
                where: {
                    zoneId: { in: zoneIds },
                    status: 'COMPLETED',
                    createdAt: { gte: thirtyDaysAgoDate },
                },
            });
            if (expectedRunsCount > 0) {
                irrigationExecutionPercent = Math.min(100, parseFloat(((completedEventsCount / expectedRunsCount) * 100).toFixed(2)));
            }
        }
    }
    const alertCount = await prismaClient_1.default.notification.count({
        where: {
            userId: authenticatedUserId,
            type: 'ALERT',
            createdAt: { gte: thirtyDaysAgoDate },
        },
    });
    const alertPenaltyPercent = Math.min(100, alertCount * 10);
    const alertScorePercent = 100 - alertPenaltyPercent;
    const sensorUptimeScore = sensorUptimePercent / 100;
    const irrigationScore = irrigationExecutionPercent / 100;
    const alertScore = alertScorePercent / 100;
    const consistencyScore = Math.min(30, consistencyDaysCount) / 30;
    const rawWeightedScore = sensorUptimeScore * 0.35 +
        irrigationScore * 0.30 +
        alertScore * 0.20 +
        consistencyScore * 0.15;
    const finalScore = parseFloat((1.0 + 4.0 * rawWeightedScore).toFixed(2));
    await prismaClient_1.default.agroScore.upsert({
        where: {
            userId_period: {
                userId: authenticatedUserId,
                period: targetPeriod,
            },
        },
        update: {
            score: finalScore,
            sensorUptime: sensorUptimePercent,
            irrigationScore: irrigationExecutionPercent,
            alertPenalty: alertPenaltyPercent,
        },
        create: {
            userId: authenticatedUserId,
            score: finalScore,
            sensorUptime: sensorUptimePercent,
            irrigationScore: irrigationExecutionPercent,
            alertPenalty: alertPenaltyPercent,
            period: targetPeriod,
        },
    });
    return {
        score: finalScore,
        sensorUptimePercent,
        irrigationExecutionPercent,
        alertPenaltyPercent,
        consistencyDaysCount,
        period: targetPeriod,
        metrics: {
            uptimeWeight: 0.35,
            irrigationWeight: 0.30,
            alertWeight: 0.20,
            consistencyWeight: 0.15,
        },
    };
}
//# sourceMappingURL=agroScoringEngine.js.map