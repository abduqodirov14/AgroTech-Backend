/**
 * @file       farmStatusService.ts
 * @module     FarmService/Services
 * @description Provides high-level summary KPIs and real-time status details of the agricultural zones and deployed IoT devices.
 */
export interface FarmOverviewStatus {
    totalZonesCount: number;
    totalDevicesCount: number;
    onlineDevicesCount: number;
    offlineDevicesCount: number;
    activeIrrigationsCount: number;
    recentAlertsCount: number;
    zoneSummaries: Array<{
        zoneId: string;
        zoneName: string;
        latitude: number;
        longitude: number;
        devicesCount: number;
        latestSensorReading: {
            moisture: number | null;
            temperature: number | null;
            ph: number | null;
            battery: number | null;
            recordedAt: Date | null;
        } | null;
    }>;
}
/**
 * Aggregates farm metrics including zones, devices, active irrigation runs, and alert counts.
 * @param authenticatedUserId The unique identifier of the user invoking the status fetch.
 */
export declare function fetchFarmOverviewForUser(authenticatedUserId: string): Promise<FarmOverviewStatus>;
//# sourceMappingURL=farmStatusService.d.ts.map