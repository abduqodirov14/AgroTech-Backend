/**
 * @file       inventoryTrackingService.ts
 * @module     AnalyticsService/Services
 * @description Monitors stock levels, identifies depleted items, and estimates inventory value.
 */

import prismaClient from '../infrastructure/database/prismaClient';
import analyticsLogger from '../utils/logger';
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

// Estimated market value per unit (UZS) for different types of farming inventory
const INVENTORY_UNIT_ESTIMATED_PRICES: Record<InventoryItemType, number> = {
  SEED: 45000,       // UZS per kg/bag
  FERTILIZER: 12000, // UZS per kg
  PESTICIDE: 35000,  // UZS per liter
  EQUIPMENT: 250000, // UZS per unit
};

/**
 * Calculates real-time inventory levels, value breakdown and alerts.
 * @param authenticatedUserId The farmer's unique key.
 */
export async function fetchInventoryStatus(authenticatedUserId: string): Promise<InventoryOverview> {
  analyticsLogger.info('Retrieving inventory status ledger', { authenticatedUserId });

  const userZones = await prismaClient.zone.findMany({
    where: { userId: authenticatedUserId },
    select: { id: true },
  });
  const zoneIds = userZones.map((z) => z.id);

  // 1. Fetch inventory items linked to user's crop batches
  const items = await prismaClient.inventoryItem.findMany({
    where: {
      cropBatch: { zoneId: { in: zoneIds } },
    },
    orderBy: { currentStock: 'asc' },
  });

  let lowStockAlertsCount = 0;
  const valueMap: Map<InventoryItemType, number> = new Map();

  // Initialize value breakdown map
  const itemTypes: InventoryItemType[] = ['SEED', 'FERTILIZER', 'PESTICIDE', 'EQUIPMENT'];
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
