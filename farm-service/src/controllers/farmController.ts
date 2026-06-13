/**
 * @file       farmController.ts
 * @module     FarmService/Controllers
 * @description HTTP route handlers for agricultural zones, IoT device registrations, and real-time status telemetry.
 */

import { Request, Response, NextFunction } from 'express';
import * as farmStatusService from '../services/farmStatusService';
import * as zoneManagementService from '../services/zoneManagementService';
import * as deviceRegistryService from '../services/deviceRegistryService';
import * as farmSeedService from '../services/farmSeedService';
import { UnauthorizedAccessError } from '../utils/errors';

function extractAuthenticatedUserId(requestFrame: Request): string {
  const userIdHeader = requestFrame.headers['x-user-id'];
  
  if (!userIdHeader || typeof userIdHeader !== 'string') {
    const fallbackUserId = process.env.DEFAULT_DEV_USER_ID;
    if (fallbackUserId) {
      return fallbackUserId;
    }
    throw new UnauthorizedAccessError('Unauthorized access: Missing authenticated user context.');
  }
  
  return userIdHeader;
}

/**
 * Handles farm overall summary retrieval.
 */
export async function getFarmStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    await deviceRegistryService.checkDevicesOnlineStatus(authenticatedUserId);
    
    const overviewData = await farmStatusService.fetchFarmOverviewForUser(authenticatedUserId);
    res.status(200).json({ success: true, data: overviewData });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves all zones owned by the authenticated user.
 */
export async function getAllZones(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const zones = await zoneManagementService.fetchAllZonesForUser(authenticatedUserId);
    res.status(200).json({ success: true, data: zones });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves a specific zone's details.
 */
export async function getZoneById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const { id } = req.params;
    const zone = await zoneManagementService.fetchZoneByIdForUser(id, authenticatedUserId);
    res.status(200).json({ success: true, data: zone });
  } catch (error) {
    next(error);
  }
}

/**
 * Creates a new zone.
 */
export async function createZone(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const createdZone = await zoneManagementService.createZoneForUser(authenticatedUserId, req.body);
    res.status(201).json({ success: true, data: createdZone });
  } catch (error) {
    next(error);
  }
}

/**
 * Updates an existing zone.
 */
export async function updateZone(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const { id } = req.params;
    const updatedZone = await zoneManagementService.updateZoneForUser(id, authenticatedUserId, req.body);
    res.status(200).json({ success: true, data: updatedZone });
  } catch (error) {
    next(error);
  }
}

/**
 * Deletes an empty zone.
 */
export async function deleteZone(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const { id } = req.params;
    await zoneManagementService.deleteZoneForUser(id, authenticatedUserId);
    res.status(200).json({ success: true, message: 'Zone successfully removed.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves all registered devices belonging to the user's zones.
 */
export async function getAllDevices(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const devices = await deviceRegistryService.fetchAllDevicesForUser(authenticatedUserId);
    res.status(200).json({ success: true, data: devices });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves details for a specific device.
 */
export async function getDeviceById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const { id } = req.params;
    const device = await deviceRegistryService.fetchDeviceByIdForUser(id, authenticatedUserId);
    res.status(200).json({ success: true, data: device });
  } catch (error) {
    next(error);
  }
}

/**
 * Registers a new hardware device.
 */
export async function registerDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const registeredDevice = await deviceRegistryService.registerDeviceForUser(authenticatedUserId, req.body);
    res.status(201).json({ success: true, data: registeredDevice });
  } catch (error) {
    next(error);
  }
}

/**
 * Updates a registered device config.
 */
export async function updateDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const { id } = req.params;
    const updatedDevice = await deviceRegistryService.updateDeviceForUser(id, authenticatedUserId, req.body);
    res.status(200).json({ success: true, data: updatedDevice });
  } catch (error) {
    next(error);
  }
}

/**
 * Seed endpoint for populating farm demo records.
 */
export async function seedDemoData(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await farmSeedService.runFarmDemographicSeeder();
    res.status(200).json({ success: true, message: 'Demo data seeding completed successfully.' });
  } catch (error) {
    next(error);
  }
}
