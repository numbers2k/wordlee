# Инструкция по развертыванию Wordlee v1.3.0

## Обзор изменений

Версия 1.3.0 добавляет:
- Синхронизацию статистики между устройствами через user ID
- Систему начисления очков (1000/800/600/400/200/100 за победы)
- Лидерборд с топ-10 игроками
- UI улучшения (клавиатура, выделенные кнопки)

## Требования

1. **PostgreSQL база данных** (Railway, Supabase, или другой провайдер)
2. **Backend API сервер** (отдельный сервис на Railway или другой платформе)
3. **GitHub Pages** (для frontend)
4. **Railway** (для Telegram бота)

## Шаг 1: Настройка базы данных PostgreSQL

### Вариант A: Railway PostgreSQL (рекомендуется)

1. В вашем проекте Railway нажмите **"+ New"** (справа вверху или в левой панели)
2. Выберите **"Database"** → **"Add PostgreSQL"**
3. Railway автоматически создаст PostgreSQL сервис
4. После создания откройте сервис PostgreSQL
5. Перейдите на вкладку **"Variables"**
6. Найдите переменную **`DATABASE_URL`** или **`POSTGRES_URL`**
7. Скопируйте значение (формат: `postgresql://user:password@host:port/database`)
8. **Важно:** Этот URL нужно будет добавить в переменные окружения вашего API сервиса

### Вариант B: Supabase

1. Зайдите на [supabase.com](https://supabase.com)
2. Создайте новый проект
3. В Settings → Database найдите Connection String
4. Используйте Connection Pooling URL (формат: `postgresql://...`)

### Вариант C: Другая БД

Используйте любой PostgreSQL провайдер. Таблицы создадутся автоматически при первом запуске API.

## Шаг 2: Развертывание Backend API

### 2.1 Создание сервиса на Railway

1. В Railway создайте новый сервис
2. Подключите GitHub репозиторий
3. Выберите папку `bot/` как root directory
4. Railway автоматически определит Python проект

### 2.2 Настройка переменных окружения

1. Откройте ваш API сервис в Railway
2. Перейдите на вкладку **"Variables"**
3. Нажмите **"+ New Variable"**
4. Добавьте следующие переменные:

```env
BOT_TOKEN=your_bot_token_here
DATABASE_URL=postgresql://user:password@host:port/database
API_PORT=5000
```

**Как получить DATABASE_URL:**
- Откройте ваш PostgreSQL сервис в Railway
- Перейдите на вкладку **"Variables"**
- Скопируйте значение `DATABASE_URL` или `POSTGRES_URL`
- Вставьте его в переменные API сервиса

**Альтернативный способ (через Reference):**
- В API сервисе нажмите **"+ New Variable"**
- Вместо значения введите: `${{PostgreSQL.DATABASE_URL}}`
- Railway автоматически подставит значение из PostgreSQL сервиса

### 2.3 Настройка запуска API

Создайте файл `Procfile` в корне проекта (или используйте `nixpacks.toml`):

**Вариант 1: Procfile**
```
web: cd bot && python3 api.py
```

**Вариант 2: Обновите railway.json**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "cd bot && python3 api.py",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 2.4 Получение URL API

После деплоя скопируйте публичный URL вашего API сервиса (например: `https://wordlee-api.railway.app`)

## Шаг 3: Обновление Frontend

### 3.1 Обновление API URL

Откройте `docs/script.js` и обновите строку 13:

```javascript
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : 'https://your-api-url.railway.app';
```

Замените `your-api-url.railway.app` на ваш реальный URL API.

### 3.2 Деплой на GitHub Pages

1. Закоммитьте изменения:
```bash
git add .
git commit -m "Update to v1.3.0"
git push
```

2. GitHub Pages автоматически обновится (если настроен автодеплой)
3. Или вручную: Settings → Pages → Deploy from branch `main` / `docs`

## Шаг 4: Развертывание Telegram бота

### 4.1 Создание сервиса бота на Railway

1. Создайте еще один сервис в Railway (или используйте существующий)
2. Подключите тот же репозиторий
3. Root directory: `bot/`

### 4.2 Настройка переменных окружения бота

```env
BOT_TOKEN=your_bot_token_here
WEBAPP_URL=https://numbers2k.github.io/wordlee
BOT_USERNAME=wordlee_ru_bot
```

### 4.3 Настройка запуска бота

Обновите `railway.json` или создайте отдельный для бота:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "cd bot && python3 bot.py",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Или используйте `nixpacks.toml` (он уже настроен для бота).

## Шаг 5: Проверка работы

### 5.1 Проверка API

Откройте в браузере:
```
https://your-api-url.railway.app/api/health
```

Должен вернуться:
```json
{"status": "ok", "version": "1.3.0"}
```

### 5.2 Проверка бота

1. Откройте Telegram бота
2. Отправьте `/start`
3. Проверьте, что кнопка "Играть" открывает игру
4. Проверьте команду `/leaderboard`

### 5.3 Проверка игры

1. Откройте игру через бота
2. Сыграйте одну игру
3. Проверьте, что очки начисляются
4. Откройте статистику - должны быть очки
5. Откройте лидерборд - должен показывать топ игроков

## Структура файлов для деплоя

```
wordlee/
├── bot/                    # Backend (бот + API)
│   ├── api.py             # API сервер (запускается отдельно)
│   ├── bot.py             # Telegram бот
│   ├── database.py        # Работа с БД
│   ├── requirements.txt   # Зависимости
│   └── .env.example       # Пример переменных
├── docs/                  # Frontend (GitHub Pages)
│   ├── index.html
│   ├── script.js          # ⚠️ Обновить API_URL!
│   ├── styles.css
│   ├── words.js
│   └── manifest.json
├── railway.json           # Конфигурация Railway
├── nixpacks.toml          # Конфигурация сборки
└── README.md
```

## Важные замечания

### CORS

API должен разрешать запросы с вашего GitHub Pages домена. Flask-CORS уже настроен в `api.py`, но убедитесь, что он работает.

### HTTPS

Telegram WebApp требует HTTPS для всех запросов. Убедитесь, что:
- GitHub Pages использует HTTPS (по умолчанию)
- Railway API использует HTTPS (по умолчанию)

### Переменные окружения

**Для API сервиса:**
- `BOT_TOKEN` - токен Telegram бота
- `DATABASE_URL` - строка подключения к PostgreSQL
- `API_PORT` - порт (опционально, по умолчанию 5000)

**Для бота:**
- `BOT_TOKEN` - токен Telegram бота
- `WEBAPP_URL` - URL вашего GitHub Pages
- `BOT_USERNAME` - username бота (опционально)

### Миграция данных

При первом входе пользователя данные из localStorage автоматически синхронизируются с сервером (если доступен API). Старые данные сохраняются как fallback.

## Решение проблем

### API не отвечает

1. Проверьте логи Railway API сервиса
2. Убедитесь, что `DATABASE_URL` правильный
3. Проверьте, что PostgreSQL доступен

### Бот не отвечает

1. Проверьте логи Railway бота
2. Убедитесь, что `BOT_TOKEN` правильный
3. Проверьте, что бот запущен

### Игра не загружает статистику

1. Проверьте консоль браузера (F12)
2. Убедитесь, что `API_URL` в `script.js` правильный
3. Проверьте CORS настройки API

### Лидерборд пустой

1. Сыграйте несколько игр и выиграйте их
2. Проверьте, что очки начисляются в статистике
3. Проверьте логи API при запросе лидерборда

## Формула очков

- 1 попытка: **1000 очков**
- 2 попытки: **800 очков**
- 3 попытки: **600 очков**
- 4 попытки: **400 очков**
- 5 попыток: **200 очков**
- 6 попыток: **100 очков**
- Проигрыш: **0 очков**

## Контакты и поддержка

Если возникли проблемы:
1. Проверьте логи в Railway
2. Проверьте консоль браузера (F12)
3. Убедитесь, что все переменные окружения установлены

---

**Версия:** 1.3.0  
**Дата:** 2026-01-27
