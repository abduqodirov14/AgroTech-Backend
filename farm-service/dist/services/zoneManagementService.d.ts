/**
 * @file       zoneManagementService.ts
 * @module     FarmService/Services
 * @description Domain logic for creating, reading, updating, and deleting agricultural zones.
 */
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
export declare function fetchAllZonesForUser(authenticatedUserId: string): Promise<{
    name: string;
    id: string;
    createdAt: Date;
    userId: string;
    latitude: number;
    longitude: number;
}[]>;
/**
 * Retrieves a single zone by ID and user ownership, including nested devices and recent telemetry readings.
 * @param zoneId The unique zone database key.
 * @param authenticatedUserId The unique user database key.
 */
export declare function fetchZoneByIdForUser(zoneId: string, authenticatedUserId: string): Promise<{
    devices: ({
        readings: {
            id: string;
            createdAt: Date;
            deviceId: string;
            moisture: number | null;
            temperature: number | null;
            ph: number | null;
            ec: number | null;
            npk: number | null;
            battery: number | null;
            signalStrength: number | null;
        }[];
    } & {
        name: string | null;
        id: string;
        createdAt: Date;
        zoneId: string;
        status: import(".prisma/client").$Enums.DeviceStatus;
        macAddress: string;
        macHash: string;
        secretKey: string;
        lastSeen: Date | null;
    })[];
} & {
    name: string;
    id: string;
    createdAt: Date;
    userId: string;
    latitude: number;
    longitude: number;
}>;
/**
 * Creates a new agricultural zone record in the database.
 * @param authenticatedUserId The user who owns the zone.
 * @param zonePayload Object containing the name, latitude, and longitude.
 */
export declare function createZoneForUser(authenticatedUserId: string, zonePayload: ZoneCreationInput): Promise<{
    name: string;
    id: string;
    createdAt: Date;
    userId: string;
    latitude: number;
    longitude: number;
}>;
/**
 * Updates an existing zone record in the database.
 * @param zoneId The unique zone database key.
 * @param authenticatedUserId The user who owns the zone.
 * @param updatePayload Object containing optional parameters to update.
 */
export declare function updateZoneForUser(zoneId: string, authenticatedUserId: string, updatePayload: ZoneUpdateInput): Promise<{
    name: string;
    id: string;
    createdAt: Date;
    userId: string;
    latitude: number;
    longitude: number;
}>;
/**
 * Deletes a zone record from the database. Prevents deletion if devices are still registered.
 * @param zoneId The unique zone database key.
 * @param authenticatedUserId The user who owns the zone.
 */
export declare function deleteZoneForUser(zoneId: string, authenticatedUserId: string): Promise<{
    name: string;
    id: string;
    createdAt: Date;
    userId: string;
    latitude: number;
    longitude: number;
}>;
//# sourceMappingURL=zoneManagementService.d.ts.map