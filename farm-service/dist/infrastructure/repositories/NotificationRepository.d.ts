import { NotificationType } from '@prisma/client';
export interface NotificationRow {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: Date;
}
export interface CreateNotificationDTO {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
}
export declare class NotificationRepository {
    create(data: CreateNotificationDTO): Promise<NotificationRow>;
    findByUser(userId: string, unreadOnly?: boolean): Promise<NotificationRow[]>;
    markAsRead(id: string): Promise<void>;
    markAllAsRead(userId: string): Promise<void>;
    unreadCount(userId: string): Promise<number>;
}
//# sourceMappingURL=NotificationRepository.d.ts.map