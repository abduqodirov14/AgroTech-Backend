export interface ZoneWithDevice {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  userId: string;
  devices: Array<{
    id: string;
    macAddress: string;
    name: string | null;
    status: string;
  }>;
  createdAt: Date;
}

export interface CreateZoneDTO {
  name: string;
  latitude: number;
  longitude: number;
  userId: string;
  deviceId?: string;
}

export interface IZoneRepository {
  findAll(): Promise<ZoneWithDevice[]>;
  findById(id: string): Promise<ZoneWithDevice | null>;
  findByUserId(userId: string): Promise<ZoneWithDevice[]>;
  findByDeviceId(deviceId: string): Promise<ZoneWithDevice | null>;
  create(data: CreateZoneDTO): Promise<ZoneWithDevice>;
  updateValveState(zoneId: string, valveState: string): Promise<void>;
}
