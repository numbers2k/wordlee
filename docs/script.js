const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;
const FLIP_DURATION = 500;
const FLIP_DELAY = 300;
const STORAGE_KEY = 'wordle_game';
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : (window.API_URL || 'https://wordlee-production.up.railway.app');

let gameState = {
    targetWord: '',
    currentRow: 0,
    currentTile: 0,
    board: [],
    gameOver: false,
    won: false,
    evaluations: []
};

let tg = null;
let currentUserId = null;
let statsCache = null;

function initTelegram() {
    try {
        if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
            tg = Telegram.WebApp;
            tg.ready();
            tg.expand();
            
            if (tg.setHeaderColor) tg.setHeaderColor('#121213');
            if (tg.setBackgroundColor) tg.setBackgroundColor('#121213');
            
            if (tg.isVersionAtLeast && tg.isVersionAtLeast('8.0') && tg.requestFullscreen) {
                tg.requestFullscreen();
            }
            
            updateSafeAreas();
            
            if (tg.onEvent) {
                tg.onEvent('safeAreaChanged', updateSafeAreas);
                tg.onEvent('contentSafeAreaChanged', updateSafeAreas);
                tg.onEvent('viewportChanged', updateSafeAreas);
            }
        }
        document.body.classList.add('dark-theme');
    } catch (e) {
        console.error('Telegram init error:', e);
    }
}

function updateSafeAreas() {
    if (!tg) return;
    
    if (tg.contentSafeAreaInset) {
        const { top, bottom, left, right } = tg.contentSafeAreaInset;
        document.documentElement.style.setProperty('--tg-safe-top', `${top || 0}px`);
        document.documentElement.style.setProperty('--tg-safe-bottom', `${bottom || 0}px`);
        document.documentElement.style.setProperty('--tg-safe-left', `${left || 0}px`);
        document.documentElement.style.setProperty('--tg-safe-right', `${right || 0}px`);
    }
    
    if (tg.safeAreaInset) {
        const { top, bottom, left, right } = tg.safeAreaInset;
        document.documentElement.style.setProperty('--device-safe-top', `${top || 0}px`);
        document.documentElement.style.setProperty('--device-safe-bottom', `${bottom || 0}px`);
        document.documentElement.style.setProperty('--device-safe-left', `${left || 0}px`);
        document.documentElement.style.setProperty('--device-safe-right', `${right || 0}px`);
    }
}

function getUserId() {
    if (currentUserId) return currentUserId;
    
    try {
        if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
            currentUserId = tg.initDataUnsafe.user.id;
            return currentUserId;
        }
    } catch (e) {
        console.error('Error getting user ID:', e);
    }
    
    const saved = localStorage.getItem('wordle_user_id');
    if (saved) {
        currentUserId = parseInt(saved);
        return currentUserId;
    }
    return null;
}

function getRandomWord() {
    return WORDS_TARGET[Math.floor(Math.random() * WORDS_TARGET.length)].toUpperCase();
}

function calculatePoints(attempts) {
    if (attempts < 1 || attempts > 6) return 0;
    const pointsMap = {1: 1000, 2: 800, 3: 600, 4: 400, 5: 200, 6: 100};
    return pointsMap[attempts] || 0;
}

async function apiRequest(endpoint, options = {}) {
    const userId = getUserId();
    if (!userId) {
        console.warn('No user ID available for API request');
        return null;
    }
    
    const url = `${API_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        'X-User-ID': userId.toString(),
        ...options.headers
    };
    
    if (tg && tg.initData) {
        headers['X-Telegram-Init-Data'] = tg.initData;
    }
    
    try {
        const response = await fetch(url, { ...options, headers });
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        return null;
    }
}

async function loadStatsFromAPI() {
    const userId = getUserId();
    if (!userId) {
        return loadStats();
    }
    
    try {
        const data = await apiRequest(`/api/user/${userId}/stats`);
        if (data) {
            statsCache = {
                gamesPlayed: data.total_games || 0,
                gamesWon: data.games_won || 0,
                currentStreak: data.current_streak || 0,
                maxStreak: data.max_streak || 0,
                totalPoints: data.total_points || 0,
                guessDistribution: data.guess_distribution || [0, 0, 0, 0, 0, 0],
                winPercent: data.win_percent || 0
            };
            return statsCache;
        }
    } catch (error) {
        console.error('Failed to load stats from API:', error);
    }
    
    // Fallback to localStorage
    return loadStats();
}

async function saveStatsToAPI(won, attempts, pointsEarned) {
    const userId = getUserId();
    if (!userId) return { success: false, total_points: null };
    
    try {
        const userData = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
        const data = await apiRequest(`/api/user/${userId}/game/complete`, {
            method: 'POST',
            body: JSON.stringify({
                won: won,
                attempts: attempts,
                username: userData?.username || null,
                first_name: userData?.first_name || null
            })
        });
        
        if (data && data.success) {
            return { success: true, total_points: data.total_points || 0 };
        }
    } catch (error) {
        console.error('Failed to save stats to API:', error);
    }
    
    return { success: false, total_points: null };
}

async function migrateLocalStorageToAPI() {
    const userId = getUserId();
    if (!userId || localStorage.getItem('wordle_migrated')) return;
    
    try {
        const localStats = loadStats();
        if (localStats.gamesPlayed > 0) {
            console.log('Migration: Found local stats, syncing...');
            localStorage.setItem('wordle_migrated', 'true');
            localStorage.setItem('wordle_user_id', userId.toString());
        }
    } catch (error) {
        console.error('Migration error:', error);
    }
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
    
    const messages = ['Гениально!', 'Великолепно!', 'Отлично!', 'Неплохо!', 'Хорошо!', 'Молодец!'];
    showToast(messages[gameState.currentRow], 3000, 'success');
    
    row.querySelectorAll('.tile').forEach((tile, i) => {
        setTimeout(() => tile.classList.add('win'), i * 100);
    });
}

function showLossMessage(word) {
    showToast(`Правильное слово: ${word.toUpperCase()}`, 4000, 'error');
    
    const statsModal = document.getElementById('statsModal');
    if (statsModal) {
        let answerDisplay = statsModal.querySelector('.correct-answer-display');
        if (!answerDisplay) {
            answerDisplay = document.createElement('div');
            answerDisplay.className = 'correct-answer-display';
            const modalBody = statsModal.querySelector('.modal-body');
            if (modalBody) modalBody.insertBefore(answerDisplay, modalBody.firstChild);
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
            totalPoints: 0,
            guessDistribution: [0, 0, 0, 0, 0, 0]
        };
    } catch { 
        return { gamesPlayed: 0, gamesWon: 0, currentStreak: 0, maxStreak: 0, totalPoints: 0, guessDistribution: [0, 0, 0, 0, 0, 0] }; 
    }
}

function saveStats(stats) {
    try { localStorage.setItem('wordle_stats', JSON.stringify(stats)); } catch {}
}

async function updateStats(won, attempts = 0) {
    const pointsEarned = won ? calculatePoints(attempts) : 0;
    const apiResult = await saveStatsToAPI(won, attempts, pointsEarned);
    
    if (apiResult.success) {
        const stats = await loadStatsFromAPI();
        if (stats) {
            statsCache = stats;
            updatePointsCounter(stats.totalPoints || 0);
        } else if (statsCache) {
            statsCache.gamesPlayed++;
            if (won) {
                statsCache.gamesWon++;
                statsCache.currentStreak++;
                statsCache.maxStreak = Math.max(statsCache.maxStreak, statsCache.currentStreak);
                statsCache.totalPoints = apiResult.total_points || (statsCache.totalPoints || 0);
                if (attempts >= 1 && attempts <= 6) {
                    statsCache.guessDistribution[attempts - 1]++;
                }
            } else {
                statsCache.currentStreak = 0;
            }
            updatePointsCounter(statsCache.totalPoints || 0);
        }
    } else {
        const stats = loadStats();
        stats.gamesPlayed++;
        if (won) {
            stats.gamesWon++;
            stats.currentStreak++;
            stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
            stats.totalPoints = (stats.totalPoints || 0) + pointsEarned;
            if (attempts >= 1 && attempts <= 6) {
                stats.guessDistribution[attempts - 1]++;
            }
        } else {
            stats.currentStreak = 0;
        }
        saveStats(stats);
        updatePointsCounter(stats.totalPoints || 0);
    }
    
    if (won && pointsEarned > 0) {
        setTimeout(() => showToast(`+${pointsEarned} очков!`, 2000, 'success'), 1000);
    }
}

function updatePointsCounter(points) {
    const counter = document.getElementById('pointsCounterValue');
    if (counter) {
        counter.textContent = (points || 0).toLocaleString('ru-RU');
    }
}

async function displayStats() {
    const stats = statsCache || await loadStatsFromAPI() || loadStats();
    
    const el = (id) => document.getElementById(id);
    if (el('gamesPlayed')) el('gamesPlayed').textContent = stats.gamesPlayed || 0;
    
    const winPercent = stats.winPercent !== undefined 
        ? stats.winPercent 
        : (stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0);
    if (el('winPercent')) el('winPercent').textContent = winPercent;
    
    if (el('currentStreak')) el('currentStreak').textContent = stats.currentStreak || 0;
    if (el('maxStreak')) el('maxStreak').textContent = stats.maxStreak || 0;
    if (el('totalPoints')) {
        el('totalPoints').textContent = (stats.totalPoints || 0).toLocaleString('ru-RU');
    }
    
    updatePointsCounter(stats.totalPoints || 0);
    
    const dist = el('distribution');
    if (dist) {
        dist.innerHTML = '';
        const guessDist = stats.guessDistribution || [0, 0, 0, 0, 0, 0];
        const max = Math.max(...guessDist, 1);
        
        for (let i = 0; i < 6; i++) {
            const row = document.createElement('div');
            row.className = 'dist-row';
            row.innerHTML = `
                <div class="dist-label">${i + 1}</div>
                <div class="dist-bar">
                    <div class="dist-fill ${gameState.won && gameState.currentRow === i ? 'highlight' : ''}" 
                         style="width: ${Math.max((guessDist[i] / max) * 100, 8)}%">
                        ${guessDist[i]}
                    </div>
                </div>
            `;
            dist.appendChild(row);
        }
    }
    
    if (el('shareSection')) el('shareSection').style.display = gameState.gameOver ? 'flex' : 'none';
    if (el('playAgainBtn')) el('playAgainBtn').style.display = gameState.gameOver ? 'inline-flex' : 'none';
}

function saveGameState() {
    try {
        const state = {
            board: gameState.board.map(row => [...row]),
            currentRow: gameState.currentRow,
            currentTile: gameState.currentTile,
            gameOver: gameState.gameOver,
            won: gameState.won,
            evaluations: gameState.evaluations.map(row => row ? [...row] : null),
            targetWord: gameState.targetWord
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
}

function loadGameState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : null;
    } catch {
        return null;
    }
}

function setupAutosave() {
    window.addEventListener('beforeunload', saveGameState);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) saveGameState();
    });
    
    if (tg && tg.onEvent) {
        tg.onEvent('viewportChanged', () => {
            if (!tg.isExpanded) saveGameState();
        });
    }
}

function restoreGameState(state) {
    if (!Array.isArray(state.evaluations)) state.evaluations = [];
    if (!Array.isArray(state.board)) return false;
    
    let completedRows = 0;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        if (state.evaluations[i] && state.evaluations[i].length === WORD_LENGTH) {
            completedRows = i + 1;
        }
    }
    
    if (!state.gameOver) {
        state.currentRow = Math.min(completedRows, MAX_ATTEMPTS - 1);
        const currentRowContent = state.board[state.currentRow] || [];
        state.currentTile = currentRowContent.filter(c => c && c !== '').length;
    }
    
    gameState.board = state.board;
    gameState.currentRow = state.currentRow;
    gameState.currentTile = state.currentTile;
    gameState.gameOver = state.gameOver;
    gameState.won = state.won;
    gameState.evaluations = state.evaluations;
    gameState.targetWord = state.targetWord;
    
    for (let row = 0; row < MAX_ATTEMPTS; row++) {
        const rowData = state.board[row];
        if (!rowData) continue;
        
        for (let col = 0; col < WORD_LENGTH; col++) {
            const letter = rowData[col];
            const tile = document.querySelector(`.tile[data-row="${row}"][data-col="${col}"]`);
            
            if (tile && letter && letter !== '') {
                tile.textContent = letter;
                tile.classList.add('filled');
                
                const rowEval = state.evaluations[row];
                if (rowEval && rowEval[col]) {
                    tile.classList.add(rowEval[col]);
                    updateKeyboard(letter, rowEval[col]);
                }
            }
        }
    }
    return true;
}

function startNewGame() {
    gameState = {
        targetWord: getRandomWord(),
        currentRow: 0,
        currentTile: 0,
        board: [],
        gameOver: false,
        won: false,
        evaluations: []
    };
    
    createBoard();
    resetKeyboard();
    hideStatsModal();
    
    const answerDisplay = document.querySelector('.correct-answer-display');
    if (answerDisplay) answerDisplay.remove();
    
    saveGameState();
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

async function loadLeaderboard() {
    const userId = getUserId();
    const container = document.getElementById('leaderboardContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Загрузка...</div>';
    
    try {
        const url = `/api/leaderboard?limit=10${userId ? `&user_id=${userId}` : ''}`;
        const data = await apiRequest(url);
        
        if (!data) {
            container.innerHTML = '<div class="error">Не удалось загрузить лидерборд</div>';
            return;
        }
        
        let html = '<div class="leaderboard-list">';
        
        if (data.top_players && data.top_players.length > 0) {
            data.top_players.forEach((player, index) => {
                const displayName = player.username 
                    ? `@${player.username}` 
                    : (player.first_name || `Игрок #${player.user_id}`);
                const points = (player.total_points || 0).toLocaleString('ru-RU');
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                
                html += `
                    <div class="leaderboard-item ${index < 3 ? 'top-three' : ''}">
                        <div class="leaderboard-rank">${medal} ${index + 1}</div>
                        <div class="leaderboard-name">${displayName}</div>
                        <div class="leaderboard-points">${points}</div>
                    </div>
                `;
            });
        } else {
            html += '<div class="empty-leaderboard">Пока нет игроков в лидерборде</div>';
        }
        
        html += '</div>';
        
        if (data.user_position && data.user_data) {
            const userDisplayName = data.user_data.username 
                ? `@${data.user_data.username}` 
                : (data.user_data.first_name || `Вы`);
            const userPoints = (data.user_data.total_points || 0).toLocaleString('ru-RU');
            
            html += `
                <div class="user-position">
                    <div class="user-position-label">Ваша позиция:</div>
                    <div class="leaderboard-item user-item">
                        <div class="leaderboard-rank">#${data.user_position}</div>
                        <div class="leaderboard-name">${userDisplayName}</div>
                        <div class="leaderboard-points">${userPoints}</div>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        container.innerHTML = '<div class="error">Ошибка загрузки лидерборда</div>';
    }
}

function showLeaderboardModal() {
    const modal = document.getElementById('leaderboardModal');
    if (modal) {
        modal.classList.add('active');
        loadLeaderboard();
    }
}

function hideLeaderboardModal() {
    const modal = document.getElementById('leaderboardModal');
    if (modal) modal.classList.remove('active');
}

function shareResult() {
    const attempts = gameState.won ? gameState.currentRow + 1 : 'X';
    let text = `Wordlee ${attempts}/${MAX_ATTEMPTS}\n\n`;
    
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
        hideLeaderboardModal();
    }
}

async function init() {
    initTelegram();
    getUserId();
    await migrateLocalStorageToAPI();
    const stats = await loadStatsFromAPI();
    if (stats) {
        updatePointsCounter(stats.totalPoints || 0);
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view');
    if (view === 'stats') {
        setTimeout(() => showStatsModal(), 500);
    } else if (view === 'leaderboard') {
        setTimeout(() => showLeaderboardModal(), 500);
    }
    
    const saved = loadGameState();
    if (saved && saved.board && saved.board.length > 0 && !saved.gameOver) {
        const normalizedSaved = saved.targetWord ? normalizeWord(saved.targetWord) : '';
        const isValidTarget = normalizedSaved && WORDS_TARGET.some(w => normalizeWord(w) === normalizedSaved);
        
        if (isValidTarget) {
            gameState.targetWord = saved.targetWord;
        } else {
            gameState.targetWord = getRandomWord();
        }
        createBoard();
        resetKeyboard();
        if (isValidTarget) {
            restoreGameState(saved);
        }
    } else {
        startNewGame();
    }
    
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
    document.getElementById('leaderboardBtn')?.addEventListener('click', showLeaderboardModal);
    document.getElementById('leaderboardClose')?.addEventListener('click', hideLeaderboardModal);
    document.getElementById('leaderboardModal')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            hideLeaderboardModal();
        }
    });
    
    updatePointsCounter();
    
    if (!localStorage.getItem('wordle_played')) {
        showHelpModal();
        localStorage.setItem('wordle_played', 'true');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
