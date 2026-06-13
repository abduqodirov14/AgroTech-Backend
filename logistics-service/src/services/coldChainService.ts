import prisma from '../infrastructure/database/prisma';
import { logger } from '../utils/logger';
import { ShipmentStatus } from '@prisma/client';

export interface ColdChainAlert {
  shipmentId: string;
  trackId: string;
  currentTemp: number;
  maxAllowedTemp: number;
  excess: number;
  timestamp: Date;
  cargoType: string;
  origin: string;
  destination: string;
  driver: string;
  driverPhone: string;
}

export async function checkColdChainViolation(trackId: string, tempCelsius: number): Promise<ColdChainAlert | null> {
  const shipment = await prisma.shipment.findUnique({
    where: { trackId },
    include: {
      driver: true,
      vehicle: true,
    },
  });

  if (!shipment) return null;

  // Temperature threshold exceeded
  if (tempCelsius > shipment.tempMaxAllowed) {
    const excess = tempCelsius - shipment.tempMaxAllowed;

    // Log warning
    logger.warn('❌ COLD CHAIN ALERT', {
      trackId,
      currentTemp: tempCelsius,
      maxAllowed: shipment.tempMaxAllowed,
      excess: `+${excess}°C`,
      cargo: shipment.cargoType,
      driver: shipment.driver?.fullName,
    });

    // Update shipment status
    await prisma.shipment.update({
      where: { trackId },
      data: {
        status: ShipmentStatus.COLD_CHAIN_ALERT,
      },
    });

    // Create alert record
    const alert: ColdChainAlert = {
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

export async function logColdChainViolation(trackId: string, tempCelsius: number, violationDurationMinutes: number) {
  const shipment = await prisma.shipment.findUnique({ where: { trackId } });
  if (!shipment) return;

  // Log as document metadata
  await prisma.shipmentDocument.create({
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

  logger.info('Cold chain violation logged', { trackId, tempCelsius, duration: violationDurationMinutes });
}

export async function getColdChainAlerts(limit = 50) {
  const alerts = await prisma.shipment.findMany({
    where: { status: ShipmentStatus.COLD_CHAIN_ALERT },
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

export async function resolveColdChainAlert(trackId: string, notes?: string) {
  const shipment = await prisma.shipment.findUnique({ where: { trackId } });
  if (!shipment) return null;

  // Update status back to IN_TRANSIT if temp is back to normal
  const updated = await prisma.shipment.update({
    where: { trackId },
    data: {
      status: ShipmentStatus.IN_TRANSIT,
    },
    include: { driver: true, vehicle: true },
  });

  // Log resolution
  if (notes) {
    await prisma.shipmentDocument.create({
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

  logger.info('Cold chain alert resolved', { trackId, notes });
  return updated;
}
