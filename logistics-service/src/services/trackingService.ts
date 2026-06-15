import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { logger } from '../utils/logger';
import prisma from '../infrastructure/database/prisma';
import { ShipmentStatus } from '@prisma/client';

export interface DriverLocationPayload {
  chatId: number;
  trackId?: string;
  lat: number;
  lng: number;
  tempCelsius?: number;
}

interface TrackingClient {
  userId: string;
  trackIds: Set<string>;
  socket: Socket;
}

export class TrackingService {
  private io: Server;
  private clients: Map<string, TrackingClient> = new Map();

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
      transports: ['websocket', 'polling'],
    });

    this.io.on('connection', (socket) => this.handleConnection(socket));
  }

  private handleConnection(socket: Socket) {
    const userId = socket.handshake.query.userId as string;

    if (!userId) {
      socket.disconnect();
      return;
    }

    const client: TrackingClient = {
      userId,
      trackIds: new Set(),
      socket,
    };

    this.clients.set(socket.id, client);
    logger.info('Tracking client connected', { userId, socketId: socket.id });

    // Subscribe to shipment tracking
    socket.on('subscribe', (data: { trackId: string }) => {
      client.trackIds.add(data.trackId);
      socket.join(`track-${data.trackId}`);
      logger.info('Client subscribed to tracking', { userId, trackId: data.trackId });
      socket.emit('subscribed', { trackId: data.trackId });
    });

    // Unsubscribe from tracking
    socket.on('unsubscribe', (data: { trackId: string }) => {
      client.trackIds.delete(data.trackId);
      socket.leave(`track-${data.trackId}`);
      logger.info('Client unsubscribed from tracking', { userId, trackId: data.trackId });
    });

    // Disconnect
    socket.on('disconnect', () => {
      this.clients.delete(socket.id);
      logger.info('Tracking client disconnected', { userId, socketId: socket.id });
    });
  }

  // Broadcast shipment update to all clients tracking this shipment
  async broadcastShipmentUpdate(trackId: string, update: any) {
    const shipment = await prisma.shipment.findUnique({
      where: { trackId },
      include: { driver: true, vehicle: true, trackingPoints: { orderBy: { recordedAt: 'desc' }, take: 1 } },
    });

    if (!shipment) return;

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
    logger.info('Broadcast shipment update', { trackId, status: shipment.status });
  }

  // Broadcast GPS tracking point
  async broadcastTrackingPoint(trackId: string, lat: number, lng: number, tempCelsius?: number) {
    this.io.to(`track-${trackId}`).emit('tracking:point', {
      trackId,
      lat,
      lng,
      temp: tempCelsius,
      timestamp: new Date(),
    });
  }

  // Broadcast cold chain alert
  async broadcastColdChainAlert(trackId: string, currentTemp: number, maxAllowed: number) {
    const shipment = await prisma.shipment.findUnique({
      where: { trackId },
      include: { driver: true },
    });

    if (!shipment) return;

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

    logger.warn('Broadcast cold chain alert', { trackId, currentTemp, maxAllowed });
  }

  // Broadcast status change
  async broadcastStatusChange(trackId: string, newStatus: ShipmentStatus, details?: string) {
    const shipment = await prisma.shipment.findUnique({
      where: { trackId },
    });

    if (!shipment) return;

    const statusMap: Record<ShipmentStatus, string> = {
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
    logger.info('Broadcast status change', { trackId, status: newStatus });
  }

  // Get active connections count
  getActiveConnections(): number {
    return this.clients.size;
  }

  // Get connections by user
  getConnectionsByUser(userId: string): number {
    let count = 0;
    this.clients.forEach((client) => {
      if (client.userId === userId) count++;
    });
    return count;
  }

  async handleDriverLocation(payload: DriverLocationPayload) {
    const { trackId, lat, lng, tempCelsius } = payload;
    if (!trackId) return;

    const shipment = await prisma.shipment.findUnique({
      where: { trackId },
    });

    if (!shipment) return;

    await prisma.trackingPoint.create({
      data: {
        shipmentId: shipment.id,
        lat,
        lng,
        tempCelsius,
        source: 'TELEGRAM',
      },
    });

    await this.broadcastTrackingPoint(trackId, lat, lng, tempCelsius);

    if (typeof tempCelsius === 'number' && shipment.tempMaxAllowed && tempCelsius > shipment.tempMaxAllowed) {
      await this.broadcastColdChainAlert(trackId, tempCelsius, shipment.tempMaxAllowed);
    }
  }

  createRoom(trackId: string) {
    this.io.emit('room:created', { trackId, room: `track-${trackId}` });
    logger.info('Tracking room ready', { trackId, room: `track-${trackId}` });
    return { success: true, trackId, room: `track-${trackId}` };
  }
}

// Singleton instance
let trackingServiceInstance: TrackingService | null = null;

export function initializeTrackingService(httpServer: HttpServer): TrackingService {
  trackingServiceInstance = new TrackingService(httpServer);
  logger.info('Tracking service initialized');
  return trackingServiceInstance;
}

 export function getTrackingService(): TrackingService {
  if (!trackingServiceInstance) {
    throw new Error('Tracking service not initialized');
  }
  return trackingServiceInstance;
}
