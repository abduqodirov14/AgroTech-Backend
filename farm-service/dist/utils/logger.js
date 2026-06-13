"use strict";
/**
 * @file       logger.ts
 * @module     FarmService/Utils
 * @description Winston structured logger with service-level metadata for farm-service.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const LOG_TIMESTAMP_FORMAT = 'YYYY-MM-DD HH:mm:ss';
const farmServiceLogger = winston_1.default.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    defaultMeta: { service: 'farm-service' },
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({ format: LOG_TIMESTAMP_FORMAT }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console({
            format: process.env.NODE_ENV === 'production'
                ? winston_1.default.format.json()
                : winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.printf(({ timestamp, level, message, service, ...rest }) => {
                    const extraFields = Object.keys(rest).length
                        ? ` ${JSON.stringify(rest)}`
                        : '';
                    return `${timestamp} [${service}] ${level}: ${message}${extraFields}`;
                })),
        }),
    ],
});
exports.default = farmServiceLogger;
//# sourceMappingURL=logger.js.map