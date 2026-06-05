// Listing model - Prisma orqali

export type { Listing } from '@prisma/client';

export interface CreateListingInput {
  title: string;
  price: number;
  unit: string;
  quantity: number;
  region: string;
  phone: string;
  seller: string;
}
