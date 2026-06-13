"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateUser = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticateUser = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (userId) {
        req.user = { userId };
        return next();
    }
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    try {
        const token = authHeader.substring(7);
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'dev-secret');
        req.user = { userId: payload.userId, phone: payload.phone };
        next();
    }
    catch {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }
};
exports.authenticateUser = authenticateUser;
