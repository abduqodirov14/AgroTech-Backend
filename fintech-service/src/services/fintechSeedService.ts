/**
 * @file       fintechSeedService.ts
 * @module     FintechService/Services
 * @description Seeds financial data (transactions, budgets, scores, products) for local development and demonstration.
 */

import prismaClient from '../infrastructure/database/prismaClient';
import fintechLogger from '../utils/logger';
import { TransactionCategory, TransactionType } from '@prisma/client';

/**
 * Seeds default credit products, transaction history, thresholds and scoring logs.
 */
export async function runFintechDemographicSeeder(): Promise<void> {
  fintechLogger.info('Initializing fintech service seeding procedure...');

  const DEFAULT_USER_PHONE = '+998901234567';
  const defaultUser = await prismaClient.user.upsert({
    where: { phone: DEFAULT_USER_PHONE },
    update: {},
    create: {
      phone: DEFAULT_USER_PHONE,
      fullName: 'Anvar Sobirov',
      username: 'anvar_farmer',
      role: 'FARMER',
    },
  });

  fintechLogger.info('Resolved seed tenant user context', { userId: defaultUser.id });

  await prismaClient.transaction.deleteMany({ where: { userId: defaultUser.id } });
  await prismaClient.budget.deleteMany({ where: { userId: defaultUser.id } });
  await prismaClient.creditApplication.deleteMany({ where: { userId: defaultUser.id } });
  await prismaClient.creditProduct.deleteMany({});
  await prismaClient.agroScore.deleteMany({ where: { userId: defaultUser.id } });

  const creditProducts = [
    { name: "Urug'lik & O'g'it Mikrokrediti", maxAmount: 5000000, minScore: 2.0, description: "Kichik hajmdagi urug'lik va mineral o'g'itlar xarid qilish uchun tezkor kredit." },
    { name: "Tomchilatib Sug'orish Tizimi", maxAmount: 15000000, minScore: 3.0, description: "Energiya va suv tejovchi tomchilatib sug'orish uskunalarini o'rnatish uchun mo'ljallangan moliyalashtirish." },
    { name: "Mini Texnika va Mini-Traktorlar", maxAmount: 25000000, minScore: 4.0, description: "Kichik traktorlar va motobloklar sotib olish uchun imtiyozli agrokredit." },
    { name: "Yirik Agrosanoat Loyihalari", maxAmount: 120000000, minScore: 4.5, description: "Issiqxonalar barpo etish va yirik agrar infratuzilmani shakllantirish uchun korporativ kredit." },
  ];

  const seededProducts = [];
  for (const productData of creditProducts) {
    const prod = await prismaClient.creditProduct.create({
      data: productData,
    });
    seededProducts.push(prod);
  }
  fintechLogger.info('Credit products populated', { count: seededProducts.length });

  fintechLogger.info('Populating transaction ledger database records...');
  const baseTimestamp = Date.now();

  const transactionMockTemplates: Array<{
    type: TransactionType;
    category: TransactionCategory;
    amount: number;
    description: string;
  }> = [
    { type: 'INCOME', category: 'CROP_SALE', amount: 45000000, description: 'Pomidor hosili sotuvidan daromad (Makro)' },
    { type: 'INCOME', category: 'CROP_SALE', amount: 65000000, description: 'Gilos eksportidan olingan tushum' },
    { type: 'INCOME', category: 'CROP_SALE', amount: 35000000, description: 'Qovun sotuvidan daromad' },
    { type: 'INCOME', category: 'CROP_SALE', amount: 12000000, description: 'Mahalliy bozorga bodring yetkazib berish' },
    { type: 'INCOME', category: 'MARKETPLACE', amount: 8000000, description: 'Uruglik sotuvidan marketplace tushumi' },
    
    { type: 'EXPENSE', category: 'FERTILIZER', amount: 4500000, description: 'Azotli ogit xaridi' },
    { type: 'EXPENSE', category: 'FERTILIZER', amount: 3200000, description: 'Kaliy tuzi xarid qilish' },
    { type: 'EXPENSE', category: 'PESTICIDE', amount: 2800000, description: 'Zarkun dorilash preparatlari' },
    { type: 'EXPENSE', category: 'FUEL', amount: 1500000, description: 'Traktor uchun dizel yonilgisi' },
    { type: 'EXPENSE', category: 'FUEL', amount: 1800000, description: 'Yuk mashinasi yonilgisi' },
    { type: 'EXPENSE', category: 'LABOR', amount: 12000000, description: 'Mavsumiy ishchilar ish haqi' },
    { type: 'EXPENSE', category: 'LABOR', amount: 8000000, description: 'Sugorish nazoratchisi maoshi' },
    { type: 'EXPENSE', category: 'EQUIPMENT', amount: 7500000, description: 'Yangi kultivator xaridi' },
    { type: 'EXPENSE', category: 'EQUIPMENT', amount: 3000000, description: 'Sugorish shlanglari va filtrlar' },
    { type: 'EXPENSE', category: 'IRRIGATION', amount: 1200000, description: 'Suv nasosi elektr energiyasi tolovi' },
    { type: 'EXPENSE', category: 'LOGISTICS', amount: 5000000, description: 'Ekinlarni bozorga yetkazish logistikasi' },
    { type: 'EXPENSE', category: 'OTHER', amount: 800000, description: 'Ishchilar uchun oziq-ovqat xarajatlari' },
  ];

  const transactionDataArray = [];
  for (let index = 0; index < 55; index++) {
    const template = transactionMockTemplates[index % transactionMockTemplates.length];
    const transactionDate = new Date(baseTimestamp - index * (16 * 60 * 60 * 1000));
    
    const variancePercent = 0.9 + Math.random() * 0.2;
    const finalAmount = Math.round(template.amount * variancePercent);

    transactionDataArray.push({
      userId: defaultUser.id,
      type: template.type,
      category: template.category,
      amount: finalAmount,
      currency: 'UZS',
      description: template.description,
      createdAt: transactionDate,
    });
  }

  await prismaClient.transaction.createMany({
    data: transactionDataArray,
  });

  fintechLogger.info('Transactions ledger seeded successfully', { count: transactionDataArray.length });

  const currentDate = new Date();
  const monthlyPeriodKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const budgetsToCreate = [
    { category: TransactionCategory.FERTILIZER, limit: 12000000 },
    { category: TransactionCategory.FUEL, limit: 5000000 },
    { category: TransactionCategory.LABOR, limit: 25000000 },
  ];

  for (const b of budgetsToCreate) {
    const startTimestamp = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endTimestamp = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const aggregates = await prismaClient.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId: defaultUser.id,
        category: b.category,
        type: 'EXPENSE',
        createdAt: {
          gte: startTimestamp,
          lte: endTimestamp,
        },
      },
    });

    await prismaClient.budget.create({
      data: {
        userId: defaultUser.id,
        category: b.category,
        limitAmount: b.limit,
        spent: aggregates._sum.amount ?? 0,
        period: monthlyPeriodKey,
        isActive: true,
      },
    });
  }
  fintechLogger.info('Budgets thresholds established', { count: budgetsToCreate.length });

  const sampleScore = await prismaClient.agroScore.create({
    data: {
      userId: defaultUser.id,
      score: 3.8,
      sensorUptime: 92.5,
      irrigationScore: 88.0,
      alertPenalty: 10.0,
      period: monthlyPeriodKey,
    },
  });
  fintechLogger.info('Sample credit rating created', { scoreId: sampleScore.id });

  const appliedProduct = seededProducts[1];
  const application = await prismaClient.creditApplication.create({
    data: {
      userId: defaultUser.id,
      productId: appliedProduct.id,
      amount: 12000000,
      status: 'APPLIED',
      scoreAtApply: 3.8,
    },
  });
  fintechLogger.info('Sample credit request filed', { applicationId: application.id });

  fintechLogger.info('Fintech seeding procedure completed successfully.');
}

if (require.main === module) {
  runFintechDemographicSeeder()
    .then(() => {
      fintechLogger.info('Standalone seed script executed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      fintechLogger.error('Standalone seed script failed with fatal error', { error: error.message });
      process.exit(1);
    });
}
