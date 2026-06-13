/**
 * @file       farmController.ts
 * @module     FarmService/Controllers
 * @description HTTP route handlers for agricultural zones, IoT device registrations, and real-time status telemetry.
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Handles farm overall summary retrieval.
 */
export declare function getFarmStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Retrieves all zones owned by the authenticated user.
 */
export declare function getAllZones(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Retrieves a specific zone's details.
 */
export declare function getZoneById(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Creates a new zone.
 */
export declare function createZone(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Updates an existing zone.
 */
export declare function updateZone(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Deletes an empty zone.
 */
export declare function deleteZone(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Retrieves all registered devices belonging to the user's zones.
 */
export declare function getAllDevices(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Retrieves details for a specific device.
 */
export declare function getDeviceById(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Registers a new hardware device.
 */
export declare function registerDevice(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Updates a registered device config.
 */
export declare function updateDevice(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Seed endpoint for populating farm demo records.
 */
export declare function seedDemoData(_req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=farmController.d.ts.map