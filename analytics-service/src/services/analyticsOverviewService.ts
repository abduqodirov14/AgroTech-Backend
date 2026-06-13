/**
 * @file       analyticsOverviewService.ts
 * @module     AnalyticsService/Services
 * @description Provides high-level business performance metrics, including revenue totals, profit margins, and sensor health percentages.
 */

import prismaClient from '../infrastructure/database/prismaClient';
import analyticsLogger from '../utils/logger';

export interface AnalyticsOverview {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  activeZonesCount: number;
  sensorHealthPercent: number;
  topCropsByRevenue: Array<{
    cropType: string;
    revenue: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
}

/**
 * Gathers KPI overview metrics for the farm analytics dashboard.
 * @param authenticatedUserId The farmer's unique key.
 */
export async function fetchAnalyticsOverview(authenticatedUserId: string): Promise<AnalyticsOverview> {
  analyticsLogger.info('Retrieving analytics overview', { authenticatedUserId });

  // 1. Fetch user zones
  const userZones = await prismaClient.zone.findMany({
    where: { userId: authenticatedUserId },
    select: { id: true },
  });
  const zoneIds = userZones.map((z) => z.id);

  // 2. Query all crop batches in those zones
  const cropBatches = await prismaClient.cropBatch.findMany({
    where: { zoneId: { in: zoneIds } },
    include: {
      productSales: true,
    },
  });

  // Calculate total revenue and top crops
  let totalRevenue = 0;
  const cropRevenueMap: Map<string, number> = new Map();

  for (const batch of cropBatches) {
    let batchRevenue = 0;
    for (const sale of batch.productSales) {
      batchRevenue += sale.totalRevenue;
    }
    totalRevenue += batchRevenue;

    const currentCropSum = cropRevenueMap.get(batch.cropType) || 0;
    cropRevenueMap.set(batch.cropType, currentCropSum + batchRevenue);
  }

  // Calculate top 3 crops
  const topCropsByRevenue = Array.from(cropRevenueMap.entries())
    .map(([cropType, revenue]) => ({ cropType, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 3);

  // 3. Query all expenses from transactions
  const expensesSum = await prismaClient.transaction.aggregate({
    _sum: { amount: true },
    where: {
      userId: authenticatedUserId,
      type: 'EXPENSE',
    },
  });
  const totalExpenses = expensesSum._sum.amount ?? 0;
  const netProfit = totalRevenue - totalExpenses;

  // 4. Calculate active zones and device uptime health
  const activeZonesCount = zoneIds.length;

  const devices = await prismaClient.device.findMany({
    where: { zoneId: { in: zoneIds } },
    select: { status: true },
  });

  const onlineDevicesCount = devices.filter((d) => d.status === 'ONLINE').length;
  const sensorHealthPercent = devices.length > 0
    ? parseFloat(((onlineDevicesCount / devices.length) * 100).toFixed(2))
    : 100;

  // 5. Gather monthly trend for last 6 months (revenue vs expense)
  const monthlyTrend = [];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  for (let index = 5; index >= 0; index--) {
    const targetMonthDate = new Date(currentYear, currentMonth - index, 1);
    const startOfMonth = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth(), 1);
    const endOfMonth = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthKey = `${targetMonthDate.getFullYear()}-${String(targetMonthDate.getMonth() + 1).padStart(2, '0')}`;

    // Calculate sales in target month
    const salesInMonth = await prismaClient.productSale.findMany({
      where: {
        cropBatch: { zoneId: { in: zoneIds } },
        soldAt: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { totalRevenue: true },
    });
    const monthlyRev = salesInMonth.reduce((sum, item) => sum + item.totalRevenue, 0);

    // Calculate expenses in target month
    const expensesInMonth = await prismaClient.transaction.findMany({
      where: {
        userId: authenticatedUserId,
        type: 'EXPENSE',
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { amount: true },
    });
    const monthlyExp = expensesInMonth.reduce((sum, item) => sum + item.amount, 0);

    monthlyTrend.push({
      month: monthKey,
      revenue: monthlyRev,
      expenses: monthlyExp,
      profit: monthlyRev - monthlyExp,
    });
  }

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    activeZonesCount,
    sensorHealthPercent,
    topCropsByRevenue,
    monthlyTrend,
  };
}
