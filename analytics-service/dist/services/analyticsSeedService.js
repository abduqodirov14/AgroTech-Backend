"use strict";
/**
 * @file       analyticsSeedService.ts
 * @module     AnalyticsService/Services
 * @description Seeds historical crop batches, sales registers, inventory logs, and customer contacts.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAnalyticsDemographicSeeder = runAnalyticsDemographicSeeder;
const prismaClient_1 = __importDefault(require("../infrastructure/database/prismaClient"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Seeds default crop batches, B2B sales data, inventories, customer profiles, and analytics records.
 */
async function runAnalyticsDemographicSeeder() {
    logger_1.default.info('Initializing analytics database seeding...');
    const DEFAULT_USER_PHONE = '+998901234567';
    const defaultUser = await prismaClient_1.default.user.upsert({
        where: { phone: DEFAULT_USER_PHONE },
        update: {},
        create: {
            phone: DEFAULT_USER_PHONE,
            fullName: 'Anvar Sobirov',
            username: 'anvar_farmer',
            role: 'FARMER',
        },
    });
    // Retrieve zones created by farm service, or create fallback zones if not run yet
    let userZones = await prismaClient_1.default.zone.findMany({
        where: { userId: defaultUser.id },
    });
    if (userZones.length === 0) {
        logger_1.default.warn('No zones found for default user. Seeding fallback zones...');
        const zonesToCreate = [
            { name: 'Pomidor Dalasi', latitude: 41.3111, longitude: 69.2797 },
            { name: "Gilos Bog'i", latitude: 39.6542, longitude: 66.9597 },
            { name: 'Paxta Maydoni', latitude: 40.7836, longitude: 72.3442 },
        ];
        for (const z of zonesToCreate) {
            await prismaClient_1.default.zone.create({
                data: {
                    ...z,
                    userId: defaultUser.id,
                },
            });
        }
        userZones = await prismaClient_1.default.zone.findMany({
            where: { userId: defaultUser.id },
        });
    }
    // Clear previous analytics mock data to allow clean re-runs
    const zoneIds = userZones.map((z) => z.id);
    await prismaClient_1.default.report.deleteMany({ where: { userId: defaultUser.id } });
    await prismaClient_1.default.customer.deleteMany({ where: { userId: defaultUser.id } });
    await prismaClient_1.default.analyticsSnapshot.deleteMany({ where: { zoneId: { in: zoneIds } } });
    await prismaClient_1.default.inventoryItem.deleteMany({ where: { cropBatch: { zoneId: { in: zoneIds } } } });
    await prismaClient_1.default.productSale.deleteMany({ where: { cropBatch: { zoneId: { in: zoneIds } } } });
    await prismaClient_1.default.cropBatch.deleteMany({ where: { zoneId: { in: zoneIds } } });
    // 1. Create crop batches
    const batchesToCreate = [
        { zoneId: userZones[0].id, cropType: 'Pomidor', variety: 'Chiko F1', areaHectares: 2.5, expectedYieldKg: 15000, actualYieldKg: 14200, status: 'HARVESTED', plantedAt: new Date('2026-03-01'), harvestedAt: new Date('2026-06-01') },
        { zoneId: userZones[1].id, cropType: 'Gilos', variety: 'Bahoriy', areaHectares: 4.0, expectedYieldKg: 8000, actualYieldKg: 8300, status: 'HARVESTED', plantedAt: new Date('2025-11-01'), harvestedAt: new Date('2026-05-20') },
        { zoneId: userZones[2].id, cropType: 'Paxta', variety: 'Sulton', areaHectares: 10.0, expectedYieldKg: 35000, actualYieldKg: null, status: 'ACTIVE', plantedAt: new Date('2026-04-15') },
    ];
    const seededBatches = [];
    for (const b of batchesToCreate) {
        const batch = await prismaClient_1.default.cropBatch.create({
            data: b,
        });
        seededBatches.push(batch);
    }
    logger_1.default.info('Crop batches seeded', { count: seededBatches.length });
    // 2. Create 20+ sales registers
    const salesTemplates = [
        { qty: 1200, price: 6500, buyer: 'Korzinka Supermarket', channel: 'DIRECT' },
        { qty: 800, price: 6800, buyer: 'Makro Supermarket', channel: 'DIRECT' },
        { qty: 2500, price: 5800, buyer: 'Fargona Agro Cluster', channel: 'CLUSTER' },
        { qty: 5000, price: 9000, buyer: 'Toshkent Fruit Export', channel: 'EXPORT' },
        { qty: 400, price: 7200, buyer: 'Mavhum Xaridor', channel: 'MARKETPLACE' },
    ];
    let salesCount = 0;
    for (let index = 0; index < 22; index++) {
        const template = salesTemplates[index % salesTemplates.length];
        // Alternate between Pomidor batch (index 0) and Gilos batch (index 1)
        const activeBatch = seededBatches[index % 2];
        // Check if batch is harvested
        if (activeBatch.status !== 'HARVESTED') {
            continue;
        }
        const quantityKg = template.qty * (0.8 + Math.random() * 0.4); // Stagger quantities
        const finalQuantity = parseFloat(quantityKg.toFixed(2));
        const totalRevenue = finalQuantity * template.price;
        await prismaClient_1.default.productSale.create({
            data: {
                cropBatchId: activeBatch.id,
                soldAt: new Date(Date.now() - index * (2 * 24 * 60 * 60 * 1000)), // spaced by 2 days
                quantityKg: finalQuantity,
                unitPrice: template.price,
                totalRevenue: parseFloat(totalRevenue.toFixed(2)),
                buyerName: template.buyer,
                channel: template.channel,
            },
        });
        salesCount++;
    }
    logger_1.default.info('Product sales ledger seeded', { count: salesCount });
    // 3. Create 10 inventory items
    const inventoryItemsList = [
        { batchIndex: 2, type: 'SEED', name: 'Sulton Paxta Urugi', stock: 150, unit: 'kg', reorder: 50 },
        { batchIndex: 2, type: 'FERTILIZER', name: 'Karbamid Ogiti', stock: 800, unit: 'kg', reorder: 200 },
        { batchIndex: 2, type: 'PESTICIDE', name: 'Zarkun Gerbitsidi', stock: 12, unit: 'L', reorder: 15 }, // low stock
        { batchIndex: 0, type: 'SEED', name: 'Chiko F1 Pomidor Urugi', stock: 5, unit: 'kg', reorder: 10 }, // low stock
        { batchIndex: 0, type: 'FERTILIZER', name: 'Superfosfat Ogiti', stock: 450, unit: 'kg', reorder: 100 },
        { batchIndex: 0, type: 'PESTICIDE', name: 'Fungitsid Dorisi', stock: 45, unit: 'L', reorder: 20 },
        { batchIndex: 1, type: 'FERTILIZER', name: 'Ammoniy Nitrat Ogiti', stock: 90, unit: 'kg', reorder: 100 }, // low stock
        { batchIndex: 1, type: 'PESTICIDE', name: 'Insektitsid Aerozol', stock: 8, unit: 'L', reorder: 10 }, // low stock
        { batchIndex: 1, type: 'EQUIPMENT', name: 'Meva Terish Bino-Uskunasi', stock: 35, unit: 'dona', reorder: 5 },
        { batchIndex: 2, type: 'EQUIPMENT', name: 'Kultivator Tishlari', stock: 4, unit: 'dona', reorder: 6 }, // low stock
    ];
    for (const inv of inventoryItemsList) {
        const linkedBatch = seededBatches[inv.batchIndex];
        await prismaClient_1.default.inventoryItem.create({
            data: {
                cropBatchId: linkedBatch.id,
                itemType: inv.type,
                name: inv.name,
                currentStock: inv.stock,
                unit: inv.unit,
                reorderLevel: inv.reorder,
                lastRestockedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
        });
    }
    logger_1.default.info('Inventory items tracking seeded', { count: inventoryItemsList.length });
    // 4. Create 5 customers
    const customersList = [
        { name: 'Korzinka.uz Cluster', phone: '+998911112233', type: 'RETAILER', spent: 45000000 },
        { name: 'Makro Food Department', phone: '+998902223344', type: 'RETAILER', spent: 38000000 },
        { name: 'Jaxon Export-Import LLC', phone: '+998934445566', type: 'EXPORTER', spent: 120000000 },
        { name: 'Sirdaryo Cluster Group', phone: '+998997778899', type: 'WHOLESALER', spent: 85000000 },
        { name: 'Rustam Karimov (Farmer)', phone: '+998971234500', type: 'INDIVIDUAL', spent: 12000000 },
    ];
    for (const c of customersList) {
        await prismaClient_1.default.customer.create({
            data: {
                userId: defaultUser.id,
                name: c.name,
                phone: c.phone,
                type: c.type,
                totalPurchases: c.spent,
            },
        });
    }
    logger_1.default.info('Customer accounts registered', { count: customersList.length });
    // 5. Create 3 analytics snapshots
    const snapshots = [
        { date: new Date('2026-06-10'), avgM: 42.5, avgT: 28.3, avgPh: 6.5, irrig: 3, water: 4500 },
        { date: new Date('2026-06-11'), avgM: 38.0, avgT: 29.1, avgPh: 6.4, irrig: 2, water: 3200 },
        { date: new Date('2026-06-12'), avgM: 40.5, avgT: 27.5, avgPh: 6.5, irrig: 4, water: 6000 },
    ];
    for (const snap of snapshots) {
        await prismaClient_1.default.analyticsSnapshot.create({
            data: {
                zoneId: userZones[0].id,
                date: snap.date,
                avgMoisture: snap.avgM,
                avgTemperature: snap.avgT,
                avgPh: snap.avgPh,
                irrigationCount: snap.irrig,
                waterUsedLiters: snap.water,
            },
        });
    }
    logger_1.default.info('Daily analytics snapshots registered', { count: snapshots.length });
    // 6. Create 2 reports
    await prismaClient_1.default.report.create({
        data: {
            userId: defaultUser.id,
            type: 'MONTHLY',
            format: 'JSON',
            title: 'May Oyi Hosil va Moliyaviy Analiz Hisoboti',
            data: { summary: 'May oyidagi umumiy tushumlar va hosil yigimi haqida qisqacha ma`lumot' },
        },
    });
    await prismaClient_1.default.report.create({
        data: {
            userId: defaultUser.id,
            type: 'ANNUAL',
            format: 'JSON',
            title: '2025-Yil Yillik Agrosanoat Faoliyati Sarhisobi',
            data: { summary: 'O`tgan yildagi sugorish tizimlari samaradorligi va foyda marjalari sharhi' },
        },
    });
    logger_1.default.info('Reports snapshots created', { count: 2 });
    logger_1.default.info('Analytics seeding procedure completed successfully.');
}
if (require.main === module) {
    runAnalyticsDemographicSeeder()
        .then(() => {
        logger_1.default.info('Standalone seed script executed successfully.');
        process.exit(0);
    })
        .catch((error) => {
        logger_1.default.error('Standalone seed script failed with fatal error', { error: error.message });
        process.exit(1);
    });
}
//# sourceMappingURL=analyticsSeedService.js.map