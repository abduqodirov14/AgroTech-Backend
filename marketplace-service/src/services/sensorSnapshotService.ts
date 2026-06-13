import prisma from '../infrastructure/database/prisma';
import { logger } from '../utils/logger';

const DAYS = 30;

export interface SensorHistorySummary {
  zoneId: string;
  zoneName: string;
  periodDays: number;
  avgMoisture: number | null;
  avgTemperature: number | null;
  avgPh: number | null;
  irrigationEventsEstimate: number;
  dataPoints: number;
  qualityScore: number;
  readings: Array<{
    date: string;
    moisture: number | null;
    temperature: number | null;
    ph: number | null;
  }>;
}

export async function buildSensorSnapshot(zoneId: string): Promise<SensorHistorySummary | null> {
  const zone = await prisma.zone.findUnique({
    where: { id: zoneId },
    include: { devices: true },
  });

  if (!zone || zone.devices.length === 0) {
    logger.warn('No devices in zone for sensor snapshot', { zoneId });
    return null;
  }

  const deviceIds = zone.devices.map((d) => d.id);
  const since = new Date();
  since.setDate(since.getDate() - DAYS);

  const readings = await prisma.sensorReading.findMany({
    where: {
      deviceId: { in: deviceIds },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'asc' },
    take: 500,
  });

  if (readings.length === 0) {
    return {
      zoneId,
      zoneName: zone.name,
      periodDays: DAYS,
      avgMoisture: null,
      avgTemperature: null,
      avgPh: null,
      irrigationEventsEstimate: 0,
      dataPoints: 0,
      qualityScore: 0,
      readings: [],
    };
  }

  const avg = (vals: (number | null)[]) => {
    const filtered = vals.filter((v): v is number => v != null);
    if (!filtered.length) return null;
    return Math.round((filtered.reduce((a, b) => a + b, 0) / filtered.length) * 100) / 100;
  };

  const avgMoisture = avg(readings.map((r) => r.moisture));
  const avgTemperature = avg(readings.map((r) => r.temperature));
  const avgPh = avg(readings.map((r) => r.ph));

  // Moisture spikes suggest irrigation events
  let irrigationEstimate = 0;
  for (let i = 1; i < readings.length; i++) {
    const prev = readings[i - 1].moisture ?? 0;
    const curr = readings[i].moisture ?? 0;
    if (curr - prev > 8) irrigationEstimate++;
  }

  const expectedPoints = DAYS * 24 * 2; // ~every 30 min ideal
  const qualityScore = Math.min(100, Math.round((readings.length / expectedPoints) * 100));

  const dailyMap = new Map<string, typeof readings>();
  for (const r of readings) {
    const day = r.createdAt.toISOString().slice(0, 10);
    if (!dailyMap.has(day)) dailyMap.set(day, []);
    dailyMap.get(day)!.push(r);
  }

  const dailyReadings = Array.from(dailyMap.entries()).map(([date, dayReadings]) => ({
    date,
    moisture: avg(dayReadings.map((r) => r.moisture)),
    temperature: avg(dayReadings.map((r) => r.temperature)),
    ph: avg(dayReadings.map((r) => r.ph)),
  }));

  return {
    zoneId,
    zoneName: zone.name,
    periodDays: DAYS,
    avgMoisture,
    avgTemperature,
    avgPh,
    irrigationEventsEstimate: irrigationEstimate,
    dataPoints: readings.length,
    qualityScore,
    readings: dailyReadings,
  };
}

export async function attachSnapshotToListing(listingId: string, zoneId: string) {
  const summary = await buildSensorSnapshot(zoneId);
  if (!summary) return null;

  return prisma.listingSensorSnapshot.create({
    data: {
      listingId,
      zoneId,
      data: summary as object,
    },
  });
}
