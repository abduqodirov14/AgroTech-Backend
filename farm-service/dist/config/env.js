"use strict";
/**
 * @file       env.ts
 * @module     FarmService/Config
 * @description Typed environment configuration with fail-fast validation for required variables.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.farmServiceConfig = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const REQUIRED_ENV_VARS = ['DATABASE_URL'];
function validateEnvironment() {
    const missingVariables = REQUIRED_ENV_VARS.filter((varName) => !process.env[varName]);
    if (missingVariables.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVariables.join(', ')}`);
    }
}
validateEnvironment();
const FARM_SERVICE_PORT = 3002;
exports.farmServiceConfig = {
    port: parseInt(process.env.PORT || String(FARM_SERVICE_PORT), 10),
    databaseUrl: process.env.DATABASE_URL,
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
};
//# sourceMappingURL=env.js.map