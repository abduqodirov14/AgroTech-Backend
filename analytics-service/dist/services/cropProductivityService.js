"use strict";
/**
 * @file       cropProductivityService.ts
 * @module     AnalyticsService/Services
 * @description Computes crop yield per hectare, production cost per kilogram, and profit margins.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchCropProductivity = fetchCropProductivity;
const prismaClient_1 = __importDefault(require("../infrastructure/database/prismaClient"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Calculates productivity, costs, and profit metrics for all crop batches.
 * @param authenticatedUserId The farmer's unique key.
 */
async function fetchCropProductivity(authenticatedUserId) {
    logger_1.default.info('Analyzing crop productivity and yield efficiency', { authenticatedUserId });
    const userZones = await prismaClient_1.default.zone.findMany({
        where: { userId: authenticatedUserId },
        select: { id: true },
    });
    const zoneIds = userZones.map((z) => z.id);
    // 1. Fetch all crop batches
    const cropBatches = await prismaClient_1.default.cropBatch.findMany({
        where: { zoneId: { in: zoneIds } },
        include: {
            productSales: true,
        },
    });
    // Calculate total area of all crops to allocate costs proportionally
    const totalAreaHectares = cropBatches.reduce((sum, item) => sum + item.areaHectares, 0);
    // 2. Fetch total farm expenses
    const expensesAggregate = await prismaClient_1.default.transaction.aggregate({
        _sum: { amount: true },
        where: {
            userId: authenticatedUserId,
            type: 'EXPENSE',
        },
    });
    const totalExpenses = expensesAggregate._sum.amount ?? 0;
    const cropMetrics = [];
    for (const batch of cropBatches) {
        const totalRevenue = batch.productSales.reduce((sum, item) => sum + item.totalRevenue, 0);
        // Allocate costs proportionally by area size
        const estimatedCost = totalAreaHectares > 0
            ? (batch.areaHectares / totalAreaHectares) * totalExpenses
            : 0;
        const actualYield = batch.actualYieldKg || 0;
        const yieldPerHectare = batch.areaHectares > 0
            ? actualYield / batch.areaHectares
            : null;
        const costPerKg = actualYield > 0
            ? estimatedCost / actualYield
            : null;
        const profit = totalRevenue - estimatedCost;
        const profitMarginPercent = totalRevenue > 0
            ? parseFloat(((profit / totalRevenue) * 100).toFixed(2))
            : 0;
        cropMetrics.push({
            id: batch.id,
            cropType: batch.cropType,
            variety: batch.variety,
            areaHectares: batch.areaHectares,
            actualYieldKg: batch.actualYieldKg,
            yieldPerHectare: yieldPerHectare ? parseFloat(yieldPerHectare.toFixed(2)) : null,
            estimatedCost: parseFloat(estimatedCost.toFixed(2)),
            costPerKg: costPerKg ? parseFloat(costPerKg.toFixed(2)) : null,
            totalRevenue,
            profitMarginPercent,
        });
    }
    // Identify best and worst performing crops based on profit margins (only where revenue exists)
    const revenueGeneratingCrops = cropMetrics.filter((m) => m.totalRevenue > 0);
    let bestPerformingCrop = null;
    let worstPerformingCrop = null;
    if (revenueGeneratingCrops.length > 0) {
        const sortedCrops = [...revenueGeneratingCrops].sort((a, b) => b.profitMarginPercent - a.profitMarginPercent);
        bestPerformingCrop = sortedCrops[0].cropType;
        worstPerformingCrop = sortedCrops[sortedCrops.length - 1].cropType;
    }
    return {
        cropMetrics,
        bestPerformingCrop,
        worstPerformingCrop,
    };
}
//# sourceMappingURL=cropProductivityService.js.map