/**
 * @file       salesPerformanceService.ts
 * @module     AnalyticsService/Services
 * @description Analyzes sales data, segmenting by channels, crop types, periods, and buyer accounts.
 */
import { SaleChannel } from '@prisma/client';
export interface SalesPerformance {
    monthlySales: Array<{
        month: string;
        revenue: number;
        quantityKg: number;
    }>;
    cropSales: Array<{
        cropType: string;
        revenue: number;
        quantityKg: number;
    }>;
    channelSales: Array<{
        channel: SaleChannel;
        revenue: number;
    }>;
    topBuyers: Array<{
        buyerName: string;
        revenue: number;
    }>;
    revenueGrowthPercent: number;
}
/**
 * Calculates detailed sales performance statistics for a given user.
 * @param authenticatedUserId The farmer's unique key.
 */
export declare function fetchSalesPerformance(authenticatedUserId: string): Promise<SalesPerformance>;
//# sourceMappingURL=salesPerformanceService.d.ts.map