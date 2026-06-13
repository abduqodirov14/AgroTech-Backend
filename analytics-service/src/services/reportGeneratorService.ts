/**
 * @file       reportGeneratorService.ts
 * @module     AnalyticsService/Services
 * @description Compiles and persists farm-level operations reports, aggregating financial KPIs, crop yields, and inventory status.
 */

import prismaClient from '../infrastructure/database/prismaClient';
import { ResourceNotFoundError, InvalidRequestError } from '../utils/errors';
import analyticsLogger from '../utils/logger';
import { fetchAnalyticsOverview } from './analyticsOverviewService';
import { fetchCropProductivity } from './cropProductivityService';
import { fetchInventoryStatus } from './inventoryTrackingService';
import { ReportType, ReportFormat } from '@prisma/client';

export interface ReportCreationInput {
  type: ReportType;
  title: string;
  format?: ReportFormat;
  zoneId?: string;
}

export async function fetchAllReportsForUser(authenticatedUserId: string) {
  analyticsLogger.info('Retrieving reports list', { authenticatedUserId });

  return prismaClient.report.findMany({
    where: { userId: authenticatedUserId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Aggregates farm data into a persisted JSON report record.
 */
export async function compileNewReport(authenticatedUserId: string, reportPayload: ReportCreationInput) {
  analyticsLogger.info('Compiling report data snapshot', { authenticatedUserId, type: reportPayload.type, title: reportPayload.title });

  if (!reportPayload.type || !reportPayload.title) {
    throw new InvalidRequestError('Report type and title must be specified.');
  }

  // 1. Gather all required sub-analytics data
  const [overview, productivity, inventory] = await Promise.all([
    fetchAnalyticsOverview(authenticatedUserId),
    fetchCropProductivity(authenticatedUserId),
    fetchInventoryStatus(authenticatedUserId),
  ]);

  // 2. Format compile payload
  const reportData = {
    generatedAt: new Date().toISOString(),
    reportingPeriod: reportPayload.type,
    financialSummary: {
      revenue: overview.totalRevenue,
      expenses: overview.totalExpenses,
      profit: overview.netProfit,
    },
    topCrops: overview.topCropsByRevenue,
    cropsPerformance: productivity.cropMetrics,
    inventoryDepletedItemsCount: inventory.lowStockAlertsCount,
    totalInventoryValueEstimate: inventory.valueByTypeBreakdown.reduce((sum, item) => sum + item.totalValue, 0),
  };

  // 3. Save report record
  return prismaClient.report.create({
    data: {
      userId: authenticatedUserId,
      type: reportPayload.type,
      format: reportPayload.format || 'JSON',
      title: reportPayload.title,
      data: reportData as any,
      zoneId: reportPayload.zoneId || null,
      fileUrl: null, // For local test runs, report is returned as JSON data
    },
  });
}

export async function fetchReportDetailsById(reportId: string, authenticatedUserId: string) {
  analyticsLogger.info('Retrieving report details by ID', { reportId, authenticatedUserId });

  const report = await prismaClient.report.findFirst({
    where: { id: reportId, userId: authenticatedUserId },
  });

  if (!report) {
    throw new ResourceNotFoundError(`Report with ID ${reportId} was not found for the user.`);
  }

  return report;
}
