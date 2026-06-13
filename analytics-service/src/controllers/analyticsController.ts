/**
 * @file       analyticsController.ts
 * @module     AnalyticsService/Controllers
 * @description HTTP controllers for farm KPIs, sales metrics, crop yields, inventory, report compiles, and smart AI recommendations.
 */

import { Request, Response, NextFunction } from 'express';
import * as analyticsOverviewService from '../services/analyticsOverviewService';
import * as salesPerformanceService from '../services/salesPerformanceService';
import * as cropProductivityService from '../services/cropProductivityService';
import * as customerInsightsService from '../services/customerInsightsService';
import * as inventoryTrackingService from '../services/inventoryTrackingService';
import * as reportGeneratorService from '../services/reportGeneratorService';
import * as aiRecommendationService from '../services/aiRecommendationService';
import * as analyticsSeedService from '../services/analyticsSeedService';
import { UnauthorizedAccessError } from '../utils/errors';

function extractAuthenticatedUserId(requestFrame: Request): string {
  const userIdHeader = requestFrame.headers['x-user-id'];
  
  if (!userIdHeader || typeof userIdHeader !== 'string') {
    const fallbackUserId = process.env.DEFAULT_DEV_USER_ID;
    if (fallbackUserId) {
      return fallbackUserId;
    }
    throw new UnauthorizedAccessError('Unauthorized access: Missing authenticated user context.');
  }
  
  return userIdHeader;
}

/**
 * Retrieves the high-level dashboard metrics overview.
 */
export async function getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const overview = await analyticsOverviewService.fetchAnalyticsOverview(authenticatedUserId);
    res.status(200).json({ success: true, data: overview });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves sales performance charts and growth.
 */
export async function getSalesPerformance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const sales = await salesPerformanceService.fetchSalesPerformance(authenticatedUserId);
    res.status(200).json({ success: true, data: sales });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves crop yields and productivity numbers.
 */
export async function getCropProductivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const productivity = await cropProductivityService.fetchCropProductivity(authenticatedUserId);
    res.status(200).json({ success: true, data: productivity });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves customer purchasing segments.
 */
export async function getCustomerInsights(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const insights = await customerInsightsService.fetchCustomerInsights(authenticatedUserId);
    res.status(200).json({ success: true, data: insights });
  } catch (error) {
    next(error);
  }
}

/**
 * Registers a new customer segment contact.
 */
export async function createCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const customer = await customerInsightsService.registerCustomer(authenticatedUserId, req.body);
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves inventory levels and warnings.
 */
export async function getInventoryStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const status = await inventoryTrackingService.fetchInventoryStatus(authenticatedUserId);
    res.status(200).json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
}

/**
 * Lists compiled reports.
 */
export async function getReports(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const reports = await reportGeneratorService.fetchAllReportsForUser(authenticatedUserId);
    res.status(200).json({ success: true, data: reports });
  } catch (error) {
    next(error);
  }
}

/**
 * Compiles and registers a new report.
 */
export async function createReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const report = await reportGeneratorService.compileNewReport(authenticatedUserId, req.body);
    res.status(201).json({ success: true, data: report, message: 'Report snapshot compiled and persisted successfully.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves details for a specific report.
 */
export async function getReportById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const { id } = req.params;
    const report = await reportGeneratorService.fetchReportDetailsById(id, authenticatedUserId);
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
}

/**
 * Computes AI suggestions.
 */
export async function getRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const recommendations = await aiRecommendationService.generateAiRecommendations(authenticatedUserId);
    res.status(200).json({ success: true, data: recommendations });
  } catch (error) {
    next(error);
  }
}

/**
 * Seeder endpoint for analytics mock data.
 */
export async function seedDemoData(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await analyticsSeedService.runAnalyticsDemographicSeeder();
    res.status(200).json({ success: true, message: 'Demo analytics records seeded successfully.' });
  } catch (error) {
    next(error);
  }
}
