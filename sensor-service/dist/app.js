"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const sensorRoutes_1 = __importDefault(require("./api/routes/sensorRoutes"));
const deviceRoutes_1 = __importDefault(require("./api/routes/deviceRoutes"));
const notificationRoutes_1 = __importDefault(require("./api/routes/notificationRoutes"));
const authenticateUser_1 = require("./middleware/authenticateUser");
const authenticateDevice_1 = require("./middleware/authenticateDevice");
const logger_1 = require("./utils/logger");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger_1.logger.info(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
    });
    next();
});
app.use('/api/v1/sensors', authenticateDevice_1.authenticateDevice, sensorRoutes_1.default);
app.use('/api/v1/devices', deviceRoutes_1.default);
app.use('/api/v1/notifications', authenticateUser_1.authenticateUser, notificationRoutes_1.default);
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'sensor-service' });
});
exports.default = app;
