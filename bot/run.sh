#!/bin/bash
# Простой скрипт для запуска бота

cd "$(dirname "$0")"

echo "🚀 Запуск Wordle RU бота..."
echo ""

# Проверка .env
if [ ! -f .env ]; then
    echo "❌ Файл .env не найден!"
    echo "Создайте .env на основе .env.example"
    exit 1
fi

# Проверка токена
if ! grep -q "BOT_TOKEN=" .env || grep -q "your_bot_token_here" .env; then
    echo "❌ BOT_TOKEN не настроен в .env!"
    exit 1
fi

echo "✅ Конфигурация проверена"
echo "🤖 Запуск бота..."
echo "Для остановки нажмите Ctrl+C"
echo ""

python3 bot.py
