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
  BLUE: 'blue',
  RED: 'red'
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
  [DIFFICULTY.NORMAL]: { label: 'NORMAL', optimalChance: 0.7, minSpeed: 1, maxSpeed: 2 },
  [DIFFICULTY.HARD]: { label: 'HARD', optimalChance: 0.8, minSpeed: 3, maxSpeed: 5 },
  [DIFFICULTY.INSANE]: { label: 'INSANE', optimalChance: 0.95, minSpeed: 5, maxSpeed: 7 },
  [DIFFICULTY.DEMON]: { label: 'DEMON', optimalChance: 1, minSpeed: 7, maxSpeed: 10 }
};

const MODE_PRESETS = {
  [MODE.SINGLE_PLAYER]: {
    description: 'Current mode: one human vs one CPU',
    sides: {
      [SIDE.BLUE]: 1,
      [SIDE.RED]: 1
    }
  },
  [MODE.SPLIT_SCREEN]: {
    description: 'Reserved for multiple human-controlled entities with independent cameras',
    sides: {}
  },
  [MODE.ONE_VS_ONE]: {
    description: 'Reserved for one entity per side',
    sides: {
      [SIDE.BLUE]: 1,
      [SIDE.RED]: 1
    }
  },
  [MODE.TWO_VS_TWO]: {
    description: 'Reserved for two entities per side',
    sides: {
      [SIDE.BLUE]: 2,
      [SIDE.RED]: 2
    }
  },
  [MODE.THREE_VS_THREE]: {
    description: 'Reserved for three entities per side',
    sides: {
      [SIDE.BLUE]: 3,
      [SIDE.RED]: 3
    }
  },
  [MODE.CUSTOM]: {
    description: 'Reserved for arbitrary counts per side',
    sides: {}
  }
};

const CONTROL_MAPPINGS = {
  WASD: {
    w: { x: 0, y: -1 },
    s: { x: 0, y: 1 },
    a: { x: -1, y: 0 },
    d: { x: 1, y: 0 }
  },
  ARROWS: {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 }
  }
};

CONTROL_MAPPINGS.ARROW_WASD = {
  ...CONTROL_MAPPINGS.ARROWS,
  ...CONTROL_MAPPINGS.WASD
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
  modeEl: document.getElementById('mode-value'),
  difficultyEl: document.getElementById('difficulty-value'),
  timerEl: document.getElementById('timer-value'),
  scoreEl: document.getElementById('score-value'),
  activeCountsEl: document.getElementById('active-counts-value'),
  countdownEl: document.getElementById('countdown-value'),
  resultEl: document.getElementById('result-value'),
  instructionsEl: document.getElementById('instructions-value'),
  startBtn: document.getElementById('start-btn'),
  roleRunnerBtn: document.getElementById('role-runner-btn'),
  roleChaserBtn: document.getElementById('role-chaser-btn'),
  modeSelect: document.getElementById('mode-select'),
  difficultySelect: document.getElementById('difficulty-select'),
  customSetupPanel: document.getElementById('custom-setup-panel'),
  customRunnersInput: document.getElementById('custom-runners-input'),
  customChasersInput: document.getElementById('custom-chasers-input'),
  customHumanRoleSelect: document.getElementById('custom-human-role-select'),
  customHumanCountInput: document.getElementById('custom-human-count-input'),
  customCpuCountInput: document.getElementById('custom-cpu-count-input'),
  customDifficultySelect: document.getElementById('custom-difficulty-select'),
  customValidationMessage: document.getElementById('custom-validation-message'),
  customSummaryEl: document.getElementById('custom-summary-value'),
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
  customSetup: getDefaultCustomSetup(),
  score: {
    runnerWins: 0,
    chaserWins: 0
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

  if (side === SIDE.BLUE) {
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

function getPreferredSpawnPoints(side, count) {
  const max = CONFIG.GRID_SIZE - 1;
  const cornerAnchors =
    side === SIDE.BLUE
      ? [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 0, y: 1 },
          { x: 1, y: 1 },
          { x: 2, y: 0 },
          { x: 0, y: 2 }
        ]
      : [
          { x: max, y: max },
          { x: max - 1, y: max },
          { x: max, y: max - 1 },
          { x: max - 1, y: max - 1 },
          { x: max - 2, y: max },
          { x: max, y: max - 2 }
        ];

  return cornerAnchors.slice(0, count).map(clampToGrid);
}

function spawnEntities(entities) {
  const sideQueues = new Map();
  const sideQueueIndexes = new Map();
  const sidePreferred = new Map();
  const sidePreferredIndexes = new Map();
  const sideCounts = new Map();
  const occupied = new Set();

  for (const entity of entities) {
    sideCounts.set(entity.side, (sideCounts.get(entity.side) ?? 0) + 1);
  }

  for (const entity of entities) {
    if (!sideQueues.has(entity.side)) {
      sideQueues.set(entity.side, getSpawnQueueForSide(entity.side));
      sideQueueIndexes.set(entity.side, 0);
      sidePreferred.set(entity.side, getPreferredSpawnPoints(entity.side, sideCounts.get(entity.side) ?? 0));
      sidePreferredIndexes.set(entity.side, 0);
    }

    const preferredQueue = sidePreferred.get(entity.side);
    let preferredIndex = sidePreferredIndexes.get(entity.side);
    let assigned = false;

    while (preferredIndex < preferredQueue.length) {
      const spawnPoint = preferredQueue[preferredIndex];
      const positionKey = toIndex(spawnPoint.x, spawnPoint.y);
      preferredIndex += 1;

      if (occupied.has(positionKey)) {
        continue;
      }

      entity.x = spawnPoint.x;
      entity.y = spawnPoint.y;
      occupied.add(positionKey);
      assigned = true;
      break;
    }

    sidePreferredIndexes.set(entity.side, preferredIndex);
    if (assigned) {
      continue;
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

function parseIntegerInput(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getDefaultCustomSetup() {
  return {
    runners: 2,
    chasers: 2,
    humanRole: ROLE.RUNNER,
    humanCount: 1,
    cpuCount: 3,
    cpuDifficulty: DIFFICULTY.NORMAL
  };
}

function getCustomRoleCount(setup, role) {
  return role === ROLE.RUNNER ? setup.runners : setup.chasers;
}

function getCustomSetupValidation(setup) {
  const total = setup.runners + setup.chasers;
  const selectedRoleCount = getCustomRoleCount(setup, setup.humanRole);

  if (!Number.isInteger(setup.runners) || setup.runners < 1) {
    return { isValid: false, message: 'Runners must be at least 1.' };
  }
  if (!Number.isInteger(setup.chasers) || setup.chasers < 1) {
    return { isValid: false, message: 'Chasers must be at least 1.' };
  }
  if (!Number.isInteger(setup.humanCount) || setup.humanCount < 1) {
    return { isValid: false, message: 'Human-controlled count must be at least 1.' };
  }
  if (!Number.isInteger(setup.cpuCount) || setup.cpuCount < 0) {
    return { isValid: false, message: 'CPU-controlled count cannot be negative.' };
  }
  if (!DIFFICULTY_CONFIG[setup.cpuDifficulty]) {
    return { isValid: false, message: 'Select a valid CPU difficulty.' };
  }
  if (total > CONFIG.GRID_SIZE * CONFIG.GRID_SIZE) {
    return { isValid: false, message: 'Total runners + chasers exceeds available grid cells.' };
  }
  if (setup.humanCount > selectedRoleCount) {
    const roleLabel = setup.humanRole === ROLE.RUNNER ? 'runner' : 'chaser';
    return {
      isValid: false,
      message: `Human-controlled count cannot exceed total ${roleLabel}s (${selectedRoleCount}).`
    };
  }
  if (setup.humanCount + setup.cpuCount !== total) {
    return {
      isValid: false,
      message: `Human + CPU must equal runners + chasers (${total}).`
    };
  }

  return { isValid: true, message: '' };
}

function getCustomSetupSummary(setup) {
  const cpuRunners = setup.runners - (setup.humanRole === ROLE.RUNNER ? setup.humanCount : 0);
  const cpuChasers = setup.chasers - (setup.humanRole === ROLE.CHASER ? setup.humanCount : 0);
  const roleLabel = setup.humanRole === ROLE.RUNNER ? 'runner' : 'chaser';
  const difficultyLabel =
    DIFFICULTY_CONFIG[setup.cpuDifficulty]?.label ?? DIFFICULTY_CONFIG[DIFFICULTY.NORMAL].label;
  return `Custom: ${setup.runners}R vs ${setup.chasers}C | Humans: ${setup.humanCount} ${roleLabel}(s) | CPUs: ${setup.cpuCount} (${cpuRunners}R/${cpuChasers}C) | CPU difficulty: ${difficultyLabel}`;
}

function readCustomSetupFromInputs() {
  return {
    runners: parseIntegerInput(view.customRunnersInput.value, 1),
    chasers: parseIntegerInput(view.customChasersInput.value, 1),
    humanRole: view.customHumanRoleSelect.value === ROLE.CHASER ? ROLE.CHASER : ROLE.RUNNER,
    humanCount: parseIntegerInput(view.customHumanCountInput.value, 1),
    cpuCount: parseIntegerInput(view.customCpuCountInput.value, 0),
    cpuDifficulty: DIFFICULTY_CONFIG[view.customDifficultySelect.value]
      ? view.customDifficultySelect.value
      : DIFFICULTY.NORMAL
  };
}

function createEntitiesForCurrentMode() {
  if (state.mode === MODE.SINGLE_PLAYER) {
    return createEntitiesForSinglePlayer();
  }

  if (state.mode === MODE.ONE_VS_ONE) {
    return createEntitiesForLocalOneVsOne();
  }

  if (state.mode === MODE.TWO_VS_TWO) {
    return createEntitiesForLocalTeamMode(2);
  }

  if (state.mode === MODE.THREE_VS_THREE) {
    return createEntitiesForLocalTeamMode(3);
  }

  if (state.mode === MODE.CUSTOM) {
    return createEntitiesForCustomMode();
  }

  console.warn(`Mode "${state.mode}" is not implemented yet. Falling back to single-player.`);
  return createEntitiesForSinglePlayer();
}

function createEntitiesForSinglePlayer() {
  const cpuRole = getOppositeRole(state.role);

  return [
    createHumanEntity({
      id: 'human-1',
      side: SIDE.BLUE,
      role: state.role,
      color: '#3b82f6',
      controlMapping: CONTROL_MAPPINGS.ARROW_WASD
    }),
    createCpuEntity({
      id: 'cpu-1',
      side: SIDE.RED,
      role: cpuRole,
      color: '#ef4444',
      difficulty: state.difficulty
    })
  ];
}

function createEntitiesForLocalOneVsOne() {
  const redRole = getOppositeRole(state.role);

  return [
    createHumanEntity({
      id: 'blue-player',
      side: SIDE.BLUE,
      role: state.role,
      color: '#3b82f6',
      controlMapping: CONTROL_MAPPINGS.WASD
    }),
    createHumanEntity({
      id: 'red-player',
      side: SIDE.RED,
      role: redRole,
      color: '#ef4444',
      controlMapping: CONTROL_MAPPINGS.ARROWS
    })
  ];
}

function createEntitiesForLocalTeamMode(teamSize) {
  const redRole = getOppositeRole(state.role);
  const blueColors = ['#3b82f6', '#60a5fa', '#2563eb'];
  const redColors = ['#ef4444', '#f87171', '#dc2626'];
  const entities = [];

  for (let i = 0; i < teamSize; i += 1) {
    entities.push(
      createHumanEntity({
        id: `blue-player-${i + 1}`,
        side: SIDE.BLUE,
        role: state.role,
        color: blueColors[i] ?? blueColors[blueColors.length - 1],
        controlMapping: CONTROL_MAPPINGS.WASD
      })
    );
  }

  for (let i = 0; i < teamSize; i += 1) {
    entities.push(
      createHumanEntity({
        id: `red-player-${i + 1}`,
        side: SIDE.RED,
        role: redRole,
        color: redColors[i] ?? redColors[redColors.length - 1],
        controlMapping: CONTROL_MAPPINGS.ARROWS
      })
    );
  }

  return entities;
}

function createEntitiesForCustomMode() {
  const validation = getCustomSetupValidation(state.customSetup);
  if (!validation.isValid) {
    return [];
  }

  const setup = state.customSetup;
  const blueRole = setup.humanRole;
  const redRole = getOppositeRole(blueRole);
  const blueCount = getCustomRoleCount(setup, blueRole);
  const redCount = getCustomRoleCount(setup, redRole);
  const blueHumanCount = Math.min(setup.humanCount, blueCount);
  const blueCpuCount = Math.max(0, blueCount - blueHumanCount);
  const entities = [];
  const blueColors = ['#3b82f6', '#60a5fa', '#2563eb', '#1d4ed8', '#93c5fd', '#0ea5e9'];
  const redColors = ['#ef4444', '#f87171', '#dc2626', '#b91c1c', '#fb7185', '#f43f5e'];

  for (let i = 0; i < blueHumanCount; i += 1) {
    entities.push(
      createHumanEntity({
        id: `custom-blue-human-${i + 1}`,
        side: SIDE.BLUE,
        role: blueRole,
        color: blueColors[i % blueColors.length],
        controlMapping: CONTROL_MAPPINGS.ARROW_WASD
      })
    );
  }

  for (let i = 0; i < blueCpuCount; i += 1) {
    const colorIndex = (i + blueHumanCount) % blueColors.length;
    entities.push(
      createCpuEntity({
        id: `custom-blue-cpu-${i + 1}`,
        side: SIDE.BLUE,
        role: blueRole,
        color: blueColors[colorIndex],
        difficulty: setup.cpuDifficulty
      })
    );
  }

  for (let i = 0; i < redCount; i += 1) {
    entities.push(
      createCpuEntity({
        id: `custom-red-cpu-${i + 1}`,
        side: SIDE.RED,
        role: redRole,
        color: redColors[i % redColors.length],
        difficulty: setup.cpuDifficulty
      })
    );
  }

  return entities;
}

function getOppositeRole(role) {
  return role === ROLE.RUNNER ? ROLE.CHASER : ROLE.RUNNER;
}

function getRoleLabel(role) {
  return role === ROLE.RUNNER ? 'RUNNER' : 'CHASER';
}

function getModeLabel() {
  if (state.mode === MODE.ONE_VS_ONE) {
    return 'LOCAL 1V1';
  }
  if (state.mode === MODE.TWO_VS_TWO) {
    return 'LOCAL 2V2';
  }
  if (state.mode === MODE.THREE_VS_THREE) {
    return 'LOCAL 3V3';
  }
  if (state.mode === MODE.CUSTOM) {
    return 'CUSTOM';
  }
  return 'SINGLE PLAYER';
}

function getRolesLabel() {
  return `Blue: ${getRoleLabel(state.role)} | Red: ${getRoleLabel(getOppositeRole(state.role))}`;
}

function getDifficultyLabel() {
  if (state.mode === MODE.SINGLE_PLAYER) {
    return DIFFICULTY_CONFIG[state.difficulty]?.label ?? DIFFICULTY_CONFIG[DIFFICULTY.NORMAL].label;
  }
  if (state.mode === MODE.CUSTOM && state.customSetup.cpuCount > 0) {
    return (
      DIFFICULTY_CONFIG[state.customSetup.cpuDifficulty]?.label ??
      DIFFICULTY_CONFIG[DIFFICULTY.NORMAL].label
    );
  }
  if (state.mode === MODE.CUSTOM && state.customSetup.cpuCount <= 0) {
    return 'N/A';
  }
  return 'N/A';
}

function getInstructionsText() {
  if (state.mode === MODE.ONE_VS_ONE) {
    return 'Local 1v1: Blue player uses WASD, Red player uses Arrow Keys.';
  }
  if (state.mode === MODE.TWO_VS_TWO || state.mode === MODE.THREE_VS_THREE) {
    return 'Local team mode: Blue team uses WASD (shared), Red team uses Arrow Keys (shared). All teammates move together.';
  }
  if (state.mode === MODE.CUSTOM) {
    return 'Custom mode: all human-controlled entities move together with WASD or Arrow Keys.';
  }
  return 'Single Player: Blue (you) moves with WASD or Arrow Keys. Red CPU moves automatically.';
}

function countActiveByRole(entities) {
  let runners = 0;
  let chasers = 0;

  for (const entity of entities) {
    if (entity.role === ROLE.RUNNER) {
      runners += 1;
    } else if (entity.role === ROLE.CHASER) {
      chasers += 1;
    }
  }

  return { runners, chasers };
}

function isLocalVersusMode(mode) {
  return mode === MODE.ONE_VS_ONE || mode === MODE.TWO_VS_TWO || mode === MODE.THREE_VS_THREE;
}

function isTeamOutcomeMode(mode) {
  return isLocalVersusMode(mode) || mode === MODE.CUSTOM;
}

function removeTaggedRunners(entities, taggedRunnerIds) {
  return entities.filter((entity) => !(entity.role === ROLE.RUNNER && taggedRunnerIds.has(entity.id)));
}

function setRoundResult(text) {
  view.resultEl.textContent = text;
}

function getCountdownValue() {
  return Math.max(1, Math.ceil(state.countdownMs / 1000));
}

function renderHUD() {
  const isRoundActive = state.phase === PHASE.PLAYING || state.phase === PHASE.COUNTDOWN;
  const activeCounts = countActiveByRole(state.entities);
  const isCustomMode = state.mode === MODE.CUSTOM;
  const customValidation = isCustomMode ? getCustomSetupValidation(state.customSetup) : { isValid: true };
  view.roleEl.textContent = getRolesLabel();
  view.modeEl.textContent = getModeLabel();
  view.difficultyEl.textContent = getDifficultyLabel();
  view.timerEl.textContent = String(Math.ceil(state.remainingMs / 1000));
  view.scoreEl.textContent = `${state.score.runnerWins}-${state.score.chaserWins}`;
  view.activeCountsEl.textContent = `${activeCounts.runners}-${activeCounts.chasers}`;
  view.roleRunnerBtn.disabled = isRoundActive || isCustomMode;
  view.roleChaserBtn.disabled = isRoundActive || isCustomMode;
  view.modeSelect.disabled = isRoundActive;
  view.difficultySelect.disabled = isRoundActive || state.mode !== MODE.SINGLE_PLAYER;
  view.startBtn.disabled = isRoundActive || (isCustomMode && !customValidation.isValid);
  view.customSetupPanel.hidden = !isCustomMode;

  if (view.customRunnersInput) {
    const shouldDisableCustomFields = isRoundActive || !isCustomMode;
    view.customRunnersInput.disabled = shouldDisableCustomFields;
    view.customChasersInput.disabled = shouldDisableCustomFields;
    view.customHumanRoleSelect.disabled = shouldDisableCustomFields;
    view.customHumanCountInput.disabled = shouldDisableCustomFields;
    view.customCpuCountInput.disabled = shouldDisableCustomFields;
    view.customDifficultySelect.disabled = shouldDisableCustomFields;
  }

  if (state.phase === PHASE.COUNTDOWN) {
    view.countdownEl.textContent = String(getCountdownValue());
  } else {
    view.countdownEl.textContent = '-';
  }
}

function renderInstructions() {
  view.instructionsEl.textContent = getInstructionsText();
}

function renderCustomSetup() {
  if (state.mode !== MODE.CUSTOM) {
    view.customValidationMessage.textContent = '';
    view.customSummaryEl.textContent = '';
    return;
  }

  const validation = getCustomSetupValidation(state.customSetup);
  view.customValidationMessage.textContent = validation.isValid ? '' : validation.message;
  view.customSummaryEl.textContent = getCustomSetupSummary(state.customSetup);
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
  renderInstructions();
  renderCustomSetup();
}

function endRound(resultText, winningRole) {
  state.phase = PHASE.ENDED;
  if (winningRole === ROLE.RUNNER) {
    state.score.runnerWins += 1;
  } else {
    state.score.chaserWins += 1;
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

  const tagEvents = findTagEvents(state.entities);
  if (tagEvents.length === 0) {
    return;
  }

  const taggedRunnerIds = new Set(tagEvents.map((event) => event.runner.id));
  if (taggedRunnerIds.size === 0) {
    return;
  }

  state.entities = removeTaggedRunners(state.entities, taggedRunnerIds);

  const activeCounts = countActiveByRole(state.entities);
  if (activeCounts.runners <= 0) {
    if (isTeamOutcomeMode(state.mode)) {
      endRound('Chaser side wins: all runners were tagged', ROLE.CHASER);
      return;
    }

    if (state.role === ROLE.CHASER) {
      endRound('You caught the CPU', ROLE.CHASER);
      return;
    }

    endRound('You were caught', ROLE.CHASER);
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
  if (state.mode === MODE.CUSTOM) {
    const validation = getCustomSetupValidation(state.customSetup);
    if (!validation.isValid) {
      setRoundResult(`Custom setup invalid: ${validation.message}`);
      render();
      return;
    }
  }

  state.entities = createEntitiesForCurrentMode();
  spawnEntities(state.entities);

  state.remainingMs = CONFIG.ROUND_MS;
  state.countdownMs = CONFIG.COUNTDOWN_SECONDS * 1000;
  state.phase = PHASE.COUNTDOWN;
  if (state.mode === MODE.CUSTOM) {
    setRoundResult(`${getCustomSetupSummary(state.customSetup)} | Starting in ${CONFIG.COUNTDOWN_SECONDS}`);
  } else {
    setRoundResult(`Starting in ${CONFIG.COUNTDOWN_SECONDS}`);
  }
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
    if (isTeamOutcomeMode(state.mode)) {
      endRound('Runner side wins: at least one runner survived 60 seconds', ROLE.RUNNER);
    } else if (state.role === ROLE.RUNNER) {
      endRound('You survived', ROLE.RUNNER);
    } else {
      endRound('Time ran out', ROLE.RUNNER);
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
  if (state.mode === MODE.CUSTOM) {
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

function setMode(mode) {
  if (state.phase === PHASE.PLAYING || state.phase === PHASE.COUNTDOWN) {
    return;
  }
  if (
    mode !== MODE.SINGLE_PLAYER &&
    mode !== MODE.ONE_VS_ONE &&
    mode !== MODE.TWO_VS_TWO &&
    mode !== MODE.THREE_VS_THREE &&
    mode !== MODE.CUSTOM
  ) {
    return;
  }
  state.mode = mode;

  if (mode === MODE.CUSTOM) {
    state.role = state.customSetup.humanRole;
    const validation = getCustomSetupValidation(state.customSetup);
    if (validation.isValid) {
      state.entities = createEntitiesForCurrentMode();
      spawnEntities(state.entities);
      setRoundResult(`${getCustomSetupSummary(state.customSetup)}. Press Start Game`);
    } else {
      state.entities = [];
      setRoundResult(`Custom setup invalid: ${validation.message}`);
    }
  } else {
    state.entities = createEntitiesForCurrentMode();
    spawnEntities(state.entities);
    setRoundResult('Press Start Game');
  }

  render();
}

function setCustomSetup(nextSetup) {
  if (state.phase === PHASE.PLAYING || state.phase === PHASE.COUNTDOWN) {
    return;
  }

  state.customSetup = nextSetup;
  state.role = nextSetup.humanRole;
  const validation = getCustomSetupValidation(nextSetup);

  if (state.mode === MODE.CUSTOM) {
    if (validation.isValid) {
      state.entities = createEntitiesForCurrentMode();
      spawnEntities(state.entities);
      setRoundResult(`${getCustomSetupSummary(nextSetup)}. Press Start Game`);
    } else {
      state.entities = [];
      setRoundResult(`Custom setup invalid: ${validation.message}`);
    }
    render();
    return;
  }

  renderHUD();
  renderInstructions();
}

function onCustomSetupInputChange() {
  setCustomSetup(readCustomSetupFromInputs());
}

function init() {
  buildGrid();

  view.customRunnersInput.value = String(state.customSetup.runners);
  view.customChasersInput.value = String(state.customSetup.chasers);
  view.customHumanRoleSelect.value = state.customSetup.humanRole;
  view.customHumanCountInput.value = String(state.customSetup.humanCount);
  view.customCpuCountInput.value = String(state.customSetup.cpuCount);
  view.customDifficultySelect.value = state.customSetup.cpuDifficulty;

  // See README "Entity architecture" for the full organization and system breakdown.
  state.entities = createEntitiesForCurrentMode();
  spawnEntities(state.entities);
  render();

  document.addEventListener('keydown', onKeydown);

  view.startBtn.addEventListener('click', startRound);
  view.roleRunnerBtn.addEventListener('click', () => setRole(ROLE.RUNNER));
  view.roleChaserBtn.addEventListener('click', () => setRole(ROLE.CHASER));
  view.modeSelect.addEventListener('change', (event) => setMode(event.target.value));
  view.difficultySelect.addEventListener('change', (event) => setDifficulty(event.target.value));
  view.customRunnersInput.addEventListener('input', onCustomSetupInputChange);
  view.customChasersInput.addEventListener('input', onCustomSetupInputChange);
  view.customHumanRoleSelect.addEventListener('change', onCustomSetupInputChange);
  view.customHumanCountInput.addEventListener('input', onCustomSetupInputChange);
  view.customCpuCountInput.addEventListener('input', onCustomSetupInputChange);
  view.customDifficultySelect.addEventListener('change', onCustomSetupInputChange);

  requestAnimationFrame(gameLoop);
}

init();
