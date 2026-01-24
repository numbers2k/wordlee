#!/usr/bin/env python3
"""Wordle RU - Telegram Bot"""

import os
import logging
from telegram import Update, WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup, MenuButtonWebApp
from telegram.ext import Application, CommandHandler, ContextTypes

logging.basicConfig(format='%(asctime)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

BOT_TOKEN = os.environ['BOT_TOKEN']
WEBAPP_URL = os.getenv('WEBAPP_URL', 'https://numbers2k.github.io/wordlee')


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    keyboard = [[InlineKeyboardButton(text="🎮 Играть", web_app=WebAppInfo(url=WEBAPP_URL))]]
    
    await update.message.reply_text(
        f"Привет, {user.first_name}! 👋\n\n"
        "🔤 *Wordle* — угадай слово из 5 букв за 6 попыток!\n\n"
        "📗 Зелёный — буква на месте\n"
        "📒 Жёлтый — буква есть, но не там\n"
        "⬜ Серый — буквы нет в слове",
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode='Markdown'
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "🎯 *Как играть:*\n\n"
        "1. Введите слово из 5 букв\n"
        "2. Смотрите подсказки:\n"
        "   🟩 — буква угадана и на месте\n"
        "   🟨 — буква есть, но не там\n"
        "   ⬜ — такой буквы нет\n"
        "3. Угадайте за 6 попыток!",
        parse_mode='Markdown'
    )


async def stats_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    keyboard = [[InlineKeyboardButton(text="📊 Статистика", web_app=WebAppInfo(url=f"{WEBAPP_URL}?view=stats"))]]
    await update.message.reply_text(
        "Статистика сохраняется в приложении.",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )


async def post_init(application: Application) -> None:
    await application.bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(text="🎮 Играть", web_app=WebAppInfo(url=WEBAPP_URL))
    )
    logger.info("Bot configured")


def main() -> None:
    application = Application.builder().token(BOT_TOKEN).post_init(post_init).build()
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("stats", stats_command))
    logger.info("Starting bot...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == '__main__':
    main()
