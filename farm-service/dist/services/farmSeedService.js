"use strict";
/**
 * @file       farmSeedService.ts
 * @module     FarmService/Services
 * @description Executable seed script that populates the database with default test users, agricultural zones, IoT devices, and historical telemetry data.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runFarmDemographicSeeder = runFarmDemographicSeeder;
const crypto_1 = __importDefault(require("crypto"));
const prismaClient_1 = __importDefault(require("../infrastructure/database/prismaClient"));
const logger_1 = __importDefault(require("../utils/logger"));
function generateDeterministicHash(macAddress) {
    return crypto_1.default.createHash('sha256').update(macAddress).digest('hex');
}
/**
 * Runs the database demographic seeder to generate default tenant, zones, devices, and historical telemetry.
 */
async function runFarmDemographicSeeder() {
    logger_1.default.info('Initializing farm service data seeding procedure...');
    const DEFAULT_USER_PHONE = '+998901234567';
    const defaultUser = await prismaClient_1.default.user.upsert({
        where: { phone: DEFAULT_USER_PHONE },
        update: {},
        create: {
            phone: DEFAULT_USER_PHONE,
            fullName: 'Anvar Sobirov',
            username: 'anvar_farmer',
            role: 'FARMER',
        },
    });
    logger_1.default.info('Default user established', { userId: defaultUser.id, phone: DEFAULT_USER_PHONE });
    const targetZonesMetadata = [
        { name: 'Pomidor Dalasi', latitude: 41.3111, longitude: 69.2797 },
        { name: "Gilos Bog'i", latitude: 39.6542, longitude: 66.9597 },
        { name: 'Paxta Maydoni', latitude: 40.7836, longitude: 72.3442 },
    ];
    const createdZones = [];
    for (const zoneData of targetZonesMetadata) {
        const existingZone = await prismaClient_1.default.zone.findFirst({
            where: { name: zoneData.name, userId: defaultUser.id },
        });
        if (existingZone) {
            createdZones.push(existingZone);
            continue;
        }
        const newZone = await prismaClient_1.default.zone.create({
            data: {
                name: zoneData.name,
                latitude: zoneData.latitude,
                longitude: zoneData.longitude,
                userId: defaultUser.id,
            },
        });
        createdZones.push(newZone);
        logger_1.default.info('Created zone', { name: newZone.name, id: newZone.id });
    }
    const targetDevicesMetadata = [
        { mac: '00:1a:2b:3c:4d:5e', name: 'Soil-Sensor-A1', zoneIndex: 0 },
        { mac: '00:1a:2b:3c:4d:5f', name: 'Soil-Sensor-A2', zoneIndex: 0 },
        { mac: '00:1a:2b:3c:4e:6a', name: 'Fruit-Sensor-B1', zoneIndex: 1 },
        { mac: '00:1a:2b:3c:4e:6b', name: 'Fruit-Sensor-B2', zoneIndex: 1 },
        { mac: '00:1a:2b:3c:4f:7a', name: 'Cotton-Sensor-C1', zoneIndex: 2 },
    ];
    const createdDevices = [];
    for (const devData of targetDevicesMetadata) {
        const normalizedMac = devData.mac.toLowerCase();
        const macHash = generateDeterministicHash(normalizedMac);
        const existingDevice = await prismaClient_1.default.device.findUnique({
            where: { macAddress: normalizedMac },
        });
        if (existingDevice) {
            createdDevices.push(existingDevice);
            continue;
        }
        const assignedZone = createdZones[devData.zoneIndex];
        const newDevice = await prismaClient_1.default.device.create({
            data: {
                macAddress: normalizedMac,
                macHash,
                name: devData.name,
                secretKey: crypto_1.default.randomBytes(32).toString('hex'),
                status: 'ONLINE',
                lastSeen: new Date(),
                zoneId: assignedZone.id,
            },
        });
        await prismaClient_1.default.deviceOwnership.upsert({
            where: {
                deviceId_userId: {
                    deviceId: newDevice.id,
                    userId: defaultUser.id,
                },
            },
            update: {},
            create: {
                deviceId: newDevice.id,
                userId: defaultUser.id,
                isOwner: true,
            },
        });
        createdDevices.push(newDevice);
        logger_1.default.info('Registered IoT device', { name: newDevice.name, macAddress: normalizedMac });
    }
    logger_1.default.info('Generating mock sensor telemetry readings...');
    const baseTimestamp = Date.now();
    const ONE_HOUR_IN_MS = 60 * 60 * 1000;
    for (const device of createdDevices) {
        const readingsCount = await prismaClient_1.default.sensorReading.count({
            where: { deviceId: device.id },
        });
        if (readingsCount >= 20) {
            continue;
        }
        const batchInsertTelemetry = [];
        for (let index = 0; index < 20; index++) {
            const readingTimestamp = new Date(baseTimestamp - index * ONE_HOUR_IN_MS);
            const moisturePercent = parseFloat((30 + Math.sin(index) * 15 + Math.random() * 5).toFixed(2));
            const temperatureCelsius = parseFloat((24 + Math.cos(index) * 6 + Math.random() * 2).toFixed(2));
            const phLevel = parseFloat((6.2 + Math.sin(index / 2) * 0.4 + Math.random() * 0.1).toFixed(2));
            const batteryPercent = parseFloat((98 - index * 0.5 - Math.random() * 0.2).toFixed(2));
            batchInsertTelemetry.push({
                deviceId: device.id,
                moisture: moisturePercent,
                temperature: temperatureCelsius,
                ph: phLevel,
                battery: batteryPercent,
                signalStrength: -65 - Math.floor(Math.random() * 15),
                createdAt: readingTimestamp,
            });
        }
        await prismaClient_1.default.sensorReading.createMany({
            data: batchInsertTelemetry,
        });
        logger_1.default.info(`Telemetry seeded for device`, { deviceName: device.name, count: batchInsertTelemetry.length });
    }
    logger_1.default.info('Farm demographic seeding procedure completed successfully.');
}
if (require.main === module) {
    runFarmDemographicSeeder()
        .then(() => {
        logger_1.default.info('Stand-alone seed script executed successfully.');
        process.exit(0);
    })
        .catch((error) => {
        logger_1.default.error('Stand-alone seed script failed with fatal error', { error: error.message });
        process.exit(1);
    });
}
//# sourceMappingURL=farmSeedService.js.map