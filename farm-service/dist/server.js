"use strict";
/**
 * @file       server.ts
 * @module     FarmService
 * @description Listens for incoming HTTP traffic on the configured port.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const logger_1 = __importDefault(require("./utils/logger"));
const serverInstance = app_1.default.listen(env_1.farmServiceConfig.port, () => {
    logger_1.default.info(`Farm Service listening on port ${env_1.farmServiceConfig.port} in ${env_1.farmServiceConfig.nodeEnv} mode.`);
});
process.on('SIGTERM', () => {
    logger_1.default.info('SIGTERM signal received: closing HTTP server...');
    serverInstance.close(() => {
        logger_1.default.info('HTTP server closed.');
    });
});
//# sourceMappingURL=server.js.map