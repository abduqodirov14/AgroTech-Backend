"use strict";
/**
 * @file       financeController.ts
 * @module     FintechService/Controllers
 * @description HTTP controllers for financial ledger transactions, budgets, P&L statements, and overviews.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOverview = getOverview;
exports.getTransactions = getTransactions;
exports.createTransaction = createTransaction;
exports.createIncome = createIncome;
exports.createExpense = createExpense;
exports.getProfitLoss = getProfitLoss;
exports.getBudgets = getBudgets;
exports.createBudget = createBudget;
exports.deleteTransaction = deleteTransaction;
exports.seedDemoData = seedDemoData;
const financialOverviewService = __importStar(require("../services/financialOverviewService"));
const transactionLedgerService = __importStar(require("../services/transactionLedgerService"));
const budgetGuardService = __importStar(require("../services/budgetGuardService"));
const profitLossStatementService = __importStar(require("../services/profitLossStatementService"));
const fintechSeedService = __importStar(require("../services/fintechSeedService"));
const errors_1 = require("../utils/errors");
function extractAuthenticatedUserId(requestFrame) {
    const userIdHeader = requestFrame.headers['x-user-id'];
    if (!userIdHeader || typeof userIdHeader !== 'string') {
        const fallbackUserId = process.env.DEFAULT_DEV_USER_ID;
        if (fallbackUserId) {
            return fallbackUserId;
        }
        throw new errors_1.UnauthorizedAccessError('Unauthorized access: Missing authenticated user context.');
    }
    return userIdHeader;
}
/**
 * Retrieves overall financial ledger summaries.
 */
async function getOverview(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const overview = await financialOverviewService.fetchFinancialOverview(authenticatedUserId);
        res.status(200).json({ success: true, data: overview });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Retrieves transactions ledger records matching filters and returns paginated result.
 */
async function getTransactions(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const { type, category, startDate, endDate, page, pageSize } = req.query;
        const filters = {
            type: type,
            category: category,
            startDate: startDate,
            endDate: endDate,
            page: page ? parseInt(page, 10) : undefined,
            pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
        };
        const result = await transactionLedgerService.fetchTransactionsForUser(authenticatedUserId, filters);
        res.status(200).json({ success: true, ...result });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Creates a generic ledger transaction.
 */
async function createTransaction(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const txn = await transactionLedgerService.createTransactionForUser(authenticatedUserId, req.body);
        res.status(201).json({ success: true, data: txn });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Creates an income ledger transaction.
 */
async function createIncome(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const payload = { ...req.body, type: 'INCOME' };
        const txn = await transactionLedgerService.createTransactionForUser(authenticatedUserId, payload);
        res.status(201).json({ success: true, data: txn });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Creates an expense ledger transaction.
 */
async function createExpense(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const payload = { ...req.body, type: 'EXPENSE' };
        const txn = await transactionLedgerService.createTransactionForUser(authenticatedUserId, payload);
        res.status(201).json({ success: true, data: txn });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Retrieves a compiled Profit and Loss statement.
 */
async function getProfitLoss(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const { period } = req.query;
        const pl = await profitLossStatementService.generateProfitLossStatement(authenticatedUserId, period);
        res.status(200).json({ success: true, data: pl });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Retrieves budgets matching specified user context and period.
 */
async function getBudgets(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const { period } = req.query;
        const budgets = await budgetGuardService.fetchAllBudgetsForUser(authenticatedUserId, period);
        res.status(200).json({ success: true, data: budgets });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Creates a new budget boundary.
 */
async function createBudget(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const budget = await budgetGuardService.createBudgetForUser(authenticatedUserId, req.body);
        res.status(201).json({ success: true, data: budget });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Deletes a ledger transaction.
 */
async function deleteTransaction(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const { id } = req.params;
        await transactionLedgerService.deleteTransactionForUser(id, authenticatedUserId);
        res.status(200).json({ success: true, message: 'Transaction record deleted successfully.' });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Seeder endpoint for fintech mock data.
 */
async function seedDemoData(req, res, next) {
    try {
        await fintechSeedService.runFintechDemographicSeeder();
        res.status(200).json({ success: true, message: 'Demo fintech records seeded successfully.' });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=financeController.js.map