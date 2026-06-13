import TelegramBot from 'node-telegram-bot-api';
import prisma from '../../infrastructure/database/prisma';
import { logger } from '../../utils/errors';
import { statusKeyboard } from '../keyboards/driverKeyboards';

export const handleDriverContact = async (bot: TelegramBot, msg: TelegramBot.Message) => {
  const chatId = msg.chat.id;
  const contact = msg.contact;

  if (!contact?.phone_number) {
    await bot.sendMessage(chatId, '❌ Kontakt topilmadi. Qaytadan urinib ko‘ring.');
    return;
  }

  const rawPhone = contact.phone_number;
  const normalizedPhone = rawPhone.replace(/[^+\d]/g, '');

  try {
    const driver = await prisma.driver.upsert({
      where: { phone: normalizedPhone },
      update: {
        telegramId: BigInt(contact.user_id || msg.from!.id),
        fullName: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || msg.from?.first_name || 'Haydovchi',
      },
      create: {
        phone: normalizedPhone,
        fullName: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || msg.from?.first_name || 'Haydovchi',
        telegramId: BigInt(contact.user_id || msg.from!.id),
        isVerified: true,
      },
    });

    await bot.sendMessage(chatId, `✅ Profil topildi: ${driver.fullName}`, {
      reply_markup: { remove_keyboard: true },
    });

    await bot.sendMessage(chatId, 'Iltimos, holatni tanlang:', {
      reply_markup: statusKeyboard(driver.status !== 'offline'),
    });
  } catch (err: any) {
    logger.error('Driver contact upsert failed', { error: err?.message });
    await bot.sendMessage(chatId, '❌ Saqlashda xatolik yuz berdi.');
  }
};
