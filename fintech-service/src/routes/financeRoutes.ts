/**
 * @file       financeRoutes.ts
 * @module     FintechService/Routes
 * @description Defines HTTP routes for ledger transactions, budgets, and P&L summaries.
 */

import { Router } from 'express';
import * as financeController from '../controllers/financeController';

const financeRouter = Router();

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

export default financeRouter;
