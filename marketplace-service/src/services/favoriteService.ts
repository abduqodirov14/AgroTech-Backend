import prisma from '../infrastructure/database/prisma';
import { NotFoundError } from '../utils/errors';

export async function getFavorites(userId: string) {
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    include: {
      listing: {
        include: {
          seller: { select: { fullName: true, phone: true } },
          sensorSnapshot: { select: { id: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return favorites.map((f) => ({
    id: f.id,
    listingId: f.listingId,
    title: f.listing.title,
    price: f.listing.price,
    unit: f.listing.unit,
    region: f.listing.region,
    seller: f.listing.seller.fullName,
    hasSensorHistory: !!f.listing.sensorSnapshot,
    createdAt: f.createdAt.getTime(),
  }));
}

export async function addFavorite(userId: string, listingId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new NotFoundError('Listing not found');

  await prisma.favorite.upsert({
    where: { userId_listingId: { userId, listingId } },
    create: { userId, listingId },
    update: {},
  });

  return { success: true };
}

export async function removeFavorite(userId: string, listingId: string) {
  await prisma.favorite.deleteMany({ where: { userId, listingId } });
  return { success: true };
}
