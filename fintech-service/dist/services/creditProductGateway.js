"use strict";
/**
 * @file       creditProductGateway.ts
 * @module     FintechService/Services
 * @description Manages available credit product listings, qualifications auditing, and loan application processing.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchEligibleCreditProductsForUser = fetchEligibleCreditProductsForUser;
exports.submitCreditApplication = submitCreditApplication;
exports.fetchCreditApplications = fetchCreditApplications;
const prismaClient_1 = __importDefault(require("../infrastructure/database/prismaClient"));
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
const agroScoringEngine_1 = require("./agroScoringEngine");
/**
 * Lists credit products indicating whether they are unlocked based on the farmer's current score.
 * @param authenticatedUserId Unique user identifier.
 */
async function fetchEligibleCreditProductsForUser(authenticatedUserId) {
    logger_1.default.info('Retrieving qualified credit products', { authenticatedUserId });
    const scoreBreakdown = await (0, agroScoringEngine_1.computeFarmerCreditScore)(authenticatedUserId);
    const currentScore = scoreBreakdown.score;
    const products = await prismaClient_1.default.creditProduct.findMany({
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
async function submitCreditApplication(authenticatedUserId, productId, requestedAmount) {
    logger_1.default.info('Submitting credit application', { authenticatedUserId, productId, requestedAmount });
    if (typeof requestedAmount !== 'number' || requestedAmount <= 0) {
        throw new errors_1.InvalidRequestError('Requested credit amount must be a positive number.');
    }
    const product = await prismaClient_1.default.creditProduct.findUnique({
        where: { id: productId },
    });
    if (!product) {
        throw new errors_1.ResourceNotFoundError(`Credit product with ID ${productId} was not found.`);
    }
    if (requestedAmount > product.maxAmount) {
        throw new errors_1.InvalidRequestError(`Requested amount UZS ${requestedAmount.toLocaleString()} exceeds product limit of UZS ${product.maxAmount.toLocaleString()}.`);
    }
    const scoreBreakdown = await (0, agroScoringEngine_1.computeFarmerCreditScore)(authenticatedUserId);
    const currentScore = scoreBreakdown.score;
    if (currentScore < product.minScore) {
        throw new errors_1.InvalidRequestError(`Your credit score of ${currentScore} is below the required minimum score of ${product.minScore} for this product.`);
    }
    const existingApp = await prismaClient_1.default.creditApplication.findFirst({
        where: {
            userId: authenticatedUserId,
            productId,
            status: { in: ['APPLIED', 'APPROVED'] },
        },
    });
    if (existingApp) {
        throw new errors_1.InvalidRequestError('An active application for this credit product is already in progress.');
    }
    return prismaClient_1.default.creditApplication.create({
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
async function fetchCreditApplications(authenticatedUserId) {
    logger_1.default.info('Retrieving credit applications list', { authenticatedUserId });
    return prismaClient_1.default.creditApplication.findMany({
        where: { userId: authenticatedUserId },
        include: {
            product: true,
        },
        orderBy: { createdAt: 'desc' },
    });
}
//# sourceMappingURL=creditProductGateway.js.map