"use strict";
/**
 * @file       reportGeneratorService.ts
 * @module     AnalyticsService/Services
 * @description Compiles and persists farm-level operations reports, aggregating financial KPIs, crop yields, and inventory status.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAllReportsForUser = fetchAllReportsForUser;
exports.compileNewReport = compileNewReport;
exports.fetchReportDetailsById = fetchReportDetailsById;
const prismaClient_1 = __importDefault(require("../infrastructure/database/prismaClient"));
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
const analyticsOverviewService_1 = require("./analyticsOverviewService");
const cropProductivityService_1 = require("./cropProductivityService");
const inventoryTrackingService_1 = require("./inventoryTrackingService");
async function fetchAllReportsForUser(authenticatedUserId) {
    logger_1.default.info('Retrieving reports list', { authenticatedUserId });
    return prismaClient_1.default.report.findMany({
        where: { userId: authenticatedUserId },
        orderBy: { createdAt: 'desc' },
    });
}
/**
 * Aggregates farm data into a persisted JSON report record.
 */
async function compileNewReport(authenticatedUserId, reportPayload) {
    logger_1.default.info('Compiling report data snapshot', { authenticatedUserId, type: reportPayload.type, title: reportPayload.title });
    if (!reportPayload.type || !reportPayload.title) {
        throw new errors_1.InvalidRequestError('Report type and title must be specified.');
    }
    // 1. Gather all required sub-analytics data
    const [overview, productivity, inventory] = await Promise.all([
        (0, analyticsOverviewService_1.fetchAnalyticsOverview)(authenticatedUserId),
        (0, cropProductivityService_1.fetchCropProductivity)(authenticatedUserId),
        (0, inventoryTrackingService_1.fetchInventoryStatus)(authenticatedUserId),
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
    return prismaClient_1.default.report.create({
        data: {
            userId: authenticatedUserId,
            type: reportPayload.type,
            format: reportPayload.format || 'JSON',
            title: reportPayload.title,
            data: reportData,
            zoneId: reportPayload.zoneId || null,
            fileUrl: null, // For local test runs, report is returned as JSON data
        },
    });
}
async function fetchReportDetailsById(reportId, authenticatedUserId) {
    logger_1.default.info('Retrieving report details by ID', { reportId, authenticatedUserId });
    const report = await prismaClient_1.default.report.findFirst({
        where: { id: reportId, userId: authenticatedUserId },
    });
    if (!report) {
        throw new errors_1.ResourceNotFoundError(`Report with ID ${reportId} was not found for the user.`);
    }
    return report;
}
//# sourceMappingURL=reportGeneratorService.js.map