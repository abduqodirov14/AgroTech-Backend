"use strict";
/**
 * @file       inventoryTrackingService.ts
 * @module     AnalyticsService/Services
 * @description Monitors stock levels, identifies depleted items, and estimates inventory value.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchInventoryStatus = fetchInventoryStatus;
const prismaClient_1 = __importDefault(require("../infrastructure/database/prismaClient"));
const logger_1 = __importDefault(require("../utils/logger"));
// Estimated market value per unit (UZS) for different types of farming inventory
const INVENTORY_UNIT_ESTIMATED_PRICES = {
    SEED: 45000, // UZS per kg/bag
    FERTILIZER: 12000, // UZS per kg
    PESTICIDE: 35000, // UZS per liter
    EQUIPMENT: 250000, // UZS per unit
};
/**
 * Calculates real-time inventory levels, value breakdown and alerts.
 * @param authenticatedUserId The farmer's unique key.
 */
async function fetchInventoryStatus(authenticatedUserId) {
    logger_1.default.info('Retrieving inventory status ledger', { authenticatedUserId });
    const userZones = await prismaClient_1.default.zone.findMany({
        where: { userId: authenticatedUserId },
        select: { id: true },
    });
    const zoneIds = userZones.map((z) => z.id);
    // 1. Fetch inventory items linked to user's crop batches
    const items = await prismaClient_1.default.inventoryItem.findMany({
        where: {
            cropBatch: { zoneId: { in: zoneIds } },
        },
        orderBy: { currentStock: 'asc' },
    });
    let lowStockAlertsCount = 0;
    const valueMap = new Map();
    // Initialize value breakdown map
    const itemTypes = ['SEED', 'FERTILIZER', 'PESTICIDE', 'EQUIPMENT'];
    for (const type of itemTypes) {
        valueMap.set(type, 0);
    }
    const processedItems = items.map((item) => {
        const isLowStock = item.reorderLevel !== null && item.currentStock <= item.reorderLevel;
        if (isLowStock) {
            lowStockAlertsCount++;
        }
        const estimatedUnitPrice = INVENTORY_UNIT_ESTIMATED_PRICES[item.itemType] || 10000;
        const estimatedValue = item.currentStock * estimatedUnitPrice;
        const currentTypeSum = valueMap.get(item.itemType) || 0;
        valueMap.set(item.itemType, currentTypeSum + estimatedValue);
        return {
            id: item.id,
            name: item.name,
            itemType: item.itemType,
            currentStock: item.currentStock,
            unit: item.unit,
            reorderLevel: item.reorderLevel,
            isLowStock,
            estimatedValue,
        };
    });
    const valueByTypeBreakdown = Array.from(valueMap.entries()).map(([itemType, totalValue]) => ({
        itemType,
        totalValue,
    }));
    return {
        items: processedItems,
        lowStockAlertsCount,
        valueByTypeBreakdown,
    };
}
//# sourceMappingURL=inventoryTrackingService.js.map