"use strict";
/**
 * @file       prismaClient.ts
 * @module     Infrastructure/Database
 * @description Prisma client singleton for the analytics service database layer.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prismaClient = new client_1.PrismaClient();
exports.default = prismaClient;
//# sourceMappingURL=prismaClient.js.map