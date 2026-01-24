# Деплой Telegram бота

## Важно: GitHub Pages ≠ Сервер для бота

- **GitHub Pages** — только для фронтенда (игра Wordle)
- **Telegram Bot** — нужен сервер для постоянной работы Python-скрипта

## Варианты деплоя бота

### 1. Railway.app (рекомендуется, бесплатно)

1. Зарегистрируйтесь на [railway.app](https://railway.app)
2. Создайте новый проект
3. Подключите GitHub репозиторий
4. Выберите папку `bot/`
5. Добавьте переменную окружения:
   - `BOT_TOKEN` = ваш токен от @BotFather
6. Railway автоматически запустит бота

### 2. Render.com (бесплатно)

1. Зарегистрируйтесь на [render.com](https://render.com)
2. Создайте новый "Web Service"
3. Подключите GitHub репозиторий
4. Настройки:
   - **Build Command:** `pip install -r bot/requirements.txt`
   - **Start Command:** `cd bot && python3 bot.py`
   - **Root Directory:** оставьте пустым
5. Добавьте переменную окружения:
   - `BOT_TOKEN` = ваш токен от @BotFather
6. Нажмите "Create Web Service"

### 3. Fly.io (бесплатно)

1. Установите flyctl: `curl -L https://fly.io/install.sh | sh`
2. Зарегистрируйтесь: `fly auth signup`
3. В папке проекта создайте `fly.toml`:
   ```toml
   app = "wordlee-bot"
   primary_region = "ams"
   
   [build]
   
   [env]
     BOT_TOKEN = "ваш_токен"
   
   [[services]]
     internal_port = 8080
     processes = ["app"]
   
   [[processes]]
     name = "app"
     command = "cd bot && python3 bot.py"
   ```
4. Деплой: `fly deploy`

### 4. Heroku (платный, но есть бесплатный tier)

1. Установите Heroku CLI
2. В папке `bot/` выполните:
   ```bash
   heroku create wordlee-bot
   heroku config:set BOT_TOKEN=ваш_токен
   git subtree push --prefix bot heroku main
   ```

## После деплоя

1. Бот должен автоматически запуститься
2. Проверьте логи на сервисе
3. Отправьте `/start` боту в Telegram
4. Бот должен ответить!

## Проверка работы

После деплоя проверьте:
- Логи сервиса показывают "Bot initialized successfully"
- Бот отвечает на команды в Telegram
- Кнопка "Wordlee!" открывает игру

## Важно

- **Не коммитьте `.env` файл** с токеном в GitHub!
- Используйте переменные окружения на сервисе
- Бот должен работать 24/7 для обработки команд
