import TelegramBot from 'node-telegram-bot-api';
import { createAuthSession } from '../../services/authSessionService';
import { normalizePhone } from '../../utils/validators';
import { logger } from '../../utils/logger';

/**
 * Contact share handler
 * Fermer "📱 Kontaktni ulashish" tugmasini bosganida
 */
export const handleContact = async (bot: TelegramBot, msg: TelegramBot.Message) => {
  const chatId = msg.chat.id;
  const contact = msg.contact;

  if (!contact || !contact.phone_number) {
    await bot.sendMessage(chatId, '❌ Kontakt ma\'lumoti topilmadi. Qaytadan urinib ko\'ring.');
    return;
  }

  try {
    const phone = normalizePhone(contact.phone_number);
    const telegramId = BigInt(contact.user_id || msg.from!.id);
    const name = `${contact.first_name} ${contact.last_name || ''}`.trim();

    logger.info('📞 Contact received', { 
      rawPhone: contact.phone_number,
      normalizedPhone: phone,
      telegramId: telegramId.toString(),
      name
    });

    // 4 xonali kod yaratish va saqlash
    const { code } = await createAuthSession(phone, telegramId);

    // Botda javob yuborish
    const responseMessage = `
✅ *Kontaktingiz qabul qilindi!*

🔑 Sizning kirish kodingiz: *${code}*

Ushbu kodni veb-saytda kiriting.

⏱ Kod 5 minut davomida amal qiladi.
    `.trim();

    await bot.sendMessage(chatId, responseMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        remove_keyboard: true, // Keyboard'ni olib tashlash
      },
    });

    logger.info('✅ Auth code sent to user', { 
      phone, 
      telegramId: telegramId.toString(),
      name,
      code 
    });

  } catch (error: any) {
    logger.error('❌ Error in contact handler', { 
      message: error?.message || 'Unknown error',
      stack: error?.stack?.substring(0, 500),
      name: error?.name,
      code: error?.code,
      chatId 
    });
    await bot.sendMessage(
      chatId,
      '❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring yoki @support bilan bog\'laning.'
    );
  }
};
