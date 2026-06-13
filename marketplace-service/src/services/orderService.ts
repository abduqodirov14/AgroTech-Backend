import { OrderStatus, ListingStatus } from '@prisma/client';
import prisma from '../infrastructure/database/prisma';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { fundEscrow, releaseEscrow } from './escrowService';

function generateOrderNumber(): string {
  const d = new Date();
  const y = d.getFullYear();
  const n = Math.floor(Math.random() * 90000) + 10000;
  return `ORD-${y}-${n}`;
}

export async function createOrder(buyerId: string, listingId: string, quantity: number, notes?: string) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { seller: true },
  });

  if (!listing) throw new NotFoundError('Listing not found');
  if (listing.status !== ListingStatus.ACTIVE) throw new ValidationError('Listing is not available');
  if (listing.sellerId === buyerId) throw new ValidationError('Cannot buy your own listing');
  if (quantity <= 0 || quantity > listing.quantity) {
    throw new ValidationError(`Quantity must be between 1 and ${listing.quantity}`);
  }

  const totalPrice = Math.round(listing.price * quantity * 100) / 100;

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        listingId,
        buyerId,
        quantity,
        unitPrice: listing.price,
        totalPrice,
        currency: 'UZS',
        status: OrderStatus.PENDING,
        notes,
      },
      include: {
        listing: { include: { seller: { select: { fullName: true, phone: true } } } },
      },
    });

    await tx.escrowPayment.create({
      data: {
        orderId: created.id,
        amount: totalPrice,
        currency: 'UZS',
      },
    });

    await tx.b2BContract.create({
      data: {
        orderId: created.id,
        terms: {
          product: listing.title,
          quantity,
          unit: listing.unit,
          unitPrice: listing.price,
          totalPrice,
          seller: listing.seller.fullName,
          sellerPhone: listing.seller.phone,
          hasSensorCertificate: !!listing.zoneId,
          signedElectronically: true,
          platform: 'AgroHub',
        },
      },
    });

    return created;
  });

  logger.info('Order created', { orderNumber: order.orderNumber, buyerId, listingId });

  return order;
}

export async function fundOrderEscrow(orderId: string, buyerId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { listing: true, escrow: true },
  });

  if (!order) throw new NotFoundError('Order not found');
  if (order.buyerId !== buyerId) throw new ForbiddenError('Not your order');
  if (order.status !== OrderStatus.PENDING) throw new ValidationError('Order already funded or completed');

  await fundEscrow(orderId);

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.ESCROW_FUNDED },
    include: { listing: true, escrow: true, contract: true },
  });

  // Trigger logistics shipment (async, non-blocking)
  triggerLogistics(updated).catch((err) =>
    logger.error('Logistics trigger failed', { orderId, error: err.message })
  );

  return updated;
}

async function triggerLogistics(order: {
  id: string;
  orderNumber: string;
  quantity: number;
  listing: { title: string; region: string; zoneId: string | null };
}) {
  const zone = order.listing.zoneId
    ? await prisma.zone.findUnique({ where: { id: order.listing.zoneId } })
    : null;

  const payload = {
    orderId: order.id,
    originLat: zone?.latitude ?? 40.1,
    originLng: zone?.longitude ?? 65.4,
    originAddress: zone?.name ?? order.listing.region,
    destLat: 41.31,
    destLng: 69.28,
    destAddress: 'Tashkent Distribution Hub',
    cargoType: order.listing.title,
    weightTons: order.quantity > 1000 ? order.quantity / 1000 : order.quantity,
    freightCost: Math.round(order.quantity * 0.05),
  };

  const res = await fetch(`${env.LOGISTICS_SERVICE_URL}/api/v1/logistics/shipments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Logistics API returned ${res.status}`);
  }

  const data = await res.json();
  await prisma.order.update({
    where: { id: order.id },
    data: { status: OrderStatus.IN_TRANSIT },
  });

  logger.info('Logistics shipment triggered', {
    orderNumber: order.orderNumber,
    trackId: data.data?.trackId,
  });

  return data;
}

export async function confirmDelivery(orderId: string, buyerId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { listing: true, escrow: true },
  });

  if (!order) throw new NotFoundError('Order not found');
  if (order.buyerId !== buyerId) throw new ForbiddenError('Not your order');
  const confirmable: OrderStatus[] = [OrderStatus.ESCROW_FUNDED, OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED];
  if (!confirmable.includes(order.status)) {
    throw new ValidationError('Order cannot be confirmed in current status');
  }

  await releaseEscrow(orderId, env.PLATFORM_COMMISSION_PERCENT);

  const [updated] = await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.COMPLETED },
      include: { listing: true, escrow: true, contract: true },
    }),
    prisma.listing.update({
      where: { id: order.listingId },
      data: {
        status: ListingStatus.SOLD,
        quantity: { decrement: order.quantity },
      },
    }),
  ]);

  logger.info('Order completed, escrow released', { orderNumber: updated.orderNumber });

  return updated;
}

export async function getOrdersForUser(userId: string, role: 'buyer' | 'seller') {
  if (role === 'buyer') {
    return prisma.order.findMany({
      where: { buyerId: userId },
      include: {
        listing: { include: { seller: { select: { fullName: true, phone: true } } } },
        escrow: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  return prisma.order.findMany({
    where: { listing: { sellerId: userId } },
    include: {
      listing: true,
      buyer: { select: { fullName: true, phone: true } },
      escrow: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getOrderById(orderId: string, userId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      listing: { include: { seller: true, sensorSnapshot: true } },
      buyer: { select: { fullName: true, phone: true } },
      escrow: true,
      contract: true,
    },
  });

  if (!order) throw new NotFoundError('Order not found');
  const isBuyer = order.buyerId === userId;
  const isSeller = order.listing.sellerId === userId;
  if (!isBuyer && !isSeller) throw new ForbiddenError('Access denied');

  return order;
}
