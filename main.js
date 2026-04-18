const CONFIG = {
  GRID_SIZE: 30,
  ROUND_MS: 60000,
  COUNTDOWN_SECONDS: 3
};

const PHASE = {
  IDLE: 'idle',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  ENDED: 'ended'
};

const ROLE = {
  RUNNER: 'runner',
  CHASER: 'chaser'
};

const DIFFICULTY = {
  NORMAL: 'normal',
  HARD: 'hard',
  INSANE: 'insane',
  DEMON: 'demon'
};

const DIFFICULTY_CONFIG = {
  // Difficulty controls both CPU routing quality and per-round speed range.
  // Higher optimalChance makes choices more consistently optimal.
  [DIFFICULTY.NORMAL]: { label: 'NORMAL', optimalChance: 0.7, minSpeed: 2, maxSpeed: 4 },
  [DIFFICULTY.HARD]: { label: 'HARD', optimalChance: 0.8, minSpeed: 4, maxSpeed: 7 },
  [DIFFICULTY.INSANE]: { label: 'INSANE', optimalChance: 0.95, minSpeed: 7, maxSpeed: 10 },
  [DIFFICULTY.DEMON]: { label: 'DEMON', optimalChance: 1, minSpeed: 10, maxSpeed: 14 }
};

class CpuDecisionEngine {
  constructor(gridSize, difficultyConfig) {
    this.gridSize = gridSize;
    this.difficultyConfig = difficultyConfig;
  }

  static manhattanDistance(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  getMoveOptions(cpuPosition) {
    const candidates = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];

    return candidates.filter((delta) => {
      const nextX = cpuPosition.x + delta.x;
      const nextY = cpuPosition.y + delta.y;
      return nextX >= 0 && nextX < this.gridSize && nextY >= 0 && nextY < this.gridSize;
    });
  }

  pickRandomMove(moves) {
    if (moves.length === 0) {
      return { x: 0, y: 0 };
    }
    return moves[Math.floor(Math.random() * moves.length)];
  }

  decideMove({ cpuPosition, humanPosition, cpuRole, difficulty }) {
    const config = this.difficultyConfig[difficulty] ?? this.difficultyConfig[DIFFICULTY.NORMAL];
    const options = this.getMoveOptions(cpuPosition).map((delta) => {
      const next = {
        x: cpuPosition.x + delta.x,
        y: cpuPosition.y + delta.y
      };
      return {
        delta,
        distance: CpuDecisionEngine.manhattanDistance(next, humanPosition)
      };
    });

    if (options.length === 0) {
      return { x: 0, y: 0 };
    }

    const isCpuChaser = cpuRole === ROLE.CHASER;
    const targetDistance = isCpuChaser
      ? Math.min(...options.map((option) => option.distance))
      : Math.max(...options.map((option) => option.distance));

    const optimalOptions = options.filter((option) => option.distance === targetDistance);
    const nonOptimalOptions = options.filter((option) => option.distance !== targetDistance);
    const chooseOptimal = Math.random() < config.optimalChance;
    const chosenPool = chooseOptimal || nonOptimalOptions.length === 0 ? optimalOptions : nonOptimalOptions;
    const choice = this.pickRandomMove(chosenPool.map((option) => option.delta));

    return choice;
  }
}

const cpuDecisionEngine = new CpuDecisionEngine(CONFIG.GRID_SIZE, DIFFICULTY_CONFIG);

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

const view = {
  gridEl: document.getElementById('grid'),
  roleEl: document.getElementById('role-value'),
  difficultyEl: document.getElementById('difficulty-value'),
  timerEl: document.getElementById('timer-value'),
  scoreEl: document.getElementById('score-value'),
  countdownEl: document.getElementById('countdown-value'),
  resultEl: document.getElementById('result-value'),
  startBtn: document.getElementById('start-btn'),
  roleRunnerBtn: document.getElementById('role-runner-btn'),
  roleChaserBtn: document.getElementById('role-chaser-btn'),
  difficultySelect: document.getElementById('difficulty-select'),
  cells: []
};

const state = {
  phase: PHASE.IDLE,
  role: ROLE.RUNNER,
  difficulty: DIFFICULTY.NORMAL,
  human: { x: 0, y: 0 },
  cpu: { x: CONFIG.GRID_SIZE - 1, y: CONFIG.GRID_SIZE - 1 },
  remainingMs: CONFIG.ROUND_MS,
  countdownMs: CONFIG.COUNTDOWN_SECONDS * 1000,
  cpuStepMs: 500,
  cpuAccumulatorMs: 0,
  score: {
    wins: 0,
    losses: 0
  }
};

let lastFrameTime = 0;

function toIndex(x, y) {
  return y * CONFIG.GRID_SIZE + x;
}

function clampToGrid(position) {
  return {
    x: Math.max(0, Math.min(CONFIG.GRID_SIZE - 1, position.x)),
    y: Math.max(0, Math.min(CONFIG.GRID_SIZE - 1, position.y))
  };
}

function buildGrid() {
  const totalCells = CONFIG.GRID_SIZE * CONFIG.GRID_SIZE;
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < totalCells; i += 1) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    fragment.appendChild(cell);
    view.cells.push(cell);
  }

  view.gridEl.appendChild(fragment);
}

function resetPositions() {
  state.human = { x: 0, y: 0 };
  state.cpu = { x: CONFIG.GRID_SIZE - 1, y: CONFIG.GRID_SIZE - 1 };
}

function getRoleLabel() {
  return state.role === ROLE.RUNNER ? 'RUNNER' : 'CHASER';
}

function getDifficultyLabel() {
  return DIFFICULTY_CONFIG[state.difficulty]?.label ?? DIFFICULTY_CONFIG[DIFFICULTY.NORMAL].label;
}

function isCollision() {
  return state.human.x === state.cpu.x && state.human.y === state.cpu.y;
}

function setRoundResult(text) {
  view.resultEl.textContent = text;
}

function getCountdownValue() {
  return Math.max(1, Math.ceil(state.countdownMs / 1000));
}

function renderHUD() {
  const isRoundActive = state.phase === PHASE.PLAYING || state.phase === PHASE.COUNTDOWN;
  view.roleEl.textContent = getRoleLabel();
  view.difficultyEl.textContent = getDifficultyLabel();
  view.timerEl.textContent = String(Math.ceil(state.remainingMs / 1000));
  view.scoreEl.textContent = `${state.score.wins}-${state.score.losses}`;
  view.roleRunnerBtn.disabled = isRoundActive;
  view.roleChaserBtn.disabled = isRoundActive;
  view.difficultySelect.disabled = isRoundActive;
  view.startBtn.disabled = isRoundActive;

  if (state.phase === PHASE.COUNTDOWN) {
    view.countdownEl.textContent = String(getCountdownValue());
  } else {
    view.countdownEl.textContent = '-';
  }
}

function renderEntities() {
  for (const cell of view.cells) {
    cell.classList.remove('human', 'cpu');
  }

  view.cells[toIndex(state.human.x, state.human.y)]?.classList.add('human');
  view.cells[toIndex(state.cpu.x, state.cpu.y)]?.classList.add('cpu');
}

function render() {
  renderHUD();
  renderEntities();
}

function endRound(resultText, didWin) {
  state.phase = PHASE.ENDED;
  if (didWin) {
    state.score.wins += 1;
  } else {
    state.score.losses += 1;
  }
  setRoundResult(resultText);
  renderHUD();
}

function resolveCollision() {
  if (!isCollision()) {
    return;
  }

  if (state.role === ROLE.CHASER) {
    endRound('You caught the CPU', true);
  } else {
    endRound('You were caught', false);
  }
}

function moveHuman(delta) {
  state.human = clampToGrid({
    x: state.human.x + delta.x,
    y: state.human.y + delta.y
  });
  resolveCollision();
  render();
}

function tryMoveCpu(delta) {
  state.cpu = clampToGrid({
    x: state.cpu.x + delta.x,
    y: state.cpu.y + delta.y
  });
}

function moveCpu() {
  const cpuRole = state.role === ROLE.RUNNER ? ROLE.CHASER : ROLE.RUNNER;
  const delta = cpuDecisionEngine.decideMove({
    cpuPosition: state.cpu,
    humanPosition: state.human,
    cpuRole,
    difficulty: state.difficulty
  });
  tryMoveCpu(delta);
  resolveCollision();
}

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

function pickCpuStepMsForRound(difficulty) {
  const config = DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG[DIFFICULTY.NORMAL];
  const speed = randomInRange(config.minSpeed, config.maxSpeed);
  return 1000 / speed;
}

function startRound() {
  resetPositions();
  state.remainingMs = CONFIG.ROUND_MS;
  state.countdownMs = CONFIG.COUNTDOWN_SECONDS * 1000;
  state.cpuAccumulatorMs = 0;
  state.cpuStepMs = pickCpuStepMsForRound(state.difficulty);
  state.phase = PHASE.COUNTDOWN;
  setRoundResult(`Starting in ${CONFIG.COUNTDOWN_SECONDS}`);
  render();
}

function updateCountdown(deltaMs) {
  state.countdownMs = Math.max(0, state.countdownMs - deltaMs);
  setRoundResult(`Starting in ${getCountdownValue()}`);
  if (state.countdownMs <= 0) {
    state.phase = PHASE.PLAYING;
    setRoundResult('Round in progress');
  }
}

function updatePlaying(deltaMs) {
  state.remainingMs = Math.max(0, state.remainingMs - deltaMs);
  state.cpuAccumulatorMs += deltaMs;

  while (state.cpuAccumulatorMs >= state.cpuStepMs && state.phase === PHASE.PLAYING) {
    state.cpuAccumulatorMs -= state.cpuStepMs;
    moveCpu();
  }

  if (state.phase !== PHASE.PLAYING) {
    return;
  }

  if (state.remainingMs <= 0) {
    if (state.role === ROLE.RUNNER) {
      endRound('You survived', true);
    } else {
      endRound('Time ran out', false);
    }
  }
}

function gameLoop(timestamp) {
  if (!lastFrameTime) {
    lastFrameTime = timestamp;
  }

  const deltaMs = timestamp - lastFrameTime;
  lastFrameTime = timestamp;

  if (state.phase === PHASE.COUNTDOWN) {
    updateCountdown(deltaMs);
  } else if (state.phase === PHASE.PLAYING) {
    updatePlaying(deltaMs);
  }

  renderHUD();
  requestAnimationFrame(gameLoop);
}

function onKeydown(event) {
  if (state.phase !== PHASE.PLAYING) {
    return;
  }

  const delta = inputDelta[event.key];
  if (!delta) {
    return;
  }

  event.preventDefault();
  moveHuman(delta);
}

function setRole(role) {
  if (state.phase === PHASE.PLAYING || state.phase === PHASE.COUNTDOWN) {
    return;
  }
  state.role = role;
  setRoundResult('Press Start Game');
  renderHUD();
  renderEntities();
}

function setDifficulty(difficulty) {
  if (state.phase === PHASE.PLAYING || state.phase === PHASE.COUNTDOWN) {
    return;
  }
  if (!DIFFICULTY_CONFIG[difficulty]) {
    return;
  }
  state.difficulty = difficulty;
  setRoundResult('Press Start Game');
  renderHUD();
}

function init() {
  buildGrid();
  render();

  document.addEventListener('keydown', onKeydown);

  view.startBtn.addEventListener('click', startRound);
  view.roleRunnerBtn.addEventListener('click', () => setRole(ROLE.RUNNER));
  view.roleChaserBtn.addEventListener('click', () => setRole(ROLE.CHASER));
  view.difficultySelect.addEventListener('change', (event) => setDifficulty(event.target.value));

  requestAnimationFrame(gameLoop);
}

init();
