import { ListingCategory } from '@prisma/client';
import prisma from '../infrastructure/database/prisma';

export async function getCatalogProducts(category?: ListingCategory, search?: string) {
  const products = await prisma.catalogProduct.findMany({
    where: {
      isActive: true,
      ...(category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { brand: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
  });

  return products;
}

export async function getServiceOfferings() {
  return prisma.serviceOffering.findMany({
    where: { isActive: true },
    orderBy: { price: 'asc' },
  });
}

export async function getPromotions() {
  return prisma.promotion.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
}
