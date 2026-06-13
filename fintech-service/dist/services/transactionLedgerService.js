"use strict";
/**
 * @file       transactionLedgerService.ts
 * @module     FintechService/Services
 * @description Domain logic for creating, viewing, updating and deleting transactions.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchTransactionsForUser = fetchTransactionsForUser;
exports.createTransactionForUser = createTransactionForUser;
exports.deleteTransactionForUser = deleteTransactionForUser;
const prismaClient_1 = __importDefault(require("../infrastructure/database/prismaClient"));
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
const budgetGuardService_1 = require("./budgetGuardService");
/**
 * Retrieves transactions ledger records matching filters and returns paginated result.
 */
async function fetchTransactionsForUser(authenticatedUserId, filters) {
    logger_1.default.info('Retrieving transactions ledger', { authenticatedUserId, filters });
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
        prismaClient_1.default.transaction.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: pageSize,
        }),
        prismaClient_1.default.transaction.count({ where: whereClause }),
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
async function createTransactionForUser(authenticatedUserId, txnPayload) {
    logger_1.default.info('Creating ledger transaction record', { authenticatedUserId, type: txnPayload.type, category: txnPayload.category });
    if (!txnPayload.type || !txnPayload.category || typeof txnPayload.amount !== 'number' || txnPayload.amount <= 0) {
        throw new errors_1.InvalidRequestError('Invalid transaction properties. Type, category, and a positive amount are required.');
    }
    const transactionDate = txnPayload.createdAt ? new Date(txnPayload.createdAt) : new Date();
    const transactionRecord = await prismaClient_1.default.transaction.create({
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
        (0, budgetGuardService_1.auditSpendingAgainstBudget)(authenticatedUserId, txnPayload.category, txnPayload.amount, transactionDate).catch((err) => {
            logger_1.default.error('Budget threshold audit failed', { error: err.message, userId: authenticatedUserId });
        });
    }
    return transactionRecord;
}
/**
 * Deletes a ledger transaction. Corrects budget thresholds if deleting an expense.
 */
async function deleteTransactionForUser(transactionId, authenticatedUserId) {
    logger_1.default.info('Deleting ledger transaction', { transactionId, authenticatedUserId });
    const existingTxn = await prismaClient_1.default.transaction.findFirst({
        where: { id: transactionId, userId: authenticatedUserId },
    });
    if (!existingTxn) {
        throw new errors_1.ResourceNotFoundError(`Transaction with ID ${transactionId} was not found for the authenticated user.`);
    }
    if (existingTxn.type === 'EXPENSE') {
        const transactionDate = existingTxn.createdAt;
        const yearStr = transactionDate.getFullYear();
        const monthStr = String(transactionDate.getMonth() + 1).padStart(2, '0');
        const monthlyPeriodKey = `${yearStr}-${monthStr}`;
        const quarter = Math.floor(transactionDate.getMonth() / 3) + 1;
        const quarterlyPeriodKey = `${yearStr}-Q${quarter}`;
        await prismaClient_1.default.budget.updateMany({
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
    return prismaClient_1.default.transaction.delete({
        where: { id: transactionId },
    });
}
//# sourceMappingURL=transactionLedgerService.js.map