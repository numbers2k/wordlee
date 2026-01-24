#!/usr/bin/env python3
"""Wordle RU - Telegram Bot"""

import os
import logging
from telegram import Update, WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup, MenuButtonWebApp
from telegram.ext import Application, CommandHandler, ContextTypes

logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

BOT_TOKEN = os.getenv('BOT_TOKEN', '8289266930:AAEFbywRrVrnV-uPRn5H8Bqx-eel2qbVa1Q')
WEBAPP_URL = os.getenv('WEBAPP_URL', 'https://wordlee-ru.vercel.app')


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    keyboard = [[InlineKeyboardButton(text="🎮 Играть в Wordle", web_app=WebAppInfo(url=WEBAPP_URL))]]
    
    await update.message.reply_text(
        f"Привет, {user.first_name}! 👋\n\n"
        "🔤 *Wordle* — угадай слово из 5 букв за 6 попыток!\n\n"
        "📗 *Зелёный* — буква на своём месте\n"
        "📒 *Жёлтый* — буква есть, но не там\n"
        "⬜ *Серый* — буквы нет в слове\n\n"
        "Каждый день — новое слово. Удачи! 🍀",
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode='Markdown'
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "🎯 *Как играть в Wordle:*\n\n"
        "1. Введите любое слово из 5 букв\n"
        "2. Посмотрите на подсказки:\n"
        "   • 🟩 Зелёный — буква угадана и на месте\n"
        "   • 🟨 Жёлтый — буква есть, но в другом месте\n"
        "   • ⬜ Серый — такой буквы нет\n"
        "3. Угадайте слово за 6 попыток!\n\n"
        "💡 *Совет:* начинайте со слов с частыми буквами (А, О, Е, И, Н, Т, С, Р)",
        parse_mode='Markdown'
    )


async def stats_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    keyboard = [[InlineKeyboardButton(text="📊 Посмотреть статистику", web_app=WebAppInfo(url=f"{WEBAPP_URL}?view=stats"))]]
    await update.message.reply_text(
        "📊 *Статистика*\n\nВаша статистика сохраняется в приложении.",
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode='Markdown'
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
