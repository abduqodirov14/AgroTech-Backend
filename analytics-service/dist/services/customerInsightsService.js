"use strict";
/**
 * @file       customerInsightsService.ts
 * @module     AnalyticsService/Services
 * @description Compiles customer intelligence including segment distributions and repeat transaction rates.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchCustomerInsights = fetchCustomerInsights;
exports.registerCustomer = registerCustomer;
const prismaClient_1 = __importDefault(require("../infrastructure/database/prismaClient"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Calculates customer analytics metrics.
 * @param authenticatedUserId The farmer's unique key.
 */
async function fetchCustomerInsights(authenticatedUserId) {
    logger_1.default.info('Retrieving customer insights', { authenticatedUserId });
    // 1. Retrieve all registered customers
    const customers = await prismaClient_1.default.customer.findMany({
        where: { userId: authenticatedUserId },
        orderBy: { totalPurchases: 'desc' },
    });
    // 2. Segment customers by type
    const typeMap = new Map();
    // Pre-populate enum values
    const customerTypes = ['INDIVIDUAL', 'WHOLESALER', 'RETAILER', 'EXPORTER'];
    for (const type of customerTypes) {
        typeMap.set(type, { count: 0, totalSpent: 0 });
    }
    for (const customer of customers) {
        const data = typeMap.get(customer.type) || { count: 0, totalSpent: 0 };
        typeMap.set(customer.type, {
            count: data.count + 1,
            totalSpent: data.totalSpent + customer.totalPurchases,
        });
    }
    const segmentation = Array.from(typeMap.entries()).map(([type, data]) => ({
        type,
        count: data.count,
        totalSpent: data.totalSpent,
    }));
    // 3. Compute repeat buyer rate from sales ledger
    const userZones = await prismaClient_1.default.zone.findMany({
        where: { userId: authenticatedUserId },
        select: { id: true },
    });
    const zoneIds = userZones.map((z) => z.id);
    const productSales = await prismaClient_1.default.productSale.findMany({
        where: { cropBatch: { zoneId: { in: zoneIds } } },
        select: { buyerName: true },
    });
    const buyerPurchasesCount = new Map();
    for (const sale of productSales) {
        if (!sale.buyerName) {
            continue;
        }
        const currentCount = buyerPurchasesCount.get(sale.buyerName) || 0;
        buyerPurchasesCount.set(sale.buyerName, currentCount + 1);
    }
    const totalBuyers = buyerPurchasesCount.size;
    let repeatBuyers = 0;
    for (const [, purchasesCount] of buyerPurchasesCount.entries()) {
        if (purchasesCount > 1) {
            repeatBuyers++;
        }
    }
    const repeatRate = totalBuyers > 0
        ? parseFloat(((repeatBuyers / totalBuyers) * 100).toFixed(2))
        : 0;
    return {
        customers: customers.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            type: c.type,
            totalPurchases: c.totalPurchases,
        })),
        segmentation,
        repeatRate,
    };
}
async function registerCustomer(authenticatedUserId, customerPayload) {
    logger_1.default.info('Registering new customer account', { authenticatedUserId, customerName: customerPayload.name });
    return prismaClient_1.default.customer.create({
        data: {
            userId: authenticatedUserId,
            name: customerPayload.name,
            phone: customerPayload.phone,
            type: customerPayload.type,
            totalPurchases: customerPayload.totalPurchases ?? 0,
        },
    });
}
//# sourceMappingURL=customerInsightsService.js.map