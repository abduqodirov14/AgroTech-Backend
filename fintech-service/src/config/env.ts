/**
 * @file       env.ts
 * @module     config
 * @description Typed environment configuration with fail-fast validation for required variables.
 */

import dotenv from 'dotenv';
dotenv.config();

interface FintechServiceEnv {
  PORT: number;
  DATABASE_URL: string;
  NODE_ENV: string;
}

function loadValidatedEnvironment(): FintechServiceEnv {
  const requiredVariables = ['DATABASE_URL'] as const;

  for (const variableName of requiredVariables) {
    if (!process.env[variableName]) {
      throw new Error(`Missing required environment variable: ${variableName}`);
    }
  }

  return {
    PORT: parseInt(process.env.PORT || '3006', 10),
    DATABASE_URL: process.env.DATABASE_URL!,
    NODE_ENV: process.env.NODE_ENV || 'development',
  };
}

const fintechEnv = loadValidatedEnvironment();

export default fintechEnv;
