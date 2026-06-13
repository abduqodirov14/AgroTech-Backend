import { ListingCategory } from '@prisma/client';
import prisma from '../infrastructure/database/prisma';
import { logger } from '../utils/logger';

const DEMO_LISTINGS = [
  { title: "Gilos (Eksportbop)", price: 25000, originalPrice: 30000, unit: 'kg', quantity: 20000, region: 'navoi', category: ListingCategory.FRUITS, cropType: 'Gilos', isFeatured: true, rating: 4.9 },
  { title: "Pomidor", price: 12000, unit: 'kg', quantity: 5000, region: 'tashkent', category: ListingCategory.VEGETABLES, rating: 4.5 },
  { title: "Bug'doy", price: 4500, unit: 'kg', quantity: 50000, region: 'bukhara', category: ListingCategory.GRAINS, rating: 4.7 },
  { title: "Uzum", price: 18000, unit: 'kg', quantity: 8000, region: 'samarkand', category: ListingCategory.FRUITS, isFeatured: true, rating: 4.8 },
  { title: "Paxta", price: 12000, unit: 'kg', quantity: 100000, region: 'khorezm', category: ListingCategory.GRAINS, rating: 4.6 },
  { title: "Tarvuz", price: 3000, unit: 'kg', quantity: 30000, region: 'fergana', category: ListingCategory.FRUITS, rating: 4.4 },
  { title: "Kartoshka", price: 6000, unit: 'kg', quantity: 15000, region: 'andijan', category: ListingCategory.VEGETABLES, rating: 4.3 },
  { title: "Shaftoli", price: 22000, unit: 'kg', quantity: 3000, region: 'namangan', category: ListingCategory.FRUITS, rating: 4.7 },
];

const CATALOG_PRODUCTS = [
  { name: 'Tomato Seeds (Hybrid F1)', brand: 'Syngenta', category: ListingCategory.SEEDS, price: 12.75, originalPrice: 15, discountPercent: 15, unit: 'pack', rating: 4.8, reviewCount: 124, badge: '15% off' },
  { name: 'Urea Fertilizer (46% N)', brand: 'EuroChem', category: ListingCategory.FERTILIZERS, price: 18.5, unit: 'kg', rating: 4.7, reviewCount: 89, badge: 'Best Seller' },
  { name: 'Imidacloprid 20% (Insecticide)', brand: 'Bayer', category: ListingCategory.PESTICIDES, price: 22.5, originalPrice: 25, discountPercent: 10, unit: 'L', rating: 4.6, reviewCount: 56, badge: '10% off' },
  { name: 'Drip Irrigation Tape (16mm)', brand: 'AquaTech', category: ListingCategory.IRRIGATION, price: 45, unit: 'roll', rating: 4.9, reviewCount: 42, badge: 'New' },
  { name: 'Pepper Seeds (Hybrid F1)', brand: 'Seminis', category: ListingCategory.SEEDS, price: 11.2, unit: 'pack', rating: 4.5, reviewCount: 67 },
  { name: 'Backpack Sprayer (16L)', brand: 'Farmate', category: ListingCategory.EQUIPMENT, price: 32, originalPrice: 40, discountPercent: 20, unit: 'piece', rating: 4.6, reviewCount: 31, badge: '20% off' },
];

const SERVICES = [
  { name: 'Soil Testing', description: 'Complete soil analysis with detailed report', price: 25, unit: 'sample' },
  { name: 'Drone Spraying', description: 'Professional drone spraying service', price: 15, unit: 'hectare' },
  { name: 'Agronomic Consultation', description: 'Expert advice for better yield and profit', price: 30, unit: 'hour' },
  { name: 'Farm Setup Planning', description: 'Irrigation & farm layout planning service', price: 50, unit: 'project' },
  { name: 'Harvesting Service', description: 'Professional harvesting with modern equipment', price: 80, unit: 'hectare' },
];

const PROMOTIONS = [
  { title: 'Spring Sale', subtitle: 'Up to 20% off on selected seeds', ctaLabel: 'Shop Now', ctaAction: 'category:SEEDS', color: '#10B981', sortOrder: 1 },
  { title: 'Free Delivery', subtitle: 'On orders over $100 within Tashkent region', ctaLabel: 'Learn More', ctaAction: 'info:delivery', color: '#3B82F6', sortOrder: 2 },
  { title: 'Top Rated Products', subtitle: 'Check out farmer favorite products', ctaLabel: 'View Top Products', ctaAction: 'sort:popular', color: '#F59E0B', sortOrder: 3 },
];

export async function seedDemoData(force = false) {
  const listingCount = await prisma.listing.count();
  if (listingCount > 0 && !force) {
    return { message: 'Demo data already exists', listings: listingCount };
  }

  let seller = await prisma.user.findFirst({ where: { role: 'FARMER' } });
  if (!seller) {
    seller = await prisma.user.create({
      data: {
        phone: '+998901234567',
        fullName: 'Kamola Farm',
        role: 'FARMER',
      },
    });
  }

  let buyer = await prisma.user.findFirst({ where: { role: 'BUYER' } });
  if (!buyer) {
    buyer = await prisma.user.create({
      data: {
        phone: '+998909876543',
        fullName: 'Korzinka Export',
        role: 'BUYER',
      },
    });
  }

  if (force) {
    await prisma.listing.deleteMany({});
    await prisma.catalogProduct.deleteMany({});
    await prisma.serviceOffering.deleteMany({});
    await prisma.promotion.deleteMany({});
  }

  for (const d of DEMO_LISTINGS) {
    await prisma.listing.create({
      data: {
        sellerId: seller.id,
        ...d,
        discountPercent: d.originalPrice
          ? Math.round((1 - d.price / d.originalPrice) * 100)
          : undefined,
      },
    });
  }

  for (const p of CATALOG_PRODUCTS) {
    await prisma.catalogProduct.create({ data: p });
  }

  for (const s of SERVICES) {
    await prisma.serviceOffering.create({ data: s });
  }

  for (const p of PROMOTIONS) {
    await prisma.promotion.create({ data: p });
  }

  logger.info('Demo marketplace data seeded');

  return {
    message: 'Demo data created',
    listings: DEMO_LISTINGS.length,
    catalogProducts: CATALOG_PRODUCTS.length,
    services: SERVICES.length,
    promotions: PROMOTIONS.length,
  };
}
