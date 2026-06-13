/**
 * @file       creditController.ts
 * @module     FintechService/Controllers
 * @description HTTP controllers for credit ratings computation and credit product applications.
 */

import { Request, Response, NextFunction } from 'express';
import * as agroScoringEngine from '../services/agroScoringEngine';
import * as creditProductGateway from '../services/creditProductGateway';
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
 * Retrieves the user's credit score rating.
 */
export async function getCreditScore(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const { period } = req.query;
    const score = await agroScoringEngine.computeFarmerCreditScore(authenticatedUserId, period as string);
    res.status(200).json({ success: true, data: score });
  } catch (error) {
    next(error);
  }
}

/**
 * Force recalculates the credit score rating.
 */
export async function recalculateCreditScore(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const { period } = req.body;
    const score = await agroScoringEngine.computeFarmerCreditScore(authenticatedUserId, period as string);
    res.status(200).json({ success: true, data: score, message: 'Credit score recalculated successfully.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Lists credit products indicating eligibility.
 */
export async function getCreditProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const products = await creditProductGateway.fetchEligibleCreditProductsForUser(authenticatedUserId);
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
}

/**
 * Submits a credit loan application.
 */
export async function applyForCredit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const { productId, amount } = req.body;
    const application = await creditProductGateway.submitCreditApplication(authenticatedUserId, productId, amount);
    res.status(201).json({ success: true, data: application, message: 'Credit application submitted successfully.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Lists submitted credit loan applications.
 */
export async function getCreditApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedUserId = extractAuthenticatedUserId(req);
    const applications = await creditProductGateway.fetchCreditApplications(authenticatedUserId);
    res.status(200).json({ success: true, data: applications });
  } catch (error) {
    next(error);
  }
}
