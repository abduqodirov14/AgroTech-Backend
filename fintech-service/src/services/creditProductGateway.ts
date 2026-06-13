/**
 * @file       creditProductGateway.ts
 * @module     FintechService/Services
 * @description Manages available credit product listings, qualifications auditing, and loan application processing.
 */

import prismaClient from '../infrastructure/database/prismaClient';
import { ResourceNotFoundError, InvalidRequestError } from '../utils/errors';
import fintechLogger from '../utils/logger';
import { computeFarmerCreditScore } from './agroScoringEngine';

/**
 * Lists credit products indicating whether they are unlocked based on the farmer's current score.
 * @param authenticatedUserId Unique user identifier.
 */
export async function fetchEligibleCreditProductsForUser(authenticatedUserId: string) {
  fintechLogger.info('Retrieving qualified credit products', { authenticatedUserId });

  const scoreBreakdown = await computeFarmerCreditScore(authenticatedUserId);
  const currentScore = scoreBreakdown.score;

  const products = await prismaClient.creditProduct.findMany({
    orderBy: { minScore: 'asc' },
  });

  return products.map((product) => {
    const isUnlocked = currentScore >= product.minScore;
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      maxAmount: product.maxAmount,
      currency: product.currency,
      minScoreRequired: product.minScore,
      isUnlocked,
    };
  });
}

/**
 * Creates a credit request application after confirming scoring minimums and limits.
 */
export async function submitCreditApplication(authenticatedUserId: string, productId: string, requestedAmount: number) {
  fintechLogger.info('Submitting credit application', { authenticatedUserId, productId, requestedAmount });

  if (typeof requestedAmount !== 'number' || requestedAmount <= 0) {
    throw new InvalidRequestError('Requested credit amount must be a positive number.');
  }

  const product = await prismaClient.creditProduct.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new ResourceNotFoundError(`Credit product with ID ${productId} was not found.`);
  }

  if (requestedAmount > product.maxAmount) {
    throw new InvalidRequestError(`Requested amount UZS ${requestedAmount.toLocaleString()} exceeds product limit of UZS ${product.maxAmount.toLocaleString()}.`);
  }

  const scoreBreakdown = await computeFarmerCreditScore(authenticatedUserId);
  const currentScore = scoreBreakdown.score;

  if (currentScore < product.minScore) {
    throw new InvalidRequestError(`Your credit score of ${currentScore} is below the required minimum score of ${product.minScore} for this product.`);
  }

  const existingApp = await prismaClient.creditApplication.findFirst({
    where: {
      userId: authenticatedUserId,
      productId,
      status: { in: ['APPLIED', 'APPROVED'] },
    },
  });

  if (existingApp) {
    throw new InvalidRequestError('An active application for this credit product is already in progress.');
  }

  return prismaClient.creditApplication.create({
    data: {
      userId: authenticatedUserId,
      productId,
      amount: requestedAmount,
      status: 'APPLIED',
      scoreAtApply: currentScore,
    },
    include: {
      product: true,
    },
  });
}

/**
 * Lists all credit applications submitted by the user.
 */
export async function fetchCreditApplications(authenticatedUserId: string) {
  fintechLogger.info('Retrieving credit applications list', { authenticatedUserId });

  return prismaClient.creditApplication.findMany({
    where: { userId: authenticatedUserId },
    include: {
      product: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}
