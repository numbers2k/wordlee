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

function initTelegram() {
    try {
        if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
            tg = Telegram.WebApp;
            tg.ready();
            tg.expand();
            if (tg.setHeaderColor) tg.setHeaderColor('#121213');
            if (tg.setBackgroundColor) tg.setBackgroundColor('#121213');
        }
        document.body.classList.add('dark-theme');
    } catch (e) {
        console.error('Telegram init error:', e);
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
            showToast(gameState.targetWord, 5000);
            updateStats(false);
            setTimeout(showStatsModal, 2000);
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
        return `wordle_game_${new Date().toISOString().split('T')[0]}`;
    }
    return null;
}

function saveGameState() {
    const key = getStorageKey();
    if (!key) return;
    try {
        localStorage.setItem(key, JSON.stringify({
            board: gameState.board,
            currentRow: gameState.currentRow,
            currentTile: gameState.currentTile,
            gameOver: gameState.gameOver,
            won: gameState.won,
            evaluations: gameState.evaluations,
            mode: gameState.mode
        }));
    } catch {}
}

function loadGameState() {
    const key = getStorageKey();
    if (!key) return null;
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : null;
    } catch { return null; }
}

function validateAndFixState(state) {
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
        // Проверяем currentTile
        const currentRowContent = state.board[state.currentRow] || [];
        state.currentTile = currentRowContent.filter(c => c !== '').length;
    }
    
    return state;
}

function restoreGameState(state) {
    state = validateAndFixState(state);
    
    gameState.board = state.board;
    gameState.currentRow = state.currentRow;
    gameState.currentTile = state.currentTile;
    gameState.gameOver = state.gameOver;
    gameState.won = state.won;
    gameState.evaluations = state.evaluations || [];
    gameState.mode = state.mode || GAME_MODE.DAILY;
    
    for (let row = 0; row < state.board.length; row++) {
        for (let col = 0; col < WORD_LENGTH; col++) {
            const letter = state.board[row][col];
            if (letter) {
                const tile = document.querySelector(`.tile[data-row="${row}"][data-col="${col}"]`);
                if (tile) {
                    tile.textContent = letter;
                    tile.classList.add('filled');
                    if (state.evaluations[row] && state.evaluations[row][col]) {
                        tile.classList.add(state.evaluations[row][col]);
                        updateKeyboard(letter, state.evaluations[row][col]);
                    }
                }
            }
        }
    }
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
}

function startDailyGame() {
    gameState = {
        targetWord: getDailyWord(),
        currentRow: 0,
        currentTile: 0,
        board: [],
        gameOver: false,
        won: false,
        evaluations: [],
        mode: GAME_MODE.DAILY,
        gameNumber: getGameNumber()
    };
    createBoard();
    resetKeyboard();
    
    const saved = loadGameState();
    if (saved) restoreGameState(saved);
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
    initTelegram();
    startDailyGame();
    
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
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
