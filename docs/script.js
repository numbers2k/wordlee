/**
 * Wordle RU - Telegram Mini App
 */

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;
const FLIP_DURATION = 500;
const FLIP_DELAY = 300;

const GAME_MODE = { DAILY: 'daily', ENDLESS: 'endless' };

let gameState = {
    targetWord: '',
    currentRow: 0,
    currentTile: 0,
    board: [],
    gameOver: false,
    won: false,
    evaluations: [],
    mode: GAME_MODE.DAILY,
    gameNumber: 0
};

let tg = null;

// Debug mode for testing
const DEBUG_MODE = new URLSearchParams(window.location.search).get('debug') === 'true';

// Visual debug panel for mobile testing
let debugPanel = null;

function debugLog(...args) {
    if (DEBUG_MODE) {
        console.log('[Wordle Debug]', ...args);
        
        // Also show on visual debug panel
        if (debugPanel) {
            const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
            const line = document.createElement('div');
            line.textContent = `${new Date().toLocaleTimeString()}: ${msg}`;
            line.style.borderBottom = '1px solid #333';
            line.style.padding = '2px 0';
            debugPanel.insertBefore(line, debugPanel.firstChild);
            
            // Keep only last 20 messages
            while (debugPanel.children.length > 20) {
                debugPanel.removeChild(debugPanel.lastChild);
            }
        }
    }
}

function createDebugPanel() {
    if (!DEBUG_MODE) return;
    
    debugPanel = document.createElement('div');
    debugPanel.id = 'debugPanel';
    debugPanel.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        max-height: 150px;
        overflow-y: auto;
        background: rgba(0,0,0,0.9);
        color: #0f0;
        font-size: 10px;
        font-family: monospace;
        padding: 5px;
        z-index: 9999;
        border-top: 2px solid #0f0;
    `;
    document.body.appendChild(debugPanel);
    
    // Add storage test button
    const testBtn = document.createElement('button');
    testBtn.textContent = 'Test Storage';
    testBtn.style.cssText = 'margin: 5px; padding: 5px; font-size: 12px;';
    testBtn.onclick = testLocalStorage;
    debugPanel.appendChild(testBtn);
    
    // Add clear button
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear Storage';
    clearBtn.style.cssText = 'margin: 5px; padding: 5px; font-size: 12px;';
    clearBtn.onclick = () => {
        localStorage.clear();
        debugLog('localStorage cleared!');
    };
    debugPanel.appendChild(clearBtn);
    
    // Show all localStorage keys
    const showKeysBtn = document.createElement('button');
    showKeysBtn.textContent = 'Show Keys';
    showKeysBtn.style.cssText = 'margin: 5px; padding: 5px; font-size: 12px;';
    showKeysBtn.onclick = () => {
        const keys = Object.keys(localStorage);
        debugLog('localStorage keys:', keys);
        keys.forEach(k => {
            const val = localStorage.getItem(k);
            debugLog(`  ${k}: ${val ? val.substring(0, 100) : 'null'}...`);
        });
    };
    debugPanel.appendChild(showKeysBtn);
}

function testLocalStorage() {
    const testKey = 'wordle_test_' + Date.now();
    const testValue = { test: true, time: Date.now() };
    
    try {
        localStorage.setItem(testKey, JSON.stringify(testValue));
        const retrieved = localStorage.getItem(testKey);
        const parsed = JSON.parse(retrieved);
        localStorage.removeItem(testKey);
        
        if (parsed.test === true) {
            debugLog('localStorage TEST PASSED');
        } else {
            debugLog('localStorage TEST FAILED - data mismatch');
        }
    } catch (e) {
        debugLog('localStorage TEST FAILED:', e.message);
    }
}

function initTelegram() {
    try {
        debugLog('Initializing Telegram Web App...');
        
        if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
            tg = Telegram.WebApp;
            debugLog('Telegram Web App available, version:', tg.version);
            debugLog('Platform:', tg.platform);
            
            // Inform Telegram that app is ready
            tg.ready();
            
            // Expand to maximum height
            tg.expand();
            debugLog('After expand - isExpanded:', tg.isExpanded);
            
            // Set colors
            if (tg.setHeaderColor) tg.setHeaderColor('#121213');
            if (tg.setBackgroundColor) tg.setBackgroundColor('#121213');
            
            // Request fullscreen mode (Bot API 8.0+)
            if (tg.isVersionAtLeast && tg.isVersionAtLeast('8.0')) {
                debugLog('API 8.0+ detected, requesting fullscreen...');
                if (tg.requestFullscreen) {
                    tg.requestFullscreen();
                    debugLog('Fullscreen requested');
                }
            }
            
            // Apply safe area insets
            updateSafeAreas();
            
            // Track safe area changes
            if (tg.onEvent) {
                tg.onEvent('safeAreaChanged', updateSafeAreas);
                tg.onEvent('contentSafeAreaChanged', updateSafeAreas);
                tg.onEvent('viewportChanged', updateSafeAreas);
                tg.onEvent('fullscreenChanged', () => {
                    debugLog('Fullscreen changed:', tg.isFullscreen);
                    updateSafeAreas();
                });
            }
        } else {
            debugLog('Telegram Web App not available');
        }
        document.body.classList.add('dark-theme');
    } catch (e) {
        console.error('Telegram init error:', e);
        debugLog('Init error:', e.stack);
    }
}

function updateSafeAreas() {
    if (!tg) return;
    
    debugLog('Updating safe areas...');
    
    // Use contentSafeAreaInset to avoid overlapping with Telegram UI
    if (tg.contentSafeAreaInset) {
        const top = tg.contentSafeAreaInset.top || 0;
        const bottom = tg.contentSafeAreaInset.bottom || 0;
        const left = tg.contentSafeAreaInset.left || 0;
        const right = tg.contentSafeAreaInset.right || 0;
        
        document.documentElement.style.setProperty('--tg-safe-top', `${top}px`);
        document.documentElement.style.setProperty('--tg-safe-bottom', `${bottom}px`);
        document.documentElement.style.setProperty('--tg-safe-left', `${left}px`);
        document.documentElement.style.setProperty('--tg-safe-right', `${right}px`);
        
        debugLog('Content safe area insets:', { top, bottom, left, right });
    }
    
    // Also account for device system safe areas
    if (tg.safeAreaInset) {
        const deviceTop = tg.safeAreaInset.top || 0;
        const deviceBottom = tg.safeAreaInset.bottom || 0;
        const deviceLeft = tg.safeAreaInset.left || 0;
        const deviceRight = tg.safeAreaInset.right || 0;
        
        document.documentElement.style.setProperty('--device-safe-top', `${deviceTop}px`);
        document.documentElement.style.setProperty('--device-safe-bottom', `${deviceBottom}px`);
        document.documentElement.style.setProperty('--device-safe-left', `${deviceLeft}px`);
        document.documentElement.style.setProperty('--device-safe-right', `${deviceRight}px`);
        
        debugLog('Device safe area insets:', { deviceTop, deviceBottom, deviceLeft, deviceRight });
    }
    
    // Log viewport info
    if (tg.viewportHeight) {
        debugLog('Viewport height:', tg.viewportHeight);
        debugLog('Viewport stable height:', tg.viewportStableHeight);
    }
}

function getDailyWord() {
    const today = new Date();
    const startDate = new Date('2024-01-01');
    const days = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    return WORDS_TARGET[Math.abs(days) % WORDS_TARGET.length].toUpperCase();
}

function getRandomWord() {
    return WORDS_TARGET[Math.floor(Math.random() * WORDS_TARGET.length)].toUpperCase();
}

function getGameNumber() {
    const today = new Date();
    const startDate = new Date('2024-01-01');
    return Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
}

function showToast(message, duration = 2000, type = '') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function normalizeWord(word) {
    return word.toUpperCase().replace(/Ё/g, 'Е');
}

function isValidWord(word) {
    const normalized = normalizeWord(word);
    const allWords = [...WORDS_TARGET, ...WORDS_VALID];
    return allWords.some(w => normalizeWord(w) === normalized);
}

function createBoard() {
    const board = document.getElementById('board');
    if (!board) return;
    
    board.innerHTML = '';
    gameState.board = [];
    
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const row = document.createElement('div');
        row.className = 'row';
        row.dataset.row = i;
        
        const rowTiles = [];
        for (let j = 0; j < WORD_LENGTH; j++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.dataset.row = i;
            tile.dataset.col = j;
            row.appendChild(tile);
            rowTiles.push('');
        }
        
        board.appendChild(row);
        gameState.board.push(rowTiles);
    }
}

function resetKeyboard() {
    document.querySelectorAll('.key').forEach(key => {
        key.classList.remove('correct', 'present', 'absent');
        delete key.dataset.status;
    });
}

function addLetter(letter) {
    if (gameState.gameOver || gameState.currentTile >= WORD_LENGTH) return;
    
    const { currentRow: row, currentTile: col } = gameState;
    gameState.board[row][col] = letter.toUpperCase();
    
    const tile = document.querySelector(`.tile[data-row="${row}"][data-col="${col}"]`);
    if (tile) {
        tile.textContent = letter.toUpperCase();
        tile.classList.add('filled');
    }
    gameState.currentTile++;
    
    // Autosave after each change
    saveGameState();
}

function removeLetter() {
    if (gameState.gameOver || gameState.currentTile <= 0) return;
    
    gameState.currentTile--;
    const { currentRow: row, currentTile: col } = gameState;
    gameState.board[row][col] = '';
    
    const tile = document.querySelector(`.tile[data-row="${row}"][data-col="${col}"]`);
    if (tile) {
        tile.textContent = '';
        tile.classList.remove('filled');
    }
    
    // Autosave after each change
    saveGameState();
}

function submitWord() {
    if (gameState.gameOver) return;
    
    if (gameState.currentTile < WORD_LENGTH) {
        shakeRow(gameState.currentRow);
        showToast('Недостаточно букв');
        return;
    }
    
    const guess = gameState.board[gameState.currentRow].join('');
    
    if (!isValidWord(guess)) {
        shakeRow(gameState.currentRow);
        showToast('Слова нет в словаре');
        return;
    }
    
    const evaluation = evaluateGuess(guess);
    gameState.evaluations[gameState.currentRow] = evaluation;
    revealRow(gameState.currentRow, evaluation);
    
    setTimeout(() => {
        if (normalizeWord(guess) === normalizeWord(gameState.targetWord)) {
            gameState.won = true;
            gameState.gameOver = true;
            celebrateWin();
            updateStats(true, gameState.currentRow + 1);
            setTimeout(showStatsModal, 1500);
        } else if (gameState.currentRow >= MAX_ATTEMPTS - 1) {
            gameState.gameOver = true;
            
            // Show the correct word more prominently
            showLossMessage(gameState.targetWord);
            
            updateStats(false);
            setTimeout(showStatsModal, 2500);
        } else {
            gameState.currentRow++;
            gameState.currentTile = 0;
        }
        saveGameState();
    }, WORD_LENGTH * FLIP_DELAY + FLIP_DURATION);
}

function evaluateGuess(guess) {
    const evaluation = new Array(WORD_LENGTH).fill('absent');
    const target = normalizeWord(gameState.targetWord).split('');
    const guessArr = normalizeWord(guess).split('');
    
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guessArr[i] === target[i]) {
            evaluation[i] = 'correct';
            target[i] = null;
            guessArr[i] = null;
        }
    }
    
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guessArr[i] === null) continue;
        const idx = target.indexOf(guessArr[i]);
        if (idx !== -1) {
            evaluation[i] = 'present';
            target[idx] = null;
        }
    }
    
    return evaluation;
}

function revealRow(rowIndex, evaluation) {
    const row = document.querySelector(`.row[data-row="${rowIndex}"]`);
    if (!row) return;
    
    const tiles = row.querySelectorAll('.tile');
    const guess = gameState.board[rowIndex];
    
    tiles.forEach((tile, i) => {
        setTimeout(() => {
            tile.classList.add('flip');
            setTimeout(() => {
                tile.classList.add(evaluation[i]);
                updateKeyboard(guess[i], evaluation[i]);
            }, FLIP_DURATION / 2);
        }, i * FLIP_DELAY);
    });
}

function shakeRow(rowIndex) {
    const row = document.querySelector(`.row[data-row="${rowIndex}"]`);
    if (!row) return;
    row.classList.add('shake');
    setTimeout(() => row.classList.remove('shake'), 500);
}

function celebrateWin() {
    const row = document.querySelector(`.row[data-row="${gameState.currentRow}"]`);
    if (!row) return;
    
    const messages = ['Гениально!', 'Великолепно!', 'Отлично!', 'Неплохо!', 'Хорошо!', 'Успел!'];
    showToast(messages[gameState.currentRow], 3000, 'success');
    
    row.querySelectorAll('.tile').forEach((tile, i) => {
        setTimeout(() => tile.classList.add('win'), i * 100);
    });
}

// Show loss message with the correct word
function showLossMessage(word) {
    // Show toast with the correct word
    showToast(`Правильное слово: ${word.toUpperCase()}`, 4000, 'error');
    
    // Add message to stats modal
    const statsModal = document.getElementById('statsModal');
    if (statsModal) {
        // Add the correct answer display element if it doesn't exist
        let answerDisplay = statsModal.querySelector('.correct-answer-display');
        if (!answerDisplay) {
            answerDisplay = document.createElement('div');
            answerDisplay.className = 'correct-answer-display';
            
            const modalBody = statsModal.querySelector('.modal-body');
            if (modalBody) {
                // Insert at the beginning of modal body
                modalBody.insertBefore(answerDisplay, modalBody.firstChild);
            }
        }
        
        answerDisplay.innerHTML = `
            <div class="loss-message">
                <p class="loss-text">Правильное слово:</p>
                <p class="loss-word">${word.toUpperCase()}</p>
            </div>
        `;
    }
}

function updateKeyboard(letter, status) {
    const key = document.querySelector(`.key[data-key="${letter.toLowerCase().replace('ё', 'е')}"]`);
    if (!key) return;
    
    const current = key.dataset.status;
    if (current === 'correct') return;
    if (current === 'present' && status !== 'correct') return;
    
    key.classList.remove('correct', 'present', 'absent');
    key.classList.add(status);
    key.dataset.status = status;
}

function loadStats() {
    try {
        const saved = localStorage.getItem('wordle_stats');
        return saved ? JSON.parse(saved) : {
            gamesPlayed: 0, gamesWon: 0, currentStreak: 0, maxStreak: 0,
            guessDistribution: [0, 0, 0, 0, 0, 0]
        };
    } catch { return { gamesPlayed: 0, gamesWon: 0, currentStreak: 0, maxStreak: 0, guessDistribution: [0, 0, 0, 0, 0, 0] }; }
}

function saveStats(stats) {
    try { localStorage.setItem('wordle_stats', JSON.stringify(stats)); } catch {}
}

function updateStats(won, attempts = 0) {
    const stats = loadStats();
    stats.gamesPlayed++;
    if (won) {
        stats.gamesWon++;
        stats.currentStreak++;
        stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
        stats.guessDistribution[attempts - 1]++;
    } else {
        stats.currentStreak = 0;
    }
    saveStats(stats);
}

function displayStats() {
    const stats = loadStats();
    
    const el = (id) => document.getElementById(id);
    if (el('gamesPlayed')) el('gamesPlayed').textContent = stats.gamesPlayed;
    if (el('winPercent')) el('winPercent').textContent = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
    if (el('currentStreak')) el('currentStreak').textContent = stats.currentStreak;
    if (el('maxStreak')) el('maxStreak').textContent = stats.maxStreak;
    
    const dist = el('distribution');
    if (dist) {
        dist.innerHTML = '';
        const max = Math.max(...stats.guessDistribution, 1);
        
        for (let i = 0; i < 6; i++) {
            const row = document.createElement('div');
            row.className = 'dist-row';
            row.innerHTML = `
                <div class="dist-label">${i + 1}</div>
                <div class="dist-bar">
                    <div class="dist-fill ${gameState.won && gameState.currentRow === i ? 'highlight' : ''}" 
                         style="width: ${Math.max((stats.guessDistribution[i] / max) * 100, 8)}%">
                        ${stats.guessDistribution[i]}
                    </div>
                </div>
            `;
            dist.appendChild(row);
        }
    }
    
    if (el('shareSection')) el('shareSection').style.display = gameState.gameOver ? 'flex' : 'none';
    if (el('playAgainBtn')) el('playAgainBtn').style.display = gameState.gameOver ? 'inline-flex' : 'none';
}

function getStorageKey() {
    if (gameState.mode === GAME_MODE.DAILY) {
        const date = new Date().toISOString().split('T')[0];
        const key = `wordle_game_${date}`;
        return key;
    }
    return null;
}

function showStorageInfo() {
    const key = getStorageKey();
    debugLog('Current storage key:', key);
    
    if (key) {
        const data = localStorage.getItem(key);
        if (data) {
            try {
                const parsed = JSON.parse(data);
                debugLog('Stored data timestamp:', new Date(parsed.timestamp).toLocaleString());
                debugLog('Stored currentRow:', parsed.currentRow);
                debugLog('Stored board[0]:', parsed.board ? parsed.board[0] : 'no board');
            } catch (e) {
                debugLog('Error parsing stored data:', e.message);
            }
        } else {
            debugLog('No data found for key:', key);
        }
    }
}

function saveGameState() {
    const key = getStorageKey();
    if (!key) {
        debugLog('saveGameState: No key (endless mode), skipping save');
        return;
    }
    
    try {
        // Глубокое копирование board чтобы избежать проблем с ссылками
        const boardCopy = gameState.board.map(row => [...row]);
        const evalsCopy = gameState.evaluations.map(row => row ? [...row] : null);
        
        const state = {
            board: boardCopy,
            currentRow: gameState.currentRow,
            currentTile: gameState.currentTile,
            gameOver: gameState.gameOver,
            won: gameState.won,
            evaluations: evalsCopy,
            mode: gameState.mode,
            targetWord: gameState.targetWord,
            gameNumber: gameState.gameNumber,
            timestamp: Date.now()
        };
        
        const stateJson = JSON.stringify(state);
        localStorage.setItem(key, stateJson);
        
        debugLog('Saved game state:', {
            key,
            currentRow: state.currentRow,
            currentTile: state.currentTile,
            gameOver: state.gameOver,
            boardFirstRow: state.board[0],
            size: stateJson.length
        });
        
        // Also save to Telegram Cloud Storage if available
        if (tg && tg.CloudStorage) {
            tg.CloudStorage.setItem(key, stateJson, (error) => {
                if (error) {
                    debugLog('Cloud storage save failed:', error);
                } else {
                    debugLog('Game state saved to Cloud Storage');
                }
            });
        }
    } catch (e) {
        console.error('Save failed:', e);
        debugLog('Save error:', e.message);
    }
}

function loadGameState() {
    const key = getStorageKey();
    debugLog('Loading game state, key:', key);
    
    if (!key) {
        debugLog('No storage key (not daily mode)');
        return null;
    }
    
    try {
        const saved = localStorage.getItem(key);
        
        if (!saved) {
            debugLog('No saved state found in localStorage');
            return null;
        }
        
        const localState = JSON.parse(saved);
        debugLog('Loaded state from localStorage:', {
            hasBoard: !!localState.board,
            boardRows: localState.board ? localState.board.length : 0,
            currentRow: localState.currentRow,
            currentTile: localState.currentTile,
            gameOver: localState.gameOver,
            hasTargetWord: !!localState.targetWord,
            evaluationsCount: localState.evaluations ? localState.evaluations.filter(e => e).length : 0
        });
        
        return localState;
    } catch (e) {
        console.error('Load failed:', e);
        debugLog('Load error:', e.message);
        return null;
    }
}

// Setup autosave event listeners
function setupAutosave() {
    // Save when page is about to unload
    window.addEventListener('beforeunload', () => {
        saveGameState();
        debugLog('Saved on beforeunload');
    });
    
    // Save when tab becomes hidden (user switches apps)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            saveGameState();
            debugLog('Saved on visibility change (hidden)');
        }
    });
    
    // Save when Telegram viewport changes (minimizing app)
    if (tg && tg.onEvent) {
        tg.onEvent('viewportChanged', () => {
            if (!tg.isExpanded) {
                saveGameState();
                debugLog('Saved on viewport change (collapsed)');
            }
        });
    }
}

function validateAndFixState(state) {
    // Убедимся что evaluations это массив
    if (!Array.isArray(state.evaluations)) {
        state.evaluations = [];
    }
    
    // Убедимся что board это массив массивов
    if (!Array.isArray(state.board)) {
        state.board = [];
        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            state.board.push(new Array(WORD_LENGTH).fill(''));
        }
    }
    
    // Найти правильный currentRow на основе заполненных строк
    let completedRows = 0;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        if (state.evaluations[i] && state.evaluations[i].length === WORD_LENGTH) {
            completedRows = i + 1;
        }
    }
    
    // Если игра не окончена, currentRow должен быть следующей пустой строкой
    if (!state.gameOver) {
        state.currentRow = Math.min(completedRows, MAX_ATTEMPTS - 1);
        // Проверяем currentTile - считаем непустые буквы в текущем ряду
        const currentRowContent = state.board[state.currentRow] || [];
        state.currentTile = currentRowContent.filter(c => c && c !== '').length;
    }
    
    debugLog('validateAndFixState result:', {
        completedRows,
        currentRow: state.currentRow,
        currentTile: state.currentTile,
        gameOver: state.gameOver
    });
    
    return state;
}

function restoreGameState(state) {
    debugLog('Restoring game state, raw state:', JSON.stringify(state).substring(0, 500));
    
    state = validateAndFixState(state);
    
    // Копируем состояние
    gameState.board = state.board;
    gameState.currentRow = state.currentRow;
    gameState.currentTile = state.currentTile;
    gameState.gameOver = state.gameOver;
    gameState.won = state.won;
    gameState.evaluations = state.evaluations || [];
    gameState.mode = state.mode || GAME_MODE.DAILY;
    
    debugLog('After restore - currentRow:', gameState.currentRow, 'currentTile:', gameState.currentTile);
    
    // Восстанавливаем визуальное состояние доски
    for (let row = 0; row < MAX_ATTEMPTS; row++) {
        const rowData = state.board[row];
        if (!rowData) continue;
        
        for (let col = 0; col < WORD_LENGTH; col++) {
            const letter = rowData[col];
            const tile = document.querySelector(`.tile[data-row="${row}"][data-col="${col}"]`);
            
            if (!tile) {
                debugLog(`Tile not found: row=${row}, col=${col}`);
                continue;
            }
            
            if (letter && letter !== '') {
                tile.textContent = letter;
                tile.classList.add('filled');
                
                // Добавляем цвета только для оценённых рядов
                const rowEval = state.evaluations[row];
                if (rowEval && rowEval[col]) {
                    tile.classList.add(rowEval[col]);
                    updateKeyboard(letter, rowEval[col]);
                }
                
                debugLog(`Restored tile [${row}][${col}]: "${letter}", eval: ${rowEval ? rowEval[col] : 'none'}`);
            }
        }
    }
    
    debugLog('Game state restored successfully');
}

function startNewGame() {
    gameState = {
        targetWord: getRandomWord(),
        currentRow: 0,
        currentTile: 0,
        board: [],
        gameOver: false,
        won: false,
        evaluations: [],
        mode: GAME_MODE.ENDLESS,
        gameNumber: Math.floor(Math.random() * 100000)
    };
    createBoard();
    resetKeyboard();
    hideStatsModal();
    
    // Clear any previous loss message
    const answerDisplay = document.querySelector('.correct-answer-display');
    if (answerDisplay) {
        answerDisplay.remove();
    }
}

function startDailyGame() {
    debugLog('=== START DAILY GAME ===');
    showStorageInfo();
    
    const dailyWord = getDailyWord();
    const gameNum = getGameNumber();
    
    gameState = {
        targetWord: dailyWord,
        currentRow: 0,
        currentTile: 0,
        board: [],
        gameOver: false,
        won: false,
        evaluations: [],
        mode: GAME_MODE.DAILY,
        gameNumber: gameNum
    };
    
    debugLog('Initial gameState created, targetWord:', dailyWord, 'gameNumber:', gameNum);
    
    createBoard();
    resetKeyboard();
    
    // Clear any previous loss message
    const answerDisplay = document.querySelector('.correct-answer-display');
    if (answerDisplay) {
        answerDisplay.remove();
    }
    
    // Try to restore saved game
    const saved = loadGameState();
    
    if (saved && saved.board && saved.board.length > 0) {
        debugLog('Found saved state!');
        debugLog('Saved timestamp:', saved.timestamp ? new Date(saved.timestamp).toLocaleString() : 'none');
        debugLog('Saved currentRow:', saved.currentRow, 'currentTile:', saved.currentTile);
        debugLog('Saved board[0]:', JSON.stringify(saved.board[0]));
        debugLog('Saved board[1]:', JSON.stringify(saved.board[1]));
        
        // Restore target word from saved state (important for consistency)
        if (saved.targetWord) {
            gameState.targetWord = saved.targetWord;
            debugLog('Using saved targetWord:', saved.targetWord);
        }
        
        restoreGameState(saved);
        
        debugLog('AFTER RESTORE - currentRow:', gameState.currentRow, 
                 'currentTile:', gameState.currentTile,
                 'gameOver:', gameState.gameOver);
        debugLog('AFTER RESTORE - board[0]:', JSON.stringify(gameState.board[0]));
    } else {
        debugLog('No valid saved state found');
        debugLog('saved object:', saved ? 'exists' : 'null');
        debugLog('saved.board:', saved?.board ? 'exists, length=' + saved.board.length : 'missing');
    }
}

function showHelpModal() {
    const modal = document.getElementById('helpModal');
    if (modal) modal.classList.add('active');
}

function hideHelpModal() {
    const modal = document.getElementById('helpModal');
    if (modal) modal.classList.remove('active');
}

function showStatsModal() {
    displayStats();
    const modal = document.getElementById('statsModal');
    if (modal) modal.classList.add('active');
}

function hideStatsModal() {
    const modal = document.getElementById('statsModal');
    if (modal) modal.classList.remove('active');
}

function shareResult() {
    const num = gameState.mode === GAME_MODE.DAILY ? getGameNumber() : '∞';
    const attempts = gameState.won ? gameState.currentRow + 1 : 'X';
    
    let text = `Wordle RU #${num} ${attempts}/${MAX_ATTEMPTS}\n\n`;
    
    for (let row = 0; row < gameState.evaluations.length; row++) {
        if (!gameState.evaluations[row]) continue;
        for (let col = 0; col < WORD_LENGTH; col++) {
            const s = gameState.evaluations[row][col];
            text += s === 'correct' ? '🟩' : s === 'present' ? '🟨' : '⬜';
        }
        text += '\n';
    }
    text += '\n@wordlee_ru_bot';
    
    navigator.clipboard.writeText(text)
        .then(() => showToast('Скопировано!', 2000, 'success'))
        .catch(() => showToast('Не удалось скопировать', 2000, 'error'));
}

function handleKeyClick(e) {
    const key = e.target.closest('.key');
    if (!key) return;
    
    const val = key.dataset.key;
    if (val === 'Enter') submitWord();
    else if (val === 'Backspace') removeLetter();
    else addLetter(val);
}

function handleKeyDown(e) {
    const help = document.getElementById('helpModal');
    const stats = document.getElementById('statsModal');
    
    if ((help?.classList.contains('active')) || (stats?.classList.contains('active'))) {
        if (e.key === 'Escape') { hideHelpModal(); hideStatsModal(); }
        return;
    }
    
    if (e.key === 'Enter') submitWord();
    else if (e.key === 'Backspace') removeLetter();
    else if (/^[а-яёА-ЯЁ]$/.test(e.key)) addLetter(e.key);
}

function handleModalClick(e) {
    if (e.target.classList.contains('modal')) {
        hideHelpModal();
        hideStatsModal();
    }
}

function init() {
    createDebugPanel();
    debugLog('=== INIT STARTED ===');
    
    initTelegram();
    startDailyGame();
    setupAutosave();
    
    document.getElementById('keyboard')?.addEventListener('click', handleKeyClick);
    document.addEventListener('keydown', handleKeyDown);
    
    document.getElementById('helpBtn')?.addEventListener('click', showHelpModal);
    document.getElementById('statsBtn')?.addEventListener('click', showStatsModal);
    document.getElementById('helpClose')?.addEventListener('click', hideHelpModal);
    document.getElementById('statsClose')?.addEventListener('click', hideStatsModal);
    document.getElementById('helpModal')?.addEventListener('click', handleModalClick);
    document.getElementById('statsModal')?.addEventListener('click', handleModalClick);
    document.getElementById('shareBtn')?.addEventListener('click', shareResult);
    document.getElementById('playAgainBtn')?.addEventListener('click', startNewGame);
    
    if (!localStorage.getItem('wordle_has_played')) {
        showHelpModal();
        localStorage.setItem('wordle_has_played', 'true');
    }
    
    if (new URLSearchParams(window.location.search).get('view') === 'stats') {
        showStatsModal();
    }
    
    debugLog('Game initialized');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
