"use strict";
/**
 * @file       env.ts
 * @module     config
 * @description Typed environment configuration with fail-fast validation for required variables.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function loadValidatedEnvironment() {
    const requiredVariables = ['DATABASE_URL'];
    for (const variableName of requiredVariables) {
        if (!process.env[variableName]) {
            throw new Error(`Missing required environment variable: ${variableName}`);
        }
    }
    return {
        PORT: parseInt(process.env.PORT || '3006', 10),
        DATABASE_URL: process.env.DATABASE_URL,
        NODE_ENV: process.env.NODE_ENV || 'development',
    };
}
const fintechEnv = loadValidatedEnvironment();
exports.default = fintechEnv;
//# sourceMappingURL=env.js.map