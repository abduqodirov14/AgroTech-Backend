import TelegramBot from 'node-telegram-bot-api';
import { shareContactKeyboard } from '../keyboards/shareContactKeyboard';
import { logger } from '../../utils/logger';

/**
 * /start command handler
 */
export const handleStart = async (bot: TelegramBot, msg: TelegramBot.Message) => {
  const chatId = msg.chat.id;
  const firstName = msg.from?.first_name || 'Fermer';

  const welcomeMessage = `
🌾 *AgroTech platformasiga xush kelibsiz, ${firstName}!*

Platformaga kirish uchun telefon raqamingizni ulashing.

Pastdagi tugmani bosing 👇
  `.trim();

  try {
    await bot.sendMessage(chatId, welcomeMessage, {
      parse_mode: 'Markdown',
      reply_markup: shareContactKeyboard(),
    });

    logger.info('✅ /start command processed', { 
      chatId, 
      username: msg.from?.username,
      firstName 
    });
  } catch (error: any) {
    logger.error('❌ Error in /start handler', { 
      message: error?.message || 'Unknown error',
      chatId 
    });
  }
};
