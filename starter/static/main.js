// Client-side rendering and interaction for the Flask-backed Sudoku
const SIZE = 9;
let puzzle = [];

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

function updateTimerDisplay(elapsedMs) {
  const timerDisplay = document.getElementById('timer-display');
  if (!timerDisplay) return;
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  timerDisplay.innerText = `Time: ${formatSeconds(totalSeconds)}`;
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
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/[^1-9]/g, '');
        e.target.value = val;
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
      if (val !== 0) {
        inp.value = val;
        inp.disabled = true;
        inp.readOnly = true;
        inp.className += ' prefilled';
      } else {
        inp.value = '';
        inp.disabled = false;
        inp.readOnly = false;
      }
    }
  }
}

async function newGame() {
  const difficulty = document.getElementById('difficulty-select').value;
  const res = await fetch(`/new?difficulty=${encodeURIComponent(difficulty)}`);
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
  document.getElementById('message').innerText = '';
}

async function checkSolution() {
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
  const incorrect = new Set(data.incorrect.map(x => x[0]*SIZE + x[1]));
  for (let idx = 0; idx < inputs.length; idx++) {
    const inp = inputs[idx];
    if (inp.disabled) continue;
    // reset classes for editable cells
    inp.className = 'sudoku-cell';
    if (incorrect.has(idx)) {
      inp.className = 'sudoku-cell incorrect';
    }
  }
  if (incorrect.size === 0) {
    stopTimer();
    msg.style.color = '#388e3c';
    msg.innerText = 'Congratulations! You solved it!';
  } else {
    msg.style.color = '#d32f2f';
    msg.innerText = 'Some cells are incorrect.';
  }
}

async function requestHint() {
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
  const inp = inputs[idx];
  inp.value = value;
  inp.disabled = true;
  inp.readOnly = true;
  inp.classList.add('prefilled');
  // Remove incorrect marking if any
  inp.classList.remove('incorrect');

  // Update hints used display if present
  const hintsSpan = document.getElementById('hints-used');
  if (hintsSpan) {
    hintsSpan.innerText = `Hints used: ${data.hints_used}`;
  }

  msg.style.color = '#000';
  msg.innerText = 'Hint applied.';
}

// Wire buttons
window.addEventListener('load', () => {
  document.getElementById('new-game').addEventListener('click', newGame);
  const hintBtn = document.getElementById('hint-button');
  if (hintBtn) hintBtn.addEventListener('click', requestHint);
  document.getElementById('check-solution').addEventListener('click', checkSolution);
  // initialize
  newGame();
});