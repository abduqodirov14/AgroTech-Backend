/**
 * @file       prismaClient.ts
 * @module     FarmService/Infrastructure
 * @description Prisma client singleton — prevents connection pool exhaustion during hot-reload.
 */
import { PrismaClient } from '@prisma/client';
declare global {
    var __prismaClient: PrismaClient | undefined;
}
declare const prismaClient: PrismaClient;
export default prismaClient;
//# sourceMappingURL=prismaClient.d.ts.map