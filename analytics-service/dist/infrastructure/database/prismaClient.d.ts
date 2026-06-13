/**
 * @file       prismaClient.ts
 * @module     Infrastructure/Database
 * @description Prisma client singleton for the analytics service database layer.
 */
import { PrismaClient } from '@prisma/client';
declare const prismaClient: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export default prismaClient;
//# sourceMappingURL=prismaClient.d.ts.map