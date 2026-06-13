"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const PUBLIC_PATHS = [
    '/api/v1/auth/telegram-init',
    '/api/v1/auth/verify-code',
    '/api/v1/sensors/upload',
    '/api/v1/marketplace/seed-demo',
    '/api/v1/seed-demo',
    '/api/v1/finance/seed-demo',
    '/api/v1/analytics/seed-demo',
    '/api/v1/farm/seed-demo',
    '/health',
];
const PUBLIC_PREFIXES = ['/api/v1/weather'];
const PUBLIC_GET_PREFIXES = ['/api/v1/marketplace', '/api/v1/logistics', '/api/v1/farm'];
const authMiddleware = (req, res, next) => {
    const path = req.originalUrl.split('?')[0];
    if (PUBLIC_PATHS.some((p) => path === p || path.endsWith(p))) {
        return next();
    }
    if (PUBLIC_PREFIXES.some((p) => path.startsWith(p))) {
        return next();
    }
    if (req.method === 'GET' && PUBLIC_GET_PREFIXES.some((p) => path.startsWith(p))) {
        return next();
    }
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Authorization token required' });
    }
    const token = authHeader.substring(7);
    try {
        const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        req.user = payload;
        req.headers['x-user-id'] = payload.userId;
        req.headers['x-user-phone'] = payload.phone;
        next();
    }
    catch {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
};
exports.authMiddleware = authMiddleware;
