"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkColdChainViolation = checkColdChainViolation;
exports.logColdChainViolation = logColdChainViolation;
exports.getColdChainAlerts = getColdChainAlerts;
exports.resolveColdChainAlert = resolveColdChainAlert;
const prisma_1 = __importDefault(require("../infrastructure/database/prisma"));
const logger_1 = require("../utils/logger");
const client_1 = require("@prisma/client");
async function checkColdChainViolation(trackId, tempCelsius) {
    const shipment = await prisma_1.default.shipment.findUnique({
        where: { trackId },
        include: {
            driver: true,
            vehicle: true,
        },
    });
    if (!shipment)
        return null;
    // Temperature threshold exceeded
    if (tempCelsius > shipment.tempMaxAllowed) {
        const excess = tempCelsius - shipment.tempMaxAllowed;
        // Log warning
        logger_1.logger.warn('❌ COLD CHAIN ALERT', {
            trackId,
            currentTemp: tempCelsius,
            maxAllowed: shipment.tempMaxAllowed,
            excess: `+${excess}°C`,
            cargo: shipment.cargoType,
            driver: shipment.driver?.fullName,
        });
        // Update shipment status
        await prisma_1.default.shipment.update({
            where: { trackId },
            data: {
                status: client_1.ShipmentStatus.COLD_CHAIN_ALERT,
            },
        });
        // Create alert record
        const alert = {
            shipmentId: shipment.id,
            trackId,
            currentTemp: tempCelsius,
            maxAllowedTemp: shipment.tempMaxAllowed,
            excess,
            timestamp: new Date(),
            cargoType: shipment.cargoType,
            origin: shipment.originAddress,
            destination: shipment.destAddress,
            driver: shipment.driver?.fullName || 'Unknown',
            driverPhone: shipment.driver?.phone || 'N/A',
        };
        return alert;
    }
    return null;
}
async function logColdChainViolation(trackId, tempCelsius, violationDurationMinutes) {
    const shipment = await prisma_1.default.shipment.findUnique({ where: { trackId } });
    if (!shipment)
        return;
    // Log as document metadata
    await prisma_1.default.shipmentDocument.create({
        data: {
            shipmentId: shipment.id,
            type: 'DELIVERY_PROOF',
            metadata: {
                type: 'COLD_CHAIN_VIOLATION',
                temperature: tempCelsius,
                maxAllowed: shipment.tempMaxAllowed,
                duration_minutes: violationDurationMinutes,
                timestamp: new Date().toISOString(),
            },
        },
    });
    logger_1.logger.info('Cold chain violation logged', { trackId, tempCelsius, duration: violationDurationMinutes });
}
async function getColdChainAlerts(limit = 50) {
    const alerts = await prisma_1.default.shipment.findMany({
        where: { status: client_1.ShipmentStatus.COLD_CHAIN_ALERT },
        include: {
            driver: true,
            vehicle: true,
            trackingPoints: { orderBy: { recordedAt: 'desc' }, take: 5 },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
    });
    return alerts.map((s) => ({
        trackId: s.trackId,
        cargoType: s.cargoType,
        route: `${s.originAddress} → ${s.destAddress}`,
        driver: s.driver?.fullName ?? 'Unassigned',
        driverPhone: s.driver?.phone,
        currentTemp: s.tempCelsius,
        maxTemp: s.tempMaxAllowed,
        excess: s.tempCelsius ? s.tempCelsius - s.tempMaxAllowed : 0,
        status: 'CRITICAL',
        alertedAt: s.updatedAt,
        lastTracking: s.trackingPoints[0]?.recordedAt,
    }));
}
async function resolveColdChainAlert(trackId, notes) {
    const shipment = await prisma_1.default.shipment.findUnique({ where: { trackId } });
    if (!shipment)
        return null;
    // Update status back to IN_TRANSIT if temp is back to normal
    const updated = await prisma_1.default.shipment.update({
        where: { trackId },
        data: {
            status: client_1.ShipmentStatus.IN_TRANSIT,
        },
        include: { driver: true, vehicle: true },
    });
    // Log resolution
    if (notes) {
        await prisma_1.default.shipmentDocument.create({
            data: {
                shipmentId: shipment.id,
                type: 'DELIVERY_PROOF',
                metadata: {
                    type: 'COLD_CHAIN_ALERT_RESOLVED',
                    notes,
                    resolvedAt: new Date().toISOString(),
                },
            },
        });
    }
    logger_1.logger.info('Cold chain alert resolved', { trackId, notes });
    return updated;
}
