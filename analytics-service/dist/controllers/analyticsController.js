"use strict";
/**
 * @file       analyticsController.ts
 * @module     AnalyticsService/Controllers
 * @description HTTP controllers for farm KPIs, sales metrics, crop yields, inventory, report compiles, and smart AI recommendations.
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
exports.getSalesPerformance = getSalesPerformance;
exports.getCropProductivity = getCropProductivity;
exports.getCustomerInsights = getCustomerInsights;
exports.createCustomer = createCustomer;
exports.getInventoryStatus = getInventoryStatus;
exports.getReports = getReports;
exports.createReport = createReport;
exports.getReportById = getReportById;
exports.getRecommendations = getRecommendations;
exports.seedDemoData = seedDemoData;
const analyticsOverviewService = __importStar(require("../services/analyticsOverviewService"));
const salesPerformanceService = __importStar(require("../services/salesPerformanceService"));
const cropProductivityService = __importStar(require("../services/cropProductivityService"));
const customerInsightsService = __importStar(require("../services/customerInsightsService"));
const inventoryTrackingService = __importStar(require("../services/inventoryTrackingService"));
const reportGeneratorService = __importStar(require("../services/reportGeneratorService"));
const aiRecommendationService = __importStar(require("../services/aiRecommendationService"));
const analyticsSeedService = __importStar(require("../services/analyticsSeedService"));
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
 * Retrieves the high-level dashboard metrics overview.
 */
async function getOverview(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const overview = await analyticsOverviewService.fetchAnalyticsOverview(authenticatedUserId);
        res.status(200).json({ success: true, data: overview });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Retrieves sales performance charts and growth.
 */
async function getSalesPerformance(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const sales = await salesPerformanceService.fetchSalesPerformance(authenticatedUserId);
        res.status(200).json({ success: true, data: sales });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Retrieves crop yields and productivity numbers.
 */
async function getCropProductivity(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const productivity = await cropProductivityService.fetchCropProductivity(authenticatedUserId);
        res.status(200).json({ success: true, data: productivity });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Retrieves customer purchasing segments.
 */
async function getCustomerInsights(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const insights = await customerInsightsService.fetchCustomerInsights(authenticatedUserId);
        res.status(200).json({ success: true, data: insights });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Registers a new customer segment contact.
 */
async function createCustomer(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const customer = await customerInsightsService.registerCustomer(authenticatedUserId, req.body);
        res.status(201).json({ success: true, data: customer });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Retrieves inventory levels and warnings.
 */
async function getInventoryStatus(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const status = await inventoryTrackingService.fetchInventoryStatus(authenticatedUserId);
        res.status(200).json({ success: true, data: status });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Lists compiled reports.
 */
async function getReports(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const reports = await reportGeneratorService.fetchAllReportsForUser(authenticatedUserId);
        res.status(200).json({ success: true, data: reports });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Compiles and registers a new report.
 */
async function createReport(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const report = await reportGeneratorService.compileNewReport(authenticatedUserId, req.body);
        res.status(201).json({ success: true, data: report, message: 'Report snapshot compiled and persisted successfully.' });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Retrieves details for a specific report.
 */
async function getReportById(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const { id } = req.params;
        const report = await reportGeneratorService.fetchReportDetailsById(id, authenticatedUserId);
        res.status(200).json({ success: true, data: report });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Computes AI suggestions.
 */
async function getRecommendations(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const recommendations = await aiRecommendationService.generateAiRecommendations(authenticatedUserId);
        res.status(200).json({ success: true, data: recommendations });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Seeder endpoint for analytics mock data.
 */
async function seedDemoData(req, res, next) {
    try {
        await analyticsSeedService.runAnalyticsDemographicSeeder();
        res.status(200).json({ success: true, message: 'Demo analytics records seeded successfully.' });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=analyticsController.js.map