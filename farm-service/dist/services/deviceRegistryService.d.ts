/**
 * @file       deviceRegistryService.ts
 * @module     FarmService/Services
 * @description Domain logic for registering IoT hardware devices, checking online status, and retrieving telemetry history.
 */
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
/**
 * Retrieves all registered devices belonging to zones owned by the authenticated user.
 * @param authenticatedUserId The unique user database key.
 */
export declare function fetchAllDevicesForUser(authenticatedUserId: string): Promise<({
    zone: {
        name: string;
        id: string;
    };
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
})[]>;
/**
 * Retrieves a single device by ID after validating user ownership of the parent zone.
 * @param deviceId The unique device database key.
 * @param authenticatedUserId The unique user database key.
 */
export declare function fetchDeviceByIdForUser(deviceId: string, authenticatedUserId: string): Promise<{
    zone: {
        name: string;
        id: string;
        createdAt: Date;
        userId: string;
        latitude: number;
        longitude: number;
    };
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
}>;
/**
 * Registers a new physical IoT device MAC address and links it to a user-owned zone.
 * @param authenticatedUserId The user registering the device.
 * @param registrationPayload Input payload containing MAC address and target zone ID.
 */
export declare function registerDeviceForUser(authenticatedUserId: string, registrationPayload: DeviceRegistrationInput): Promise<{
    name: string | null;
    id: string;
    createdAt: Date;
    zoneId: string;
    status: import(".prisma/client").$Enums.DeviceStatus;
    macAddress: string;
    macHash: string;
    secretKey: string;
    lastSeen: Date | null;
}>;
/**
 * Updates a device configuration such as its display name or zone placement.
 * @param deviceId The unique device database key.
 * @param authenticatedUserId The user owning the device.
 * @param updatePayload Configuration changes.
 */
export declare function updateDeviceForUser(deviceId: string, authenticatedUserId: string, updatePayload: DeviceUpdateInput): Promise<{
    name: string | null;
    id: string;
    createdAt: Date;
    zoneId: string;
    status: import(".prisma/client").$Enums.DeviceStatus;
    macAddress: string;
    macHash: string;
    secretKey: string;
    lastSeen: Date | null;
}>;
/**
 * Scans all devices and updates status to OFFLINE if they have not reported telemetry in 30 minutes.
 * @param authenticatedUserId User whose fleet is being audited.
 */
export declare function checkDevicesOnlineStatus(authenticatedUserId: string): Promise<{
    onlineCount: number;
    offlineCount: number;
}>;
//# sourceMappingURL=deviceRegistryService.d.ts.map