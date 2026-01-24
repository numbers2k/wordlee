# Wordle RU — Telegram Mini App

Русская версия популярной игры Wordle для Telegram.

**Играть:** [@wordlee_ru_bot](https://t.me/wordlee_ru_bot)

## Скриншоты

<p align="center">
  <img src="https://img.shields.io/badge/status-working-brightgreen" alt="Status">
  <img src="https://img.shields.io/badge/platform-Telegram-blue" alt="Platform">
  <img src="https://img.shields.io/badge/language-Russian-red" alt="Language">
</p>

## Геймплей

Угадай слово из **5 букв** за **6 попыток**.

| Цвет | Значение |
|------|----------|
| 🟩 Зелёный | Буква на правильном месте |
| 🟨 Жёлтый | Буква есть, но не на том месте |
| ⬜ Серый | Буквы нет в слове |

## Возможности

- ♾️ **Бесконечный режим** — играй сколько хочешь
- 💾 **Автосохранение** — прогресс не теряется при выходе
- 📊 **Статистика** — отслеживай победы и серии
- 📱 **Адаптивный дизайн** — работает на всех iPhone
- 🌙 **Тёмная тема** — комфортно для глаз
- 📤 **Поделиться** — отправь результат друзьям

## Структура проекта

```
wordlee/
├── docs/               # Frontend (GitHub Pages)
│   ├── index.html      # Разметка
│   ├── styles.css      # Стили + responsive
│   ├── script.js       # Игровая логика
│   └── words.js        # Словарь (~1500 слов)
├── bot/                # Telegram Bot
│   ├── bot.py          # Команды бота
│   ├── requirements.txt
│   └── .env.example
└── README.md
```

## Локальный запуск

### Frontend
```bash
cd docs
python3 -m http.server 8080
# Открой http://localhost:8080
```

### Bot
```bash
cd bot
pip install -r requirements.txt
cp .env.example .env
# Добавь BOT_TOKEN в .env
python bot.py
```

## Деплой

### GitHub Pages
1. Settings → Pages
2. Branch: `main`, Folder: `/docs`
3. Save

### Telegram Bot
1. [@BotFather](https://t.me/BotFather) → `/newbot`
2. Bot Settings → Menu Button → указать URL приложения
3. Запустить `bot.py` на сервере

## Технологии

- **Frontend:** HTML, CSS, JavaScript (vanilla)
- **Backend:** Python, python-telegram-bot
- **API:** Telegram Mini Apps API
- **Хостинг:** GitHub Pages

## Команды бота

| Команда | Описание |
|---------|----------|
| `/start` | Начать игру |
| `/help` | Правила игры |
| `/stats` | Статистика |

## Лицензия

MIT
