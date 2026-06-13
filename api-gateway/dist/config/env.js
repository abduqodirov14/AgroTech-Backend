"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.env = {
    PORT: parseInt(process.env.PORT || '7600', 10),
    JWT_SECRET: process.env.JWT_SECRET || 'change-this-secret',
    NODE_ENV: process.env.NODE_ENV || 'development',
    services: {
        auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
        farm: process.env.FARM_SERVICE_URL || 'http://localhost:3002',
        weather: process.env.WEATHER_SERVICE_URL || 'http://localhost:3003',
        sensor: process.env.SENSOR_SERVICE_URL || 'http://localhost:3004',
        irrigation: process.env.IRRIGATION_SERVICE_URL || 'http://localhost:3005',
        fintech: process.env.FINTECH_SERVICE_URL || 'http://localhost:3006',
        marketplace: process.env.MARKETPLACE_SERVICE_URL || 'http://localhost:3007',
        logistics: process.env.LOGISTICS_SERVICE_URL || 'http://localhost:3008',
        analytics: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3009',
    },
};
