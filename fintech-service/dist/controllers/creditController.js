"use strict";
/**
 * @file       creditController.ts
 * @module     FintechService/Controllers
 * @description HTTP controllers for credit ratings computation and credit product applications.
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
exports.getCreditScore = getCreditScore;
exports.recalculateCreditScore = recalculateCreditScore;
exports.getCreditProducts = getCreditProducts;
exports.applyForCredit = applyForCredit;
exports.getCreditApplications = getCreditApplications;
const agroScoringEngine = __importStar(require("../services/agroScoringEngine"));
const creditProductGateway = __importStar(require("../services/creditProductGateway"));
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
 * Retrieves the user's credit score rating.
 */
async function getCreditScore(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const { period } = req.query;
        const score = await agroScoringEngine.computeFarmerCreditScore(authenticatedUserId, period);
        res.status(200).json({ success: true, data: score });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Force recalculates the credit score rating.
 */
async function recalculateCreditScore(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const { period } = req.body;
        const score = await agroScoringEngine.computeFarmerCreditScore(authenticatedUserId, period);
        res.status(200).json({ success: true, data: score, message: 'Credit score recalculated successfully.' });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Lists credit products indicating eligibility.
 */
async function getCreditProducts(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const products = await creditProductGateway.fetchEligibleCreditProductsForUser(authenticatedUserId);
        res.status(200).json({ success: true, data: products });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Submits a credit loan application.
 */
async function applyForCredit(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const { productId, amount } = req.body;
        const application = await creditProductGateway.submitCreditApplication(authenticatedUserId, productId, amount);
        res.status(201).json({ success: true, data: application, message: 'Credit application submitted successfully.' });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Lists submitted credit loan applications.
 */
async function getCreditApplications(req, res, next) {
    try {
        const authenticatedUserId = extractAuthenticatedUserId(req);
        const applications = await creditProductGateway.fetchCreditApplications(authenticatedUserId);
        res.status(200).json({ success: true, data: applications });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=creditController.js.map