"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findDeviceByMac = findDeviceByMac;
exports.updateDeviceStatus = updateDeviceStatus;
exports.updateDeviceSecret = updateDeviceSecret;
exports.createDeviceOwnership = createDeviceOwnership;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function findDeviceByMac(macAddress) {
    const device = await prisma.device.findUnique({
        where: { macAddress },
        select: { id: true, macAddress: true, secretKey: true, status: true },
    });
    return device ?? null;
}
async function updateDeviceStatus(id, status) {
    return prisma.device.update({ where: { id }, data: { status } });
}
async function updateDeviceSecret(id, secretHash) {
    return prisma.device.update({ where: { id }, data: { secretKey: secretHash, macHash: secretHash } });
}
async function createDeviceOwnership(deviceId, userId) {
    return prisma.deviceOwnership.upsert({
        where: { deviceId_userId: { deviceId, userId } },
        create: { deviceId, userId, isOwner: true },
        update: { isOwner: true },
    });
}
