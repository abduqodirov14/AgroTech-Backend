/**
 * @file       transactionLedgerService.ts
 * @module     FintechService/Services
 * @description Domain logic for creating, viewing, updating and deleting transactions.
 */

import prismaClient from '../infrastructure/database/prismaClient';
import { ResourceNotFoundError, InvalidRequestError } from '../utils/errors';
import fintechLogger from '../utils/logger';
import { auditSpendingAgainstBudget } from './budgetGuardService';
import { TransactionType, TransactionCategory } from '@prisma/client';

export interface TransactionCreationInput {
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  currency?: string;
  description?: string;
  referenceId?: string;
  createdAt?: string;
}

export interface TransactionFilterOptions {
  type?: TransactionType;
  category?: TransactionCategory;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Retrieves transactions ledger records matching filters and returns paginated result.
 */
export async function fetchTransactionsForUser(authenticatedUserId: string, filters: TransactionFilterOptions) {
  fintechLogger.info('Retrieving transactions ledger', { authenticatedUserId, filters });

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 20;
  const offset = (page - 1) * pageSize;

  const startTimestamp = filters.startDate ? new Date(filters.startDate) : undefined;
  const endTimestamp = filters.endDate ? new Date(filters.endDate) : undefined;

  const whereClause = {
    userId: authenticatedUserId,
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...((startTimestamp || endTimestamp)
      ? {
          createdAt: {
            ...(startTimestamp ? { gte: startTimestamp } : {}),
            ...(endTimestamp ? { lte: endTimestamp } : {}),
          },
        }
      : {}),
  };

  const [transactions, totalCount] = await Promise.all([
    prismaClient.transaction.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: pageSize,
    }),
    prismaClient.transaction.count({ where: whereClause }),
  ]);

  return {
    transactions,
    pagination: {
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / pageSize),
      pageSize,
    },
  };
}

/**
 * Creates a new transaction and audits spending bounds if it's an expense.
 */
export async function createTransactionForUser(authenticatedUserId: string, txnPayload: TransactionCreationInput) {
  fintechLogger.info('Creating ledger transaction record', { authenticatedUserId, type: txnPayload.type, category: txnPayload.category });

  if (!txnPayload.type || !txnPayload.category || typeof txnPayload.amount !== 'number' || txnPayload.amount <= 0) {
    throw new InvalidRequestError('Invalid transaction properties. Type, category, and a positive amount are required.');
  }

  const transactionDate = txnPayload.createdAt ? new Date(txnPayload.createdAt) : new Date();

  const transactionRecord = await prismaClient.transaction.create({
    data: {
      userId: authenticatedUserId,
      type: txnPayload.type,
      category: txnPayload.category,
      amount: txnPayload.amount,
      currency: txnPayload.currency || 'UZS',
      description: txnPayload.description,
      referenceId: txnPayload.referenceId,
      createdAt: transactionDate,
    },
  });

  if (txnPayload.type === 'EXPENSE') {
    auditSpendingAgainstBudget(authenticatedUserId, txnPayload.category, txnPayload.amount, transactionDate).catch((err) => {
      fintechLogger.error('Budget threshold audit failed', { error: err.message, userId: authenticatedUserId });
    });
  }

  return transactionRecord;
}

/**
 * Deletes a ledger transaction. Corrects budget thresholds if deleting an expense.
 */
export async function deleteTransactionForUser(transactionId: string, authenticatedUserId: string) {
  fintechLogger.info('Deleting ledger transaction', { transactionId, authenticatedUserId });

  const existingTxn = await prismaClient.transaction.findFirst({
    where: { id: transactionId, userId: authenticatedUserId },
  });

  if (!existingTxn) {
    throw new ResourceNotFoundError(`Transaction with ID ${transactionId} was not found for the authenticated user.`);
  }

  if (existingTxn.type === 'EXPENSE') {
    const transactionDate = existingTxn.createdAt;
    const yearStr = transactionDate.getFullYear();
    const monthStr = String(transactionDate.getMonth() + 1).padStart(2, '0');
    const monthlyPeriodKey = `${yearStr}-${monthStr}`;

    const quarter = Math.floor(transactionDate.getMonth() / 3) + 1;
    const quarterlyPeriodKey = `${yearStr}-Q${quarter}`;

    await prismaClient.budget.updateMany({
      where: {
        userId: authenticatedUserId,
        category: existingTxn.category,
        period: { in: [monthlyPeriodKey, quarterlyPeriodKey] },
        isActive: true,
      },
      data: {
        spent: { decrement: existingTxn.amount },
      },
    });
  }

  return prismaClient.transaction.delete({
    where: { id: transactionId },
  });
}
