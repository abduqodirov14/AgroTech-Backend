import TelegramBot from 'node-telegram-bot-api';

/**
 * "📱 Kontaktni ulashish" keyboard
 */
export const shareContactKeyboard = (): TelegramBot.ReplyKeyboardMarkup => {
  return {
    keyboard: [
      [
        {
          text: '📱 Kontaktni ulashish',
          request_contact: true,
        },
      ],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  };
};
