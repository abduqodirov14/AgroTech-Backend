import TelegramBot from 'node-telegram-bot-api';
import prisma from '../../infrastructure/database/prisma';
import { logger } from '../../utils/logger';

export const handleDriverDocument = async (bot: TelegramBot, msg: TelegramBot.Message) => {
  const chatId = msg.chat.id;
  
  if (!msg.photo || !msg.from) {
    await bot.sendMessage(chatId, '? Rasm topilmadi.');
    return;
  }

  const driver = await prisma.driver.findUnique({
    where: { telegramId: BigInt(msg.from.id) },
  });

  if (!driver) {
    await bot.sendMessage(chatId, '? Profil topilmadi. Avval /start ni bosing.');
    return;
  }

  try {
    const largestPhoto = msg.photo[msg.photo.length - 1];
    const fileLink = await bot.getFileLink(largestPhoto.file_id);

    let updateData: any = {};
    
    if (!driver.licenseImage) {
      updateData.licenseImage = fileLink;
      await bot.sendMessage(chatId, '? Prava qabul qilindi! Endi fura pasport rasmini yuboring.');
    } else if (!driver.vehicleImage) {
      updateData.vehicleImage = fileLink;
      await bot.sendMessage(chatId, '? Tex pasport qabul qilindi! Operatorlarimiz tez orada profilini tasdiqlaydi.\n\n?? Hozircha bot faoliyati cheklangan.', {
        reply_markup: { remove_keyboard: true },
      });
    } else {
      await bot.sendMessage(chatId, 'Hujjatlar allaqachon qabul qilindi. Kutish holatidasiz.');
      return;
    }

    await prisma.driver.update({
      where: { id: driver.id },
      data: updateData,
    });
  } catch (err: any) {
    logger.error('Driver document handler failed', { error: err?.message });
    await bot.sendMessage(chatId, '? Hujjatni saqlashda xatolik.');
  }
};
