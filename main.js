/* ==========================================
   Constants and future-ready configuration
========================================== */
const CONFIG = {
  GRID_SIZE: 30,
  CELL_CLASS: 'cell',
  TIMER_SECONDS: 60,
  TICK_MS: 1000,
  CPU_STEP_MS: 280,
  SCORE_PER_SECOND: 10,
  MODES: {
    SINGLE_PLAYER: 'single-player',
    SPLIT_SCREEN: 'split-screen',
    TEAM_1V1: '1v1',
    TEAM_2V2: '2v2',
    TEAM_3V3: '3v3'
  },
  DEFAULT_SETUP: {
    runnerCount: 1,
    chaserCount: 1,
    isSplitScreen: false
  },
  COLORS: {
    runner: '#22c55e',
    chaser: '#ef4444'
  }
};

/* ==========================================
   Game state module
========================================== */
const state = {
  mode: CONFIG.MODES.SINGLE_PLAYER,
  isRunning: false,
  isPaused: false,
  role: 'Runner',
  timeLeft: CONFIG.TIMER_SECONDS,
  score: 0,
  setup: { ...CONFIG.DEFAULT_SETUP },
  entities: {
    runner: { x: 2, y: 2 },
    chaser: { x: CONFIG.GRID_SIZE - 3, y: CONFIG.GRID_SIZE - 3 }
  },
  timerId: null,
  cpuId: null
};

/* ==========================================
   Rendering module
========================================== */
const view = {
  gridEl: document.getElementById('grid'),
  roleEl: document.getElementById('role-value'),
  timerEl: document.getElementById('timer-value'),
  scoreEl: document.getElementById('score-value'),
  startBtn: document.getElementById('start-btn'),
  pauseBtn: document.getElementById('pause-btn'),
  resetBtn: document.getElementById('reset-btn'),
  cells: []
};

function buildGrid() {
  const totalCells = CONFIG.GRID_SIZE * CONFIG.GRID_SIZE;
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < totalCells; i += 1) {
    const cell = document.createElement('div');
    cell.className = CONFIG.CELL_CLASS;
    fragment.appendChild(cell);
    view.cells.push(cell);
  }

  view.gridEl.appendChild(fragment);
}

function toIndex(x, y) {
  return y * CONFIG.GRID_SIZE + x;
}

function renderHUD() {
  view.roleEl.textContent = state.role;
  view.timerEl.textContent = String(state.timeLeft);
  view.scoreEl.textContent = String(state.score);
}

function renderEntities() {
  for (const cell of view.cells) {
    cell.classList.remove('runner', 'chaser');
  }

  const runner = state.entities.runner;
  const chaser = state.entities.chaser;

  view.cells[toIndex(runner.x, runner.y)]?.classList.add('runner');
  view.cells[toIndex(chaser.x, chaser.y)]?.classList.add('chaser');
}

function render() {
  renderHUD();
  renderEntities();
}

/* ==========================================
   Input module
========================================== */
const inputDelta = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 }
};

function clampToGrid(position) {
  return {
    x: Math.max(0, Math.min(CONFIG.GRID_SIZE - 1, position.x)),
    y: Math.max(0, Math.min(CONFIG.GRID_SIZE - 1, position.y))
  };
}

function moveRunner(delta) {
  state.entities.runner = clampToGrid({
    x: state.entities.runner.x + delta.x,
    y: state.entities.runner.y + delta.y
  });
  validateTagCondition();
  render();
}

function onKeydown(event) {
  if (!state.isRunning || state.isPaused) {
    return;
  }

  const delta = inputDelta[event.key];
  if (!delta) {
    return;
  }

  event.preventDefault();
  moveRunner(delta);
}

/* ==========================================
   CPU module
========================================== */
function stepToward(target, current) {
  if (target > current) return 1;
  if (target < current) return -1;
  return 0;
}

function moveChaserAI() {
  if (!state.isRunning || state.isPaused) {
    return;
  }

  const runner = state.entities.runner;
  const chaser = state.entities.chaser;

  const xStep = stepToward(runner.x, chaser.x);
  const yStep = stepToward(runner.y, chaser.y);

  if (Math.random() < 0.5) {
    state.entities.chaser = clampToGrid({ x: chaser.x + xStep, y: chaser.y });
  } else {
    state.entities.chaser = clampToGrid({ x: chaser.x, y: chaser.y + yStep });
  }

  validateTagCondition();
  render();
}

/* ==========================================
   Game flow module
========================================== */
function isTagged() {
  const { runner, chaser } = state.entities;
  return runner.x === chaser.x && runner.y === chaser.y;
}

function stopLoops() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
  if (state.cpuId) {
    clearInterval(state.cpuId);
    state.cpuId = null;
  }
}

function endGame(message) {
  state.isRunning = false;
  state.isPaused = false;
  stopLoops();
  renderHUD();
  window.alert(message);
}

function validateTagCondition() {
  if (isTagged()) {
    endGame('Caught! The chaser tagged you.');
  }
}

function tickTimer() {
  if (!state.isRunning || state.isPaused) {
    return;
  }

  state.timeLeft -= 1;
  state.score += CONFIG.SCORE_PER_SECOND;

  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    renderHUD();
    endGame(`Time up! Final score: ${state.score}`);
    return;
  }

  renderHUD();
}

function resetState() {
  stopLoops();
  state.isRunning = false;
  state.isPaused = false;
  state.role = 'Runner';
  state.timeLeft = CONFIG.TIMER_SECONDS;
  state.score = 0;
  state.entities.runner = { x: 2, y: 2 };
  state.entities.chaser = { x: CONFIG.GRID_SIZE - 3, y: CONFIG.GRID_SIZE - 3 };
  render();
}

function startGame() {
  if (state.isRunning) {
    return;
  }

  state.isRunning = true;
  state.isPaused = false;
  stopLoops();

  state.timerId = window.setInterval(tickTimer, CONFIG.TICK_MS);
  state.cpuId = window.setInterval(moveChaserAI, CONFIG.CPU_STEP_MS);
}

function togglePause() {
  if (!state.isRunning) {
    return;
  }
  state.isPaused = !state.isPaused;
  view.pauseBtn.textContent = state.isPaused ? 'Resume' : 'Pause';
}

function init() {
  buildGrid();
  render();

  document.addEventListener('keydown', onKeydown);
  view.startBtn.addEventListener('click', startGame);
  view.pauseBtn.addEventListener('click', togglePause);
  view.resetBtn.addEventListener('click', () => {
    view.pauseBtn.textContent = 'Pause';
    resetState();
  });
}

init();
