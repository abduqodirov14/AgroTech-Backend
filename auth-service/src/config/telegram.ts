// Telegram Bot API configuration
// Bot commands va settings

export const BOT_COMMANDS = [
  {
    command: 'start',
    description: 'Botni ishga tushirish va kirish',
  },
  {
    command: 'help',
    description: 'Yordam va ko\'rsatmalar',
  },
];

// Bot description (BotFather'da o'rnatiladi)
export const BOT_DESCRIPTION = 'AgroTech fermerlar platformasi uchun avtorizatsiya boti';

// Bot short description
export const BOT_SHORT_DESCRIPTION = 'AgroTech platformasiga kirish';

// Telegram API limits
export const TELEGRAM_LIMITS = {
  MESSAGE_LENGTH: 4096,
  RATE_LIMIT_PER_SECOND: 30,
  RATE_LIMIT_PER_MINUTE: 20,
};
