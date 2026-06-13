import TelegramBot from 'node-telegram-bot-api';
import { env } from '../../config/env';
import { handleDriverStart } from '../handlers/driverStartHandler';
import { handleDriverContact } from '../handlers/driverContactHandler';
import { handleDriverMessage } from '../handlers/driverMessageHandler';
import { handleCallbackQuery } from '../handlers/driverCallbackHandler';
import { getLogisticsServiceClient } from '../services/driverLogicService';
import { logger } from '../../utils/logger';

let bot: TelegramBot | null = null;
let logisticsServiceClient: unknown = null;

export const getLogisticsServiceClient = () => logisticsServiceClient;
export const setLogisticsServiceClient = (client: unknown) => {
  logisticsServiceClient = client;
};

export const initializeLogisticsBot = () => {
  try {
    if (!env.TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN.length < 20) {
      throw new Error('Invalid TELEGRAM_LOGISTICS_BOT_TOKEN in .env file');
    }

    bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN, {
      polling: {
        interval: 300,
        autoStart: true,
        params: {
          timeout: 10,
        },
      },
    });

    bot.on('polling_error', (error: any) => {
      logger.error('Logistics bot polling error', {
        error: error?.message || 'Unknown error',
        code: error?.code,
      });
    });

    bot.on('message', async (msg) => {
      try {
        if (msg.text === '/start') {
          await handleDriverStart(bot!, msg, getLogisticsServiceClient());
        }
        else if (msg.contact) {
          await handleDriverContact(bot!, msg, getLogisticsServiceClient());
        }
        else if (msg.text && !msg.text.startsWith('/')) {
          await handleDriverMessage(bot!, msg, getLogisticsServiceClient());
        } else if (msg.location) {
          await handleDriverLocation(msg.chat.id, msg.location);
        } else if (msg.text?.startsWith('/')) {
          await bot!.sendMessage(msg.chat.id, "Kerakli buyruq topilmadi. /start tugmasini bosing.");
        }
      } catch (error: any) {
        logger.error('Logistics bot message handler error', {
          error: error?.message || 'Unknown error',
          chatId: msg.chat.id,
        });
      }
    });

    bot.on('callback_query', async (query) => {
      try {
        await handleCallbackQuery(bot!, query, getLogisticsServiceClient());
      } catch (error: any) {
        logger.error('Logistics bot callback error', {
          error: error?.message || 'Unknown error',
        });
      }
    });

    logger.info('Logistics Telegram bot initialized successfully');
  } catch (error: any) {
    logger.error('Failed to initialize logistics bot', {
      message: error?.message || 'Unknown error',
    });
  }
};

export const getLogisticsBot = () => bot;

export const stopLogisticsBot = async () => {
  try {
    if (bot) {
      await bot.stopPolling();
    }
  } catch (e) {
    // ignore
  }
};
