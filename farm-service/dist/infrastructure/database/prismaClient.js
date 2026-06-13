"use strict";
/**
 * @file       prismaClient.ts
 * @module     FarmService/Infrastructure
 * @description Prisma client singleton — prevents connection pool exhaustion during hot-reload.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prismaClient = globalThis.__prismaClient ?? new client_1.PrismaClient();
if (process.env.NODE_ENV !== 'production') {
    globalThis.__prismaClient = prismaClient;
}
exports.default = prismaClient;
//# sourceMappingURL=prismaClient.js.map