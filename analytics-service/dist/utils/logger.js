"use strict";
/**
 * @file       logger.ts
 * @module     Utils
 * @description Winston structured logger for the analytics service with JSON and console transports.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const env_1 = __importDefault(require("../config/env"));
const SERVICE_NAME = 'analytics-service';
const analyticsLogger = winston_1.default.createLogger({
    level: env_1.default.NODE_ENV === 'production' ? 'info' : 'debug',
    defaultMeta: { service: SERVICE_NAME },
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.printf(({ timestamp, level, message, service, ...rest }) => {
                const extraFields = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
                return `${timestamp} [${service}] ${level}: ${message}${extraFields}`;
            })),
        }),
    ],
});
exports.default = analyticsLogger;
//# sourceMappingURL=logger.js.map