"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const logger_1 = require("./utils/logger");
const trackingService_1 = require("./services/trackingService");
const server = http_1.default.createServer(app_1.default);
// Initialize WebSocket tracking service
(0, trackingService_1.initializeTrackingService)(server);
server.listen(env_1.env.PORT, () => {
    logger_1.logger.info(`✅ Logistics service running on port ${env_1.env.PORT}`);
    logger_1.logger.info(`📍 WebSocket tracking available at ws://localhost:${env_1.env.PORT}`);
});
