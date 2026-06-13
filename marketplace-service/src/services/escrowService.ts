import { EscrowStatus } from '@prisma/client';
import prisma from '../infrastructure/database/prisma';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

export async function fundEscrow(orderId: string) {
  const escrow = await prisma.escrowPayment.findUnique({ where: { orderId } });
  if (!escrow) throw new NotFoundError('Escrow not found');
  if (escrow.status !== EscrowStatus.PENDING) {
    throw new ValidationError('Escrow already funded');
  }

  // MVP: simulate bank payment success
  return prisma.escrowPayment.update({
    where: { orderId },
    data: {
      status: EscrowStatus.FUNDED,
      fundedAt: new Date(),
    },
  });
}

export async function releaseEscrow(orderId: string, commissionPercent: number) {
  const escrow = await prisma.escrowPayment.findUnique({
    where: { orderId },
    include: { order: { include: { listing: true } } },
  });

  if (!escrow) throw new NotFoundError('Escrow not found');
  if (escrow.status !== EscrowStatus.FUNDED) {
    throw new ValidationError('Escrow not in funded state');
  }

  const commission = Math.round(escrow.amount * (commissionPercent / 100));
  const sellerAmount = escrow.amount - commission;

  logger.info('Escrow release', {
    orderId,
    total: escrow.amount,
    commission,
    sellerAmount,
  });

  return prisma.escrowPayment.update({
    where: { orderId },
    data: {
      status: EscrowStatus.RELEASED,
      releasedAt: new Date(),
    },
  });
}
