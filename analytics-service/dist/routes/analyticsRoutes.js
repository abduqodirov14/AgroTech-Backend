"use strict";
/**
 * @file       analyticsRoutes.ts
 * @module     AnalyticsService/Routes
 * @description Express router defining routes for crop yields, sales metrics, inventories, compiled reports, and AI recommendations.
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
const analyticsController = __importStar(require("../controllers/analyticsController"));
const analyticsRouter = (0, express_1.Router)();
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
exports.default = analyticsRouter;
//# sourceMappingURL=analyticsRoutes.js.map