"use strict";
/**
 * @file       budgetGuardService.ts
 * @module     FintechService/Services
 * @description Controls budget boundaries, spending audit checks, and alert dispatch on budget exceedance.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAllBudgetsForUser = fetchAllBudgetsForUser;
exports.createBudgetForUser = createBudgetForUser;
exports.auditSpendingAgainstBudget = auditSpendingAgainstBudget;
exports.calculateSpentForCategoryAndPeriod = calculateSpentForCategoryAndPeriod;
const prismaClient_1 = __importDefault(require("../infrastructure/database/prismaClient"));
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Retrieves budgets matching specified user context and period.
 * @param authenticatedUserId User owning the budget.
 * @param period Optional period filter.
 */
async function fetchAllBudgetsForUser(authenticatedUserId, period) {
    logger_1.default.info('Retrieving budgets', { authenticatedUserId, period });
    return prismaClient_1.default.budget.findMany({
        where: {
            userId: authenticatedUserId,
            isActive: true,
            ...(period ? { period } : {}),
        },
        orderBy: { createdAt: 'desc' },
    });
}
/**
 * Creates a new budget boundary.
 * @param authenticatedUserId User owning the budget.
 * @param budgetPayload Parameters defining limits and category.
 */
async function createBudgetForUser(authenticatedUserId, budgetPayload) {
    logger_1.default.info('Creating new budget threshold', { authenticatedUserId, category: budgetPayload.category });
    if (!budgetPayload.category || typeof budgetPayload.limitAmount !== 'number' || !budgetPayload.period) {
        throw new errors_1.InvalidRequestError('Invalid budget parameters. Category, limit amount, and period must be specified.');
    }
    const existingBudget = await prismaClient_1.default.budget.findUnique({
        where: {
            userId_category_period: {
                userId: authenticatedUserId,
                category: budgetPayload.category,
                period: budgetPayload.period,
            },
        },
    });
    if (existingBudget) {
        throw new errors_1.InvalidRequestError(`A budget already exists for category ${budgetPayload.category} in period ${budgetPayload.period}.`);
    }
    const spendAmount = await calculateSpentForCategoryAndPeriod(authenticatedUserId, budgetPayload.category, budgetPayload.period);
    return prismaClient_1.default.budget.create({
        data: {
            userId: authenticatedUserId,
            category: budgetPayload.category,
            limitAmount: budgetPayload.limitAmount,
            spent: spendAmount,
            period: budgetPayload.period,
            isActive: true,
        },
    });
}
/**
 * Updates budget ledger when an expense occurs, triggering push alerts if boundaries are crossed.
 */
async function auditSpendingAgainstBudget(authenticatedUserId, category, amountSpent, timestamp) {
    const yearStr = timestamp.getFullYear();
    const monthStr = String(timestamp.getMonth() + 1).padStart(2, '0');
    const monthlyPeriodKey = `${yearStr}-${monthStr}`;
    const quarter = Math.floor(timestamp.getMonth() / 3) + 1;
    const quarterlyPeriodKey = `${yearStr}-Q${quarter}`;
    const activeBudgets = await prismaClient_1.default.budget.findMany({
        where: {
            userId: authenticatedUserId,
            category,
            period: { in: [monthlyPeriodKey, quarterlyPeriodKey] },
            isActive: true,
        },
    });
    for (const budget of activeBudgets) {
        const updatedSpentAmount = budget.spent + amountSpent;
        await prismaClient_1.default.budget.update({
            where: { id: budget.id },
            data: { spent: updatedSpentAmount },
        });
        if (updatedSpentAmount > budget.limitAmount) {
            logger_1.default.warn('Budget threshold violated', {
                budgetId: budget.id,
                limit: budget.limitAmount,
                spent: updatedSpentAmount,
                category,
            });
            await prismaClient_1.default.notification.create({
                data: {
                    userId: authenticatedUserId,
                    type: 'ALERT',
                    title: `Budget Exceeded: ${category}`,
                    message: `Your spending in the ${category} category has reached UZS ${updatedSpentAmount.toLocaleString()} which exceeds your set limit of UZS ${budget.limitAmount.toLocaleString()} for ${budget.period}.`,
                },
            });
        }
    }
}
/**
 * Computes historical spend sums for a specific category within period window bounds.
 */
async function calculateSpentForCategoryAndPeriod(userId, category, period) {
    let startTimestamp;
    let endTimestamp;
    if (period.includes('-Q')) {
        const [year, qPart] = period.split('-Q');
        const quarterNum = parseInt(qPart, 10);
        const startMonthIndex = (quarterNum - 1) * 3;
        startTimestamp = new Date(parseInt(year, 10), startMonthIndex, 1);
        endTimestamp = new Date(parseInt(year, 10), startMonthIndex + 3, 0, 23, 59, 59, 999);
    }
    else {
        const [year, month] = period.split('-');
        startTimestamp = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
        endTimestamp = new Date(parseInt(year, 10), parseInt(month, 10), 0, 23, 59, 59, 999);
    }
    const aggregates = await prismaClient_1.default.transaction.aggregate({
        _sum: { amount: true },
        where: {
            userId,
            category,
            type: 'EXPENSE',
            createdAt: {
                gte: startTimestamp,
                lte: endTimestamp,
            },
        },
    });
    return aggregates._sum.amount ?? 0;
}
//# sourceMappingURL=budgetGuardService.js.map