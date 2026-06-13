"use strict";
/**
 * @file       financialOverviewService.ts
 * @module     FintechService/Services
 * @description Compiles the financial overview KPIs (income, expense, profit trends) and historical monthly performance.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchFinancialOverview = fetchFinancialOverview;
const prismaClient_1 = __importDefault(require("../infrastructure/database/prismaClient"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Calculates user metrics for total income, expense, and net profit comparisons.
 * @param authenticatedUserId The unique key of the user request context.
 */
async function fetchFinancialOverview(authenticatedUserId) {
    logger_1.default.info('Retrieving financial overview data', { authenticatedUserId });
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    const endOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
    const startOfPreviousMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfPreviousMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
    const currentMonthTransactions = await prismaClient_1.default.transaction.findMany({
        where: {
            userId: authenticatedUserId,
            createdAt: {
                gte: startOfCurrentMonth,
                lte: endOfCurrentMonth,
            },
        },
    });
    const previousMonthTransactions = await prismaClient_1.default.transaction.findMany({
        where: {
            userId: authenticatedUserId,
            createdAt: {
                gte: startOfPreviousMonth,
                lte: endOfPreviousMonth,
            },
        },
    });
    let totalIncomeCurrentMonth = 0;
    let totalExpenseCurrentMonth = 0;
    for (const txn of currentMonthTransactions) {
        if (txn.type === 'INCOME') {
            totalIncomeCurrentMonth += txn.amount;
        }
        else if (txn.type === 'EXPENSE') {
            totalExpenseCurrentMonth += txn.amount;
        }
    }
    let totalIncomePreviousMonth = 0;
    let totalExpensePreviousMonth = 0;
    for (const txn of previousMonthTransactions) {
        if (txn.type === 'INCOME') {
            totalIncomePreviousMonth += txn.amount;
        }
        else if (txn.type === 'EXPENSE') {
            totalExpensePreviousMonth += txn.amount;
        }
    }
    const netProfitCurrentMonth = totalIncomeCurrentMonth - totalExpenseCurrentMonth;
    const netProfitPreviousMonth = totalIncomePreviousMonth - totalExpensePreviousMonth;
    let profitTrendPercentage = 0;
    if (netProfitPreviousMonth !== 0) {
        profitTrendPercentage = parseFloat((((netProfitCurrentMonth - netProfitPreviousMonth) / Math.abs(netProfitPreviousMonth)) * 100).toFixed(2));
    }
    else if (netProfitCurrentMonth > 0) {
        profitTrendPercentage = 100;
    }
    const monthlyChartData = [];
    for (let index = 5; index >= 0; index--) {
        const chartMonthDate = new Date(currentYear, currentMonth - index, 1);
        const startOfChartMonth = new Date(chartMonthDate.getFullYear(), chartMonthDate.getMonth(), 1);
        const endOfChartMonth = new Date(chartMonthDate.getFullYear(), chartMonthDate.getMonth() + 1, 0, 23, 59, 59, 999);
        const monthKey = `${chartMonthDate.getFullYear()}-${String(chartMonthDate.getMonth() + 1).padStart(2, '0')}`;
        const monthTransactions = await prismaClient_1.default.transaction.findMany({
            where: {
                userId: authenticatedUserId,
                createdAt: {
                    gte: startOfChartMonth,
                    lte: endOfChartMonth,
                },
            },
        });
        let monthIncome = 0;
        let monthExpense = 0;
        for (const txn of monthTransactions) {
            if (txn.type === 'INCOME') {
                monthIncome += txn.amount;
            }
            else if (txn.type === 'EXPENSE') {
                monthExpense += txn.amount;
            }
        }
        monthlyChartData.push({
            month: monthKey,
            income: monthIncome,
            expense: monthExpense,
            profit: monthIncome - monthExpense,
        });
    }
    return {
        totalIncomeCurrentMonth,
        totalExpenseCurrentMonth,
        netProfitCurrentMonth,
        profitTrendPercentage,
        monthlyChartData,
    };
}
//# sourceMappingURL=financialOverviewService.js.map