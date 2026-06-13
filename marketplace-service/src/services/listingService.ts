import { ListingCategory, ListingStatus, Prisma } from '@prisma/client';
import prisma from '../infrastructure/database/prisma';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors';
import { attachSnapshotToListing } from './sensorSnapshotService';

export interface ListFilters {
  region?: string;
  category?: ListingCategory;
  search?: string;
  sort?: 'popular' | 'price_asc' | 'price_desc' | 'newest';
  page?: number;
  limit?: number;
  featured?: boolean;
}

export interface CreateListingInput {
  sellerId: string;
  title: string;
  description?: string;
  category?: ListingCategory;
  brand?: string;
  price: number;
  originalPrice?: number;
  unit: string;
  quantity: number;
  region: string;
  zoneId?: string;
  cropType?: string;
  imageUrl?: string;
}

function mapListingItem(item: {
  id: string;
  title: string;
  price: number;
  originalPrice: number | null;
  discountPercent: number | null;
  unit: string;
  quantity: number;
  region: string;
  category: ListingCategory;
  brand: string | null;
  rating: number;
  reviewCount: number;
  imageUrl: string | null;
  isFeatured: boolean;
  createdAt: Date;
  seller: { fullName: string; phone: string };
  sensorSnapshot: { id: string } | null;
}) {
  return {
    id: item.id,
    title: item.title,
    price: item.price,
    originalPrice: item.originalPrice,
    discountPercent: item.discountPercent,
    unit: item.unit,
    quantity: item.quantity,
    region: item.region,
    category: item.category,
    brand: item.brand,
    rating: item.rating,
    reviewCount: item.reviewCount,
    imageUrl: item.imageUrl,
    isFeatured: item.isFeatured,
    seller: item.seller.fullName,
    phone: item.seller.phone,
    hasSensorHistory: !!item.sensorSnapshot,
    createdAt: item.createdAt.getTime(),
  };
}

export async function listListings(filters: ListFilters) {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.ListingWhereInput = {
    status: ListingStatus.ACTIVE,
    ...(filters.region ? { region: filters.region } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.featured ? { isFeatured: true } : {}),
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
            { brand: { contains: filters.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  let orderBy: Prisma.ListingOrderByWithRelationInput = { createdAt: 'desc' };
  switch (filters.sort) {
    case 'price_asc':
      orderBy = { price: 'asc' };
      break;
    case 'price_desc':
      orderBy = { price: 'desc' };
      break;
    case 'popular':
      orderBy = { viewCount: 'desc' };
      break;
    default:
      orderBy = { createdAt: 'desc' };
  }

  const [items, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: {
        seller: { select: { fullName: true, phone: true } },
        sensorSnapshot: { select: { id: true } },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.listing.count({ where }),
  ]);

  return {
    items: items.map(mapListingItem),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

export async function getListingById(id: string) {
  const item = await prisma.listing.findUnique({
    where: { id },
    include: {
      seller: { select: { id: true, fullName: true, phone: true, role: true } },
      sensorSnapshot: true,
    },
  });

  if (!item) throw new NotFoundError('Listing not found');

  await prisma.listing.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });

  return {
    ...mapListingItem({ ...item, sensorSnapshot: item.sensorSnapshot }),
    description: item.description,
    zoneId: item.zoneId,
    cropType: item.cropType,
    status: item.status,
    viewCount: item.viewCount + 1,
    sensorHistory: item.sensorSnapshot?.data ?? null,
    sellerId: item.seller.id,
  };
}

export async function createListing(input: CreateListingInput) {
  if (!input.title?.trim()) throw new ValidationError('Title is required');
  if (input.price <= 0) throw new ValidationError('Price must be positive');
  if (input.quantity <= 0) throw new ValidationError('Quantity must be positive');

  let discountPercent: number | undefined;
  if (input.originalPrice && input.originalPrice > input.price) {
    discountPercent = Math.round((1 - input.price / input.originalPrice) * 100);
  }

  const listing = await prisma.listing.create({
    data: {
      sellerId: input.sellerId,
      title: input.title.trim(),
      description: input.description,
      category: input.category || ListingCategory.PRODUCE,
      brand: input.brand,
      price: input.price,
      originalPrice: input.originalPrice,
      discountPercent,
      unit: input.unit || 'kg',
      quantity: input.quantity,
      region: input.region || 'tashkent',
      zoneId: input.zoneId,
      cropType: input.cropType,
      imageUrl: input.imageUrl,
    },
    include: {
      seller: { select: { fullName: true, phone: true } },
      sensorSnapshot: { select: { id: true } },
    },
  });

  if (input.zoneId) {
    await attachSnapshotToListing(listing.id, input.zoneId);
  }

  const refreshed = await prisma.listing.findUnique({
    where: { id: listing.id },
    include: {
      seller: { select: { fullName: true, phone: true } },
      sensorSnapshot: { select: { id: true } },
    },
  });

  return mapListingItem(refreshed!);
}

export async function updateListing(
  listingId: string,
  userId: string,
  data: Partial<CreateListingInput>
) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new NotFoundError('Listing not found');
  if (listing.sellerId !== userId) throw new ForbiddenError('Not your listing');
  if (listing.status !== ListingStatus.ACTIVE) throw new ValidationError('Cannot edit inactive listing');

  const updated = await prisma.listing.update({
    where: { id: listingId },
    data: {
      ...(data.title ? { title: data.title.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.price ? { price: data.price } : {}),
      ...(data.quantity ? { quantity: data.quantity } : {}),
      ...(data.unit ? { unit: data.unit } : {}),
      ...(data.region ? { region: data.region } : {}),
      ...(data.category ? { category: data.category } : {}),
    },
    include: {
      seller: { select: { fullName: true, phone: true } },
      sensorSnapshot: { select: { id: true } },
    },
  });

  return mapListingItem(updated);
}

export async function cancelListing(listingId: string, userId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new NotFoundError('Listing not found');
  if (listing.sellerId !== userId) throw new ForbiddenError('Not your listing');

  await prisma.listing.update({
    where: { id: listingId },
    data: { status: ListingStatus.CANCELLED },
  });

  return { success: true };
}

export async function getOverview() {
  const [totalListings, byCategory, byRegion, featured] = await Promise.all([
    prisma.listing.count({ where: { status: ListingStatus.ACTIVE } }),
    prisma.listing.groupBy({
      by: ['category'],
      where: { status: ListingStatus.ACTIVE },
      _count: { id: true },
    }),
    prisma.listing.groupBy({
      by: ['region'],
      where: { status: ListingStatus.ACTIVE },
      _count: { id: true },
    }),
    prisma.listing.findMany({
      where: { status: ListingStatus.ACTIVE, isFeatured: true },
      take: 6,
      include: {
        seller: { select: { fullName: true, phone: true } },
        sensorSnapshot: { select: { id: true } },
      },
      orderBy: { rating: 'desc' },
    }),
  ]);

  return {
    totalListings,
    categories: byCategory.map((c) => ({
      category: c.category,
      count: c._count.id,
    })),
    regions: byRegion.map((r) => ({
      region: r.region,
      count: r._count.id,
    })),
    featured: featured.map(mapListingItem),
  };
}
