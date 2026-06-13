import prisma from '../infrastructure/database/prisma';
import { logger } from '../utils/logger';

export async function seedDemoData(force = false) {
  const count = await prisma.shipment.count();
  if (count > 0 && !force) {
    return { message: 'Demo data exists', shipments: count };
  }

  if (force) {
    await prisma.shipmentTracking.deleteMany({});
    await prisma.shipmentDocument.deleteMany({});
    await prisma.shipment.deleteMany({});
    await prisma.vehicle.deleteMany({});
    await prisma.driver.deleteMany({});
    await prisma.warehouse.deleteMany({});
    await prisma.route.deleteMany({});
    await prisma.logisticsCostSnapshot.deleteMany({});
  }

  const drivers = await Promise.all([
    prisma.driver.create({ data: { fullName: 'Akmal R.', phone: '+998901111111', telegramId: BigInt(100001), isVerified: true } }),
    prisma.driver.create({ data: { fullName: 'Bobur R.', phone: '+998902222222', telegramId: BigInt(100002), isVerified: true } }),
    prisma.driver.create({ data: { fullName: 'Sardor K.', phone: '+998903333333', telegramId: BigInt(100003), isVerified: true } }),
  ]);

  const vehicles = await Promise.all([
    prisma.vehicle.create({
      data: {
        plateNumber: '01 D 234 AB',
        name: 'Truck 10 Ton',
        type: 'REFRIGERATED',
        capacityTons: 10,
        hasRefrigeration: true,
        status: 'ON_ROUTE',
        fuelPercent: 72,
        currentLocation: 'Navoiy',
        currentLat: 40.1,
        currentLng: 65.38,
        driverId: drivers[0].id,
      },
    }),
    prisma.vehicle.create({
      data: {
        plateNumber: '10 B 456 CD',
        name: 'Truck 20 Ton',
        type: 'TRUCK_20T',
        capacityTons: 20,
        hasRefrigeration: true,
        status: 'AVAILABLE',
        fuelPercent: 85,
        currentLocation: 'Tashkent',
        currentLat: 41.31,
        currentLng: 69.28,
        driverId: drivers[1].id,
      },
    }),
    prisma.vehicle.create({
      data: {
        plateNumber: '30 C 789 EF',
        name: 'Van 3 Ton',
        type: 'VAN',
        capacityTons: 3,
        status: 'MAINTENANCE',
        fuelPercent: 40,
        currentLocation: 'Samarkand',
        driverId: drivers[2].id,
      },
    }),
  ]);

  const shipments = [
    {
      trackId: 'SH-2025-0387',
      originLat: 40.1, originLng: 65.38, originAddress: 'Navoiy',
      destLat: 55.75, destLng: 37.62, destAddress: 'Moskva',
      cargoType: 'Gilos (20t)', weightTons: 20, freightCost: 4000,
      status: 'IN_TRANSIT' as const, tempCelsius: 2, progressPercent: 75,
      driverId: drivers[0].id, vehicleId: vehicles[0].id, distanceKm: 3200,
    },
    {
      trackId: 'SH-2025-0388',
      originLat: 39.65, originLng: 66.96, originAddress: 'Samarqand',
      destLat: 41.31, destLng: 69.28, destAddress: 'Toshkent',
      cargoType: "Bug'doy (35t)", weightTons: 35, freightCost: 800,
      status: 'IN_TRANSIT' as const, progressPercent: 60,
      driverId: drivers[1].id, vehicleId: vehicles[1].id, distanceKm: 280,
    },
    {
      trackId: 'SH-2025-0389',
      originLat: 39.77, originLng: 64.42, originAddress: 'Buxoro',
      destLat: 40.38, destLng: 71.78, destAddress: "Farg'ona",
      cargoType: 'Pomidor (12t)', weightTons: 12, freightCost: 450,
      status: 'COMPLETED' as const, tempCelsius: 5, progressPercent: 100,
      driverId: drivers[2].id, vehicleId: vehicles[2].id, distanceKm: 520,
      deliveredAt: new Date(),
    },
    {
      trackId: 'SH-2025-0390',
      originLat: 40.78, originLng: 72.34, originAddress: 'Andijon',
      destLat: 43.24, destLng: 76.91, destAddress: "Qozog'iston",
      cargoType: 'Uzum (8t)', weightTons: 8, freightCost: 600,
      status: 'PENDING_DRIVER' as const, progressPercent: 0, distanceKm: 400,
    },
  ];

  for (const s of shipments) {
    const eta = new Date();
    eta.setHours(eta.getHours() + 24);
    await prisma.shipment.create({
      data: { ...s, etaAt: eta, startedAt: s.status !== 'PENDING_DRIVER' ? new Date(Date.now() - 86400000) : undefined },
    });
  }

  const inTransit = await prisma.shipment.findFirst({ where: { trackId: 'SH-2025-0387' } });
  if (inTransit) {
    await prisma.shipmentTracking.createMany({
      data: [
        { shipmentId: inTransit.id, lat: 40.1, lng: 65.38, tempCelsius: 2 },
        { shipmentId: inTransit.id, lat: 42.5, lng: 59.6, tempCelsius: 2.1 },
        { shipmentId: inTransit.id, lat: 48.0, lng: 50.0, tempCelsius: 2.5 },
      ],
    });
  }

  await prisma.warehouse.createMany({
    data: [
      { name: 'Tashkent Hub', region: 'tashkent', latitude: 41.31, longitude: 69.28, capacityPct: 85, stockValue: 45230 },
      { name: "Fergana Depot", region: 'fergana', latitude: 40.38, longitude: 71.78, capacityPct: 62, stockValue: 28100 },
      { name: 'Samarkand Storage', region: 'samarkand', latitude: 39.65, longitude: 66.96, capacityPct: 45, stockValue: 21450 },
      { name: 'Andijan Cold Store', region: 'andijan', latitude: 40.78, longitude: 72.34, capacityPct: 78, stockValue: 33800 },
    ],
  });

  await prisma.route.createMany({
    data: [
      { origin: 'Toshkent', destination: 'Samarqand', shipmentCount: 48, avgTravelHours: 4.5, onTimePercent: 96, distanceKm: 280 },
      { origin: 'Navoiy', destination: 'Moskva', shipmentCount: 12, avgTravelHours: 72, onTimePercent: 92, distanceKm: 3200 },
      { origin: 'Buxoro', destination: "Farg'ona", shipmentCount: 35, avgTravelHours: 6, onTimePercent: 98, distanceKm: 520 },
      { origin: 'Andijon', destination: 'Toshkent', shipmentCount: 28, avgTravelHours: 5, onTimePercent: 94, distanceKm: 380 },
    ],
  });

  await prisma.logisticsCostSnapshot.create({
    data: {
      period: '2026-06',
      total: 2450,
      fuel: 980,
      transport: 735,
      warehouse: 490,
      other: 245,
    },
  });

  logger.info('Logistics demo data seeded');
  return { message: 'Demo data created', shipments: shipments.length, vehicles: vehicles.length };
}
