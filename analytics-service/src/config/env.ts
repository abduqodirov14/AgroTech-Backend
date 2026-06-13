/**
 * @file       env.ts
 * @module     Config
 * @description Typed environment configuration with fail-fast validation for required variables.
 */

import dotenv from 'dotenv';

// Load .env first to override any pre-existing environment variables
const parsedEnv = dotenv.config({ path: '.env' }).parsed || {};

interface AnalyticsServiceEnv {
  PORT: number;
  DATABASE_URL: string;
  NODE_ENV: string;
}

function loadValidatedEnvironment(): AnalyticsServiceEnv {
  const requiredVariables = ['DATABASE_URL'] as const;

  for (const variableName of requiredVariables) {
    if (!parsedEnv[variableName] && !process.env[variableName]) {
      throw new Error(`Missing required environment variable: ${variableName}`);
    }
  }

  return {
    PORT: parseInt(parsedEnv.PORT || process.env.PORT || '3009', 10),
    DATABASE_URL: parsedEnv.DATABASE_URL || process.env.DATABASE_URL!,
    NODE_ENV: parsedEnv.NODE_ENV || process.env.NODE_ENV || 'development',
  };
}

const analyticsEnv = loadValidatedEnvironment();

export default analyticsEnv;