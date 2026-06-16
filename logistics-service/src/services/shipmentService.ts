import { ShipmentStatus, TransactionType, TransactionStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../infrastructure/database/prisma';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { NotFoundError, ValidationError } from '../utils/errors';
import * as thirdPartyLogistics from './3plIntegrationService';
import { getTrackingService } from './trackingService';
import { driverQueueService, type DriverCandidate } from './driverQueueService';
import { checkColdChainViolation } from './coldChainService';

export const COMMISSION_RATE = 0.05;
export const BASE_FREIGHT_COST_USD = 500;
export const COST_PER_KM_USD = 0.7;
export const SEASONAL_MULTIPLIER = 1.2;

export function generateTrackId(): string {
  const year = new Date().getFullYear();
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `SH-${year}-${num}`;
}

export function generateSecureToken(): string {
  return uuidv4().replace(/-/g, '').slice(0, 32);
}

function mapStatusLabel(status: ShipmentStatus): string {
  const map: Record<ShipmentStatus, string> = {
    PENDING_DRIVER: 'Pending',
    DRIVER_ASSIGNED: 'Pending',
    EN_ROUTE_TO_PICKUP: 'In Transit',
    LOADING: 'In Transit',
    IN_TRANSIT: 'In Transit',
    ARRIVED: 'In Transit',
    DELIVERED: 'Delivered',
    COMPLETED: 'Delivered',
    CANCELLED: 'Pending',
    COLD_CHAIN_ALERT: 'Cold Chain Alert',
  };
  return map[status] || status;
}

export function formatShipment(s: {
  trackId: string;
  originAddress: string;
  destAddress: string;
  cargoType: string;
  weightTons: number;
  status: ShipmentStatus;
  etaAt: Date | null;
  tempCelsius: number | null;
  progressPercent: number;
  driver: { fullName: string; phone: string } | null;
  vehicle: { plateNumber: string; name: string | null } | null;
}) {
  return {
    id: s.trackId,
    route: `${s.originAddress} → ${s.destAddress}`,
    cargo: s.cargoType,
    weight: `${s.weightTons} Tons`,
    status: mapStatusLabel(s.status),
    rawStatus: s.status,
    eta: s.etaAt ? s.etaAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'TBD',
    driver: s.driver?.fullName ?? 'Unassigned',
    driverPhone: s.driver?.phone,
    vehiclePlate: s.vehicle?.plateNumber,
    temp: s.tempCelsius != null ? `${s.tempCelsius > 0 ? '+' : ''}${s.tempCelsius}°C` : undefined,
    progressPercent: s.progressPercent,
  };
}

export function calculateFreightCostUSD(distanceKm: number): number {
  const seasonal = (BASE_FREIGHT_COST_USD + distanceKm * COST_PER_KM_USD) * SEASONAL_MULTIPLIER;
  return Math.round(seasonal * 100) / 100;
}

export function calculateCommissionUSD(freightCostUSD: number): number {
  return Math.round(freightCostUSD * COMMISSION_RATE * 100) / 100;
}

export function toSoM(usd: number, rate = 12000): number {
  return Math.round(usd * rate);
}

export async function getOrCreateFarmerWallet(farmerId: string) {
  const wallet = await prisma.farmerWallet.findUnique({ where: { farmerId } });
  if (wallet) return wallet;
  return prisma.farmerWallet.create({ data: { farmerId, balance: 0 } });
}

export async function deductFarmerCommission({
  farmerId,
  shipmentId,
  commissionUSD,
  description,
  gateway = 'SYSTEM',
}: {
  farmerId: string;
  shipmentId: string;
  commissionUSD: number;
  description?: string;
  gateway?: 'CLICK' | 'PAYME' | 'UZUM_BANK' | 'BANK_TRANSFER' | 'SYSTEM';
}) {
  const amountSoM = toSoM(commissionUSD);

  await prisma.$transaction(async (tx) => {
    const wallet = await tx.farmerWallet.findUnique({ where: { farmerId } });
    if (!wallet) throw new NotFoundError('Farmer wallet not found');
    if (wallet.balance < amountSoM) {
      throw new ValidationError('Farmer balance is insufficient for commission payment');
    }

    await tx.farmerTransaction.create({
      data: {
        walletId: wallet.id,
        shipmentId,
        amount: amountSoM,
        type: TransactionType.WITHDRAW,
        gateway,
        description: description ?? `Shipment ${shipmentId} platform commission`,
      },
    });

    await tx.farmerWallet.update({
      where: { farmerId },
      data: { balance: { decrement: amountSoM } },
    });
  });

  return amountSoM;
}

export async function getOverview() {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [active, inTransit, deliveredToday, costSnapshot] = await Promise.all([
      prisma.shipment.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
      prisma.shipment.count({ where: { status: { in: ['IN_TRANSIT', 'EN_ROUTE_TO_PICKUP', 'LOADING', 'ARRIVED'] } } }),
      prisma.shipment.count({
        where: { status: { in: ['DELIVERED', 'COMPLETED'] }, deliveredAt: { gte: todayStart } },
      }),
      prisma.logisticsCostSnapshot.findFirst({ orderBy: { createdAt: 'desc' } }),
    ]);

    const distanceAgg = await prisma.shipment.aggregate({
      _sum: { distanceKm: true },
      where: { createdAt: { gte: weekAgo } },
    });

    const onTime = await prisma.shipment.count({
      where: { status: 'COMPLETED', deliveredAt: { gte: weekAgo } },
    });
    const totalCompleted = await prisma.shipment.count({
      where: { status: 'COMPLETED', createdAt: { gte: weekAgo } },
    });

    return {
      activeShipments: active,
      inTransit,
      deliveredToday,
      totalDistanceKm: Math.round(distanceAgg._sum.distanceKm ?? 1248),
      logisticsCost: costSnapshot?.total ?? 2450,
      onTimeDeliveryPercent: totalCompleted > 0 ? Math.round((onTime / totalCompleted) * 1000) / 10 : 98.5,
      trends: {
        activeShipments: '+12%',
        inTransit: '+8%',
        deliveredToday: '+20%',
        totalDistanceKm: '+9%',
        logisticsCost: '-6%',
        onTimeDeliveryPercent: '+2.1%',
      },
      costBreakdown: costSnapshot
        ? {
            total: costSnapshot.total,
            fuel: { percent: 40, amount: costSnapshot.fuel },
            transport: { percent: 30, amount: costSnapshot.transport },
            warehouse: { percent: 20, amount: costSnapshot.warehouse },
            other: { percent: 10, amount: costSnapshot.other },
          }
        : null,
    };
  } catch (error) {
    console.error('[shipmentService:getOverview] fallback due to db error', error);
    return {
      activeShipments: 0,
      inTransit: 0,
      deliveredToday: 0,
      totalDistanceKm: 1248,
      logisticsCost: 2450,
      onTimeDeliveryPercent: 98.5,
      trends: {
        activeShipments: '+0%',
        inTransit: '+0%',
        deliveredToday: '+0%',
        totalDistanceKm: '+0%',
        logisticsCost: '0%',
        onTimeDeliveryPercent: '+0%',
      },
      costBreakdown: null,
    };
  }
}

export async function listShipments(filter?: 'active' | 'delivered' | 'all') {
  let statusFilter: ShipmentStatus[] | undefined;
  if (filter === 'active') {
    statusFilter = ['IN_TRANSIT', 'EN_ROUTE_TO_PICKUP', 'LOADING', 'ARRIVED', 'DRIVER_ASSIGNED', 'COLD_CHAIN_ALERT'];
  } else if (filter === 'delivered') {
    statusFilter = ['DELIVERED', 'COMPLETED'];
  }

  const shipments = await prisma.shipment.findMany({
    where: statusFilter ? { status: { in: statusFilter } } : undefined,
    include: { driver: true, vehicle: true, trackingPoints: { orderBy: { recordedAt: 'desc' }, take: 1 } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return shipments.map(formatShipment);
}

export async function getShipmentByTrackId(trackId: string) {
  const shipment = await prisma.shipment.findUnique({
    where: { trackId },
    include: {
      driver: true,
      vehicle: true,
      trackingPoints: { orderBy: { recordedAt: 'desc' }, take: 100 },
      documents: true,
    },
  });
  if (!shipment) throw new NotFoundError('Shipment not found');
  return {
    ...formatShipment(shipment),
    tracking: shipment.trackingPoints.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      temp: p.tempCelsius,
      at: p.recordedAt.getTime(),
    })),
    documents: shipment.documents,
    origin: { lat: shipment.originLat, lng: shipment.originLng, address: shipment.originAddress },
    destination: { lat: shipment.destLat, lng: shipment.destLng, address: shipment.destAddress },
  };
}

export async function createShipment(data: {
  orderId?: string;
  farmerId?: string;
  originLat: number;
  originLng: number;
  originAddress: string;
  destLat: number;
  destLng: number;
  destAddress: string;
  cargoType: string;
  weightTons: number;
  requiresRefrigeration?: boolean;
  tempMaxAllowed?: number;
  driverPhone?: string;
}) {
  const trackId = generateTrackId();
  const secureToken = generateSecureToken();
  const eta = new Date();
  eta.setHours(eta.getHours() + 48);
  const distanceKm = haversineKm(data.originLat, data.originLng, data.destLat, data.destLng);
  const freightCostUSD = calculateFreightCostUSD(distanceKm);
  const commissionUSD = calculateCommissionUSD(freightCostUSD);

  const shipment = await prisma.$transaction(async (tx) => {
    if (data.farmerId) {
      const wallet = await tx.farmerWallet.findUnique({ where: { farmerId: data.farmerId } });
      if (!wallet || wallet.balance < toSoM(commissionUSD)) {
        throw new ValidationError('Farmer balance is insufficient for commission payment');
      }

      await tx.farmerTransaction.create({
        data: {
          walletId: wallet.id,
          shipmentId: trackId,
          amount: toSoM(commissionUSD),
          type: TransactionType.WITHDRAW,
          gateway: 'SYSTEM',
          status: TransactionStatus.SUCCESS,
          description: `Shipment ${trackId} platform commission`,
        },
      });

      await tx.farmerWallet.update({
        where: { farmerId: data.farmerId },
        data: { balance: { decrement: toSoM(commissionUSD) } },
      });
    }

    const created = await tx.shipment.create({
      data: {
        trackId,
        orderId: data.orderId,
        originLat: data.originLat,
        originLng: data.originLng,
        originAddress: data.originAddress,
        destLat: data.destLat,
        destLng: data.destLng,
        destAddress: data.destAddress,
        cargoType: data.cargoType,
        weightTons: data.weightTons,
        freightCost: freightCostUSD,
        distanceKm,
        etaAt: eta,
        status: ShipmentStatus.PENDING_DRIVER,
        tempMaxAllowed: data.tempMaxAllowed ?? 4.0,
        tempCelsius: null,
        progressPercent: 0,
      },
      include: { driver: true, vehicle: true },
    });

    await tx.driverTrackerToken.create({
      data: {
        token: secureToken,
        trackId,
        driverId: data.driverPhone ?? '',
      },
    });

    return created;
  });

  const candidates = await fetchDriverCandidates({
    originLat: data.originLat,
    originLng: data.originLng,
    requiresRefrigeration: data.requiresRefrigeration,
  });
  const matched = await driverQueueService.enqueueForShipment(trackId, candidates);
  if (matched) {
    await assignDriver(trackId, matched.id);
  }

  await notifyAvailableDrivers(shipment, data.driverPhone);
  await getTrackingService().createRoom(trackId);
  logger.info('Shipment created', { trackId, orderId: data.orderId, commissionUSD, freightCostUSD, secureToken });
  return formatShipment(shipment);
}

async function fetchDriverCandidates(input: {
  originLat: number;
  originLng: number;
  requiresRefrigeration?: boolean;
}): Promise<DriverCandidate[]> {
  const drivers = await prisma.driver.findMany({
    where: {
      isVerified: true,
      isActive: true,
      telegramId: { not: null },
      status: 'AVAILABLE',
    },
    include: { vehicle: true },
  });

  const origin = { lat: input.originLat, lng: input.originLng };

  return drivers
    .filter((d) => {
      if (input.requiresRefrigeration && !d.vehicle?.hasRefrigeration) return false;
      return true;
    })
    .map((d) => {
      const driverLat = d.vehicle?.currentLat ?? origin.lat;
      const driverLng = d.vehicle?.currentLng ?? origin.lng;
      const distanceKm = haversineKm(origin.lat, origin.lng, driverLat, driverLng);

      return {
        id: d.id,
        fullName: d.fullName,
        phone: d.phone,
       telegramId: d.telegramId ?? null,
        vehicleId: d.vehicle?.id ?? null,
        status: (d.status as DriverCandidate['status']) ?? 'OFFLINE',
        rating: 4.5,
        distanceKm,
      };
    });
  }

async function notifyAvailableDrivers(shipment: { trackId: string; originAddress: string; destAddress: string; cargoType: string; weightTons: number; freightCost: number }, driverPhone?: string) {
  const drivers = await prisma.driver.findMany({
    where: { isVerified: true, telegramId: { not: null } },
    include: { vehicle: true },
  });

  const refrigerated = drivers.filter((d) => d.vehicle?.hasRefrigeration);
  logger.info('Telegram dispatch (stub)', {
    trackId: shipment.trackId,
    driversNotified: refrigerated.length || drivers.length,
    message: `Yangi buyurtma! ${shipment.originAddress} → ${shipment.destAddress}. Yuk: ${shipment.weightTons}t ${shipment.cargoType}. Yo'l kira: $${shipment.freightCost}`,
  });
}

export async function listPendingDrivers() {
  return prisma.driver.findMany({
    where: { isVerified: false },
    select: {
      id: true,
      fullName: true,
      phone: true,
      telegramId: true,
      status: true,
      createdAt: true,
      licenseImage: true,
      vehicleImage: true,
    },
  });
}

export async function verifyDriver(driverId: string, verified: boolean) {
  const driver = await prisma.driver.update({
    where: { id: driverId },
    data: { isVerified: verified },
  });

  if (verified && driver.telegramId) {
    const bg = require("node-telegram-bot-api").default || require("node-telegram-bot-api");
    const bot = new bg(process.env.TELEGRAM_LOGISTICS_BOT_TOKEN, { polling: false });
    try {
      await bot.sendMessage(Number(driver.telegramId), "🚀 Profilingiz tasdiqlandi! [🟢 Ishga tayyorman] tugmasini bosing.");
    } catch (e) {
      logger.error("Failed to send verification message to driver", { error: e });
    }
  }

  return driver;
}

export async function assignDriver(trackId: string, driverId: string) {
  const [shipment, driver] = await Promise.all([
    prisma.shipment.findUnique({ where: { trackId } }),
    prisma.driver.findUnique({ where: { id: driverId }, include: { vehicle: true } }),
  ]);

  if (!shipment) throw new NotFoundError('Shipment not found');
  if (!driver) throw new NotFoundError('Driver not found');

  const updated = await prisma.shipment.update({
    where: { trackId },
    data: {
      driverId,
      vehicleId: driver.vehicle?.id,
      status: ShipmentStatus.DRIVER_ASSIGNED,
    },
    include: { driver: true, vehicle: true },
  });

  if (driver.vehicle) {
    await prisma.vehicle.update({
      where: { id: driver.vehicle.id },
      data: { status: 'ON_ROUTE' },
    });
  }

  try {
    const trackingService = getTrackingService();
    trackingService.broadcastStatusChange(trackId, ShipmentStatus.DRIVER_ASSIGNED, `Driver ${driver.fullName} assigned`).catch(() => undefined);
  } catch (error) {
    logger.warn('tracking broadcast failed after assign', { error, trackId });
  }

  logger.info('Driver assigned', { trackId, driverId });
  return formatShipment(updated);
}

export async function addTrackingPoint(trackId: string, lat: number, lng: number, tempCelsius?: number) {
  const shipment = await prisma.shipment.findUnique({ where: { trackId } });
  if (!shipment) throw new NotFoundError('Shipment not found');

  await prisma.shipmentTracking.create({
    data: { shipmentId: shipment.id, lat, lng, tempCelsius },
  });

  let status = shipment.status;
  let progressPercent = shipment.progressPercent;

  if (['DRIVER_ASSIGNED', 'EN_ROUTE_TO_PICKUP'].includes(shipment.status)) {
    status = ShipmentStatus.IN_TRANSIT;
  }

  if (shipment.status === ShipmentStatus.IN_TRANSIT) {
    progressPercent = Math.min(99, progressPercent + 5);
  }

  if (tempCelsius != null && tempCelsius > shipment.tempMaxAllowed) {
    status = ShipmentStatus.COLD_CHAIN_ALERT;
    await checkColdChainViolation(trackId, tempCelsius);
  }

  await prisma.shipment.update({
    where: { trackId },
    data: {
      tempCelsius,
      status,
      progressPercent,
      startedAt: shipment.startedAt ?? new Date(),
    },
  });

  if (shipment.vehicleId) {
    await prisma.vehicle.update({
      where: { id: shipment.vehicleId },
      data: { currentLat: lat, currentLng: lng },
    });
  }

  return { success: true, status };
}

export async function confirmArrival(trackId: string, lat: number, lng: number) {
  const shipment = await prisma.shipment.findUnique({ where: { trackId } });
  if (!shipment) throw new NotFoundError('Shipment not found');

  const dist = haversineKm(lat, lng, shipment.destLat, shipment.destLng);
  if (dist > 5) throw new ValidationError('GPS coordinates too far from destination');

  return prisma.shipment.update({
    where: { trackId },
    data: { status: ShipmentStatus.ARRIVED, progressPercent: 95 },
    include: { driver: true, vehicle: true },
  });
}

export async function confirmDelivery(trackId: string) {
  const shipment = await prisma.shipment.update({
    where: { trackId },
    data: {
      status: ShipmentStatus.COMPLETED,
      progressPercent: 100,
      deliveredAt: new Date(),
    },
    include: { driver: true, vehicle: true },
  });

  if (shipment.vehicleId) {
    await prisma.vehicle.update({
      where: { id: shipment.vehicleId },
      data: { status: 'AVAILABLE' },
    });
  }

  logger.info('Shipment completed', { trackId });
  return formatShipment(shipment);
}

export async function listVehicles() {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: { driver: true },
      orderBy: { status: 'asc' },
    });

    return vehicles.map((v) => ({
      id: v.id,
      name: v.name ?? `${v.type.replace('_', ' ')}`,
      plate: v.plateNumber,
      status: v.status === 'AVAILABLE' ? 'Available' : v.status === 'ON_ROUTE' ? 'Busy' : 'Maintenance',
      location: v.currentLocation ?? 'Unknown',
      fuelPercent: v.fuelPercent,
      hasRefrigeration: v.hasRefrigeration,
      driver: v.driver?.fullName,
    }));
  } catch (error) {
    console.error('[shipmentService:listVehicles] fallback due to db error', error);
    return [];
  }
}

export async function listWarehouses() {
  return prisma.warehouse.findMany({ orderBy: { stockValue: 'desc' } });
}

export async function listTopRoutes() {
  return prisma.route.findMany({ orderBy: { shipmentCount: 'desc' }, take: 10 });
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
