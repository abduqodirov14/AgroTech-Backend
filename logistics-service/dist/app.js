"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const logisticsRoutes_1 = __importDefault(require("./routes/logisticsRoutes"));
const logger_1 = require("./utils/logger");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        logger_1.logger.info('request', { method: req.method, path: req.originalUrl, status: res.statusCode, durationMs: Date.now() - start });
    });
    next();
});
app.get('/health', (_req, res) => {
    res.json({ status: 'healthy', service: 'logistics-service', version: '2.0.0' });
});
app.use('/api/v1/logistics', logisticsRoutes_1.default);
exports.default = app;
