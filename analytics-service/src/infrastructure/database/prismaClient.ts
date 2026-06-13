/**
 * @file       prismaClient.ts
 * @module     Infrastructure/Database
 * @description Prisma client singleton for the analytics service database layer.
 */

import { PrismaClient } from '@prisma/client';

const prismaClient = new PrismaClient();

export default prismaClient;
