"use strict";
/**
 * @file       farmController.ts
 * @module     FarmService/Controllers
 * @description HTTP route handlers for agricultural zones, IoT device registrations, and real-time status telemetry.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFarmStatus = getFarmStatus;
exports.getAllZones = getAllZones;
exports.getZoneById = getZoneById;
exports.createZone = createZone;
exports.updateZone = updateZone;
exports.deleteZone = deleteZone;
exports.getAllDevices = getAllDevices;
exports.getDeviceById = getDeviceById;
exports.registerDevice = registerDevice;
exports.updateDevice = updateDevice;
exports.seedDemoData = seedDemoData;
const farmStatusService = __importStar(require("../services/farmStatusService"));
const zoneManagementService = __importStar(require("../services/zoneManagementService"));
const deviceRegistryService = __importStar(require("../services/deviceRegistryService"));
const farmSeedService = __importStar(require("../services/farmSeedService"));
const errors_1 = require("../utils/errors");
function extractAuthenticatedUserId(requestFrame) {
    const userIdHeader = requestFrame.headers['x-user-id'];
    if (!userIdHeader || typeof userIdHeader !== 'string') {
        const fallbackUserId = process.env.DEFAULT_DEV_USER_ID;
        if (fallbackUserId) {
            return fallbackUserId;
        }
        throw new errors_1.UnauthorizedAccessError('Unauthorized access: Missing authenticated user context.');
    }
    return userIdHeader;
}
/**
 * Handles farm overall summary retrieval.
 */
async function getFarmStatus(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        await deviceRegistryService.checkDevicesOnlineStatus(authenticatedUserId);
        const overviewData = await farmStatusService.fetchFarmOverviewForUser(authenticatedUserId);
        res.status(200).json({ success: true, data: overviewData });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Retrieves all zones owned by the authenticated user.
 */
async function getAllZones(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const zones = await zoneManagementService.fetchAllZonesForUser(authenticatedUserId);
        res.status(200).json({ success: true, data: zones });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Retrieves a specific zone's details.
 */
async function getZoneById(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const { id } = req.params;
        const zone = await zoneManagementService.fetchZoneByIdForUser(id, authenticatedUserId);
        res.status(200).json({ success: true, data: zone });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Creates a new zone.
 */
async function createZone(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const createdZone = await zoneManagementService.createZoneForUser(authenticatedUserId, req.body);
        res.status(201).json({ success: true, data: createdZone });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Updates an existing zone.
 */
async function updateZone(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const { id } = req.params;
        const updatedZone = await zoneManagementService.updateZoneForUser(id, authenticatedUserId, req.body);
        res.status(200).json({ success: true, data: updatedZone });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Deletes an empty zone.
 */
async function deleteZone(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const { id } = req.params;
        await zoneManagementService.deleteZoneForUser(id, authenticatedUserId);
        res.status(200).json({ success: true, message: 'Zone successfully removed.' });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Retrieves all registered devices belonging to the user's zones.
 */
async function getAllDevices(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const devices = await deviceRegistryService.fetchAllDevicesForUser(authenticatedUserId);
        res.status(200).json({ success: true, data: devices });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Retrieves details for a specific device.
 */
async function getDeviceById(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const { id } = req.params;
        const device = await deviceRegistryService.fetchDeviceByIdForUser(id, authenticatedUserId);
        res.status(200).json({ success: true, data: device });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Registers a new hardware device.
 */
async function registerDevice(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const registeredDevice = await deviceRegistryService.registerDeviceForUser(authenticatedUserId, req.body);
        res.status(201).json({ success: true, data: registeredDevice });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Updates a registered device config.
 */
async function updateDevice(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const { id } = req.params;
        const updatedDevice = await deviceRegistryService.updateDeviceForUser(id, authenticatedUserId, req.body);
        res.status(200).json({ success: true, data: updatedDevice });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Seed endpoint for populating farm demo records.
 */
async function seedDemoData(_req, res, next) {
    try {
        await farmSeedService.runFarmDemographicSeeder();
        res.status(200).json({ success: true, message: 'Demo data seeding completed successfully.' });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=farmController.js.map