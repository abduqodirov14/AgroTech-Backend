/**
 * @file       cropProductivityService.ts
 * @module     AnalyticsService/Services
 * @description Computes crop yield per hectare, production cost per kilogram, and profit margins.
 */
export interface CropProductivityMetrics {
    id: string;
    cropType: string;
    variety: string | null;
    areaHectares: number;
    actualYieldKg: number | null;
    yieldPerHectare: number | null;
    estimatedCost: number;
    costPerKg: number | null;
    totalRevenue: number;
    profitMarginPercent: number;
}
export interface CropProductivityReport {
    cropMetrics: CropProductivityMetrics[];
    bestPerformingCrop: string | null;
    worstPerformingCrop: string | null;
}
/**
 * Calculates productivity, costs, and profit metrics for all crop batches.
 * @param authenticatedUserId The farmer's unique key.
 */
export declare function fetchCropProductivity(authenticatedUserId: string): Promise<CropProductivityReport>;
//# sourceMappingURL=cropProductivityService.d.ts.map