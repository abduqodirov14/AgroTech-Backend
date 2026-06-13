/**
 * @file       profitLossStatementService.ts
 * @module     FintechService/Services
 * @description Compiles the Profit and Loss statement, grouping income and expenses by category.
 */

import prismaClient from '../infrastructure/database/prismaClient';
import fintechLogger from '../utils/logger';
import { TransactionCategory } from '@prisma/client';

export interface ProfitLossStatement {
  period: string;
  incomeBreakdown: Array<{ category: TransactionCategory; total: number }>;
  expenseBreakdown: Array<{ category: TransactionCategory; total: number }>;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  statusColor: 'yashil' | 'qizil';
}

/**
 * Compiles a Profit and Loss statement for the given period.
 * @param authenticatedUserId The unique key of the user request context.
 * @param period Optional period filter (defaults to current month YYYY-MM).
 */
export async function generateProfitLossStatement(authenticatedUserId: string, period?: string): Promise<ProfitLossStatement> {
  fintechLogger.info('Generating P&L statement', { authenticatedUserId, period });

  const currentDate = new Date();
  const targetPeriod = period || `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  
  const [yearStr, monthStr] = targetPeriod.split('-');
  const startTimestamp = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
  const endTimestamp = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 0, 23, 59, 59, 999);

  const transactions = await prismaClient.transaction.findMany({
    where: {
      userId: authenticatedUserId,
      createdAt: {
        gte: startTimestamp,
        lte: endTimestamp,
      },
    },
  });

  const incomeMap: Map<TransactionCategory, number> = new Map();
  const expenseMap: Map<TransactionCategory, number> = new Map();

  let totalIncome = 0;
  let totalExpense = 0;

  for (const txn of transactions) {
    if (txn.type === 'INCOME') {
      const currentSum = incomeMap.get(txn.category) || 0;
      incomeMap.set(txn.category, currentSum + txn.amount);
      totalIncome += txn.amount;
    } else if (txn.type === 'EXPENSE') {
      const currentSum = expenseMap.get(txn.category) || 0;
      expenseMap.set(txn.category, currentSum + txn.amount);
      totalExpense += txn.amount;
    }
  }

  const incomeBreakdown = Array.from(incomeMap.entries()).map(([category, total]) => ({
    category,
    total,
  }));

  const expenseBreakdown = Array.from(expenseMap.entries()).map(([category, total]) => ({
    category,
    total,
  }));

  const netProfit = totalIncome - totalExpense;
  const statusColor = netProfit >= 0 ? 'yashil' : 'qizil';

  return {
    period: targetPeriod,
    incomeBreakdown,
    expenseBreakdown,
    totalIncome,
    totalExpense,
    netProfit,
    statusColor,
  };
}
