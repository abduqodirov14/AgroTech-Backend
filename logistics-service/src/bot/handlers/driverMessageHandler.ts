import TelegramBot from 'node-telegram-bot-api';
import prisma from '../../infrastructure/database/prisma';
import { logger } from '../../utils/errors';
import { statusKeyboard } from '../keyboards/driverKeyboards';

export const handleDriverMessage = async (bot: TelegramBot, msg: TelegramBot.Message) => {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();

  const activeToggle = /^(🟢 Ishga tayyorman|🔴 Dam olmoqdaman|Ishga tayyorman|Dam olmoqdaman)$/i.test(text);
  if (activeToggle) {
    const nextStatus = /🟢|Ishga tayyorman/i.test(text) ? 'available' : 'offline';
    await prisma.driver.updateMany({
      where: { telegramId: BigInt(msg.from!.id) },
      data: { status: nextStatus, lastStatusUpdate: new Date() },
    });

    await bot.sendMessage(chatId, nextStatus === 'available' ? '🟢 Holatingiz: Ishga tayyorman' : '🔴 Holatingiz: Dam olmoqdaman', {
      reply_markup: statusKeyboard(nextStatus === 'available'),
    });
    return;
  }

  if (/^📦/.test(text)) {
    await bot.sendMessage(chatId, '⚠️ Hozircha sizga biriktirilgan yuklar yo‘q.');
    return;
  }

  await bot.sendMessage(chatId, "❓ Tushunmadim. Tugmalardan foydalaning.", {
    reply_markup: statusKeyboard(true),
  });
};
