import TelegramBot from 'node-telegram-bot-api';
import prisma from '../../infrastructure/database/prisma';
import { logger } from '../../utils/errors';
import { statusKeyboard, shipmentActionKeyboard } from '../keyboards/driverKeyboards';

export const handleCallbackQuery = async (bot: TelegramBot, query: TelegramBot.CallbackQuery) => {
  const data = query.data;
  const chatId = query.message?.chat.id;
  if (!chatId) return;

  try {
    if (data === 'shipment_accept' || data === 'shipment_reject') {
      await bot.answerCallbackQuery(query.id, { text: data === 'shipment_accept' ? '✅ Qabul qilindi' : '❌ Rad etildi' });
      await bot.sendMessage(chatId, data === 'shipment_accept' ? '✅ Yuk qabul qilindi' : '❌ Yuk rad etildi', {
        reply_markup: { remove_keyboard: true },
      });
      return;
    }

    await bot.answerCallbackQuery(query.id, { text: '✅' });
  } catch (err: any) {
    logger.error('Callback handler failed', { error: err?.message });
  }
};
