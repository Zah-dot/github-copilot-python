// Client-side rendering and interaction for the Flask-backed Sudoku
const SIZE = 9;
const SCOREBOARD_KEY = 'sudoku-top-10-scores';
const LAST_COMPLETED_GAME_KEY = 'sudoku-last-completed-game';
const PLAYER_NAME_KEY = 'sudoku-player-name';

let puzzle = [];
let currentDifficulty = 'easy';
let currentHintsUsed = 0;
let currentGameCompleted = false;
let currentGameId = null;

const timerState = {
  startedAt: 0,
  elapsedMs: 0,
  running: false,
  finished: false,
  rafId: null,
};

function formatSeconds(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getLeaderboard() {
  try {
    const rawValue = localStorage.getItem(SCOREBOARD_KEY);
    if (!rawValue) return [];
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveLeaderboard(scores) {
  localStorage.setItem(SCOREBOARD_KEY, JSON.stringify(scores));
}

function normalizeScore(score) {
  return {
    playerName: String(score.playerName || 'Player').trim() || 'Player',
    timeSeconds: Number(score.timeSeconds) || 0,
    difficulty: String(score.difficulty || 'easy'),
    hintsUsed: Number(score.hintsUsed) || 0,
  };
}

function sortLeaderboard(scores) {
  return [...scores]
    .map(normalizeScore)
    .sort((first, second) => {
      if (first.timeSeconds !== second.timeSeconds) {
        return first.timeSeconds - second.timeSeconds;
      }
      if (first.hintsUsed !== second.hintsUsed) {
        return first.hintsUsed - second.hintsUsed;
      }
      return first.playerName.localeCompare(second.playerName);
    })
    .slice(0, 10);
}

function renderLeaderboard() {
  const list = document.getElementById('leaderboard-list');
  if (!list) return;

  list.innerHTML = '';

  const header = document.createElement('li');
  header.className = 'score-item header';
  const rank = document.createElement('span');
  rank.textContent = 'Rank';
  const player = document.createElement('span');
  player.textContent = 'Player';
  const time = document.createElement('span');
  time.textContent = 'Time';
  const meta = document.createElement('span');
  meta.textContent = 'Difficulty';
  header.append(rank, player, time, meta);
  list.appendChild(header);

  const scores = sortLeaderboard(getLeaderboard());
  if (scores.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'score-item empty';
    empty.textContent = 'No scores yet';
    list.appendChild(empty);
    return;
  }

  scores.forEach((score, index) => {
    const item = document.createElement('li');
    item.className = 'score-item';

    const rankValue = document.createElement('span');
    rankValue.textContent = `${index + 1}.`;

    const playerValue = document.createElement('span');
    playerValue.textContent = score.playerName;

    const timeValue = document.createElement('span');
    timeValue.textContent = formatSeconds(score.timeSeconds);

    const metaValue = document.createElement('span');
    metaValue.textContent = `${score.difficulty} • ${score.hintsUsed} hints`;

    item.append(rankValue, playerValue, timeValue, metaValue);
    list.appendChild(item);
  });
}

function updateTimerDisplay(elapsedMs) {
  const timerDisplay = document.getElementById('timer-display');
  if (!timerDisplay) return;
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  timerDisplay.innerText = `Time: ${formatSeconds(totalSeconds)}`;
}

function updateHintsDisplay() {
  const hintsSpan = document.getElementById('hints-used');
  if (hintsSpan) {
    hintsSpan.innerText = `Hints used: ${currentHintsUsed}`;
  }
}

function startTimer(startedAtMs = Date.now()) {
  if (timerState.running) return;
  timerState.startedAt = startedAtMs;
  timerState.running = true;
  timerState.finished = false;
  updateTimerDisplay(timerState.elapsedMs);

  const tick = () => {
    if (!timerState.running || timerState.finished) return;
    const elapsedMs = Date.now() - timerState.startedAt;
    updateTimerDisplay(elapsedMs);
    timerState.rafId = requestAnimationFrame(tick);
  };

  timerState.rafId = requestAnimationFrame(tick);
}

function stopTimer() {
  timerState.running = false;
  timerState.finished = true;
  if (timerState.rafId) {
    cancelAnimationFrame(timerState.rafId);
    timerState.rafId = null;
  }
  timerState.elapsedMs = Date.now() - timerState.startedAt;
  updateTimerDisplay(timerState.elapsedMs);
}

function resetTimer() {
  timerState.startedAt = 0;
  timerState.elapsedMs = 0;
  timerState.running = false;
  timerState.finished = false;
  if (timerState.rafId) {
    cancelAnimationFrame(timerState.rafId);
    timerState.rafId = null;
  }
  updateTimerDisplay(0);
}

function createBoardElement() {
  const boardDiv = document.getElementById('sudoku-board');
  boardDiv.innerHTML = '';
  for (let i = 0; i < SIZE; i++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'sudoku-row';
    for (let j = 0; j < SIZE; j++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 1;
      input.className = 'sudoku-cell';
      input.dataset.row = i;
      input.dataset.col = j;
      input.addEventListener('input', (event) => {
        const val = event.target.value.replace(/[^1-9]/g, '');
        event.target.value = val;
      });
      rowDiv.appendChild(input);
    }
    boardDiv.appendChild(rowDiv);
  }
}

function renderPuzzle(puz) {
  puzzle = puz;
  createBoardElement();
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = puzzle[i][j];
      const inp = inputs[idx];
      inp.className = 'sudoku-cell';
      if (val !== 0) {
        inp.value = val;
        inp.disabled = true;
        inp.readOnly = true;
        inp.classList.add('prefilled');
      } else {
        inp.value = '';
        inp.disabled = false;
        inp.readOnly = false;
      }
    }
  }
}

function getPlayerName() {
  const input = document.getElementById('player-name');
  if (!input) return 'Player';
  return (input.value || 'Player').trim() || 'Player';
}

function persistPlayerName() {
  const input = document.getElementById('player-name');
  if (!input) return;
  localStorage.setItem(PLAYER_NAME_KEY, input.value || 'Player');
}

function recordCompletedScore(elapsedSeconds) {
  if (currentGameCompleted) return;

  const playerName = getPlayerName();
  const scoreEntry = {
    playerName,
    timeSeconds: Number(elapsedSeconds) || 0,
    difficulty: currentDifficulty,
    hintsUsed: currentHintsUsed,
  };

  const leaderboard = sortLeaderboard([...getLeaderboard(), scoreEntry]);
  saveLeaderboard(leaderboard);
  currentGameCompleted = true;
  localStorage.setItem(LAST_COMPLETED_GAME_KEY, currentGameId);
  renderLeaderboard();
}

async function newGame() {
  currentDifficulty = document.getElementById('difficulty-select').value;
  currentHintsUsed = 0;
  currentGameCompleted = false;
  currentGameId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.removeItem(LAST_COMPLETED_GAME_KEY);

  const res = await fetch(`/new?difficulty=${encodeURIComponent(currentDifficulty)}`);
  const data = await res.json();
  if (!res.ok) {
    const msg = document.getElementById('message');
    msg.style.color = '#d32f2f';
    msg.innerText = data.error || 'Unable to start a new game.';
    return;
  }

  renderPuzzle(data.puzzle);
  resetTimer();
  if (data.timer_started_at) {
    startTimer(data.timer_started_at * 1000);
  } else {
    startTimer();
  }
  updateHintsDisplay();
  document.getElementById('message').innerText = '';
}

function buildBoardFromInputs() {
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  const board = [];
  for (let i = 0; i < SIZE; i++) {
    board[i] = [];
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = inputs[idx].value;
      board[i][j] = val ? parseInt(val, 10) : 0;
    }
  }
  return board;
}

async function checkSolution() {
  const board = buildBoardFromInputs();
  const res = await fetch('/check', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board})
  });
  const data = await res.json();
  const msg = document.getElementById('message');
  if (data.error) {
    msg.style.color = '#d32f2f';
    msg.innerText = data.error;
    return;
  }

  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  const incorrect = new Set((data.incorrect || []).map((cell) => cell[0] * SIZE + cell[1]));

  for (let idx = 0; idx < inputs.length; idx++) {
    const inp = inputs[idx];
    if (inp.disabled) continue;
    inp.className = 'sudoku-cell';
    if (incorrect.has(idx)) {
      inp.className = 'sudoku-cell incorrect';
    }
  }

  if (data.completed || data.solved) {
    stopTimer();
    const elapsedSeconds = Number(data.elapsed_seconds) || 0;
    recordCompletedScore(elapsedSeconds);
    msg.style.color = '#388e3c';
    msg.innerText = `Congratulations! You solved it in ${formatSeconds(elapsedSeconds)}. Score recorded.`;
    return;
  }

  msg.style.color = '#d32f2f';
  msg.innerText = 'Some cells are incorrect.';
}

async function requestHint() {
  const board = buildBoardFromInputs();
  const res = await fetch('/hint', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board})
  });
  const data = await res.json();
  const msg = document.getElementById('message');
  if (data.error) {
    msg.style.color = '#d32f2f';
    msg.innerText = data.error;
    return;
  }

  const [row, col] = data.cell;
  const value = data.value;
  const idx = row * SIZE + col;
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  const inp = inputs[idx];
  inp.value = value;
  inp.disabled = true;
  inp.readOnly = true;
  inp.classList.add('prefilled');
  inp.classList.remove('incorrect');

  currentHintsUsed = data.hints_used;
  updateHintsDisplay();

  msg.style.color = '#000';
  msg.innerText = 'Hint applied.';
}

window.addEventListener('load', () => {
  const playerNameInput = document.getElementById('player-name');
  if (playerNameInput) {
    const savedName = localStorage.getItem(PLAYER_NAME_KEY);
    if (savedName) {
      playerNameInput.value = savedName;
    }
    playerNameInput.addEventListener('input', persistPlayerName);
  }

  const difficultySelect = document.getElementById('difficulty-select');
  if (difficultySelect) {
    difficultySelect.addEventListener('change', () => {
      currentDifficulty = difficultySelect.value;
    });
  }

  document.getElementById('new-game').addEventListener('click', newGame);
  const hintBtn = document.getElementById('hint-button');
  if (hintBtn) hintBtn.addEventListener('click', requestHint);
  document.getElementById('check-solution').addEventListener('click', checkSolution);

  renderLeaderboard();
  newGame();
});