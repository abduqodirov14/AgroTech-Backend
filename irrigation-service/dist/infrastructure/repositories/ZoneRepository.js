"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZoneRepository = void 0;
const prismaClient_1 = require("../../infrastructure/database/prismaClient");
const client_1 = require("@prisma/client");
class ZoneRepository {
    async findAll() {
        const zones = await prismaClient_1.prisma.zone.findMany({
            include: {
                devices: {
                    select: {
                        id: true,
                        macAddress: true,
                        name: true,
                        status: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return zones;
    }
    async findById(id) {
        const zone = await prismaClient_1.prisma.zone.findUnique({
            where: { id },
            include: {
                devices: {
                    select: {
                        id: true,
                        macAddress: true,
                        name: true,
                        status: true,
                    },
                },
            },
        });
        return zone;
    }
    async findByUserId(userId) {
        const zones = await prismaClient_1.prisma.zone.findMany({
            where: { userId },
            include: {
                devices: {
                    select: {
                        id: true,
                        macAddress: true,
                        name: true,
                        status: true,
                    },
                },
            },
        });
        return zones;
    }
    async findByDeviceId(deviceId) {
        const zone = await prismaClient_1.prisma.zone.findFirst({
            where: {
                devices: {
                    some: { id: deviceId },
                },
            },
            include: {
                devices: {
                    where: { id: deviceId },
                    select: {
                        id: true,
                        macAddress: true,
                        name: true,
                        status: true,
                    },
                },
            },
        });
        return zone;
    }
    async create(data) {
        const zone = await prismaClient_1.prisma.zone.create({
            data: {
                name: data.name,
                latitude: data.latitude,
                longitude: data.longitude,
                userId: data.userId,
                devices: data.deviceId ? {
                    connect: { id: data.deviceId },
                } : undefined,
            },
            include: {
                devices: {
                    select: {
                        id: true,
                        macAddress: true,
                        name: true,
                        status: true,
                    },
                },
            },
        });
        return zone;
    }
    async updateValveState(zoneId, _valveState) {
        await prismaClient_1.prisma.device.updateMany({
            where: { zoneId },
            data: { status: client_1.DeviceStatus.ONLINE },
        });
    }
}
exports.ZoneRepository = ZoneRepository;
