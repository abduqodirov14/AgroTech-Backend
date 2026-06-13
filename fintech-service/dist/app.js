"use strict";
/**
 * @file       app.ts
 * @module     FintechService
 * @description Express application setup, mounting routes and global middleware.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const financeRoutes_1 = __importDefault(require("./routes/financeRoutes"));
const creditRoutes_1 = __importDefault(require("./routes/creditRoutes"));
const logger_1 = __importDefault(require("./utils/logger"));
const errors_1 = require("./utils/errors");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((req, _res, next) => {
    logger_1.default.info(`Incoming request ${req.method} ${req.originalUrl}`);
    next();
});
app.use('/api/v1/finance', financeRoutes_1.default);
app.use('/api/v1/credit', creditRoutes_1.default);
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'UP', service: 'fintech-service' });
});
app.use((error, req, res, _next) => {
    if (error instanceof errors_1.DomainError) {
        logger_1.default.warn(`Domain exception processed: ${error.message}`, {
            statusCode: error.statusCode,
            url: req.originalUrl,
        });
        res.status(error.statusCode).json({
            success: false,
            error: error.constructor.name,
            message: error.message,
        });
        return;
    }
    logger_1.default.error('Unhandled internal server error', {
        errorMessage: error.message,
        stackTrace: error.stack,
        url: req.originalUrl,
    });
    res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'An unexpected internal error occurred on the server.',
    });
});
exports.default = app;
//# sourceMappingURL=app.js.map