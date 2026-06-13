"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceRepository = void 0;
const prismaClient_1 = __importDefault(require("../database/prismaClient"));
const client_1 = require("@prisma/client");
class DeviceRepository {
    async findByMac(macAddress) {
        return prismaClient_1.default.device.findUnique({
            where: { macAddress },
            include: { zone: true },
        });
    }
    async findById(id) {
        return prismaClient_1.default.device.findUnique({
            where: { id },
            include: { zone: true },
        });
    }
    async updateStatus(id, status) {
        return prismaClient_1.default.device.update({
            where: { id },
            data: { status },
        });
    }
    async updateSecretKey(id, secretKey) {
        return prismaClient_1.default.device.update({
            where: { id },
            data: { secretKey },
        });
    }
    async linkToUserAndZone(id, userId, zoneId) {
        return prismaClient_1.default.device.update({
            where: { id },
            data: {
                userId,
                zoneId,
                status: client_1.DeviceStatus.ONLINE,
            },
        });
    }
    async create(data) {
        return prismaClient_1.default.device.create({
            data: {
                macAddress: data.macAddress,
                secretKey: data.secretKey,
                name: data.name ?? null,
                userId: data.userId ?? null,
                zoneId: data.zoneId ?? null,
                status: client_1.DeviceStatus.OFFLINE,
            },
        });
    }
}
exports.DeviceRepository = DeviceRepository;
//# sourceMappingURL=DeviceRepository.js.map