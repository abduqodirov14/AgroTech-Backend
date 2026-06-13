"use strict";
/**
 * @file       zoneManagementService.ts
 * @module     FarmService/Services
 * @description Domain logic for creating, reading, updating, and deleting agricultural zones.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAllZonesForUser = fetchAllZonesForUser;
exports.fetchZoneByIdForUser = fetchZoneByIdForUser;
exports.createZoneForUser = createZoneForUser;
exports.updateZoneForUser = updateZoneForUser;
exports.deleteZoneForUser = deleteZoneForUser;
const prismaClient_1 = __importDefault(require("../infrastructure/database/prismaClient"));
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Retrieves all zones associated with a given user ID.
 * @param authenticatedUserId The unique user database key.
 */
async function fetchAllZonesForUser(authenticatedUserId) {
    logger_1.default.info('Retrieving all zones for user', { authenticatedUserId });
    return prismaClient_1.default.zone.findMany({
        where: { userId: authenticatedUserId },
        orderBy: { createdAt: 'desc' },
    });
}
/**
 * Retrieves a single zone by ID and user ownership, including nested devices and recent telemetry readings.
 * @param zoneId The unique zone database key.
 * @param authenticatedUserId The unique user database key.
 */
async function fetchZoneByIdForUser(zoneId, authenticatedUserId) {
    logger_1.default.info('Retrieving specific zone details', { zoneId, authenticatedUserId });
    const zoneRecord = await prismaClient_1.default.zone.findFirst({
        where: { id: zoneId, userId: authenticatedUserId },
        include: {
            devices: {
                include: {
                    readings: {
                        orderBy: { createdAt: 'desc' },
                        take: 5,
                    },
                },
            },
        },
    });
    if (!zoneRecord) {
        throw new errors_1.ResourceNotFoundError(`Zone with ID ${zoneId} was not found for the authenticated user.`);
    }
    return zoneRecord;
}
/**
 * Creates a new agricultural zone record in the database.
 * @param authenticatedUserId The user who owns the zone.
 * @param zonePayload Object containing the name, latitude, and longitude.
 */
async function createZoneForUser(authenticatedUserId, zonePayload) {
    logger_1.default.info('Creating a new zone', { authenticatedUserId, zoneName: zonePayload.name });
    if (!zonePayload.name || typeof zonePayload.latitude !== 'number' || typeof zonePayload.longitude !== 'number') {
        throw new errors_1.InvalidRequestError('Invalid zone payload. Name, latitude, and longitude must be provided.');
    }
    return prismaClient_1.default.zone.create({
        data: {
            name: zonePayload.name,
            latitude: zonePayload.latitude,
            longitude: zonePayload.longitude,
            userId: authenticatedUserId,
        },
    });
}
/**
 * Updates an existing zone record in the database.
 * @param zoneId The unique zone database key.
 * @param authenticatedUserId The user who owns the zone.
 * @param updatePayload Object containing optional parameters to update.
 */
async function updateZoneForUser(zoneId, authenticatedUserId, updatePayload) {
    logger_1.default.info('Updating zone records', { zoneId, authenticatedUserId });
    const existingZone = await prismaClient_1.default.zone.findFirst({
        where: { id: zoneId, userId: authenticatedUserId },
    });
    if (!existingZone) {
        throw new errors_1.ResourceNotFoundError(`Zone with ID ${zoneId} was not found for the authenticated user.`);
    }
    return prismaClient_1.default.zone.update({
        where: { id: zoneId },
        data: {
            name: updatePayload.name ?? existingZone.name,
            latitude: updatePayload.latitude ?? existingZone.latitude,
            longitude: updatePayload.longitude ?? existingZone.longitude,
        },
    });
}
/**
 * Deletes a zone record from the database. Prevents deletion if devices are still registered.
 * @param zoneId The unique zone database key.
 * @param authenticatedUserId The user who owns the zone.
 */
async function deleteZoneForUser(zoneId, authenticatedUserId) {
    logger_1.default.info('Initiating zone deletion process', { zoneId, authenticatedUserId });
    const existingZone = await prismaClient_1.default.zone.findFirst({
        where: { id: zoneId, userId: authenticatedUserId },
        include: { devices: true },
    });
    if (!existingZone) {
        throw new errors_1.ResourceNotFoundError(`Zone with ID ${zoneId} was not found for the authenticated user.`);
    }
    if (existingZone.devices.length > 0) {
        throw new errors_1.InvalidRequestError(`Cannot delete zone with ID ${zoneId} because it has ${existingZone.devices.length} registered IoT devices. Unregister devices first.`);
    }
    return prismaClient_1.default.zone.delete({
        where: { id: zoneId },
    });
}
//# sourceMappingURL=zoneManagementService.js.map