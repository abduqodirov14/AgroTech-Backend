import { Device, DeviceStatus, Zone } from '@prisma/client';
export type DeviceWithZone = Device & {
    zone: Zone | null;
};
export declare class DeviceRepository {
    findByMac(macAddress: string): Promise<DeviceWithZone | null>;
    findById(id: string): Promise<DeviceWithZone | null>;
    updateStatus(id: string, status: DeviceStatus): Promise<Device>;
    updateSecretKey(id: string, secretKey: string): Promise<Device>;
    linkToUserAndZone(id: string, userId: string, zoneId: string | null): Promise<Device>;
    create(data: {
        macAddress: string;
        secretKey: string;
        name?: string;
        userId?: string | null;
        zoneId?: string | null;
    }): Promise<Device>;
}
//# sourceMappingURL=DeviceRepository.d.ts.map