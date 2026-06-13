/**
 * @file       budgetGuardService.ts
 * @module     FintechService/Services
 * @description Controls budget boundaries, spending audit checks, and alert dispatch on budget exceedance.
 */
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
export declare function fetchAllBudgetsForUser(authenticatedUserId: string, period?: string): Promise<{
    id: string;
    userId: string;
    category: import(".prisma/client").$Enums.TransactionCategory;
    createdAt: Date;
    limitAmount: number;
    spent: number;
    period: string;
    isActive: boolean;
}[]>;
/**
 * Creates a new budget boundary.
 * @param authenticatedUserId User owning the budget.
 * @param budgetPayload Parameters defining limits and category.
 */
export declare function createBudgetForUser(authenticatedUserId: string, budgetPayload: BudgetCreationInput): Promise<{
    id: string;
    userId: string;
    category: import(".prisma/client").$Enums.TransactionCategory;
    createdAt: Date;
    limitAmount: number;
    spent: number;
    period: string;
    isActive: boolean;
}>;
/**
 * Updates budget ledger when an expense occurs, triggering push alerts if boundaries are crossed.
 */
export declare function auditSpendingAgainstBudget(authenticatedUserId: string, category: TransactionCategory, amountSpent: number, timestamp: Date): Promise<void>;
/**
 * Computes historical spend sums for a specific category within period window bounds.
 */
export declare function calculateSpentForCategoryAndPeriod(userId: string, category: TransactionCategory, period: string): Promise<number>;
//# sourceMappingURL=budgetGuardService.d.ts.map