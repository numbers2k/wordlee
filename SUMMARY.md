# Wordle RU — История разработки

## Обзор проекта

Telegram Mini App — русский клон игры Wordle. Угадай слово из 5 букв за 6 попыток.

**Дата начала:** 24 января 2026  
**Бот:** [@wordlee_ru_bot](https://t.me/wordlee_ru_bot)  
**Репозиторий:** [github.com/numbers2k/wordlee](https://github.com/numbers2k/wordlee)

---

## Этапы разработки

### Этап 1: Планирование
- Исследование существующих Wordle-клонов
- Выбор архитектуры: статический frontend + Python бот
- Определение функционала: daily mode, endless mode, статистика

### Этап 2: Базовая структура
- Папка `docs/` — фронтенд (для GitHub Pages)
- Папка `bot/` — Telegram бот на Python
- HTML структура: игровое поле 6x5, русская клавиатура (33 буквы)

### Этап 3: Стилизация
- Тёмная тема (цвета Wordle)
- Анимации: flip, shake, bounce, pop
- Адаптивная вёрстка

### Этап 4: Игровая логика
- Проверка слов по словарю
- Оценка букв (correct/present/absent)
- Сохранение состояния и статистики

### Этап 5: Интеграция с Telegram
- Подключение telegram-web-app.js
- Fullscreen режим
- Safe area для iPhone

---

## Проблемы и решения

### Проблема 1: Иконка вопроса без точки

**Симптом:** SVG иконка помощи отображалась без точки внизу знака вопроса.

**Причина:** Линия `<line x1="12" y1="17" x2="12.01" y2="17">` была слишком короткой для отображения.

**Решение:** Заменена на круг с явным заполнением.

```html
<!-- До -->
<line x1="12" y1="17" x2="12.01" y2="17"/>

<!-- После -->
<circle cx="12" cy="17" r="0.5" fill="currentColor"/>
```

---

### Проблема 2: Слова не отправлялись на проверку

**Симптом:** При нажатии "OK" ничего не происходило.

**Причина:** `WORDS_VALID` был объявлен как `Set`, но код использовал метод `.some()`, который работает только с массивами.

```javascript
// Ошибка
const WORDS_VALID = new Set([...]);
WORDS_VALID.some(w => ...)  // TypeError: WORDS_VALID.some is not a function
```

**Решение:** Преобразован Set в массив.

```javascript
// Исправлено
const WORDS_VALID = [...];
const allWords = [...WORDS_TARGET, ...WORDS_VALID];
return allWords.some(w => normalizeWord(w) === normalized);
```

---

### Проблема 3: Игровое поле не создавалось

**Симптом:** Клавиатура отображалась, но сетка 6x5 — пустая.

**Причина:** JavaScript ошибка прерывала `init()` до вызова `createBoard()`.

**Решение:** Добавлены проверки на null и try-catch блоки.

```javascript
function createBoard() {
    const board = document.getElementById('board');
    if (!board) return;  // Защита от null
    // ...
}
```

---

### Проблема 4: Кнопки модалки слипались

**Симптом:** Кнопки "Поделиться" и "Играть ещё" без отступов.

**Причина:** Недостаточный gap в flexbox контейнере.

**Решение:** Увеличен gap и добавлен margin.

```css
.share-section {
    gap: 24px;
}
.share-btn, .play-again-btn {
    margin: 8px 0;
}
```

---

### Проблема 5: Приложение открывается в разных режимах

**Симптом:** При открытии через кнопку клавиатуры — компактный режим, через страницу бота — полноэкранный, но шапка перекрывалась UI Telegram.

**Причина:** Не использовались новые методы Telegram Mini Apps API 8.0+.

**Решение:** Добавлены вызовы fullscreen API и обработка safe areas.

```javascript
// Запрос полноэкранного режима
if (tg.isVersionAtLeast('8.0') && tg.requestFullscreen) {
    tg.requestFullscreen();
}

// Обработка отступов
function updateSafeAreas() {
    if (tg.contentSafeAreaInset) {
        document.documentElement.style.setProperty(
            '--tg-safe-top', 
            `${tg.contentSafeAreaInset.top}px`
        );
    }
}

// Подписка на изменения
tg.onEvent('safeAreaChanged', updateSafeAreas);
tg.onEvent('contentSafeAreaChanged', updateSafeAreas);
tg.onEvent('fullscreenChanged', updateSafeAreas);
```

---

### Проблема 6: Клавиатура неудобная, кнопки выезжают

**Симптом:** Кнопки клавиатуры выходили за края экрана, особенно на маленьких iPhone.

**Причина:** Фиксированные размеры кнопок без учёта ширины экрана.

**Решение:** Полная переработка клавиатуры в iOS-стиле с адаптивными размерами.

```css
.key {
    flex: 1;
    min-width: 0;
    max-width: 36px;
    height: var(--key-height);
}

.key-action {
    flex: 1.5;
    max-width: 58px;
}

/* Offset для второго ряда (как в iOS) */
.keyboard-row-offset {
    padding: 0 6px;
}

.spacer-half {
    flex: 0.5;
}
```

Добавлены media queries для всех размеров iPhone:

```css
/* iPhone SE */
@media (max-width: 375px) and (max-height: 667px) { ... }

/* iPhone 12/13/14 */
@media (min-width: 376px) and (max-width: 393px) { ... }

/* iPhone 14 Pro */
@media (min-width: 393px) and (max-width: 430px) { ... }

/* iPhone 14 Pro Max */
@media (min-width: 430px) { ... }
```

---

### Проблема 7: Не видно первое и последнее слово

**Симптом:** На iPhone 14 Pro верхняя и нижняя строки игрового поля обрезались.

**Причина:** Игровое поле не учитывало safe areas и имело фиксированную высоту.

**Решение:** Использование `100dvh` (dynamic viewport height) и CSS переменных для safe areas.

```css
:root {
    --safe-area-top: max(
        var(--tg-safe-top), 
        var(--device-safe-top), 
        env(safe-area-inset-top, 0px)
    );
    --safe-area-bottom: max(
        var(--tg-safe-bottom), 
        var(--device-safe-bottom), 
        env(safe-area-inset-bottom, 0px)
    );
}

html, body { 
    height: 100dvh;
}

.container {
    height: 100dvh;
    padding-top: var(--safe-area-top);
}

.keyboard {
    padding-bottom: max(6px, var(--safe-area-bottom));
}
```

---

### Проблема 8: Прогресс не сохранялся

**Симптом:** При выходе из приложения и повторном входе игра начиналась заново. Пользователь терял прогресс.

**Причина:** Сохранение происходило только в конце игры, а не после каждого действия.

**Решение:** Реализовано автосохранение после каждого действия + при системных событиях.

```javascript
function addLetter(letter) {
    // ... логика добавления буквы
    saveGameState();  // Сохраняем после каждой буквы
}

function removeLetter() {
    // ... логика удаления буквы
    saveGameState();  // Сохраняем после каждого удаления
}

function setupAutosave() {
    // При закрытии вкладки
    window.addEventListener('beforeunload', saveGameState);
    
    // При сворачивании приложения
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) saveGameState();
    });
    
    // При сворачивании в Telegram
    tg.onEvent('viewportChanged', () => {
        if (!tg.isExpanded) saveGameState();
    });
}
```

Также добавлено сохранение `targetWord` для восстановления той же игры:

```javascript
const state = {
    board: gameState.board,
    targetWord: gameState.targetWord,  // Важно!
    timestamp: Date.now()
};
localStorage.setItem(key, JSON.stringify(state));
```

---

### Проблема 9: Не показывалось загаданное слово при проигрыше

**Симптом:** После 6 неудачных попыток пользователь не узнавал правильный ответ.

**Причина:** Отсутствовала логика показа ответа.

**Решение:** Добавлена функция `showLossMessage()` с визуальным отображением.

```javascript
function showLossMessage(word) {
    // Toast уведомление
    showToast(`Правильное слово: ${word.toUpperCase()}`, 4000, 'error');
    
    // Блок в модальном окне статистики
    const answerDisplay = document.createElement('div');
    answerDisplay.className = 'correct-answer-display';
    answerDisplay.innerHTML = `
        <div class="loss-message">
            <p class="loss-text">Правильное слово:</p>
            <p class="loss-word">${word.toUpperCase()}</p>
        </div>
    `;
}
```

CSS стили:

```css
.correct-answer-display {
    margin: 16px 0 20px 0;
    padding: 16px;
    background: rgba(255, 68, 68, 0.1);
    border: 2px solid #ff4444;
    border-radius: 8px;
}

.loss-word {
    font-size: 1.8rem;
    font-weight: 700;
    color: #ff4444;
    letter-spacing: 4px;
}
```

---

### Проблема 10: Маленький словарь

**Симптом:** Пользователи жаловались, что многие слова не принимаются ("Слова нет в словаре").

**Причина:** В словаре было мало допустимых слов для ввода.

**Решение:** Расширение словаря с ~170 до ~1500 слов. Добавлены:
- Существительные разных форм
- Глаголы (разные лица и времена)
- Прилагательные
- Наречия
- Числительные

---

### Проблема 11: Усечённые слова в словаре

**Симптом:** Некоторые слова в словаре были короче 5 букв (усечены).

**Причина:** Ошибка при генерации словаря — слова были обрезаны.

**Пример ошибок:**
```javascript
"творо"   // должно быть "творог"
"кроват"  // должно быть "кровать" (но это 7 букв)
"подуш"   // усечено
```

**Решение:** Полная очистка словаря — оставлены только валидные 5-буквенные слова.

```javascript
// Итоговая структура
const WORDS_TARGET = [  // ~750 слов для загадывания
    "абзац", "аборт", "аванс", ...
];

const WORDS_VALID = [   // ~750 дополнительных слов для ввода
    "слово", "буква", "место", ...
];
```

---

## Финальная архитектура

```
┌─────────────────────────────────────────────────────────┐
│                 Telegram Mini App                        │
├─────────────────────────────────────────────────────────┤
│  index.html    — структура страницы                     │
│  styles.css    — стили, анимации, responsive            │
│  script.js     — игровая логика, Telegram API           │
│  words.js      — словарь (~1500 слов)                   │
│  manifest.json — PWA манифест                           │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                 Telegram Bot (Python)                    │
├─────────────────────────────────────────────────────────┤
│  /start   — приветствие + кнопка игры                   │
│  /help    — правила игры                                │
│  /stats   — ссылка на статистику                        │
│  Menu Button — быстрый доступ к игре                    │
└─────────────────────────────────────────────────────────┘
```

---

## Ключевые технические решения

| Решение | Обоснование |
|---------|-------------|
| Vanilla JS | Без фреймворков для минимального размера и максимальной скорости |
| localStorage | Надёжное хранение статистики без backend |
| CSS Variables | Динамическое изменение safe areas через JS |
| 100dvh | Корректная высота на мобильных с учётом адресной строки |
| requestFullscreen | Максимальное использование экрана |
| Autosave | Защита от потери прогресса |

---

## Версии и коммиты

| Дата | Коммит | Изменения |
|------|--------|-----------|
| 24.01.2026 | Initial | Базовая версия |
| 24.01.2026 | UI improvements | Исправление иконок, кнопок модалки |
| 24.01.2026 | Custom keyboard | Редизайн клавиатуры, фикс шапки |
| 24.01.2026 | Major update | Fullscreen, safe areas, autosave, словарь |

---

## Тестирование

**Устройства:**
- iPhone 11 (375×812)
- iPhone 14 Pro (393×852)

**Режимы открытия:**
- Через кнопку клавиатуры (compact mode)
- Через страницу бота (fullscreen mode)
- Через Menu Button

**Отладка:**
```
https://numbers2k.github.io/wordlee/?debug=true
```

---

## Выводы и lessons learned

1. **DOM Safety** — всегда проверять элементы на null перед использованием
2. **Set vs Array** — разные структуры данных имеют разные методы
3. **Safe Areas** — критически важны для современных iPhone
4. **Autosave** — пользователи ожидают автоматическое сохранение
5. **Fullscreen API** — требует Telegram Mini Apps API 8.0+
6. **Responsive Design** — media queries для каждого размера экрана
7. **User Feedback** — реальные пользователи находят баги, которые не видишь сам
8. **Dictionary Quality** — валидация данных важна не меньше кода

---

## TODO (потенциальные улучшения)

- [ ] Добавить звуковые эффекты
- [ ] Реализовать хинты (подсказки)
- [ ] Добавить выбор сложности (6/7/8 букв)
- [ ] Мультиязычность (украинский, белорусский)
- [ ] Таблица лидеров через Telegram Cloud Storage
- [ ] Achievements (достижения)

---

**Последнее обновление:** 24 января 2026
