"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDevice = void 0;
const zod_1 = require("zod");
const prismaClient_1 = __importDefault(require("../../infrastructure/database/prismaClient"));
const deviceCrypto_1 = require("../../services/deviceCrypto");
const logger_1 = require("../../utils/logger");
const registerSchema = zod_1.z.object({
    macAddress: zod_1.z.string().min(1),
    plainSecret: zod_1.z.string().min(4),
    userId: zod_1.z.string().min(1),
    name: zod_1.z.string().optional(),
});
const registerDevice = async (req, res, next) => {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ success: false, error: parsed.error.issues[0]?.message || 'Validation failed' });
        }
        const { macAddress, plainSecret, userId, name } = parsed.data;
        const normalizedMac = macAddress.toLowerCase();
        const existing = await prismaClient_1.default.device.findUnique({
            where: { macAddress: normalizedMac },
            select: { id: true },
        });
        const secretHash = await (0, deviceCrypto_1.hashDeviceSecret)(plainSecret);
        let zoneId = 'default';
        const firstZone = await prismaClient_1.default.zone.findFirst({
            where: { userId }
        });
        if (firstZone) {
            zoneId = firstZone.id;
        }
        else {
            const defaultZone = await prismaClient_1.default.zone.create({
                data: {
                    name: 'Asosiy Zona',
                    latitude: 41.3111,
                    longitude: 69.2797,
                    userId
                }
            });
            zoneId = defaultZone.id;
        }
        if (!existing) {
            const device = await prismaClient_1.default.device.create({
                data: {
                    macAddress: normalizedMac,
                    macHash: secretHash,
                    secretKey: plainSecret,
                    name: name || `Device ${normalizedMac.slice(-4)}`,
                    status: 'ONLINE',
                    lastSeen: new Date(),
                    zoneId: zoneId,
                },
                select: { id: true, macAddress: true, status: true, createdAt: true },
            });
            await prismaClient_1.default.deviceOwnership.upsert({
                where: { deviceId_userId: { deviceId: device.id, userId } },
                create: { deviceId: device.id, userId, isOwner: true },
                update: { isOwner: true },
            });
            logger_1.logger.info('Device registered', { deviceId: device.id, userId, mac: normalizedMac });
            return res.status(201).json({ success: true, device });
        }
        await prismaClient_1.default.device.update({
            where: { id: existing.id },
            data: { macHash: secretHash, status: 'ONLINE', lastSeen: new Date() },
        });
        await prismaClient_1.default.deviceOwnership.upsert({
            where: { deviceId_userId: { deviceId: existing.id, userId } },
            create: { deviceId: existing.id, userId, isOwner: true },
            update: { isOwner: true },
        });
        logger_1.logger.info('Device registered/updated', { deviceId: existing.id, userId, mac: normalizedMac });
        return res.status(200).json({ success: true, device: { id: existing.id, macAddress: normalizedMac } });
    }
    catch (error) {
        logger_1.logger.error('Device registration failed', { error: error.message });
        return res.status(500).json({ success: false, error: 'Registration failed' });
    }
};
exports.registerDevice = registerDevice;
