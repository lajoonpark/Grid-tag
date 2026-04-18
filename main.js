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

const SIDE = {
  PLAYER: 'player',
  CPU: 'cpu'
};

const DIFFICULTY = {
  NORMAL: 'normal',
  HARD: 'hard',
  INSANE: 'insane',
  DEMON: 'demon'
};

const MODE = {
  SINGLE_PLAYER: 'single-player',
  SPLIT_SCREEN: 'split-screen',
  ONE_VS_ONE: '1v1',
  TWO_VS_TWO: '2v2',
  THREE_VS_THREE: '3v3',
  CUSTOM: 'custom'
};

const DIFFICULTY_CONFIG = {
  // Difficulty controls both CPU routing quality and per-round speed range.
  // Higher optimalChance makes choices more consistently optimal.
  [DIFFICULTY.NORMAL]: { label: 'NORMAL', optimalChance: 0.7, minSpeed: 2, maxSpeed: 4 },
  [DIFFICULTY.HARD]: { label: 'HARD', optimalChance: 0.8, minSpeed: 4, maxSpeed: 7 },
  [DIFFICULTY.INSANE]: { label: 'INSANE', optimalChance: 0.95, minSpeed: 7, maxSpeed: 10 },
  [DIFFICULTY.DEMON]: { label: 'DEMON', optimalChance: 1, minSpeed: 10, maxSpeed: 14 }
};

const MODE_PRESETS = {
  [MODE.SINGLE_PLAYER]: {
    description: 'Current mode: one human vs one CPU',
    sides: {
      [SIDE.PLAYER]: 1,
      [SIDE.CPU]: 1
    }
  },
  [MODE.SPLIT_SCREEN]: {
    description: 'Reserved for multiple human-controlled entities with independent cameras',
    sides: {}
  },
  [MODE.ONE_VS_ONE]: {
    description: 'Reserved for one entity per side',
    sides: {
      [SIDE.PLAYER]: 1,
      [SIDE.CPU]: 1
    }
  },
  [MODE.TWO_VS_TWO]: {
    description: 'Reserved for two entities per side',
    sides: {
      [SIDE.PLAYER]: 2,
      [SIDE.CPU]: 2
    }
  },
  [MODE.THREE_VS_THREE]: {
    description: 'Reserved for three entities per side',
    sides: {
      [SIDE.PLAYER]: 3,
      [SIDE.CPU]: 3
    }
  },
  [MODE.CUSTOM]: {
    description: 'Reserved for arbitrary counts per side',
    sides: {}
  }
};

const CONTROL_MAPPINGS = {
  ARROW_WASD: {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 },
    s: { x: 0, y: 1 },
    a: { x: -1, y: 0 },
    d: { x: 1, y: 0 }
  }
};

const ARROW_KEY_ALIASES = {
  arrowup: 'ArrowUp',
  arrowdown: 'ArrowDown',
  arrowleft: 'ArrowLeft',
  arrowright: 'ArrowRight'
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
  mode: MODE.SINGLE_PLAYER,
  entities: [],
  remainingMs: CONFIG.ROUND_MS,
  countdownMs: CONFIG.COUNTDOWN_SECONDS * 1000,
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

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

function pickCpuStepMsForRound(difficulty) {
  const config = DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG[DIFFICULTY.NORMAL];
  const speed = randomInRange(config.minSpeed, config.maxSpeed);
  return 1000 / speed;
}

function createEntity({
  id,
  side,
  role,
  color,
  x = 0,
  y = 0,
  isHuman = false,
  isCPU = false,
  controlMapping = null,
  cpuSettings = null
}) {
  return {
    id,
    side,
    role,
    color,
    x,
    y,
    isHuman,
    isCPU,
    controlMapping,
    cpuSettings
  };
}

function createHumanEntity({ id, side, role, color, controlMapping }) {
  return createEntity({
    id,
    side,
    role,
    color,
    isHuman: true,
    isCPU: false,
    controlMapping,
    cpuSettings: null
  });
}

function createCpuEntity({ id, side, role, color, difficulty }) {
  return createEntity({
    id,
    side,
    role,
    color,
    isHuman: false,
    isCPU: true,
    controlMapping: null,
    cpuSettings: {
      difficulty,
      stepMs: pickCpuStepMsForRound(difficulty),
      accumulatorMs: 0
    }
  });
}

function getSpawnQueueForSide(side) {
  const points = [];

  if (side === SIDE.PLAYER) {
    for (let y = 0; y < CONFIG.GRID_SIZE; y += 1) {
      for (let x = 0; x < CONFIG.GRID_SIZE; x += 1) {
        points.push({ x, y });
      }
    }
    return points;
  }

  for (let y = CONFIG.GRID_SIZE - 1; y >= 0; y -= 1) {
    for (let x = CONFIG.GRID_SIZE - 1; x >= 0; x -= 1) {
      points.push({ x, y });
    }
  }
  return points;
}

function spawnEntities(entities) {
  const sideQueues = new Map();
  const sideQueueIndexes = new Map();
  const occupied = new Set();

  for (const entity of entities) {
    if (!sideQueues.has(entity.side)) {
      sideQueues.set(entity.side, getSpawnQueueForSide(entity.side));
      sideQueueIndexes.set(entity.side, 0);
    }

    const queue = sideQueues.get(entity.side);
    let queueIndex = sideQueueIndexes.get(entity.side);

    while (queueIndex < queue.length) {
      const spawnPoint = queue[queueIndex];
      const positionKey = toIndex(spawnPoint.x, spawnPoint.y);
      queueIndex += 1;

      if (occupied.has(positionKey)) {
        continue;
      }

      entity.x = spawnPoint.x;
      entity.y = spawnPoint.y;
      occupied.add(positionKey);
      break;
    }

    sideQueueIndexes.set(entity.side, queueIndex);
  }
}

function createEntitiesForCurrentMode() {
  if (state.mode !== MODE.SINGLE_PLAYER) {
    // TODO: Build entities from MODE_PRESETS[state.mode].sides and assign controls/CPU settings per entity.
    // TODO: Use per-mode team composition (1v1/2v2/3v3/custom/split-screen) instead of single-player defaults.
    console.warn(`Mode "${state.mode}" is not implemented yet. Falling back to single-player.`);
  }

  return createEntitiesForSinglePlayer();
}

function createEntitiesForSinglePlayer() {
  const cpuRole = state.role === ROLE.RUNNER ? ROLE.CHASER : ROLE.RUNNER;

  return [
    createHumanEntity({
      id: 'human-1',
      side: SIDE.PLAYER,
      role: state.role,
      color: '#3b82f6',
      controlMapping: CONTROL_MAPPINGS.ARROW_WASD
    }),
    createCpuEntity({
      id: 'cpu-1',
      side: SIDE.CPU,
      role: cpuRole,
      color: '#ef4444',
      difficulty: state.difficulty
    })
  ];
}

function getRoleLabel() {
  return state.role === ROLE.RUNNER ? 'RUNNER' : 'CHASER';
}

function getDifficultyLabel() {
  return DIFFICULTY_CONFIG[state.difficulty]?.label ?? DIFFICULTY_CONFIG[DIFFICULTY.NORMAL].label;
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
    cell.classList.remove('human', 'cpu', 'entity');
    cell.style.removeProperty('background-color');
  }

  for (const entity of state.entities) {
    const cell = view.cells[toIndex(entity.x, entity.y)];
    if (!cell) {
      continue;
    }

    cell.classList.add('entity');
    cell.style.backgroundColor = entity.color;

    if (entity.isHuman) {
      cell.classList.add('human');
    } else if (entity.isCPU) {
      cell.classList.add('cpu');
    }
  }
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

function findTagEvents(entities) {
  const tiles = new Map();

  for (const entity of entities) {
    const tileKey = String(toIndex(entity.x, entity.y));
    if (!tiles.has(tileKey)) {
      tiles.set(tileKey, []);
    }
    tiles.get(tileKey).push(entity);
  }

  const events = [];

  for (const sameTileEntities of tiles.values()) {
    if (sameTileEntities.length < 2) {
      continue;
    }

    const chasers = sameTileEntities.filter((entity) => entity.role === ROLE.CHASER);
    const runners = sameTileEntities.filter((entity) => entity.role === ROLE.RUNNER);

    for (const chaser of chasers) {
      for (const runner of runners) {
        if (chaser.side === runner.side) {
          continue;
        }
        events.push({ chaser, runner });
      }
    }
  }

  return events;
}

function resolveCollision() {
  if (state.phase !== PHASE.PLAYING) {
    return;
  }

  const humanEntity = state.entities.find((entity) => entity.isHuman);
  if (!humanEntity) {
    return;
  }

  const tagEvents = findTagEvents(state.entities);
  if (tagEvents.length === 0) {
    return;
  }

  if (humanEntity.role === ROLE.CHASER) {
    const humanTag = tagEvents.some((event) => event.chaser.id === humanEntity.id);
    if (humanTag) {
      endRound('You caught the CPU', true);
    }
    return;
  }

  const humanCaught = tagEvents.some((event) => event.runner.id === humanEntity.id);
  if (humanCaught) {
    endRound('You were caught', false);
  }
}

function moveEntity(entity, delta) {
  const next = clampToGrid({
    x: entity.x + delta.x,
    y: entity.y + delta.y
  });

  entity.x = next.x;
  entity.y = next.y;
}

function moveHumanByKey(key) {
  let didMove = false;

  for (const entity of state.entities) {
    if (!entity.isHuman || !entity.controlMapping) {
      continue;
    }

    const delta = entity.controlMapping[key];
    if (!delta) {
      continue;
    }

    moveEntity(entity, delta);
    didMove = true;
  }

  if (!didMove) {
    return;
  }

  resolveCollision();
  renderEntities();
}

function findNearestOpponent(entity, entities) {
  const opponents = entities.filter((candidate) => candidate.side !== entity.side);
  if (opponents.length === 0) {
    return null;
  }

  let nearest = opponents[0];
  let bestDistance = CpuDecisionEngine.manhattanDistance(entity, nearest);

  for (let i = 1; i < opponents.length; i += 1) {
    const candidate = opponents[i];
    const distance = CpuDecisionEngine.manhattanDistance(entity, candidate);
    if (distance < bestDistance) {
      nearest = candidate;
      bestDistance = distance;
    }
  }

  return nearest;
}

function moveCpuEntity(cpuEntity) {
  const target = findNearestOpponent(cpuEntity, state.entities);
  if (!target) {
    return;
  }

  const delta = cpuDecisionEngine.decideMove({
    cpuPosition: cpuEntity,
    humanPosition: target,
    cpuRole: cpuEntity.role,
    difficulty: cpuEntity.cpuSettings?.difficulty ?? state.difficulty
  });

  moveEntity(cpuEntity, delta);
}

function updateCpuMovement(deltaMs) {
  for (const entity of state.entities) {
    if (!entity.isCPU || !entity.cpuSettings) {
      continue;
    }

    entity.cpuSettings.accumulatorMs += deltaMs;

    while (entity.cpuSettings.accumulatorMs >= entity.cpuSettings.stepMs) {
      if (state.phase !== PHASE.PLAYING) {
        return;
      }

      entity.cpuSettings.accumulatorMs -= entity.cpuSettings.stepMs;
      moveCpuEntity(entity);
      resolveCollision();

      if (state.phase !== PHASE.PLAYING) {
        return;
      }
    }
  }

  renderEntities();
}

function startRound() {
  state.entities = createEntitiesForCurrentMode();
  spawnEntities(state.entities);

  state.remainingMs = CONFIG.ROUND_MS;
  state.countdownMs = CONFIG.COUNTDOWN_SECONDS * 1000;
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
  updateCpuMovement(deltaMs);

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

function normalizeKey(eventKey) {
  const lowerKey = eventKey.toLowerCase();
  if (ARROW_KEY_ALIASES[lowerKey]) {
    return ARROW_KEY_ALIASES[lowerKey];
  }
  return lowerKey;
}

function onKeydown(event) {
  if (state.phase !== PHASE.PLAYING) {
    return;
  }

  const key = normalizeKey(event.key);
  const hasHumanControl = state.entities.some(
    (entity) => entity.isHuman && entity.controlMapping && entity.controlMapping[key]
  );

  if (!hasHumanControl) {
    return;
  }

  event.preventDefault();
  moveHumanByKey(key);
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

  // See README "Entity architecture" for the full organization and system breakdown.
  state.entities = createEntitiesForCurrentMode();
  spawnEntities(state.entities);
  render();

  document.addEventListener('keydown', onKeydown);

  view.startBtn.addEventListener('click', startRound);
  view.roleRunnerBtn.addEventListener('click', () => setRole(ROLE.RUNNER));
  view.roleChaserBtn.addEventListener('click', () => setRole(ROLE.CHASER));
  view.difficultySelect.addEventListener('change', (event) => setDifficulty(event.target.value));

  requestAnimationFrame(gameLoop);
}

init();
