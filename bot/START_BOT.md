# Инструкция по запуску бота

## Проблема: бот не отвечает на команды

**Главная причина:** Бот не запущен!

## Быстрый запуск

1. **Установите зависимости:**
   ```bash
   cd /Users/gpt0/Desktop/tg/main/bot
   pip3 install python-telegram-bot python-dotenv
   ```
   
   Если возникнет ошибка, используйте:
   ```bash
   pip3 install --user python-telegram-bot python-dotenv
   ```

2. **Проверьте токен:**
   ```bash
   cat .env | grep BOT_TOKEN
   ```
   
   Должен быть реальный токен от @BotFather

3. **Запустите бота:**
   ```bash
   python3 bot.py
   ```

4. **Проверьте логи:**
   При запуске должны появиться сообщения:
   ```
   ==================================================
   Starting Wordle RU bot...
   WEBAPP_URL: https://numbers2k.github.io/wordlee
   BOT_USERNAME: wordlee_ru_bot
   ==================================================
   Initializing bot...
   Menu button set
   Bot commands registered: 6 commands
   Bot initialized successfully: @wordlee_ru_bot (Wordlee RU)
   Registering command handlers...
   Command handlers registered: 6 commands
   ...
   Starting polling...
   ```

5. **Отправьте команду `/start` боту в Telegram**

## Запуск в фоне (для постоянной работы)

### macOS/Linux:
```bash
nohup python3 bot.py > bot.log 2>&1 &
```

### Или с screen:
```bash
screen -S wordle_bot
python3 bot.py
# Нажмите Ctrl+A, затем D для отсоединения
```

## Проверка работы

После запуска бота:
- Откройте Telegram: [@wordlee_ru_bot](https://t.me/wordlee_ru_bot)
- Отправьте `/start`
- Бот должен ответить приветственным сообщением

## Решение проблем

### Бот не запускается
- Проверьте, что токен правильный в `.env`
- Проверьте, что зависимости установлены
- Посмотрите на ошибки в консоли

### Бот запущен, но не отвечает
- Проверьте логи на наличие ошибок
- Убедитесь, что бот действительно запущен: `ps aux | grep bot.py`
- Попробуйте перезапустить бота

### Ошибка "ModuleNotFoundError"
Установите зависимости:
```bash
pip3 install python-telegram-bot python-dotenv
```
