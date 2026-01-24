# 🟩 Wordle RU — Telegram Mini App

Русская версия популярной игры Wordle в формате Telegram Mini App.

**Играть:** [@wordlee_ru_bot](https://t.me/wordlee_ru_bot)

---

## 🎮 Геймплей

Угадай слово из **5 букв** за **6 попыток**.

После каждой попытки буквы окрашиваются:
- 🟩 **Зелёный** — буква на правильном месте
- 🟨 **Жёлтый** — буква есть, но не на том месте  
- ⬜ **Серый** — буквы нет в слове

---

## ✨ Особенности

- 📅 **Ежедневное слово** — каждый день новое слово для всех
- ♾️ **Бесконечный режим** — продолжай играть после daily
- 📊 **Статистика** — отслеживай серии побед и процент угадываний
- 💾 **Автосохранение** — прогресс сохраняется при сворачивании приложения
- 📱 **Адаптивный дизайн** — оптимизировано для всех iPhone (SE — Pro Max)
- 🌙 **Тёмная тема** — комфортно для глаз
- 📤 **Поделиться результатом** — отправь друзьям свой результат

---

## 📱 Скриншоты

| Игра | Победа | Статистика |
|:----:|:------:|:----------:|
| Игровое поле 6x5 | Анимация победы | Распределение попыток |

---

## 🛠 Технологии

| Компонент | Технология |
|-----------|------------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Python + python-telegram-bot |
| Хранение | localStorage + Telegram Cloud Storage |
| Хостинг | GitHub Pages |
| API | Telegram Mini Apps API 8.0+ |

---

## 📁 Структура проекта

```
wordlee/
├── docs/                    # Frontend (GitHub Pages)
│   ├── index.html          # Главная страница
│   ├── styles.css          # Стили и анимации
│   ├── script.js           # Игровая логика
│   ├── words.js            # Словарь (~1500 слов)
│   ├── manifest.json       # PWA манифест
│   └── assets/
│       └── icon.svg        # Иконка приложения
│
├── bot/                     # Telegram Bot
│   ├── bot.py              # Основной код бота
│   ├── requirements.txt    # Зависимости Python
│   └── .env.example        # Пример конфигурации
│
├── README.md               # Этот файл
├── SUMMARY.md              # История разработки
└── vercel.json             # Конфиг для Vercel (опционально)
```

---

## 🚀 Запуск

### Frontend (локально)

```bash
cd docs
python3 -m http.server 8080
# Открыть http://localhost:8080
```

### Bot

```bash
cd bot
pip install -r requirements.txt
cp .env.example .env
# Отредактировать .env, добавив BOT_TOKEN и WEB_APP_URL
python bot.py
```

---

## ☁️ Деплой

### GitHub Pages (Frontend)

1. Создай репозиторий на GitHub
2. Загрузи код: `git push origin main`
3. Settings → Pages → Branch: `main`, Folder: `/docs`
4. URL: `https://USERNAME.github.io/wordlee/`

### Настройка бота (BotFather)

1. `/mybots` → выбрать бота
2. **Bot Settings** → **Menu Button** → **Configure menu button**
3. Указать URL: `https://USERNAME.github.io/wordlee/`

---

## 🔧 Отладка

Добавь `?debug=true` к URL для включения режима отладки:
```
https://USERNAME.github.io/wordlee/?debug=true
```

В консоли браузера появятся подробные логи:
- Safe area insets
- Viewport dimensions
- Fullscreen state
- Game state saves

---

## 📝 Команды бота

| Команда | Описание |
|---------|----------|
| `/start` | Начать игру |
| `/help` | Правила игры |
| `/stats` | Открыть статистику |

---

## 🎯 Функционал Telegram Mini Apps

- `requestFullscreen()` — полноэкранный режим
- `expand()` — развернуть на весь экран
- `safeAreaInset` — учёт вырезов (notch)
- `contentSafeAreaInset` — отступы от UI Telegram
- `CloudStorage` — облачное хранение данных
- `setHeaderColor()` — цвет шапки

---

## 📄 Лицензия

MIT License — свободное использование и модификация.

---

## 🙏 Благодарности

- [Wordle](https://www.nytimes.com/games/wordle/) — оригинальная игра от Josh Wardle
- [Telegram](https://core.telegram.org/bots/webapps) — документация Mini Apps

---

**Сделано с ❤️ для Telegram**
