/**
 * @file       prismaClient.ts
 * @module     infrastructure/database
 * @description Prisma client singleton for the fintech service database layer.
 */

import { PrismaClient } from '@prisma/client';

const prismaClient = new PrismaClient();

export default prismaClient;
