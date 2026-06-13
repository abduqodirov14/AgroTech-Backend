/**
 * @file       financeController.ts
 * @module     FintechService/Controllers
 * @description HTTP controllers for financial ledger transactions, budgets, P&L statements, and overviews.
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Retrieves overall financial ledger summaries.
 */
export declare function getOverview(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Retrieves transactions ledger records matching filters and returns paginated result.
 */
export declare function getTransactions(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Creates a generic ledger transaction.
 */
export declare function createTransaction(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Creates an income ledger transaction.
 */
export declare function createIncome(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Creates an expense ledger transaction.
 */
export declare function createExpense(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Retrieves a compiled Profit and Loss statement.
 */
export declare function getProfitLoss(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Retrieves budgets matching specified user context and period.
 */
export declare function getBudgets(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Creates a new budget boundary.
 */
export declare function createBudget(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Deletes a ledger transaction.
 */
export declare function deleteTransaction(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Seeder endpoint for fintech mock data.
 */
export declare function seedDemoData(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=financeController.d.ts.map