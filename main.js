const CONFIG = {
  GRID_SIZE: 30,
  ROUND_MS: 60000,
  COUNTDOWN_SECONDS: 3
};

const STORAGE_KEYS = {
  SCORE: 'grid-tag.score',
  SETTINGS: 'grid-tag.settings'
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

const ROUND_WINNER = {
  PLAYER: 'player',
  CPU: 'cpu'
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
  newRoundBtn: document.getElementById('new-round-btn'),
  resetScoreBtn: document.getElementById('reset-score-btn'),
  roleRunnerBtn: document.getElementById('role-runner-btn'),
  roleChaserBtn: document.getElementById('role-chaser-btn'),
  difficultySelect: document.getElementById('difficulty-select'),
  cells: []
};

function readJsonStorage(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJsonStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures (private mode / quota).
  }
}

function getInitialSettings() {
  const stored = readJsonStorage(STORAGE_KEYS.SETTINGS);
  const role = stored?.role;
  const difficulty = stored?.difficulty;

  return {
    role: role === ROLE.CHASER ? ROLE.CHASER : ROLE.RUNNER,
    difficulty: DIFFICULTY_CONFIG[difficulty] ? difficulty : DIFFICULTY.NORMAL
  };
}

function getInitialScore() {
  const stored = readJsonStorage(STORAGE_KEYS.SCORE);
  const player = Number(stored?.player);
  const cpu = Number(stored?.cpu);

  return {
    player: Number.isFinite(player) && player >= 0 ? player : 0,
    cpu: Number.isFinite(cpu) && cpu >= 0 ? cpu : 0
  };
}

const initialSettings = getInitialSettings();

const state = {
  settings: {
    role: initialSettings.role,
    difficulty: initialSettings.difficulty
  },
  matchScore: getInitialScore(),
  round: {
    phase: PHASE.IDLE,
    human: { x: 0, y: 0 },
    cpu: { x: CONFIG.GRID_SIZE - 1, y: CONFIG.GRID_SIZE - 1 },
    remainingMs: CONFIG.ROUND_MS,
    countdownMs: CONFIG.COUNTDOWN_SECONDS * 1000,
    cpuStepMs: 500,
    cpuAccumulatorMs: 0
  }
};

let lastFrameTime = 0;

function saveSettings() {
  writeJsonStorage(STORAGE_KEYS.SETTINGS, {
    role: state.settings.role,
    difficulty: state.settings.difficulty
  });
}

function saveScore() {
  writeJsonStorage(STORAGE_KEYS.SCORE, state.matchScore);
}

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
  state.round.human = { x: 0, y: 0 };
  state.round.cpu = { x: CONFIG.GRID_SIZE - 1, y: CONFIG.GRID_SIZE - 1 };
}

function getRoleLabel() {
  return state.settings.role === ROLE.RUNNER ? 'RUNNER' : 'CHASER';
}

function getDifficultyLabel() {
  return DIFFICULTY_CONFIG[state.settings.difficulty]?.label ?? DIFFICULTY_CONFIG[DIFFICULTY.NORMAL].label;
}

function isCollision() {
  return state.round.human.x === state.round.cpu.x && state.round.human.y === state.round.cpu.y;
}

function setRoundResult(text) {
  view.resultEl.textContent = text;
}

function getCountdownValue() {
  return Math.max(1, Math.ceil(state.round.countdownMs / 1000));
}

function isRoundActive() {
  return state.round.phase === PHASE.PLAYING || state.round.phase === PHASE.COUNTDOWN;
}

function renderHUD() {
  view.roleEl.textContent = getRoleLabel();
  view.difficultyEl.textContent = getDifficultyLabel();
  view.timerEl.textContent = String(Math.ceil(state.round.remainingMs / 1000));
  view.scoreEl.textContent = `${state.matchScore.player} : ${state.matchScore.cpu}`;
  view.roleRunnerBtn.disabled = isRoundActive();
  view.roleChaserBtn.disabled = isRoundActive();
  view.difficultySelect.disabled = isRoundActive();
  view.startBtn.disabled = isRoundActive();

  if (state.round.phase === PHASE.COUNTDOWN) {
    view.countdownEl.textContent = String(getCountdownValue());
  } else {
    view.countdownEl.textContent = '-';
  }
}

function renderEntities() {
  for (const cell of view.cells) {
    cell.classList.remove('human', 'cpu');
  }

  view.cells[toIndex(state.round.human.x, state.round.human.y)]?.classList.add('human');
  view.cells[toIndex(state.round.cpu.x, state.round.cpu.y)]?.classList.add('cpu');
}

function render() {
  renderHUD();
  renderEntities();
}

function awardRoundWin(winner) {
  if (winner === ROUND_WINNER.PLAYER) {
    state.matchScore.player += 1;
    saveScore();
    return;
  }
  if (winner === ROUND_WINNER.CPU) {
    state.matchScore.cpu += 1;
    saveScore();
  }
}

function endRound(resultText, winner) {
  state.round.phase = PHASE.ENDED;
  awardRoundWin(winner);
  setRoundResult(resultText);
  renderHUD();
}

function resolveCollision() {
  if (!isCollision()) {
    return;
  }

  if (state.settings.role === ROLE.CHASER) {
    endRound('You caught the CPU', ROUND_WINNER.PLAYER);
  } else {
    endRound('You were caught', ROUND_WINNER.CPU);
  }
}

function moveHuman(delta) {
  state.round.human = clampToGrid({
    x: state.round.human.x + delta.x,
    y: state.round.human.y + delta.y
  });
  resolveCollision();
  render();
}

function tryMoveCpu(delta) {
  state.round.cpu = clampToGrid({
    x: state.round.cpu.x + delta.x,
    y: state.round.cpu.y + delta.y
  });
}

function moveCpu() {
  const cpuRole = state.settings.role === ROLE.RUNNER ? ROLE.CHASER : ROLE.RUNNER;
  const delta = cpuDecisionEngine.decideMove({
    cpuPosition: state.round.cpu,
    humanPosition: state.round.human,
    cpuRole,
    difficulty: state.settings.difficulty
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
  state.round.remainingMs = CONFIG.ROUND_MS;
  state.round.countdownMs = CONFIG.COUNTDOWN_SECONDS * 1000;
  state.round.cpuAccumulatorMs = 0;
  state.round.cpuStepMs = pickCpuStepMsForRound(state.settings.difficulty);
  state.round.phase = PHASE.COUNTDOWN;
  setRoundResult(`Starting in ${CONFIG.COUNTDOWN_SECONDS}`);
  render();
}

function resetScoreOnly() {
  state.matchScore.player = 0;
  state.matchScore.cpu = 0;
  saveScore();
  renderHUD();
}

function updateCountdown(deltaMs) {
  state.round.countdownMs = Math.max(0, state.round.countdownMs - deltaMs);
  setRoundResult(`Starting in ${getCountdownValue()}`);
  if (state.round.countdownMs <= 0) {
    state.round.phase = PHASE.PLAYING;
    setRoundResult('Round in progress');
  }
}

function updatePlaying(deltaMs) {
  state.round.remainingMs = Math.max(0, state.round.remainingMs - deltaMs);
  state.round.cpuAccumulatorMs += deltaMs;

  while (state.round.cpuAccumulatorMs >= state.round.cpuStepMs && state.round.phase === PHASE.PLAYING) {
    state.round.cpuAccumulatorMs -= state.round.cpuStepMs;
    moveCpu();
  }

  if (state.round.phase !== PHASE.PLAYING) {
    return;
  }

  if (state.round.remainingMs <= 0) {
    if (state.settings.role === ROLE.RUNNER) {
      endRound('You survived', ROUND_WINNER.PLAYER);
    } else {
      endRound('Time ran out', ROUND_WINNER.CPU);
    }
  }
}

function gameLoop(timestamp) {
  if (!lastFrameTime) {
    lastFrameTime = timestamp;
  }

  const deltaMs = timestamp - lastFrameTime;
  lastFrameTime = timestamp;

  if (state.round.phase === PHASE.COUNTDOWN) {
    updateCountdown(deltaMs);
  } else if (state.round.phase === PHASE.PLAYING) {
    updatePlaying(deltaMs);
  }

  renderHUD();
  requestAnimationFrame(gameLoop);
}

function onKeydown(event) {
  if (state.round.phase !== PHASE.PLAYING) {
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
  if (isRoundActive()) {
    return;
  }
  state.settings.role = role;
  saveSettings();
  setRoundResult('Press Start Game');
  renderHUD();
  renderEntities();
}

function setDifficulty(difficulty) {
  if (isRoundActive()) {
    return;
  }
  if (!DIFFICULTY_CONFIG[difficulty]) {
    return;
  }
  state.settings.difficulty = difficulty;
  saveSettings();
  setRoundResult('Press Start Game');
  renderHUD();
}

function init() {
  buildGrid();
  view.difficultySelect.value = state.settings.difficulty;
  render();

  document.addEventListener('keydown', onKeydown);

  view.startBtn.addEventListener('click', startRound);
  view.newRoundBtn.addEventListener('click', startRound);
  view.resetScoreBtn.addEventListener('click', resetScoreOnly);
  view.roleRunnerBtn.addEventListener('click', () => setRole(ROLE.RUNNER));
  view.roleChaserBtn.addEventListener('click', () => setRole(ROLE.CHASER));
  view.difficultySelect.addEventListener('change', (event) => setDifficulty(event.target.value));

  requestAnimationFrame(gameLoop);
}

init();
