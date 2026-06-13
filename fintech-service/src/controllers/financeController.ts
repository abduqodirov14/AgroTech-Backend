/**
 * @file       financeController.ts
 * @module     FintechService/Controllers
 * @description HTTP controllers for financial ledger transactions, budgets, P&L statements, and overviews.
 */

import { Request, Response, NextFunction } from 'express';
import * as financialOverviewService from '../services/financialOverviewService';
import * as transactionLedgerService from '../services/transactionLedgerService';
import * as budgetGuardService from '../services/budgetGuardService';
import * as profitLossStatementService from '../services/profitLossStatementService';
import * as fintechSeedService from '../services/fintechSeedService';
import { UnauthorizedAccessError } from '../utils/errors';

function extractAuthenticatedUserId(requestFrame: Request): string {
  const userIdHeader = requestFrame.headers['x-user-id'];
  
  if (!userIdHeader || typeof userIdHeader !== 'string') {
    const fallbackUserId = process.env.DEFAULT_DEV_USER_ID;
    if (fallbackUserId) {
      return fallbackUserId;
    }
    throw new UnauthorizedAccessError('Unauthorized access: Missing authenticated user context.');
  }
  
  return userIdHeader;
}

/**
 * Retrieves overall financial ledger summaries.
 */
export async function getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const overview = await financialOverviewService.fetchFinancialOverview(authenticatedUserId);
    res.status(200).json({ success: true, data: overview });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves transactions ledger records matching filters and returns paginated result.
 */
export async function getTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const { type, category, startDate, endDate, page, pageSize } = req.query;

    const filters = {
      type: type as any,
      category: category as any,
      startDate: startDate as string,
      endDate: endDate as string,
      page: page ? parseInt(page as string, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
    };

    const result = await transactionLedgerService.fetchTransactionsForUser(authenticatedUserId, filters);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

/**
 * Creates a generic ledger transaction.
 */
export async function createTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const txn = await transactionLedgerService.createTransactionForUser(authenticatedUserId, req.body);
    res.status(201).json({ success: true, data: txn });
  } catch (error) {
    next(error);
  }
}

/**
 * Creates an income ledger transaction.
 */
export async function createIncome(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const payload = { ...req.body, type: 'INCOME' as const };
    const txn = await transactionLedgerService.createTransactionForUser(authenticatedUserId, payload);
    res.status(201).json({ success: true, data: txn });
  } catch (error) {
    next(error);
  }
}

/**
 * Creates an expense ledger transaction.
 */
export async function createExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const payload = { ...req.body, type: 'EXPENSE' as const };
    const txn = await transactionLedgerService.createTransactionForUser(authenticatedUserId, payload);
    res.status(201).json({ success: true, data: txn });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves a compiled Profit and Loss statement.
 */
export async function getProfitLoss(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const { period } = req.query;
    const pl = await profitLossStatementService.generateProfitLossStatement(authenticatedUserId, period as string);
    res.status(200).json({ success: true, data: pl });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves budgets matching specified user context and period.
 */
export async function getBudgets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const { period } = req.query;
    const budgets = await budgetGuardService.fetchAllBudgetsForUser(authenticatedUserId, period as string);
    res.status(200).json({ success: true, data: budgets });
  } catch (error) {
    next(error);
  }
}

/**
 * Creates a new budget boundary.
 */
export async function createBudget(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const budget = await budgetGuardService.createBudgetForUser(authenticatedUserId, req.body);
    res.status(201).json({ success: true, data: budget });
  } catch (error) {
    next(error);
  }
}

/**
 * Deletes a ledger transaction.
 */
export async function deleteTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const { id } = req.params;
    await transactionLedgerService.deleteTransactionForUser(id, authenticatedUserId);
    res.status(200).json({ success: true, message: 'Transaction record deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Seeder endpoint for fintech mock data.
 */
export async function seedDemoData(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await fintechSeedService.runFintechDemographicSeeder();
    res.status(200).json({ success: true, message: 'Demo fintech records seeded successfully.' });
  } catch (error) {
    next(error);
  }
}
