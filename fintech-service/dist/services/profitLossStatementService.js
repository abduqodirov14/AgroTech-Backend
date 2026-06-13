"use strict";
/**
 * @file       profitLossStatementService.ts
 * @module     FintechService/Services
 * @description Compiles the Profit and Loss statement, grouping income and expenses by category.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateProfitLossStatement = generateProfitLossStatement;
const prismaClient_1 = __importDefault(require("../infrastructure/database/prismaClient"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Compiles a Profit and Loss statement for the given period.
 * @param authenticatedUserId The unique key of the user request context.
 * @param period Optional period filter (defaults to current month YYYY-MM).
 */
async function generateProfitLossStatement(authenticatedUserId, period) {
    logger_1.default.info('Generating P&L statement', { authenticatedUserId, period });
    const currentDate = new Date();
    const targetPeriod = period || `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const [yearStr, monthStr] = targetPeriod.split('-');
    const startTimestamp = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
    const endTimestamp = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 0, 23, 59, 59, 999);
    const transactions = await prismaClient_1.default.transaction.findMany({
        where: {
            userId: authenticatedUserId,
            createdAt: {
                gte: startTimestamp,
                lte: endTimestamp,
            },
        },
    });
    const incomeMap = new Map();
    const expenseMap = new Map();
    let totalIncome = 0;
    let totalExpense = 0;
    for (const txn of transactions) {
        if (txn.type === 'INCOME') {
            const currentSum = incomeMap.get(txn.category) || 0;
            incomeMap.set(txn.category, currentSum + txn.amount);
            totalIncome += txn.amount;
        }
        else if (txn.type === 'EXPENSE') {
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
//# sourceMappingURL=profitLossStatementService.js.map