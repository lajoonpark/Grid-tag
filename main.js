const CONFIG = {
  GRID_SIZE: 30,
  ROUND_MS: 60000,
  COUNTDOWN_SECONDS: 3,
  CPU_STEP_MS: 220
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
  timerEl: document.getElementById('timer-value'),
  scoreEl: document.getElementById('score-value'),
  countdownEl: document.getElementById('countdown-value'),
  resultEl: document.getElementById('result-value'),
  startBtn: document.getElementById('start-btn'),
  roleRunnerBtn: document.getElementById('role-runner-btn'),
  roleChaserBtn: document.getElementById('role-chaser-btn'),
  cells: []
};

const state = {
  phase: PHASE.IDLE,
  role: ROLE.RUNNER,
  human: { x: 0, y: 0 },
  cpu: { x: CONFIG.GRID_SIZE - 1, y: CONFIG.GRID_SIZE - 1 },
  remainingMs: CONFIG.ROUND_MS,
  countdownMs: CONFIG.COUNTDOWN_SECONDS * 1000,
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
  view.roleEl.textContent = getRoleLabel();
  view.timerEl.textContent = String(Math.ceil(state.remainingMs / 1000));
  view.scoreEl.textContent = `${state.score.wins}-${state.score.losses}`;

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

function stepToward(target, current) {
  if (target > current) return 1;
  if (target < current) return -1;
  return 0;
}

function stepAway(target, current) {
  return -stepToward(target, current);
}

function tryMoveCpu(delta) {
  state.cpu = clampToGrid({
    x: state.cpu.x + delta.x,
    y: state.cpu.y + delta.y
  });
}

function moveCpuAsChaser() {
  const xStep = stepToward(state.human.x, state.cpu.x);
  const yStep = stepToward(state.human.y, state.cpu.y);

  const shouldMoveHorizontallyFirst = Math.abs(state.human.x - state.cpu.x) >= Math.abs(state.human.y - state.cpu.y);
  if (shouldMoveHorizontallyFirst && xStep !== 0) {
    tryMoveCpu({ x: xStep, y: 0 });
  } else if (yStep !== 0) {
    tryMoveCpu({ x: 0, y: yStep });
  } else if (xStep !== 0) {
    tryMoveCpu({ x: xStep, y: 0 });
  }
}

function pickCpuRunMove() {
  const xStep = stepAway(state.human.x, state.cpu.x);
  const yStep = stepAway(state.human.y, state.cpu.y);
  const options = [];

  if (xStep !== 0) {
    options.push({ x: xStep, y: 0 });
  }
  if (yStep !== 0) {
    options.push({ x: 0, y: yStep });
  }

  options.push(
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 }
  );

  let bestMove = { x: 0, y: 0 };
  let bestDistance = -1;

  for (const option of options) {
    const next = clampToGrid({ x: state.cpu.x + option.x, y: state.cpu.y + option.y });
    const distance = Math.abs(next.x - state.human.x) + Math.abs(next.y - state.human.y);
    if (distance > bestDistance) {
      bestDistance = distance;
      bestMove = { x: next.x - state.cpu.x, y: next.y - state.cpu.y };
    }
  }

  return bestMove;
}

function moveCpuAsRunner() {
  const move = pickCpuRunMove();
  tryMoveCpu(move);
}

function moveCpu() {
  if (state.role === ROLE.RUNNER) {
    moveCpuAsChaser();
  } else {
    moveCpuAsRunner();
  }
  resolveCollision();
}

function startRound() {
  resetPositions();
  state.remainingMs = CONFIG.ROUND_MS;
  state.countdownMs = CONFIG.COUNTDOWN_SECONDS * 1000;
  state.cpuAccumulatorMs = 0;
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

  while (state.cpuAccumulatorMs >= CONFIG.CPU_STEP_MS && state.phase === PHASE.PLAYING) {
    state.cpuAccumulatorMs -= CONFIG.CPU_STEP_MS;
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

function init() {
  buildGrid();
  render();

  document.addEventListener('keydown', onKeydown);

  view.startBtn.addEventListener('click', startRound);
  view.roleRunnerBtn.addEventListener('click', () => setRole(ROLE.RUNNER));
  view.roleChaserBtn.addEventListener('click', () => setRole(ROLE.CHASER));

  requestAnimationFrame(gameLoop);
}

init();
