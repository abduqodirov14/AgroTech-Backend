"use strict";
/**
 * @file       financeRoutes.ts
 * @module     FintechService/Routes
 * @description Defines HTTP routes for ledger transactions, budgets, and P&L summaries.
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
const express_1 = require("express");
const financeController = __importStar(require("../controllers/financeController"));
const financeRouter = (0, express_1.Router)();
financeRouter.get('/overview', financeController.getOverview);
financeRouter.get('/transactions', financeController.getTransactions);
financeRouter.post('/transactions', financeController.createTransaction);
financeRouter.delete('/transactions/:id', financeController.deleteTransaction);
financeRouter.post('/income', financeController.createIncome);
financeRouter.post('/expenses', financeController.createExpense);
financeRouter.get('/profit-loss', financeController.getProfitLoss);
financeRouter.get('/budgets', financeController.getBudgets);
financeRouter.post('/budgets', financeController.createBudget);
financeRouter.post('/seed-demo', financeController.seedDemoData);
exports.default = financeRouter;
//# sourceMappingURL=financeRoutes.js.map