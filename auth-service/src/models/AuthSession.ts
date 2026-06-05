// AuthSession model - Prisma client orqali
// Vaqtinchalik 4 xonali kod saqlash

export type { AuthSession } from '@prisma/client';

// AuthSession creation uchun type
export interface CreateAuthSessionInput {
  phone: string;
  telegramId: bigint;
  code: string;
  expiresAt: Date;
}
