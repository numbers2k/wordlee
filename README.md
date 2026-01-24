# Wordle RU — Telegram Mini App

Русская версия игры Wordle для Telegram.

**Играть:** [@wordlee_ru_bot](https://t.me/wordlee_ru_bot)

## Геймплей

Угадай слово из **5 букв** за **6 попыток**.

- 🟩 Зелёный — буква на правильном месте
- 🟨 Жёлтый — буква есть, но не на том месте
- ⬜ Серый — буквы нет в слове

## Возможности

- Бесконечный режим — играй сколько хочешь
- Автосохранение прогресса
- Статистика побед и серий
- Адаптивный дизайн для всех iPhone
- Тёмная тема

## Структура

```
wordlee/
├── docs/           # Frontend (GitHub Pages)
│   ├── index.html
│   ├── styles.css
│   ├── script.js
│   └── words.js
├── bot/            # Telegram Bot
│   ├── bot.py
│   └── requirements.txt
└── README.md
```

## Запуск

### Frontend
```bash
cd docs && python3 -m http.server 8080
```

### Bot
```bash
cd bot
pip install -r requirements.txt
python bot.py
```

## Деплой

1. GitHub: Settings → Pages → Branch: `main`, Folder: `/docs`
2. BotFather: Bot Settings → Menu Button → URL приложения

## Технологии

- HTML/CSS/JavaScript (vanilla)
- Telegram Mini Apps API
- Python + python-telegram-bot

## Лицензия

MIT
