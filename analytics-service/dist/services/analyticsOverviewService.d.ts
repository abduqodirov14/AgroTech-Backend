/**
 * @file       analyticsOverviewService.ts
 * @module     AnalyticsService/Services
 * @description Provides high-level business performance metrics, including revenue totals, profit margins, and sensor health percentages.
 */
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
export declare function fetchAnalyticsOverview(authenticatedUserId: string): Promise<AnalyticsOverview>;
//# sourceMappingURL=analyticsOverviewService.d.ts.map