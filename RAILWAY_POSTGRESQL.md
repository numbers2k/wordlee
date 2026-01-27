# Как добавить PostgreSQL на Railway

## Пошаговая инструкция

### Шаг 1: Добавление PostgreSQL сервиса

1. В вашем проекте Railway найдите кнопку **"+ New"** (справа вверху или в левой панели)
2. Нажмите на нее
3. В выпадающем меню выберите **"Database"**
4. Выберите **"Add PostgreSQL"**
5. Railway автоматически создаст и настроит PostgreSQL сервис

### Шаг 2: Получение DATABASE_URL

После создания PostgreSQL сервиса:

1. Откройте созданный PostgreSQL сервис (он появится в списке сервисов слева)
2. Перейдите на вкладку **"Variables"**
3. Найдите переменную:
   - `DATABASE_URL` или
   - `POSTGRES_URL` или
   - `DATABASE_URL_PRIVATE`
4. Скопируйте значение (формат: `postgresql://user:password@host:port/database`)

### Шаг 3: Добавление DATABASE_URL в API сервис

Теперь нужно добавить этот URL в ваш API сервис:

#### Способ 1: Прямое копирование (простой)

1. Откройте ваш API сервис (например, "wordlee-api")
2. Перейдите на вкладку **"Variables"**
3. Нажмите **"+ New Variable"**
4. В поле **"Name"** введите: `DATABASE_URL`
5. В поле **"Value"** вставьте скопированный URL из PostgreSQL
6. Нажмите **"Add"**

#### Способ 2: Reference (рекомендуется)

Railway позволяет ссылаться на переменные других сервисов:

1. Откройте ваш API сервис
2. Перейдите на вкладку **"Variables"**
3. Нажмите **"+ New Variable"**
4. В поле **"Name"** введите: `DATABASE_URL`
5. В поле **"Value"** введите: `${{PostgreSQL.DATABASE_URL}}`
   - Замените `PostgreSQL` на имя вашего PostgreSQL сервиса (обычно это "PostgreSQL" или "postgres")
6. Нажмите **"Add"**

**Преимущества Reference:**
- Автоматически обновляется при изменении URL
- Не нужно копировать вручную
- Безопаснее

### Шаг 4: Проверка подключения

После добавления переменной:

1. Railway автоматически перезапустит ваш API сервис
2. Проверьте логи API сервиса (вкладка **"Deployments"** → выберите последний деплой → **"View Logs"**)
3. Должны увидеть сообщение: `"Database connection pool created"` и `"Database tables created/verified"`

Если видите ошибки:
- Проверьте, что `DATABASE_URL` правильный
- Убедитесь, что PostgreSQL сервис запущен (статус "Online")
- Проверьте, что имя сервиса в Reference правильное

## Визуальная структура

После добавления PostgreSQL ваша структура будет выглядеть так:

```
Railway Project: gracious-connection
├── PostgreSQL (новый сервис)
│   └── Variables:
│       └── DATABASE_URL = postgresql://...
│
├── wordlee (ваш API сервис)
│   └── Variables:
│       ├── BOT_TOKEN = ...
│       ├── DATABASE_URL = ${{PostgreSQL.DATABASE_URL}}  ← ссылка на PostgreSQL
│       └── API_PORT = 5000
│
└── wordlee-bot (ваш бот сервис)
    └── Variables:
        ├── BOT_TOKEN = ...
        └── WEBAPP_URL = ...
```

## Важные замечания

1. **Имя сервиса:** Если Railway назвал PostgreSQL сервис по-другому (например, "postgres" или "db"), используйте это имя в Reference:
   ```
   ${{postgres.DATABASE_URL}}
   ```

2. **Публичный доступ:** PostgreSQL на Railway по умолчанию доступен только внутри проекта. Это безопасно и правильно.

3. **Автоматическое создание таблиц:** При первом запуске API таблицы создадутся автоматически. Не нужно ничего делать вручную.

4. **Бэкапы:** Railway автоматически делает бэкапы PostgreSQL. Проверьте настройки в PostgreSQL сервисе → Settings.

## Решение проблем

### Ошибка: "DATABASE_URL not set"
- Убедитесь, что переменная `DATABASE_URL` добавлена в API сервис
- Проверьте, что имя в Reference правильное

### Ошибка: "Failed to initialize database"
- Проверьте логи API сервиса
- Убедитесь, что PostgreSQL сервис запущен
- Проверьте формат DATABASE_URL

### Ошибка: "connection refused"
- Убедитесь, что PostgreSQL сервис в статусе "Online"
- Проверьте, что используете правильный URL (не публичный, а внутренний)

---

**Готово!** После этих шагов ваша база данных будет подключена и готова к работе.
