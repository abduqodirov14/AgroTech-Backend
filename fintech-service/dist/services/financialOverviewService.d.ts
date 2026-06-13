/**
 * @file       financialOverviewService.ts
 * @module     FintechService/Services
 * @description Compiles the financial overview KPIs (income, expense, profit trends) and historical monthly performance.
 */
export interface FinancialOverview {
    totalIncomeCurrentMonth: number;
    totalExpenseCurrentMonth: number;
    netProfitCurrentMonth: number;
    profitTrendPercentage: number;
    monthlyChartData: Array<{
        month: string;
        income: number;
        expense: number;
        profit: number;
    }>;
}
/**
 * Calculates user metrics for total income, expense, and net profit comparisons.
 * @param authenticatedUserId The unique key of the user request context.
 */
export declare function fetchFinancialOverview(authenticatedUserId: string): Promise<FinancialOverview>;
//# sourceMappingURL=financialOverviewService.d.ts.map