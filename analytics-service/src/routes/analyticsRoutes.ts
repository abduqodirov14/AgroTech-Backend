/**
 * @file       analyticsRoutes.ts
 * @module     AnalyticsService/Routes
 * @description Express router defining routes for crop yields, sales metrics, inventories, compiled reports, and AI recommendations.
 */

import { Router } from 'express';
import * as analyticsController from '../controllers/analyticsController';

const analyticsRouter = Router();

analyticsRouter.get('/overview', analyticsController.getOverview);
analyticsRouter.get('/sales', analyticsController.getSalesPerformance);
analyticsRouter.get('/products', analyticsController.getCropProductivity);

analyticsRouter.get('/customers', analyticsController.getCustomerInsights);
analyticsRouter.post('/customers', analyticsController.createCustomer);

analyticsRouter.get('/inventory', analyticsController.getInventoryStatus);

analyticsRouter.get('/reports', analyticsController.getReports);
analyticsRouter.post('/reports', analyticsController.createReport);
analyticsRouter.get('/reports/:id', analyticsController.getReportById);

analyticsRouter.get('/recommendations', analyticsController.getRecommendations);

analyticsRouter.post('/seed-demo', analyticsController.seedDemoData);

export default analyticsRouter;
