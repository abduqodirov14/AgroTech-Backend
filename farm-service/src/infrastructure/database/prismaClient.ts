/**
 * @file       prismaClient.ts
 * @module     FarmService/Infrastructure
 * @description Prisma client singleton — prevents connection pool exhaustion during hot-reload.
 */

import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

const prismaClient: PrismaClient =
  globalThis.__prismaClient ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prismaClient = prismaClient;
}

export default prismaClient;
