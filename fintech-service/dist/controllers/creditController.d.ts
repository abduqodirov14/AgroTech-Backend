/**
 * @file       creditController.ts
 * @module     FintechService/Controllers
 * @description HTTP controllers for credit ratings computation and credit product applications.
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Retrieves the user's credit score rating.
 */
export declare function getCreditScore(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Force recalculates the credit score rating.
 */
export declare function recalculateCreditScore(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Lists credit products indicating eligibility.
 */
export declare function getCreditProducts(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Submits a credit loan application.
 */
export declare function applyForCredit(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Lists submitted credit loan applications.
 */
export declare function getCreditApplications(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=creditController.d.ts.map