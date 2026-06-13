"use strict";
/**
 * @file       aiRecommendationService.ts
 * @module     AnalyticsService/Services
 * @description Analyzes farm telemetry and ledger metrics to generate actionable AI-driven agronomic recommendations.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAiRecommendations = generateAiRecommendations;
const prismaClient_1 = __importDefault(require("../infrastructure/database/prismaClient"));
const logger_1 = __importDefault(require("../utils/logger"));
const cropProductivityService_1 = require("./cropProductivityService");
const inventoryTrackingService_1 = require("./inventoryTrackingService");
/**
 * Computes AI suggestions based on crops margins, low soil moisture levels, and depleted items.
 */
async function generateAiRecommendations(authenticatedUserId) {
    logger_1.default.info('Generating AI-driven insights and recommendations', { authenticatedUserId });
    const recommendationsList = [];
    const productivityReport = await (0, cropProductivityService_1.fetchCropProductivity)(authenticatedUserId);
    const cropMetrics = productivityReport.cropMetrics;
    if (cropMetrics.length > 0) {
        const sortedByMargin = [...cropMetrics].sort((a, b) => b.profitMarginPercent - a.profitMarginPercent);
        const topCrop = sortedByMargin[0];
        if (topCrop.profitMarginPercent > 20) {
            recommendationsList.push({
                id: 'rec_crop_margin',
                category: 'EKIN',
                title: `${topCrop.cropType} ekin maydonini kengaytiring`,
                description: `${topCrop.cropType} hosildorligi va sotuvidan olingan foyda marjasi ${topCrop.profitMarginPercent}% ni tashkil etdi. Ushbu turdagi ekinni kelgusi mavsumda 35% ko'proq yetishtirish tavsiya etiladi.`,
                impactScore: 9,
            });
        }
    }
    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const transactions = await prismaClient_1.default.transaction.findMany({
        where: {
            userId: authenticatedUserId,
            type: 'EXPENSE',
            createdAt: { gte: currentMonthStart },
        },
    });
    const categoryTotalExpenses = {};
    let totalExpenses = 0;
    for (const txn of transactions) {
        categoryTotalExpenses[txn.category] = (categoryTotalExpenses[txn.category] || 0) + txn.amount;
        totalExpenses += txn.amount;
    }
    if (totalExpenses > 0) {
        const fertilizerExpense = categoryTotalExpenses['FERTILIZER'] || 0;
        const fertilizerRatio = (fertilizerExpense / totalExpenses) * 100;
        if (fertilizerRatio > 15) {
            recommendationsList.push({
                id: 'rec_expense_fertilizer',
                category: 'OGIT',
                title: "O'g'it xarajatlarini optimallashtirish",
                description: "Mineral o'g'itlar xarajati umumiy xarajatlarning " + fertilizerRatio.toFixed(1) + "% qismini tashkil etdi. Muqobil organik o'g'it yetkazib beruvchilarini topish va sarfni 20% ga kamaytirish tavsiya etiladi.",
                impactScore: 8,
            });
        }
    }
    const userZones = await prismaClient_1.default.zone.findMany({
        where: { userId: authenticatedUserId },
        select: { id: true, name: true },
    });
    const zoneIds = userZones.map((z) => z.id);
    if (zoneIds.length > 0) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const lowMoistureZones = [];
        for (const zone of userZones) {
            const readings = await prismaClient_1.default.sensorReading.findMany({
                where: {
                    device: { zoneId: zone.id },
                    createdAt: { gte: sevenDaysAgo },
                },
                select: { moisture: true },
            });
            if (readings.length > 0) {
                const avgMoisture = readings.reduce((sum, r) => sum + (r.moisture || 0), 0) / readings.length;
                if (avgMoisture < 35) {
                    lowMoistureZones.push({ name: zone.name, avgMoisture });
                }
            }
        }
        if (lowMoistureZones.length > 0) {
            const zoneNamesStr = lowMoistureZones.map((z) => `'${z.name}'`).join(', ');
            recommendationsList.push({
                id: 'rec_moisture_low',
                category: 'NAMNLIK',
                title: 'Namlik darajasi past zonalarga ekin sugorishini tartibga solish',
                description: `Namlik past bo'lgan ${zoneNamesStr} zonalarida hosildorlik 15% gacha kamayishi xavfi bor. Ushbu zonalarda sug'orish datchiklari orqali namlikni 55% atrofida ushlab turish tavsiya etiladi.`,
                impactScore: 7,
            });
        }
    }
    const inventoryStatus = await (0, inventoryTrackingService_1.fetchInventoryStatus)(authenticatedUserId);
    if (inventoryStatus.lowStockAlertsCount > 0) {
        const lowStockItems = inventoryStatus.items.filter((i) => i.isLowStock);
        const itemNamesStr = lowStockItems.map((i) => `'${i.name}'`).join(', ');
        recommendationsList.push({
            id: 'rec_inventory_low',
            category: 'MOLIYA',
            title: 'Kam qolgan agrar zaxiralarini toldirish',
            description: `Omborda ${itemNamesStr} zaxiralari belgilangan minimal miqdordan kam qoldi. Kelgusi mavsumiy ishlar buzilmasligi uchun zaxirani darhol to'ldiring.`,
            impactScore: 8,
        });
    }
    const currentMonthNum = new Date().getMonth() + 1;
    if (currentMonthNum >= 9 && currentMonthNum <= 11) {
        recommendationsList.push({
            id: 'rec_rotation_autumn',
            category: 'ROTATION',
            title: "Ekinlarni almashtirib ekish (Crop rotation)",
            description: "Paxta maydonlarida hosil yig'ishtirilgandan so'ng, tuproq unumdorligini tiklash va azot bilan boyitish uchun dukkakli ekinlar (mosh, soya) yoki beda ekish tavsiya etiladi.",
            impactScore: 6,
        });
    }
    else {
        recommendationsList.push({
            id: 'rec_rotation_spring',
            category: 'ROTATION',
            title: "Sug'orish rejasini ob-havoga moslashtirish",
            description: "Havo harorati oshishi munosabati bilan, suv isrofgarchiligini kamaytirish uchun sug'orish ishlarini faqat kechki va ertalabki soatlarda amalga oshiring.",
            impactScore: 7,
        });
    }
    return recommendationsList;
}
//# sourceMappingURL=aiRecommendationService.js.map