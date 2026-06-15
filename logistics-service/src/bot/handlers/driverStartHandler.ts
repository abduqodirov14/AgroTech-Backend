import TelegramBot from 'node-telegram-bot-api';
import { env } from '../../config/env';
import { markdownSafe } from '../../utils/errors';

export const handleDriverStart = async (bot: TelegramBot, msg: TelegramBot.Message) => {
  const chatId = msg.chat.id;
  const firstName = msg.from?.first_name || 'Haydovchi';

  const welcomeText = `
🚛 *AgroHub Logistics — Haydovchi paneli*

Salom, ${markdownSafe(firstName)}!
Quyidagi tugmani bosib, telefon raqamingizni yuboring.
  `.trim();

  await bot.sendMessage(chatId, welcomeText, {
    parse_mode: 'Markdown',
    reply_markup: {
      keyboard: [
        [{ text: '📱 Telefon raqamni yuborish', request_contact: true }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
};
