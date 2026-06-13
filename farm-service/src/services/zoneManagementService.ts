/**
 * @file       zoneManagementService.ts
 * @module     FarmService/Services
 * @description Domain logic for creating, reading, updating, and deleting agricultural zones.
 */

import prismaClient from '../infrastructure/database/prismaClient';
import { ResourceNotFoundError, InvalidRequestError } from '../utils/errors';
import farmServiceLogger from '../utils/logger';

export interface ZoneCreationInput {
  name: string;
  latitude: number;
  longitude: number;
}

export interface ZoneUpdateInput {
  name?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Retrieves all zones associated with a given user ID.
 * @param authenticatedUserId The unique user database key.
 */
export async function fetchAllZonesForUser(authenticatedUserId: string) {
  farmServiceLogger.info('Retrieving all zones for user', { authenticatedUserId });
  return prismaClient.zone.findMany({
    where: { userId: authenticatedUserId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Retrieves a single zone by ID and user ownership, including nested devices and recent telemetry readings.
 * @param zoneId The unique zone database key.
 * @param authenticatedUserId The unique user database key.
 */
export async function fetchZoneByIdForUser(zoneId: string, authenticatedUserId: string) {
  farmServiceLogger.info('Retrieving specific zone details', { zoneId, authenticatedUserId });

  const zoneRecord = await prismaClient.zone.findFirst({
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
    throw new ResourceNotFoundError(`Zone with ID ${zoneId} was not found for the authenticated user.`);
  }

  return zoneRecord;
}

/**
 * Creates a new agricultural zone record in the database.
 * @param authenticatedUserId The user who owns the zone.
 * @param zonePayload Object containing the name, latitude, and longitude.
 */
export async function createZoneForUser(authenticatedUserId: string, zonePayload: ZoneCreationInput) {
  farmServiceLogger.info('Creating a new zone', { authenticatedUserId, zoneName: zonePayload.name });

  if (!zonePayload.name || typeof zonePayload.latitude !== 'number' || typeof zonePayload.longitude !== 'number') {
    throw new InvalidRequestError('Invalid zone payload. Name, latitude, and longitude must be provided.');
  }

  return prismaClient.zone.create({
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
export async function updateZoneForUser(zoneId: string, authenticatedUserId: string, updatePayload: ZoneUpdateInput) {
  farmServiceLogger.info('Updating zone records', { zoneId, authenticatedUserId });

  const existingZone = await prismaClient.zone.findFirst({
    where: { id: zoneId, userId: authenticatedUserId },
  });

  if (!existingZone) {
    throw new ResourceNotFoundError(`Zone with ID ${zoneId} was not found for the authenticated user.`);
  }

  return prismaClient.zone.update({
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
export async function deleteZoneForUser(zoneId: string, authenticatedUserId: string) {
  farmServiceLogger.info('Initiating zone deletion process', { zoneId, authenticatedUserId });

  const existingZone = await prismaClient.zone.findFirst({
    where: { id: zoneId, userId: authenticatedUserId },
    include: { devices: true },
  });

  if (!existingZone) {
    throw new ResourceNotFoundError(`Zone with ID ${zoneId} was not found for the authenticated user.`);
  }

  if (existingZone.devices.length > 0) {
    throw new InvalidRequestError(
      `Cannot delete zone with ID ${zoneId} because it has ${existingZone.devices.length} registered IoT devices. Unregister devices first.`
    );
  }

  return prismaClient.zone.delete({
    where: { id: zoneId },
  });
}
