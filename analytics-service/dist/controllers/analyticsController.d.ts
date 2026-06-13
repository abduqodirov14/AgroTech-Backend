/**
 * @file       analyticsController.ts
 * @module     AnalyticsService/Controllers
 * @description HTTP controllers for farm KPIs, sales metrics, crop yields, inventory, report compiles, and smart AI recommendations.
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Retrieves the high-level dashboard metrics overview.
 */
export declare function getOverview(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Retrieves sales performance charts and growth.
 */
export declare function getSalesPerformance(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Retrieves crop yields and productivity numbers.
 */
export declare function getCropProductivity(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Retrieves customer purchasing segments.
 */
export declare function getCustomerInsights(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Registers a new customer segment contact.
 */
export declare function createCustomer(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Retrieves inventory levels and warnings.
 */
export declare function getInventoryStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Lists compiled reports.
 */
export declare function getReports(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Compiles and registers a new report.
 */
export declare function createReport(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Retrieves details for a specific report.
 */
export declare function getReportById(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Computes AI suggestions.
 */
export declare function getRecommendations(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Seeder endpoint for analytics mock data.
 */
export declare function seedDemoData(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=analyticsController.d.ts.map