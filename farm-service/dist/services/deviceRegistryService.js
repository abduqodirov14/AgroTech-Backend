"use strict";
/**
 * @file       deviceRegistryService.ts
 * @module     FarmService/Services
 * @description Domain logic for registering IoT hardware devices, checking online status, and retrieving telemetry history.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAllDevicesForUser = fetchAllDevicesForUser;
exports.fetchDeviceByIdForUser = fetchDeviceByIdForUser;
exports.registerDeviceForUser = registerDeviceForUser;
exports.updateDeviceForUser = updateDeviceForUser;
exports.checkDevicesOnlineStatus = checkDevicesOnlineStatus;
const crypto_1 = __importDefault(require("crypto"));
const prismaClient_1 = __importDefault(require("../infrastructure/database/prismaClient"));
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
function normalizeMacAddress(rawMacAddress) {
    return rawMacAddress.toLowerCase().replace(/[^a-f0-9:]/g, '');
}
function generateMacHash(normalizedMac) {
    return crypto_1.default.createHash('sha256').update(normalizedMac).digest('hex');
}
/**
 * Retrieves all registered devices belonging to zones owned by the authenticated user.
 * @param authenticatedUserId The unique user database key.
 */
async function fetchAllDevicesForUser(authenticatedUserId) {
    logger_1.default.info('Retrieving all registered devices for user', { authenticatedUserId });
    return prismaClient_1.default.device.findMany({
        where: {
            zone: { userId: authenticatedUserId },
        },
        include: {
            zone: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
}
/**
 * Retrieves a single device by ID after validating user ownership of the parent zone.
 * @param deviceId The unique device database key.
 * @param authenticatedUserId The unique user database key.
 */
async function fetchDeviceByIdForUser(deviceId, authenticatedUserId) {
    logger_1.default.info('Retrieving device details by ID', { deviceId, authenticatedUserId });
    const deviceRecord = await prismaClient_1.default.device.findFirst({
        where: {
            id: deviceId,
            zone: { userId: authenticatedUserId },
        },
        include: {
            zone: true,
            readings: {
                orderBy: { createdAt: 'desc' },
                take: 20,
            },
        },
    });
    if (!deviceRecord) {
        throw new errors_1.ResourceNotFoundError(`Device with ID ${deviceId} was not found for the authenticated user.`);
    }
    return deviceRecord;
}
/**
 * Registers a new physical IoT device MAC address and links it to a user-owned zone.
 * @param authenticatedUserId The user registering the device.
 * @param registrationPayload Input payload containing MAC address and target zone ID.
 */
async function registerDeviceForUser(authenticatedUserId, registrationPayload) {
    logger_1.default.info('Registering new IoT device', {
        authenticatedUserId,
        macAddress: registrationPayload.macAddress,
        zoneId: registrationPayload.zoneId,
    });
    const normalizedMac = normalizeMacAddress(registrationPayload.macAddress);
    if (!normalizedMac) {
        throw new errors_1.InvalidRequestError('Invalid MAC address format.');
    }
    const targetZone = await prismaClient_1.default.zone.findFirst({
        where: { id: registrationPayload.zoneId, userId: authenticatedUserId },
    });
    if (!targetZone) {
        throw new errors_1.ResourceNotFoundError(`Target zone with ID ${registrationPayload.zoneId} was not found for the user.`);
    }
    const existingDevice = await prismaClient_1.default.device.findFirst({
        where: {
            OR: [
                { macAddress: normalizedMac },
                { macHash: generateMacHash(normalizedMac) },
            ],
        },
    });
    if (existingDevice) {
        throw new errors_1.ConflictError(`Device with MAC address ${registrationPayload.macAddress} is already registered.`);
    }
    const generatedSecretKey = crypto_1.default.randomBytes(32).toString('hex');
    const macHash = generateMacHash(normalizedMac);
    return prismaClient_1.default.device.create({
        data: {
            macAddress: normalizedMac,
            macHash,
            name: registrationPayload.name || `Device-${normalizedMac.slice(-5)}`,
            secretKey: generatedSecretKey,
            status: 'OFFLINE',
            zoneId: registrationPayload.zoneId,
        },
    });
}
/**
 * Updates a device configuration such as its display name or zone placement.
 * @param deviceId The unique device database key.
 * @param authenticatedUserId The user owning the device.
 * @param updatePayload Configuration changes.
 */
async function updateDeviceForUser(deviceId, authenticatedUserId, updatePayload) {
    logger_1.default.info('Updating device configuration', { deviceId, authenticatedUserId });
    const existingDevice = await prismaClient_1.default.device.findFirst({
        where: {
            id: deviceId,
            zone: { userId: authenticatedUserId },
        },
    });
    if (!existingDevice) {
        throw new errors_1.ResourceNotFoundError(`Device with ID ${deviceId} was not found for the authenticated user.`);
    }
    if (updatePayload.zoneId && updatePayload.zoneId !== existingDevice.zoneId) {
        const targetZone = await prismaClient_1.default.zone.findFirst({
            where: { id: updatePayload.zoneId, userId: authenticatedUserId },
        });
        if (!targetZone) {
            throw new errors_1.ResourceNotFoundError(`Target zone with ID ${updatePayload.zoneId} was not found for the user.`);
        }
    }
    return prismaClient_1.default.device.update({
        where: { id: deviceId },
        data: {
            name: updatePayload.name ?? existingDevice.name,
            zoneId: updatePayload.zoneId ?? existingDevice.zoneId,
            status: updatePayload.status ?? existingDevice.status,
        },
    });
}
/**
 * Scans all devices and updates status to OFFLINE if they have not reported telemetry in 30 minutes.
 * @param authenticatedUserId User whose fleet is being audited.
 */
async function checkDevicesOnlineStatus(authenticatedUserId) {
    logger_1.default.info('Evaluating real-time online status of IoT fleet', { authenticatedUserId });
    const devices = await prismaClient_1.default.device.findMany({
        where: { zone: { userId: authenticatedUserId } },
        select: { id: true, lastSeen: true, status: true },
    });
    const THIRTY_MINUTES_IN_MILLISECONDS = 30 * 60 * 1000;
    const offlineThreshold = new Date(Date.now() - THIRTY_MINUTES_IN_MILLISECONDS);
    let onlineCount = 0;
    let offlineCount = 0;
    for (const device of devices) {
        const isOnline = !!device.lastSeen && device.lastSeen >= offlineThreshold;
        const resolvedStatus = isOnline ? 'ONLINE' : 'OFFLINE';
        if (resolvedStatus !== device.status) {
            await prismaClient_1.default.device.update({
                where: { id: device.id },
                data: { status: resolvedStatus },
            });
        }
        if (isOnline) {
            onlineCount++;
        }
        else {
            offlineCount++;
        }
    }
    return { onlineCount, offlineCount };
}
//# sourceMappingURL=deviceRegistryService.js.map