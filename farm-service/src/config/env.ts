/**
 * @file       env.ts
 * @module     FarmService/Config
 * @description Typed environment configuration with fail-fast validation for required variables.
 */

import dotenv from 'dotenv';

dotenv.config();

const REQUIRED_ENV_VARS = ['DATABASE_URL'] as const;

function validateEnvironment(): void {
  const missingVariables = REQUIRED_ENV_VARS.filter(
    (varName) => !process.env[varName]
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVariables.join(', ')}`
    );
  }
}

validateEnvironment();

const FARM_SERVICE_PORT = 3002;

export const farmServiceConfig = {
  port: parseInt(process.env.PORT || String(FARM_SERVICE_PORT), 10),
  databaseUrl: process.env.DATABASE_URL!,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
} as const;
