"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationRepository = void 0;
const prismaClient_1 = __importDefault(require("../database/prismaClient"));
class NotificationRepository {
    async create(data) {
        return prismaClient_1.default.notification.create({
            data: {
                userId: data.userId,
                type: data.type,
                title: data.title,
                message: data.message,
                isRead: false,
            },
        });
    }
    async findByUser(userId, unreadOnly = false) {
        return prismaClient_1.default.notification.findMany({
            where: {
                userId,
                ...(unreadOnly ? { isRead: false } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }
    async markAsRead(id) {
        await prismaClient_1.default.notification.update({
            where: { id },
            data: { isRead: true },
        });
    }
    async markAllAsRead(userId) {
        await prismaClient_1.default.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
    }
    async unreadCount(userId) {
        return prismaClient_1.default.notification.count({
            where: { userId, isRead: false },
        });
    }
}
exports.NotificationRepository = NotificationRepository;
