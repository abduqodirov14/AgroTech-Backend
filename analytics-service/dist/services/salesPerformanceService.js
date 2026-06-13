"use strict";
/**
 * @file       salesPerformanceService.ts
 * @module     AnalyticsService/Services
 * @description Analyzes sales data, segmenting by channels, crop types, periods, and buyer accounts.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchSalesPerformance = fetchSalesPerformance;
const prismaClient_1 = __importDefault(require("../infrastructure/database/prismaClient"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Calculates detailed sales performance statistics for a given user.
 * @param authenticatedUserId The farmer's unique key.
 */
async function fetchSalesPerformance(authenticatedUserId) {
    logger_1.default.info('Analyzing sales performance', { authenticatedUserId });
    const userZones = await prismaClient_1.default.zone.findMany({
        where: { userId: authenticatedUserId },
        select: { id: true },
    });
    const zoneIds = userZones.map((z) => z.id);
    // 1. Fetch all sales records
    const sales = await prismaClient_1.default.productSale.findMany({
        where: {
            cropBatch: { zoneId: { in: zoneIds } },
        },
        include: {
            cropBatch: true,
        },
        orderBy: { soldAt: 'asc' },
    });
    // 2. Aggregate sales by month (last 12 months)
    const monthlyMap = new Map();
    const cropMap = new Map();
    const channelMap = new Map();
    const buyerMap = new Map();
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    for (const sale of sales) {
        // Group monthly
        const saleDate = new Date(sale.soldAt);
        const monthKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
        const monthlyData = monthlyMap.get(monthKey) || { revenue: 0, quantity: 0 };
        monthlyMap.set(monthKey, {
            revenue: monthlyData.revenue + sale.totalRevenue,
            quantity: monthlyData.quantity + sale.quantityKg,
        });
        // Group by crop type
        const cropType = sale.cropBatch.cropType;
        const cropData = cropMap.get(cropType) || { revenue: 0, quantity: 0 };
        cropMap.set(cropType, {
            revenue: cropData.revenue + sale.totalRevenue,
            quantity: cropData.quantity + sale.quantityKg,
        });
        // Group by channel
        const currentChannelSum = channelMap.get(sale.channel) || 0;
        channelMap.set(sale.channel, currentChannelSum + sale.totalRevenue);
        // Group by buyer name
        const buyerName = sale.buyerName || 'Mavhum Xaridor';
        const currentBuyerSum = buyerMap.get(buyerName) || 0;
        buyerMap.set(buyerName, currentBuyerSum + sale.totalRevenue);
    }
    // Formatting monthly sales array (sorted chronologically)
    const monthlySales = Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month,
        revenue: data.revenue,
        quantityKg: data.quantity,
    })).sort((a, b) => a.month.localeCompare(b.month));
    const cropSales = Array.from(cropMap.entries()).map(([cropType, data]) => ({
        cropType,
        revenue: data.revenue,
        quantityKg: data.quantity,
    }));
    const channelSales = Array.from(channelMap.entries()).map(([channel, revenue]) => ({
        channel,
        revenue,
    }));
    const topBuyers = Array.from(buyerMap.entries())
        .map(([buyerName, revenue]) => ({ buyerName, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    // 3. Compute growth month-over-month
    const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthRevenue = monthlyMap.get(currentMonthKey)?.revenue || 0;
    const lastMonthRevenue = monthlyMap.get(lastMonthKey)?.revenue || 0;
    let revenueGrowthPercent = 0;
    if (lastMonthRevenue !== 0) {
        revenueGrowthPercent = parseFloat((((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(2));
    }
    else if (currentMonthRevenue > 0) {
        revenueGrowthPercent = 100;
    }
    return {
        monthlySales,
        cropSales,
        channelSales,
        topBuyers,
        revenueGrowthPercent,
    };
}
//# sourceMappingURL=salesPerformanceService.js.map