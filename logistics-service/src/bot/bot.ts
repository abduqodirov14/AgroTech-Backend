import TelegramBot from "node-telegram-bot-api";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { statusKeyboard } from "./keyboards/driverKeyboards";

export type DriverStatus = "available" | "offline" | "assigned" | "in_transit" | "arrived";

function normalizeWhitespace(text: string) {
  return text.replace(/\\s+/g, " ").trim();
}

const REQUIRED_START_PROMPT = normalizeWhitespace(`
🚛 AgroHub Logistics botiga xush kelibsiz! Telefon raqamingizni yuboring:
`);

export const initializeLogisticsBot = async () => {
  const token = env.TELEGRAM_BOT_TOKEN || env.TELEGRAM_LOGISTICS_BOT_TOKEN;
  if (!token || token.length < 20) {
    logger.warn("Telegram bot token missing, skipping logistics bot initialization");
    return;
  }

  try {
    const TelegramBotClass = require("node-telegram-bot-api").default || require("node-telegram-bot-api");

    let bot: InstanceType<typeof TelegramBotClass>;
    try {
      bot = new TelegramBotClass(token, {
        polling: { interval: 300, params: { timeout: 10 } },
      }) as unknown as InstanceType<typeof TelegramBotClass>;
    } catch (initError: unknown) {
      logger.error("Failed to create Telegram bot instance", {
        message: (initError as Error)?.message,
        stack: (initError as Error)?.stack,
      });
      throw initError;
    }

    bot.on("polling_error", (error: unknown) => {
      const reason = (error as Error)?.message || String(error);
      if (/ECONNRESET|EFATAL/i.test(reason)) {
        logger.warn("Telegram polling connection reset", { reason });
      } else {
        logger.error("Logistics bot polling error", { reason });
      }
    });

    bot.on("message", async (msg) => {
      try {
        if (!msg.chat) return;

        switch (msg.text) {
          case "/start":
            await bot.sendMessage(msg.chat.id, REQUIRED_START_PROMPT, {
              reply_markup: {
                keyboard: [[{ text: "📱 Kontaktni ulashish", request_contact: true }]],
                resize_keyboard: true,
                one_time_keyboard: true,
              },
            });
            break;

          default:
            if (msg.contact) {
              await bot.sendMessage(msg.chat.id, "Kontakt qabul qilindi. Tez orada bog'lanamiz!", {
                reply_markup: { remove_keyboard: true },
              });
            } else if (msg.text && !msg.text.startsWith("/")) {
              await bot.sendMessage(msg.chat.id, "Tushunarsiz buyruq. /start ni bosing.", {
                reply_markup: statusKeyboard("available"),
              });
            }
            break;
        }
      } catch (error: unknown) {
        logger.error("Logistics bot message handler failed", {
          message: (error as Error)?.message || "Unknown error",
          stack: (error as Error)?.stack,
          chatId: msg.chat?.id,
        });
      }
    });

    bot.on("callback_query", async (query) => {
      try {
        const { handleCallbackQuery } = await import("./handlers/driverCallbackHandler");
        await handleCallbackQuery(bot as any, query);
      } catch (error: unknown) {
        logger.error("Logistics bot callback error", {
          message: (error as Error)?.message || "Unknown error",
          stack: (error as Error)?.stack,
        });
      }
    });

    logger.info("Logistics Telegram bot initialized successfully");
  } catch (error: unknown) {
    logger.error("Failed to initialize logistics bot", {
      message: (error as Error)?.message,
      stack: (error as Error)?.stack,
      code: (error as { code?: string })?.code,
    });
  }
};
