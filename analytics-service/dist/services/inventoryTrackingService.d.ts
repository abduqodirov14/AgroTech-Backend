/**
 * @file       inventoryTrackingService.ts
 * @module     AnalyticsService/Services
 * @description Monitors stock levels, identifies depleted items, and estimates inventory value.
 */
import { InventoryItemType } from '@prisma/client';
export interface InventoryOverview {
    items: Array<{
        id: string;
        name: string;
        itemType: InventoryItemType;
        currentStock: number;
        unit: string;
        reorderLevel: number | null;
        isLowStock: boolean;
        estimatedValue: number;
    }>;
    lowStockAlertsCount: number;
    valueByTypeBreakdown: Array<{
        itemType: InventoryItemType;
        totalValue: number;
    }>;
}
/**
 * Calculates real-time inventory levels, value breakdown and alerts.
 * @param authenticatedUserId The farmer's unique key.
 */
export declare function fetchInventoryStatus(authenticatedUserId: string): Promise<InventoryOverview>;
//# sourceMappingURL=inventoryTrackingService.d.ts.map