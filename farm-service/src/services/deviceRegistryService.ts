/**
 * @file       deviceRegistryService.ts
 * @module     FarmService/Services
 * @description Domain logic for registering IoT hardware devices, checking online status, and retrieving telemetry history.
 */

import crypto from 'crypto';
import prismaClient from '../infrastructure/database/prismaClient';
import { ResourceNotFoundError, InvalidRequestError, ConflictError } from '../utils/errors';
import farmServiceLogger from '../utils/logger';

export interface DeviceRegistrationInput {
  macAddress: string;
  name?: string;
  zoneId: string;
}

export interface DeviceUpdateInput {
  name?: string;
  zoneId?: string;
  status?: 'ONLINE' | 'OFFLINE';
}

function normalizeMacAddress(rawMacAddress: string): string {
  return rawMacAddress.toLowerCase().replace(/[^a-f0-9:]/g, '');
}

function generateMacHash(normalizedMac: string): string {
  return crypto.createHash('sha256').update(normalizedMac).digest('hex');
}

/**
 * Retrieves all registered devices belonging to zones owned by the authenticated user.
 * @param authenticatedUserId The unique user database key.
 */
export async function fetchAllDevicesForUser(authenticatedUserId: string) {
  farmServiceLogger.info('Retrieving all registered devices for user', { authenticatedUserId });

  return prismaClient.device.findMany({
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
      readings: {
        orderBy: { createdAt: 'desc' },
        take: 1,
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
export async function fetchDeviceByIdForUser(deviceId: string, authenticatedUserId: string) {
  farmServiceLogger.info('Retrieving device details by ID', { deviceId, authenticatedUserId });

  const deviceRecord = await prismaClient.device.findFirst({
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
    throw new ResourceNotFoundError(`Device with ID ${deviceId} was not found for the authenticated user.`);
  }

  return deviceRecord;
}

/**
 * Registers a new physical IoT device MAC address and links it to a user-owned zone.
 * @param authenticatedUserId The user registering the device.
 * @param registrationPayload Input payload containing MAC address and target zone ID.
 */
export async function registerDeviceForUser(authenticatedUserId: string, registrationPayload: DeviceRegistrationInput) {
  farmServiceLogger.info('Registering new IoT device', {
    authenticatedUserId,
    macAddress: registrationPayload.macAddress,
    zoneId: registrationPayload.zoneId,
  });

  const normalizedMac = normalizeMacAddress(registrationPayload.macAddress);
  if (!normalizedMac) {
    throw new InvalidRequestError('Invalid MAC address format.');
  }

  const targetZone = await prismaClient.zone.findFirst({
    where: { id: registrationPayload.zoneId, userId: authenticatedUserId },
  });

  if (!targetZone) {
    throw new ResourceNotFoundError(`Target zone with ID ${registrationPayload.zoneId} was not found for the user.`);
  }

  const existingDevice = await prismaClient.device.findFirst({
    where: {
      OR: [
        { macAddress: normalizedMac },
        { macHash: generateMacHash(normalizedMac) },
      ],
    },
  });

  if (existingDevice) {
    throw new ConflictError(`Device with MAC address ${registrationPayload.macAddress} is already registered.`);
  }

  const generatedSecretKey = crypto.randomBytes(32).toString('hex');
  const macHash = generateMacHash(normalizedMac);

  return prismaClient.device.create({
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
export async function updateDeviceForUser(deviceId: string, authenticatedUserId: string, updatePayload: DeviceUpdateInput) {
  farmServiceLogger.info('Updating device configuration', { deviceId, authenticatedUserId });

  const existingDevice = await prismaClient.device.findFirst({
    where: {
      id: deviceId,
      zone: { userId: authenticatedUserId },
    },
  });

  if (!existingDevice) {
    throw new ResourceNotFoundError(`Device with ID ${deviceId} was not found for the authenticated user.`);
  }

  if (updatePayload.zoneId && updatePayload.zoneId !== existingDevice.zoneId) {
    const targetZone = await prismaClient.zone.findFirst({
      where: { id: updatePayload.zoneId, userId: authenticatedUserId },
    });

    if (!targetZone) {
      throw new ResourceNotFoundError(`Target zone with ID ${updatePayload.zoneId} was not found for the user.`);
    }
  }

  return prismaClient.device.update({
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
export async function checkDevicesOnlineStatus(authenticatedUserId: string): Promise<{ onlineCount: number; offlineCount: number }> {
  farmServiceLogger.info('Evaluating real-time online status of IoT fleet', { authenticatedUserId });

  const devices = await prismaClient.device.findMany({
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
      await prismaClient.device.update({
        where: { id: device.id },
        data: { status: resolvedStatus },
      });
    }

    if (isOnline) {
      onlineCount++;
    } else {
      offlineCount++;
    }
  }

  return { onlineCount, offlineCount };
}
