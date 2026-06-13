"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackingService = void 0;
exports.initializeTrackingService = initializeTrackingService;
exports.getTrackingService = getTrackingService;
const socket_io_1 = require("socket.io");
const logger_1 = require("../utils/logger");
const prisma_1 = __importDefault(require("../infrastructure/database/prisma"));
class TrackingService {
    constructor(httpServer) {
        this.clients = new Map();
        this.io = new socket_io_1.Server(httpServer, {
            cors: { origin: '*', methods: ['GET', 'POST'] },
            transports: ['websocket', 'polling'],
        });
        this.io.on('connection', (socket) => this.handleConnection(socket));
    }
    handleConnection(socket) {
        const userId = socket.handshake.query.userId;
        if (!userId) {
            socket.disconnect();
            return;
        }
        const client = {
            userId,
            trackIds: new Set(),
            socket,
        };
        this.clients.set(socket.id, client);
        logger_1.logger.info('Tracking client connected', { userId, socketId: socket.id });
        // Subscribe to shipment tracking
        socket.on('subscribe', (data) => {
            client.trackIds.add(data.trackId);
            socket.join(`track-${data.trackId}`);
            logger_1.logger.info('Client subscribed to tracking', { userId, trackId: data.trackId });
            socket.emit('subscribed', { trackId: data.trackId });
        });
        // Unsubscribe from tracking
        socket.on('unsubscribe', (data) => {
            client.trackIds.delete(data.trackId);
            socket.leave(`track-${data.trackId}`);
            logger_1.logger.info('Client unsubscribed from tracking', { userId, trackId: data.trackId });
        });
        // Disconnect
        socket.on('disconnect', () => {
            this.clients.delete(socket.id);
            logger_1.logger.info('Tracking client disconnected', { userId, socketId: socket.id });
        });
    }
    // Broadcast shipment update to all clients tracking this shipment
    async broadcastShipmentUpdate(trackId, update) {
        const shipment = await prisma_1.default.shipment.findUnique({
            where: { trackId },
            include: { driver: true, vehicle: true, trackingPoints: { orderBy: { recordedAt: 'desc' }, take: 1 } },
        });
        if (!shipment)
            return;
        const payload = {
            trackId,
            status: shipment.status,
            progress: shipment.progressPercent,
            location: {
                lat: shipment.trackingPoints[0]?.lat || shipment.originLat,
                lng: shipment.trackingPoints[0]?.lng || shipment.originLng,
            },
            temperature: shipment.tempCelsius,
            driver: shipment.driver?.fullName,
            vehicle: shipment.vehicle?.plateNumber,
            eta: shipment.etaAt,
            ...update,
        };
        this.io.to(`track-${trackId}`).emit('shipment:update', payload);
        logger_1.logger.info('Broadcast shipment update', { trackId, status: shipment.status });
    }
    // Broadcast GPS tracking point
    async broadcastTrackingPoint(trackId, lat, lng, tempCelsius) {
        this.io.to(`track-${trackId}`).emit('tracking:point', {
            trackId,
            lat,
            lng,
            temp: tempCelsius,
            timestamp: new Date(),
        });
    }
    // Broadcast cold chain alert
    async broadcastColdChainAlert(trackId, currentTemp, maxAllowed) {
        const shipment = await prisma_1.default.shipment.findUnique({
            where: { trackId },
            include: { driver: true },
        });
        if (!shipment)
            return;
        const alert = {
            trackId,
            type: 'COLD_CHAIN_ALERT',
            severity: 'critical',
            currentTemp,
            maxAllowed,
            excess: currentTemp - maxAllowed,
            cargoType: shipment.cargoType,
            driver: shipment.driver?.fullName,
            timestamp: new Date(),
            message: `⚠️ ALERT: Temperature ${currentTemp}°C exceeds limit of ${maxAllowed}°C for ${shipment.cargoType}`,
        };
        // Broadcast to all clients tracking this shipment
        this.io.to(`track-${trackId}`).emit('alert:cold-chain', alert);
        // Broadcast to admin/ops room
        this.io.to('ops-room').emit('alert:cold-chain', alert);
        logger_1.logger.warn('Broadcast cold chain alert', { trackId, currentTemp, maxAllowed });
    }
    // Broadcast status change
    async broadcastStatusChange(trackId, newStatus, details) {
        const shipment = await prisma_1.default.shipment.findUnique({
            where: { trackId },
        });
        if (!shipment)
            return;
        const statusMap = {
            PENDING_DRIVER: '⏳ Waiting for driver',
            DRIVER_ASSIGNED: '📍 Driver assigned',
            EN_ROUTE_TO_PICKUP: '🚗 En route to pickup',
            LOADING: '📦 Loading cargo',
            IN_TRANSIT: '🚚 In transit',
            ARRIVED: '🏁 Arrived at destination',
            DELIVERED: '✅ Delivered',
            COMPLETED: '✅ Completed',
            CANCELLED: '❌ Cancelled',
            COLD_CHAIN_ALERT: '❄️ Cold chain alert',
        };
        const update = {
            trackId,
            status: newStatus,
            statusLabel: statusMap[newStatus],
            details,
            timestamp: new Date(),
        };
        this.io.to(`track-${trackId}`).emit('shipment:status-change', update);
        logger_1.logger.info('Broadcast status change', { trackId, status: newStatus });
    }
    // Get active connections count
    getActiveConnections() {
        return this.clients.size;
    }
    // Get connections by user
    getConnectionsByUser(userId) {
        let count = 0;
        this.clients.forEach((client) => {
            if (client.userId === userId)
                count++;
        });
        return count;
    }
}
exports.TrackingService = TrackingService;
// Singleton instance
let trackingServiceInstance = null;
function initializeTrackingService(httpServer) {
    trackingServiceInstance = new TrackingService(httpServer);
    logger_1.logger.info('Tracking service initialized');
    return trackingServiceInstance;
}
function getTrackingService() {
    if (!trackingServiceInstance) {
        throw new Error('Tracking service not initialized');
    }
    return trackingServiceInstance;
}
