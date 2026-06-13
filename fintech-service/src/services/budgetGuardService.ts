/**
 * @file       budgetGuardService.ts
 * @module     FintechService/Services
 * @description Controls budget boundaries, spending audit checks, and alert dispatch on budget exceedance.
 */

import prismaClient from '../infrastructure/database/prismaClient';
import { InvalidRequestError } from '../utils/errors';
import fintechLogger from '../utils/logger';
import { TransactionCategory } from '@prisma/client';

export interface BudgetCreationInput {
  category: TransactionCategory;
  limitAmount: number;
  period: string;
}

/**
 * Retrieves budgets matching specified user context and period.
 * @param authenticatedUserId User owning the budget.
 * @param period Optional period filter.
 */
export async function fetchAllBudgetsForUser(authenticatedUserId: string, period?: string) {
  fintechLogger.info('Retrieving budgets', { authenticatedUserId, period });

  return prismaClient.budget.findMany({
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
export async function createBudgetForUser(authenticatedUserId: string, budgetPayload: BudgetCreationInput) {
  fintechLogger.info('Creating new budget threshold', { authenticatedUserId, category: budgetPayload.category });

  if (!budgetPayload.category || typeof budgetPayload.limitAmount !== 'number' || !budgetPayload.period) {
    throw new InvalidRequestError('Invalid budget parameters. Category, limit amount, and period must be specified.');
  }

  const existingBudget = await prismaClient.budget.findUnique({
    where: {
      userId_category_period: {
        userId: authenticatedUserId,
        category: budgetPayload.category,
        period: budgetPayload.period,
      },
    },
  });

  if (existingBudget) {
    throw new InvalidRequestError(`A budget already exists for category ${budgetPayload.category} in period ${budgetPayload.period}.`);
  }

  const spendAmount = await calculateSpentForCategoryAndPeriod(authenticatedUserId, budgetPayload.category, budgetPayload.period);

  return prismaClient.budget.create({
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
export async function auditSpendingAgainstBudget(
  authenticatedUserId: string,
  category: TransactionCategory,
  amountSpent: number,
  timestamp: Date
): Promise<void> {
  const yearStr = timestamp.getFullYear();
  const monthStr = String(timestamp.getMonth() + 1).padStart(2, '0');
  const monthlyPeriodKey = `${yearStr}-${monthStr}`;

  const quarter = Math.floor(timestamp.getMonth() / 3) + 1;
  const quarterlyPeriodKey = `${yearStr}-Q${quarter}`;

  const activeBudgets = await prismaClient.budget.findMany({
    where: {
      userId: authenticatedUserId,
      category,
      period: { in: [monthlyPeriodKey, quarterlyPeriodKey] },
      isActive: true,
    },
  });

  for (const budget of activeBudgets) {
    const updatedSpentAmount = budget.spent + amountSpent;

    await prismaClient.budget.update({
      where: { id: budget.id },
      data: { spent: updatedSpentAmount },
    });

    if (updatedSpentAmount > budget.limitAmount) {
      fintechLogger.warn('Budget threshold violated', {
        budgetId: budget.id,
        limit: budget.limitAmount,
        spent: updatedSpentAmount,
        category,
      });

      await prismaClient.notification.create({
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
export async function calculateSpentForCategoryAndPeriod(
  userId: string,
  category: TransactionCategory,
  period: string
): Promise<number> {
  let startTimestamp: Date;
  let endTimestamp: Date;

  if (period.includes('-Q')) {
    const [year, qPart] = period.split('-Q');
    const quarterNum = parseInt(qPart, 10);
    const startMonthIndex = (quarterNum - 1) * 3;
    startTimestamp = new Date(parseInt(year, 10), startMonthIndex, 1);
    endTimestamp = new Date(parseInt(year, 10), startMonthIndex + 3, 0, 23, 59, 59, 999);
  } else {
    const [year, month] = period.split('-');
    startTimestamp = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    endTimestamp = new Date(parseInt(year, 10), parseInt(month, 10), 0, 23, 59, 59, 999);
  }

  const aggregates = await prismaClient.transaction.aggregate({
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
