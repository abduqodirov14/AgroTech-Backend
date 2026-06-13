"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTrackId = generateTrackId;
exports.formatShipment = formatShipment;
exports.getOverview = getOverview;
exports.listShipments = listShipments;
exports.getShipmentByTrackId = getShipmentByTrackId;
exports.createShipment = createShipment;
exports.assignDriver = assignDriver;
exports.addTrackingPoint = addTrackingPoint;
exports.confirmArrival = confirmArrival;
exports.confirmDelivery = confirmDelivery;
exports.listVehicles = listVehicles;
exports.listWarehouses = listWarehouses;
exports.listTopRoutes = listTopRoutes;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../infrastructure/database/prisma"));
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
function generateTrackId() {
    const year = new Date().getFullYear();
    const num = Math.floor(Math.random() * 9000) + 1000;
    return `SH-${year}-${num}`;
}
function mapStatusLabel(status) {
    const map = {
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
function formatShipment(s) {
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
async function getOverview() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const [active, inTransit, deliveredToday, costSnapshot] = await Promise.all([
        prisma_1.default.shipment.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
        prisma_1.default.shipment.count({ where: { status: { in: ['IN_TRANSIT', 'EN_ROUTE_TO_PICKUP', 'LOADING', 'ARRIVED'] } } }),
        prisma_1.default.shipment.count({
            where: { status: { in: ['DELIVERED', 'COMPLETED'] }, deliveredAt: { gte: todayStart } },
        }),
        prisma_1.default.logisticsCostSnapshot.findFirst({ orderBy: { createdAt: 'desc' } }),
    ]);
    const distanceAgg = await prisma_1.default.shipment.aggregate({
        _sum: { distanceKm: true },
        where: { createdAt: { gte: weekAgo } },
    });
    const onTime = await prisma_1.default.shipment.count({
        where: { status: 'COMPLETED', deliveredAt: { gte: weekAgo } },
    });
    const totalCompleted = await prisma_1.default.shipment.count({
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
}
async function listShipments(filter) {
    let statusFilter;
    if (filter === 'active') {
        statusFilter = ['IN_TRANSIT', 'EN_ROUTE_TO_PICKUP', 'LOADING', 'ARRIVED', 'DRIVER_ASSIGNED', 'COLD_CHAIN_ALERT'];
    }
    else if (filter === 'delivered') {
        statusFilter = ['DELIVERED', 'COMPLETED'];
    }
    const shipments = await prisma_1.default.shipment.findMany({
        where: statusFilter ? { status: { in: statusFilter } } : undefined,
        include: { driver: true, vehicle: true, trackingPoints: { orderBy: { recordedAt: 'desc' }, take: 1 } },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });
    return shipments.map(formatShipment);
}
async function getShipmentByTrackId(trackId) {
    const shipment = await prisma_1.default.shipment.findUnique({
        where: { trackId },
        include: {
            driver: true,
            vehicle: true,
            trackingPoints: { orderBy: { recordedAt: 'desc' }, take: 100 },
            documents: true,
        },
    });
    if (!shipment)
        throw new errors_1.NotFoundError('Shipment not found');
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
async function createShipment(data) {
    const trackId = generateTrackId();
    const eta = new Date();
    eta.setHours(eta.getHours() + 48);
    const shipment = await prisma_1.default.shipment.create({
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
            freightCost: data.freightCost ?? 0,
            distanceKm: haversineKm(data.originLat, data.originLng, data.destLat, data.destLng),
            etaAt: eta,
            status: client_1.ShipmentStatus.PENDING_DRIVER,
        },
        include: { driver: true, vehicle: true },
    });
    await notifyAvailableDrivers(shipment);
    logger_1.logger.info('Shipment created', { trackId, orderId: data.orderId });
    return formatShipment(shipment);
}
async function notifyAvailableDrivers(shipment) {
    const drivers = await prisma_1.default.driver.findMany({
        where: { isVerified: true, telegramId: { not: null } },
        include: { vehicle: true },
    });
    const refrigerated = drivers.filter((d) => d.vehicle?.hasRefrigeration);
    logger_1.logger.info('Telegram dispatch (stub)', {
        trackId: shipment.trackId,
        driversNotified: refrigerated.length || drivers.length,
        message: `Yangi buyurtma! ${shipment.originAddress} → ${shipment.destAddress}. Yuk: ${shipment.weightTons}t ${shipment.cargoType}. Yo'l kira: $${shipment.freightCost}`,
    });
}
async function assignDriver(trackId, driverId) {
    const [shipment, driver] = await Promise.all([
        prisma_1.default.shipment.findUnique({ where: { trackId } }),
        prisma_1.default.driver.findUnique({ where: { id: driverId }, include: { vehicle: true } }),
    ]);
    if (!shipment)
        throw new errors_1.NotFoundError('Shipment not found');
    if (!driver)
        throw new errors_1.NotFoundError('Driver not found');
    const updated = await prisma_1.default.shipment.update({
        where: { trackId },
        data: {
            driverId,
            vehicleId: driver.vehicle?.id,
            status: client_1.ShipmentStatus.DRIVER_ASSIGNED,
        },
        include: { driver: true, vehicle: true },
    });
    if (driver.vehicle) {
        await prisma_1.default.vehicle.update({
            where: { id: driver.vehicle.id },
            data: { status: 'ON_ROUTE' },
        });
    }
    return formatShipment(updated);
}
async function addTrackingPoint(trackId, lat, lng, tempCelsius) {
    const shipment = await prisma_1.default.shipment.findUnique({ where: { trackId } });
    if (!shipment)
        throw new errors_1.NotFoundError('Shipment not found');
    await prisma_1.default.shipmentTracking.create({
        data: { shipmentId: shipment.id, lat, lng, tempCelsius },
    });
    let status = shipment.status;
    let progressPercent = shipment.progressPercent;
    if (['DRIVER_ASSIGNED', 'EN_ROUTE_TO_PICKUP'].includes(shipment.status)) {
        status = client_1.ShipmentStatus.IN_TRANSIT;
    }
    if (shipment.status === client_1.ShipmentStatus.IN_TRANSIT) {
        progressPercent = Math.min(99, progressPercent + 5);
    }
    if (tempCelsius != null && tempCelsius > shipment.tempMaxAllowed) {
        status = client_1.ShipmentStatus.COLD_CHAIN_ALERT;
        logger_1.logger.warn('Cold chain alert', { trackId, tempCelsius });
    }
    await prisma_1.default.shipment.update({
        where: { trackId },
        data: {
            tempCelsius,
            status,
            progressPercent,
            startedAt: shipment.startedAt ?? new Date(),
        },
    });
    if (shipment.vehicleId) {
        await prisma_1.default.vehicle.update({
            where: { id: shipment.vehicleId },
            data: { currentLat: lat, currentLng: lng },
        });
    }
    return { success: true, status };
}
async function confirmArrival(trackId, lat, lng) {
    const shipment = await prisma_1.default.shipment.findUnique({ where: { trackId } });
    if (!shipment)
        throw new errors_1.NotFoundError('Shipment not found');
    const dist = haversineKm(lat, lng, shipment.destLat, shipment.destLng);
    if (dist > 5)
        throw new errors_1.ValidationError('GPS coordinates too far from destination');
    return prisma_1.default.shipment.update({
        where: { trackId },
        data: { status: client_1.ShipmentStatus.ARRIVED, progressPercent: 95 },
        include: { driver: true, vehicle: true },
    });
}
async function confirmDelivery(trackId) {
    const shipment = await prisma_1.default.shipment.update({
        where: { trackId },
        data: {
            status: client_1.ShipmentStatus.COMPLETED,
            progressPercent: 100,
            deliveredAt: new Date(),
        },
        include: { driver: true, vehicle: true },
    });
    if (shipment.vehicleId) {
        await prisma_1.default.vehicle.update({
            where: { id: shipment.vehicleId },
            data: { status: 'AVAILABLE' },
        });
    }
    logger_1.logger.info('Shipment completed', { trackId });
    return formatShipment(shipment);
}
async function listVehicles() {
    const vehicles = await prisma_1.default.vehicle.findMany({
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
}
async function listWarehouses() {
    return prisma_1.default.warehouse.findMany({ orderBy: { stockValue: 'desc' } });
}
async function listTopRoutes() {
    return prisma_1.default.route.findMany({ orderBy: { shipmentCount: 'desc' }, take: 10 });
}
function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
