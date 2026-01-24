#!/usr/bin/env python3
"""Wordlee - Telegram Bot

Полнофункциональный бот для игры Wordlee на русском языке.
Поддерживает личные чаты и группы.
"""

import os
import logging
from dotenv import load_dotenv
from telegram import Update, WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup, MenuButtonWebApp
from telegram.ext import (
    Application, 
    CommandHandler, 
    MessageHandler,
    CallbackQueryHandler,
    ContextTypes,
    filters
)
from telegram.constants import ChatType

load_dotenv()

# Logging configuration
logging.basicConfig(
    format='%(asctime)s - %(levelname)s - %(message)s',
    level=logging.INFO,
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Отключаем избыточные логи от httpx
logging.getLogger('httpx').setLevel(logging.WARNING)

# Bot configuration
BOT_TOKEN = os.environ['BOT_TOKEN']
WEBAPP_URL = os.getenv('WEBAPP_URL', 'https://numbers2k.github.io/wordlee')
BOT_USERNAME = os.getenv('BOT_USERNAME', 'wordlee_ru_bot')
BOT_VERSION = '1.2.0'


def get_main_keyboard() -> InlineKeyboardMarkup:
    """Создаёт основную клавиатуру с кнопками."""
    keyboard = [
        [InlineKeyboardButton(text="🎮 Играть", web_app=WebAppInfo(url=WEBAPP_URL))],
        [
            InlineKeyboardButton(text="📖 Правила", callback_data="help"),
            InlineKeyboardButton(text="📊 Статистика", callback_data="stats")
        ],
        [InlineKeyboardButton(text="📤 Поделиться", callback_data="share")],
        [InlineKeyboardButton(text="ℹ️ О боте", callback_data="about")]
    ]
    return InlineKeyboardMarkup(keyboard)


def get_play_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура с кнопкой игры и главным меню."""
    keyboard = [
        [InlineKeyboardButton(text="🎮 Играть", web_app=WebAppInfo(url=WEBAPP_URL))],
        [InlineKeyboardButton(text="🏠 Главное меню", callback_data="main_menu")]
    ]
    return InlineKeyboardMarkup(keyboard)


def get_stats_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура для статистики."""
    keyboard = [
        [InlineKeyboardButton(text="📊 Открыть статистику", web_app=WebAppInfo(url=f"{WEBAPP_URL}?view=stats"))],
        [InlineKeyboardButton(text="🏠 Главное меню", callback_data="main_menu")]
    ]
    return InlineKeyboardMarkup(keyboard)


def get_help_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура для правил."""
    keyboard = [
        [InlineKeyboardButton(text="🎮 Играть", web_app=WebAppInfo(url=WEBAPP_URL))],
        [InlineKeyboardButton(text="🏠 Главное меню", callback_data="main_menu")]
    ]
    return InlineKeyboardMarkup(keyboard)


def get_share_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура для поделиться."""
    keyboard = [
        [InlineKeyboardButton(text="📤 Переслать друзьям", switch_inline_query=f"Играй в Wordlee! 🎮")],
        [InlineKeyboardButton(text="🏠 Главное меню", callback_data="main_menu")]
    ]
    return InlineKeyboardMarkup(keyboard)


def get_about_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура для информации о боте."""
    keyboard = [
        [InlineKeyboardButton(text="🎮 Играть", web_app=WebAppInfo(url=WEBAPP_URL))],
        [InlineKeyboardButton(text="🏠 Главное меню", callback_data="main_menu")]
    ]
    return InlineKeyboardMarkup(keyboard)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик команды /start — приветствие и главное меню."""
    try:
        if not update.message:
            logger.warning("Received /start but update.message is None")
            return
        
        user = update.effective_user
        chat_type = update.effective_chat.type
        username = user.username or 'без username'
        logger.info(f"👤 USER ACTION: /start | User: {user.id} (@{username}) | Name: {user.first_name} | Chat: {chat_type}")
        
        # Разное приветствие для личных чатов и групп
        if chat_type == ChatType.PRIVATE:
            welcome_text = (
                f"Привет, {user.first_name}! 👋\n\n"
                "🎮 *Wordlee* — угадай слово из 5 букв за 6 попыток!\n\n"
                "🟩 Зелёный — буква на правильном месте\n"
                "🟨 Жёлтый — буква есть, но не там\n"
                "⬜ Серый — такой буквы нет в слове\n\n"
                "♾️ Бесконечный режим — играй сколько хочешь!\n"
                "📊 Статистика — отслеживай свой прогресс\n"
                "📤 Делись результатами с друзьями!"
            )
        else:
            welcome_text = (
                f"Привет, {update.effective_chat.title}! 👋\n\n"
                "🎮 *Wordlee* теперь и в этом чате!\n\n"
                "Угадай слово из 5 букв за 6 попыток.\n"
                "Нажми кнопку ниже, чтобы начать игру!"
            )
        
        await update.message.reply_text(
            welcome_text,
            reply_markup=get_main_keyboard(),
            parse_mode='Markdown'
        )
        logger.info(f"✅ RESPONSE SENT: /start to user {user.id}")
    except Exception as e:
        logger.error(f"Error in start handler: {e}", exc_info=True)
        if update.message:
            await update.message.reply_text("😅 Произошла ошибка. Попробуй ещё раз!")


async def play_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик команды /play — быстрый запуск игры."""
    try:
        if not update.message:
            logger.warning("Received /play but update.message is None")
            return
        user = update.effective_user
        username = user.username or 'без username'
        logger.info(f"🎮 USER ACTION: /play | User: {user.id} (@{username}) | Name: {user.first_name}")
        await update.message.reply_text(
            "🎯 Нажми кнопку, чтобы начать игру!",
            reply_markup=get_play_keyboard()
        )
    except Exception as e:
        logger.error(f"Error in play_command: {e}", exc_info=True)


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик команды /help — правила игры."""
    try:
        if not update.message:
            logger.warning("Received /help but update.message is None")
            return
        user = update.effective_user
        username = user.username or 'без username'
        logger.info(f"📖 USER ACTION: /help | User: {user.id} (@{username}) | Name: {user.first_name}")
        help_text = (
            "📖 *Как играть в Wordlee*\n\n"
            "*Цель:* угадать слово из 5 букв за 6 попыток.\n\n"
            "*Подсказки после каждой попытки:*\n"
            "🟩 — буква угадана и стоит на своём месте\n"
            "🟨 — буква есть в слове, но стоит не там\n"
            "⬜ — такой буквы в слове нет\n\n"
            "*Советы:*\n"
            "• Начинай с частых букв: А, О, Е, И, Н, Т, С, Р\n"
            "• Используй разные буквы в первых попытках\n"
            "• Следи за клавиатурой — она подсвечивает использованные буквы\n\n"
            "Удачи! 🍀"
        )
        
        await update.message.reply_text(
            help_text,
            reply_markup=get_help_keyboard(),
            parse_mode='Markdown'
        )
    except Exception as e:
        logger.error(f"Error in help_command: {e}", exc_info=True)


async def stats_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик команды /stats — статистика игрока."""
    try:
        if not update.message:
            logger.warning("Received /stats but update.message is None")
            return
        user = update.effective_user
        username = user.username or 'без username'
        logger.info(f"📊 USER ACTION: /stats | User: {user.id} (@{username}) | Name: {user.first_name}")
        
        await update.message.reply_text(
            "📊 *Твоя статистика*\n\n"
            "Статистика сохраняется в приложении и включает:\n"
            "• Количество сыгранных игр\n"
            "• Процент побед\n"
            "• Текущую серию побед\n"
            "• Лучшую серию\n"
            "• Распределение попыток\n\n"
            "Нажми кнопку ниже, чтобы посмотреть!",
            reply_markup=get_stats_keyboard(),
            parse_mode='Markdown'
        )
    except Exception as e:
        logger.error(f"Error in stats_command: {e}", exc_info=True)


async def share_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик команды /share — поделиться ботом."""
    try:
        if not update.message:
            logger.warning("Received /share but update.message is None")
            return
        user = update.effective_user
        username = user.username or 'без username'
        logger.info(f"📤 USER ACTION: /share | User: {user.id} (@{username}) | Name: {user.first_name}")
        # Используем код-форматирование вместо Markdown для username, чтобы избежать курсива
        share_text = (
            "🎮 *Wordlee*\n\n"
            "Попробуй угадать слово из 5 букв за 6 попыток!\n\n"
            f"👉 [@{BOT_USERNAME}](https://t.me/{BOT_USERNAME})"
        )
        
        await update.message.reply_text(
            share_text,
            reply_markup=get_share_keyboard(),
            parse_mode='Markdown'
        )
    except Exception as e:
        logger.error(f"Error in share_command: {e}", exc_info=True)


async def about_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик команды /about — информация о боте."""
    try:
        if not update.message:
            logger.warning("Received /about but update.message is None")
            return
        user = update.effective_user
        username = user.username or 'без username'
        logger.info(f"ℹ️ USER ACTION: /about | User: {user.id} (@{username}) | Name: {user.first_name}")
        about_text = (
            "ℹ️ *О боте Wordlee*\n\n"
            f"*Версия:* {BOT_VERSION}\n"
            "*Словарь:* 25,334 слова\n"
            "*Платформа:* Telegram Mini Apps\n\n"
            "*Особенности:*\n"
            "• Бесконечный режим игры\n"
            "• Автосохранение прогресса\n"
            "• Работает на всех устройствах\n\n"
            "автор: [@boik_off](https://t.me/boik_off)"
        )
        
        await update.message.reply_text(
            about_text,
            reply_markup=get_about_keyboard(),
            parse_mode='Markdown'
        )
    except Exception as e:
        logger.error(f"Error in about_command: {e}", exc_info=True)


async def handle_new_chat_members(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик добавления бота в группу."""
    try:
        for member in update.message.new_chat_members:
            if member.id == context.bot.id:
                welcome_text = (
                    "👋 Привет! Спасибо, что добавили меня!\n\n"
                    "🎮 *Wordlee* — угадай слово из 5 букв за 6 попыток.\n\n"
                    "*Команды:*\n"
                    "/play — начать игру\n"
                    "/help — правила\n"
                    "/stats — статистика\n\n"
                    "Нажмите кнопку ниже, чтобы начать играть!"
                )
                
                await update.message.reply_text(
                    welcome_text,
                    reply_markup=get_play_keyboard(),
                    parse_mode='Markdown'
                )
                logger.info(f"👥 BOT ADDED TO GROUP: {update.effective_chat.title} (ID: {update.effective_chat.id})")
                break
    except Exception as e:
        logger.error(f"Error in handle_new_chat_members: {e}", exc_info=True)


async def handle_text_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик текстовых сообщений в личных чатах."""
    try:
        if update.effective_chat.type != ChatType.PRIVATE:
            return
        
        if not update.message or not update.message.text:
            return
        
        text = update.message.text.lower().strip()
        
        if any(word in text for word in ['играть', 'игра', 'play', 'старт', 'начать']):
            await play_command(update, context)
        elif any(word in text for word in ['помощь', 'правила', 'help', 'как']):
            await help_command(update, context)
        elif any(word in text for word in ['стат', 'счёт', 'результат', 'stats']):
            await stats_command(update, context)
        else:
            await update.message.reply_text(
                "🎮 Чтобы начать игру, нажми кнопку ниже или используй команды:\n\n"
                "/play — начать игру\n"
                "/help — правила\n"
                "/stats — статистика\n"
                "/share — поделиться\n"
                "/about — о боте",
                reply_markup=get_play_keyboard()
            )
    except Exception as e:
        logger.error(f"Error in handle_text_message: {e}", exc_info=True)


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик нажатий на inline-кнопки."""
    try:
        query = update.callback_query
        await query.answer()
        
        user = update.effective_user
        username = user.username or 'без username'
        logger.info(f"🔘 BUTTON CLICK: {query.data} | User: {user.id} (@{username}) | Name: {user.first_name}")
        
        if query.data == "main_menu":
            user = update.effective_user
            welcome_text = (
                f"Привет, {user.first_name}! 👋\n\n"
                "🎮 *Wordlee* — угадай слово из 5 букв за 6 попыток!\n\n"
                "🟩 Зелёный — буква на правильном месте\n"
                "🟨 Жёлтый — буква есть, но не там\n"
                "⬜ Серый — такой буквы нет в слове\n\n"
                "♾️ Бесконечный режим — играй сколько хочешь!\n"
                "📊 Статистика — отслеживай свой прогресс\n"
                "📤 Делись результатами с друзьями!"
            )
            await query.edit_message_text(
                welcome_text,
                reply_markup=get_main_keyboard(),
                parse_mode='Markdown'
            )
        
        elif query.data == "help":
            help_text = (
                "📖 *Как играть в Wordlee*\n\n"
                "*Цель:* угадать слово из 5 букв за 6 попыток.\n\n"
                "*Подсказки после каждой попытки:*\n"
                "🟩 — буква угадана и стоит на своём месте\n"
                "🟨 — буква есть в слове, но стоит не там\n"
                "⬜ — такой буквы в слове нет\n\n"
                "*Советы:*\n"
                "• Начинай с частых букв: А, О, Е, И, Н, Т, С, Р\n"
                "• Используй разные буквы в первых попытках\n"
                "• Следи за клавиатурой — она подсвечивает использованные буквы\n\n"
                "Удачи! 🍀"
            )
            await query.edit_message_text(
                help_text,
                reply_markup=get_help_keyboard(),
                parse_mode='Markdown'
            )
        
        elif query.data == "stats":
            stats_text = (
                "📊 *Твоя статистика*\n\n"
                "Статистика сохраняется в приложении и включает:\n"
                "• Количество сыгранных игр\n"
                "• Процент побед\n"
                "• Текущую серию побед\n"
                "• Лучшую серию\n"
                "• Распределение попыток\n\n"
                "Нажми кнопку ниже, чтобы посмотреть!"
            )
            await query.edit_message_text(
                stats_text,
                reply_markup=get_stats_keyboard(),
                parse_mode='Markdown'
            )
        
        elif query.data == "share":
            share_text = (
                "🎮 *Wordlee*\n\n"
                "Попробуй угадать слово из 5 букв за 6 попыток!\n\n"
                f"👉 [@{BOT_USERNAME}](https://t.me/{BOT_USERNAME})"
            )
            await query.edit_message_text(
                share_text,
                reply_markup=get_share_keyboard(),
                parse_mode='Markdown'
            )
        
        elif query.data == "about":
            about_text = (
                "ℹ️ *О боте Wordlee*\n\n"
                f"*Версия:* {BOT_VERSION}\n"
                "*Словарь:* 25,334 слова\n"
                "*Платформа:* Telegram Mini Apps\n\n"
                "*Особенности:*\n"
                "• Бесконечный режим игры\n"
                "• Автосохранение прогресса\n"
                "• Работает на всех устройствах\n\n"
                "автор: [@boik_off](https://t.me/boik_off)"
            )
            await query.edit_message_text(
                about_text,
                reply_markup=get_about_keyboard(),
                parse_mode='Markdown'
            )
            
    except Exception as e:
        logger.error(f"Error in handle_callback: {e}", exc_info=True)


async def unknown_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик неизвестных команд."""
    try:
        if not update.message:
            return
        await update.message.reply_text(
            "🤔 Такой команды нет.\n\n"
            "*Доступные команды:*\n"
            "/start — главное меню\n"
            "/play — начать игру\n"
            "/help — правила\n"
            "/stats — статистика\n"
            "/share — поделиться\n"
            "/about — о боте",
            reply_markup=get_play_keyboard(),
            parse_mode='Markdown'
        )
    except Exception as e:
        logger.error(f"Error in unknown_command: {e}", exc_info=True)


async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик ошибок."""
    logger.error(f"Exception while handling an update: {context.error}")
    
    # Пытаемся уведомить пользователя
    if update and hasattr(update, 'effective_message') and update.effective_message:
        try:
            await update.effective_message.reply_text(
                "😅 Произошла ошибка. Попробуй ещё раз!",
                reply_markup=get_play_keyboard()
            )
        except Exception as e:
            logger.error(f"Failed to send error message: {e}")


async def post_init(application: Application) -> None:
    """Инициализация бота после запуска."""
    try:
        logger.info("Initializing bot...")
        # Установка кнопки меню
        await application.bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(text="Wordlee!", web_app=WebAppInfo(url=WEBAPP_URL))
        )
        logger.info("Menu button set")
        
        # Установка команд бота
        commands = [
            ("start", "🎮 Главное меню"),
            ("play", "🎯 Начать игру"),
            ("help", "📖 Правила игры"),
            ("stats", "📊 Моя статистика"),
            ("share", "📤 Поделиться"),
            ("about", "ℹ️ О боте"),
        ]
        await application.bot.set_my_commands(commands)
        logger.info(f"Bot commands registered: {len(commands)} commands")
        
        # Проверка подключения
        bot_info = await application.bot.get_me()
        logger.info(f"Bot initialized successfully: @{bot_info.username} ({bot_info.first_name})")
    except Exception as e:
        logger.error(f"Error in post_init: {e}", exc_info=True)
        raise


def main() -> None:
    """Запуск бота."""
    try:
        logger.info("=" * 50)
        logger.info("Starting Wordlee bot...")
        logger.info(f"WEBAPP_URL: {WEBAPP_URL}")
        logger.info(f"BOT_USERNAME: {BOT_USERNAME}")
        logger.info("=" * 50)
        
        # Создание приложения
        application = Application.builder().token(BOT_TOKEN).post_init(post_init).build()
        
        # Команды (добавляем первыми, чтобы они обрабатывались в первую очередь)
        logger.info("Registering command handlers...")
        application.add_handler(CommandHandler("start", start))
        application.add_handler(CommandHandler("play", play_command))
        application.add_handler(CommandHandler("help", help_command))
        application.add_handler(CommandHandler("stats", stats_command))
        application.add_handler(CommandHandler("share", share_command))
        application.add_handler(CommandHandler("about", about_command))
        logger.info("Command handlers registered: 6 commands")
        
        # Обработчик inline-кнопок
        application.add_handler(CallbackQueryHandler(handle_callback))
        logger.info("Callback query handler registered")
        
        # Обработчик добавления бота в группу
        application.add_handler(MessageHandler(filters.StatusUpdate.NEW_CHAT_MEMBERS, handle_new_chat_members))
        logger.info("New chat members handler registered")
        
        # Обработчик текстовых сообщений
        application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text_message))
        logger.info("Text message handler registered")
        
        
        # Обработчик ошибок
        application.add_error_handler(error_handler)
        logger.info("Error handler registered")
        
        logger.info("All handlers registered successfully")
        logger.info("Starting polling...")
        logger.info("=" * 50)
        
        # Запуск бота
        application.run_polling(
            allowed_updates=Update.ALL_TYPES,
            drop_pending_updates=True  # Игнорируем старые обновления при запуске
        )
    except KeyboardInterrupt:
        logger.info("Bot stopped by user")
    except Exception as e:
        logger.error(f"Fatal error in main: {e}", exc_info=True)
        raise


if __name__ == '__main__':
    main()
