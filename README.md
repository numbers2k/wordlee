# Wordle RU - Telegram Mini App

Русская версия игры Wordle для Telegram.

**Бот:** [@wordlee_ru_bot](https://t.me/wordlee_ru_bot)

## Особенности

- Угадай слово из 5 букв за 6 попыток
- Каждый день — новое слово
- Бесконечный режим после ежедневной игры
- Статистика и серии побед
- Темная тема, плавные анимации

## Структура

```
main/
├── bot/
│   ├── bot.py
│   ├── requirements.txt
│   └── .env.example
├── docs/
│   ├── index.html
│   ├── styles.css
│   ├── script.js
│   └── words.js
└── README.md
```

## Локальный запуск

```bash
cd docs && python3 -m http.server 8080
```

## Деплой

### Frontend (GitHub Pages)

1. Создай репозиторий на GitHub
2. Settings → Pages → Branch: main, folder: `/docs`
3. URL: `https://USERNAME.github.io/REPO/`

### Bot

```bash
cd bot
pip install -r requirements.txt
python bot.py
```

### Настройка в BotFather

1. `/mybots` → выбрать бота
2. Bot Settings → Menu Button → Configure
3. Указать URL веб-приложения

## Технологии

- HTML/CSS/JavaScript (vanilla)
- Python + python-telegram-bot
- localStorage для статистики

## Лицензия

MIT
