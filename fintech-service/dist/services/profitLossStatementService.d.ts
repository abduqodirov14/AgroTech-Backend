/**
 * @file       profitLossStatementService.ts
 * @module     FintechService/Services
 * @description Compiles the Profit and Loss statement, grouping income and expenses by category.
 */
import { TransactionCategory } from '@prisma/client';
export interface ProfitLossStatement {
    period: string;
    incomeBreakdown: Array<{
        category: TransactionCategory;
        total: number;
    }>;
    expenseBreakdown: Array<{
        category: TransactionCategory;
        total: number;
    }>;
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
export declare function generateProfitLossStatement(authenticatedUserId: string, period?: string): Promise<ProfitLossStatement>;
//# sourceMappingURL=profitLossStatementService.d.ts.map