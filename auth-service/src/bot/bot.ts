import TelegramBot from 'node-telegram-bot-api';
import { env } from '../config/env';
import { handleStart } from './handlers/startHandler';
import { handleContact } from './handlers/contactHandler';
import { logger } from '../utils/logger';

// Bot instance
let bot: TelegramBot | null = null;

/**
 * Bot handlerlarni ulash
 */
export const initializeBot = () => {
  try {
    // Token tekshirish
    if (!env.TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN.length < 20) {
      throw new Error('Invalid TELEGRAM_BOT_TOKEN in .env file');
    }

    logger.info('🔄 Initializing Telegram bot...');
    logger.info(`📱 Bot token: ${env.TELEGRAM_BOT_TOKEN.substring(0, 10)}...`);

    // Bot instance yaratish
    bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN, {
      polling: {
        interval: 300,
        autoStart: true,
        params: {
          timeout: 10,
        },
      },
    });

    // Polling error handler (birinchi bo'lishi kerak)
    bot.on('polling_error', (error: any) => {
      logger.error('❌ Telegram bot polling error', { 
        message: error?.message || 'Unknown error',
        code: error?.code,
        response: error?.response?.body
      });
    });

    // /start command
    bot.onText(/\/start/, async (msg) => {
      try {
        await handleStart(bot!, msg);
      } catch (error: any) {
        logger.error('❌ Error in /start handler', { 
          message: error?.message || 'Unknown error',
          chatId: msg.chat.id 
        });
      }
    });

    // Contact message
    bot.on('contact', async (msg) => {
      try {
        await handleContact(bot!, msg);
      } catch (error: any) {
        logger.error('❌ Error in contact handler', { 
          message: error?.message || 'Unknown error',
          chatId: msg.chat.id 
        });
      }
    });

    // Boshqa text message'lar uchun
    bot.on('message', async (msg) => {
      try {
        // Agar contact yoki command bo'lmasa
        if (!msg.contact && !msg.text?.startsWith('/')) {
          await bot!.sendMessage(
            msg.chat.id,
            'ℹ️ Kirish uchun /start buyrug\'ini yuboring yoki "Kontaktni ulashish" tugmasini bosing.'
          );
        }
      } catch (error: any) {
        logger.error('❌ Error in message handler', { 
          message: error?.message || 'Unknown error',
          chatId: msg.chat.id 
        });
      }
    });

    logger.info('🤖 Telegram bot initialized successfully');
    logger.info(`📱 Bot username: @${env.TELEGRAM_BOT_USERNAME}`);
    logger.info('⏳ Waiting for messages...');

  } catch (error: any) {
    logger.error('❌ Failed to initialize bot', { 
      message: error?.message || 'Unknown error',
      stack: error?.stack
    });
    throw error;
  }
};

/**
 * Bot'ni to'xtatish
 */
export const stopBot = async () => {
  try {
    if (bot) {
      await bot.stopPolling();
      logger.info('🛑 Telegram bot stopped');
    }
  } catch (error: any) {
    logger.error('❌ Error stopping bot', { 
      message: error?.message || 'Unknown error' 
    });
  }
};

// Bot instanceni export qilish (handlerlar uchun kerak)
export const getBot = () => bot;
