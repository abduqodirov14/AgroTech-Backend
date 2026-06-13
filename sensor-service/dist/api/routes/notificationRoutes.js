"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const NotificationRepository_1 = require("../../infrastructure/repositories/NotificationRepository");
const router = (0, express_1.Router)();
const notificationRepo = new NotificationRepository_1.NotificationRepository();
router.get('/', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const unreadOnly = req.query.unread === 'true';
        const notifications = await notificationRepo.findByUser(userId, unreadOnly);
        return res.json({ success: true, data: notifications });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/unread-count', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const count = await notificationRepo.unreadCount(userId);
        return res.json({ success: true, count });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/:id/read', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        await notificationRepo.markAsRead(req.params.id);
        return res.json({ success: true });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/read-all', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        await notificationRepo.markAllAsRead(userId);
        return res.json({ success: true });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
