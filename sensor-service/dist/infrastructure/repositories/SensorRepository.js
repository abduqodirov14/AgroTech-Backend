"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensorRepository = void 0;
const prismaClient_1 = __importDefault(require("../database/prismaClient"));
class SensorRepository {
    async create(data) {
        return prismaClient_1.default.sensorReading.create({
            data: {
                deviceId: data.deviceId,
                moisture: data.moisture ?? null,
                temperature: data.temperature ?? null,
                ph: data.ph ?? null,
                ec: data.ec ?? null,
                npk: data.npk ?? null,
                battery: data.battery ?? null,
                createdAt: data.timestamp ?? new Date(),
            },
        });
    }
    async findRecentByDevice(deviceId, limit) {
        return prismaClient_1.default.sensorReading.findMany({
            where: { deviceId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
    async findLatestByDevice(deviceId) {
        return prismaClient_1.default.sensorReading.findFirst({
            where: { deviceId },
            orderBy: { createdAt: 'desc' },
        });
    }
}
exports.SensorRepository = SensorRepository;
