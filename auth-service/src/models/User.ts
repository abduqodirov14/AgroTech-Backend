// User model - Prisma client orqali
// Bu yerda faqat type export qilamiz, CRUD userService da

export type { User } from '@prisma/client';

// User creation uchun type
export interface CreateUserInput {
  phone: string;
  telegramId: bigint;
  fullName: string;
  username?: string;
}
