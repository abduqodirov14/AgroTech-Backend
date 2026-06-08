"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const customFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.printf(({ timestamp, level, message, stack }) => {
    const colorMap = {
        info: '\x1b[36m',
        warn: '\x1b[33m',
        error: '\x1b[31m',
        debug: '\x1b[35m',
    };
    const reset = '\x1b[0m';
    const color = colorMap[level] || reset;
    const emoji = {
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
        debug: '🔍',
    };
    return `${color}[${timestamp}] ${emoji[level] || ''} ${level.toUpperCase()}: ${message}${reset}${stack ? `\n${stack}` : ''}`;
}));
exports.logger = winston_1.default.createLogger({
    level: 'info',
    format: customFormat,
    transports: [new winston_1.default.transports.Console()],
});
