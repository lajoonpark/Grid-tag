const CONFIG = {
  GRID_SIZE: 30,
  ROUND_MS: 60000,
  COUNTDOWN_SECONDS: 3,
  COUNTDOWN_START_DELAY_MS: 650,
  MIN_COUNTDOWN_DISPLAY: 1,
  MIN_SPAWN_BUFFER: 4
};

const PHASE = {
  IDLE: 'idle',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ENDED: 'ended'
};

const SCREEN = {
  CONFIG: 'config',
  GAMEPLAY: 'gameplay'
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
  ONE_VS_ONE: '1v1',
  TWO_VS_TWO: '2v2',
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
  },
  TFGH: {
    t: { x: 0, y: -1 },
    g: { x: 0, y: 1 },
    f: { x: -1, y: 0 },
    h: { x: 1, y: 0 }
  },
  IJKL: {
    i: { x: 0, y: -1 },
    k: { x: 0, y: 1 },
    j: { x: -1, y: 0 },
    l: { x: 1, y: 0 }
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

const TEAM_COLORS = {
  [SIDE.BLUE]: ['#3b82f6', '#60a5fa', '#2563eb', '#1d4ed8', '#93c5fd', '#0ea5e9'],
  [SIDE.RED]: ['#ef4444', '#f87171', '#dc2626', '#b91c1c', '#fb7185', '#f43f5e']
};

const LOCAL_TEAM_COLORS = {
  [SIDE.BLUE]: ['#3b82f6', '#60a5fa', '#2563eb'],
  [SIDE.RED]: ['#ef4444', '#f87171', '#dc2626']
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
  configViewEl: document.getElementById('config-view'),
  gameplayViewEl: document.getElementById('gameplay-view'),
  countdownScreenEl: document.getElementById('countdown-screen'),
  countdownScreenValueEl: document.getElementById('countdown-screen-value'),
  gridEl: document.getElementById('grid'),
  roleEl: document.getElementById('role-value'),
  modeEl: document.getElementById('mode-value'),
  difficultyEl: document.getElementById('difficulty-value'),
  timerEl: document.getElementById('timer-value'),
  scoreEl: document.getElementById('score-value'),
  activeCountsEl: document.getElementById('active-counts-value'),
  resultEl: document.getElementById('result-value'),
  roundOverlayEl: document.getElementById('round-overlay'),
  overlayTitleEl: document.getElementById('overlay-title'),
  overlayMessageEl: document.getElementById('overlay-message'),
  startBtn: document.getElementById('start-btn'),
  pauseBtn: document.getElementById('pause-btn'),
  continueBtn: document.getElementById('continue-btn'),
  restartRoundBtn: document.getElementById('restart-round-btn'),
  backConfigBtn: document.getElementById('back-config-btn'),
  overlayConfigBtn: document.getElementById('overlay-config-btn'),
  configMenuBtn: document.getElementById('config-menu-btn'),
  menuBtn: document.getElementById('menu-btn'),
  overlayMenuBtn: document.getElementById('overlay-menu-btn'),
  overlayRestartBtn: document.getElementById('overlay-restart-btn'),
  overlayCloseBtn: document.getElementById('overlay-close-btn'),
  roleToggleBtn: document.getElementById('role-toggle-btn'),
  settingsMenuWrapEl: document.getElementById('settings-menu-wrap'),
  difficultySelect: document.getElementById('difficulty-select'),
  customSetupPanel: document.getElementById('custom-setup-panel'),
  customRunnersInput: document.getElementById('custom-runners-input'),
  customChasersInput: document.getElementById('custom-chasers-input'),
  customHumanOneRoleSelect: document.getElementById('custom-human-one-role-select'),
  customHumanTwoRoleSelect: document.getElementById('custom-human-two-role-select'),
  customHumanCountInput: document.getElementById('custom-human-count-input'),
  customCpuCountInput: document.getElementById('custom-cpu-count-input'),
  customDifficultySelect: document.getElementById('custom-difficulty-select'),
  customValidationMessage: document.getElementById('custom-validation-message'),
  customSummaryEl: document.getElementById('custom-summary-value'),
  cells: []
};

const state = {
  screen: SCREEN.CONFIG,
  phase: PHASE.IDLE,
  role: ROLE.RUNNER,
  difficulty: DIFFICULTY.NORMAL,
  mode: MODE.SINGLE_PLAYER,
  entities: [],
  remainingMs: CONFIG.ROUND_MS,
  countdownMs: CONFIG.COUNTDOWN_SECONDS * 1000,
  customSetup: getDefaultCustomSetup(),
  overlayDismissed: false,
  lastRound: {
    resultText: '',
    winningRole: null
  },
  score: {
    runnerWins: 0,
    chaserWins: 0
  }
};

let lastFrameTime = 0;
let feedbackTimeoutId = null;

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
  const max = CONFIG.GRID_SIZE - 1;
  const points = [];

  for (let y = 0; y < CONFIG.GRID_SIZE; y += 1) {
    for (let x = 0; x < CONFIG.GRID_SIZE; x += 1) {
      const ownCornerDistance = side === SIDE.BLUE ? x + y : max - x + (max - y);
      const enemyCornerDistance = side === SIDE.BLUE ? max - x + (max - y) : x + y;
      points.push({ x, y, ownCornerDistance, enemyCornerDistance });
    }
  }

  // Keep entities near their own corner while biasing away from the enemy corner.
  points.sort((a, b) => {
    if (a.ownCornerDistance !== b.ownCornerDistance) {
      return a.ownCornerDistance - b.ownCornerDistance;
    }
    return b.enemyCornerDistance - a.enemyCornerDistance;
  });

  return points.map((point) => ({ x: point.x, y: point.y }));
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

function hasOpposingSpawnBuffer(spawnPoint, side, occupiedBySide, minDistance) {
  const opponentSide = side === SIDE.BLUE ? SIDE.RED : SIDE.BLUE;
  const opponentSpawns = occupiedBySide.get(opponentSide) ?? [];

  for (const opponent of opponentSpawns) {
    if (CpuDecisionEngine.manhattanDistance(spawnPoint, opponent) < minDistance) {
      return false;
    }
  }

  return true;
}

function findAvailableSpawnPoint({
  pools,
  side,
  occupied,
  occupiedBySide,
  requireOpposingBuffer,
  minOpposingDistance
}) {
  for (const pool of pools) {
    for (const spawnPoint of pool) {
      const positionKey = toIndex(spawnPoint.x, spawnPoint.y);
      if (occupied.has(positionKey)) {
        continue;
      }

      if (
        requireOpposingBuffer &&
        !hasOpposingSpawnBuffer(spawnPoint, side, occupiedBySide, minOpposingDistance)
      ) {
        continue;
      }

      return spawnPoint;
    }
  }

  return null;
}

function spawnEntities(entities) {
  const sideQueues = new Map();
  const sidePreferred = new Map();
  const sideCounts = new Map();
  const occupiedBySide = new Map([
    [SIDE.BLUE, []],
    [SIDE.RED, []]
  ]);
  const occupied = new Set();
  // Try to keep early opposing spawns separated to reduce instant tags at round start.
  const minOpposingDistance = Math.max(CONFIG.MIN_SPAWN_BUFFER, Math.floor(CONFIG.GRID_SIZE / 5));

  for (const entity of entities) {
    sideCounts.set(entity.side, (sideCounts.get(entity.side) ?? 0) + 1);
  }

  for (const entity of entities) {
    if (!sideQueues.has(entity.side)) {
      sideQueues.set(entity.side, getSpawnQueueForSide(entity.side));
      sidePreferred.set(entity.side, getPreferredSpawnPoints(entity.side, sideCounts.get(entity.side) ?? 0));
    }

    const preferredQueue = sidePreferred.get(entity.side) ?? [];
    const queue = sideQueues.get(entity.side) ?? [];
    const pools = [preferredQueue, queue];

    let spawnPoint = findAvailableSpawnPoint({
      pools,
      side: entity.side,
      occupied,
      occupiedBySide,
      requireOpposingBuffer: true,
      minOpposingDistance
    });

    if (!spawnPoint) {
      spawnPoint = findAvailableSpawnPoint({
        pools,
        side: entity.side,
        occupied,
        occupiedBySide,
        requireOpposingBuffer: false,
        minOpposingDistance
      });
    }

    if (!spawnPoint) {
      continue;
    }

    entity.x = spawnPoint.x;
    entity.y = spawnPoint.y;
    occupied.add(toIndex(spawnPoint.x, spawnPoint.y));
    occupiedBySide.get(entity.side).push({ x: spawnPoint.x, y: spawnPoint.y });
  }
}

function parseIntegerInput(value, fallback, min = Number.NEGATIVE_INFINITY) {
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.max(min, parsed);
}

function getDefaultCustomSetup() {
  return {
    runners: 2,
    chasers: 2,
    humanOneRole: ROLE.RUNNER,
    humanTwoRole: ROLE.CHASER,
    humanCount: 1,
    cpuCount: 3,
    cpuDifficulty: DIFFICULTY.NORMAL
  };
}

function isRoleValid(role) {
  return role === ROLE.RUNNER || role === ROLE.CHASER;
}

function getActiveCustomHumanRoles(setup) {
  const roles = [setup.humanOneRole];
  if (setup.humanCount >= 2) {
    roles.push(setup.humanTwoRole);
  }
  return roles;
}

function getCustomHumanRoleCounts(setup) {
  const roles = getActiveCustomHumanRoles(setup);
  return roles.reduce(
    (counts, role) => {
      if (role === ROLE.RUNNER) {
        counts.runners += 1;
      } else if (role === ROLE.CHASER) {
        counts.chasers += 1;
      }
      return counts;
    },
    { runners: 0, chasers: 0 }
  );
}

function normalizeCustomSetup(inputSetup) {
  const fallback = getDefaultCustomSetup();
  const next = Object.assign({}, fallback, inputSetup || {});

  if (!isRoleValid(next.humanOneRole) && isRoleValid(next.humanRole)) {
    next.humanOneRole = next.humanRole;
  }
  if (!isRoleValid(next.humanOneRole)) {
    next.humanOneRole = fallback.humanOneRole;
  }
  if (!isRoleValid(next.humanTwoRole)) {
    next.humanTwoRole = getOppositeRole(next.humanOneRole);
  }

  if (!Number.isInteger(next.humanCount)) {
    next.humanCount = parseIntegerInput(next.humanCount, fallback.humanCount, 1);
  }
  next.humanCount = Math.max(1, Math.min(2, next.humanCount));

  return next;
}

function getCustomSetupValidation(setup) {
  const total = setup.runners + setup.chasers;
  const activeHumanRoles = getActiveCustomHumanRoles(setup);
  const humanRoleCounts = getCustomHumanRoleCounts(setup);

  if (!Number.isInteger(setup.runners) || setup.runners < 1) {
    return { isValid: false, message: 'Runners must be at least 1.' };
  }
  if (!Number.isInteger(setup.chasers) || setup.chasers < 1) {
    return { isValid: false, message: 'Chasers must be at least 1.' };
  }
  if (!Number.isInteger(setup.humanCount) || setup.humanCount < 1 || setup.humanCount > 2) {
    return { isValid: false, message: 'Human-controlled count must be 1 or 2.' };
  }
  if (!Number.isInteger(setup.cpuCount) || setup.cpuCount < 0) {
    return { isValid: false, message: 'CPU-controlled count cannot be negative.' };
  }
  if (!activeHumanRoles.every((role) => isRoleValid(role))) {
    return { isValid: false, message: 'Select valid role(s) for all human players.' };
  }
  if (!DIFFICULTY_CONFIG[setup.cpuDifficulty]) {
    return { isValid: false, message: 'Select a valid CPU difficulty.' };
  }
  if (total > CONFIG.GRID_SIZE * CONFIG.GRID_SIZE) {
    return { isValid: false, message: 'Total runners + chasers exceeds available grid cells.' };
  }
  if (humanRoleCounts.runners > setup.runners) {
    return {
      isValid: false,
      message: `Human runner selections cannot exceed total runners (${setup.runners}).`
    };
  }
  if (humanRoleCounts.chasers > setup.chasers) {
    return {
      isValid: false,
      message: `Human chaser selections cannot exceed total chasers (${setup.chasers}).`
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
  const humanRoles = getActiveCustomHumanRoles(setup);
  const humanRoleCounts = getCustomHumanRoleCounts(setup);
  const cpuRunners = setup.runners - humanRoleCounts.runners;
  const cpuChasers = setup.chasers - humanRoleCounts.chasers;
  const formattedHumanRoles = humanRoles
    .map((role, index) => `H${index + 1}:${getRoleLabel(role)}`)
    .join(', ');
  const difficultyLabel =
    DIFFICULTY_CONFIG[setup.cpuDifficulty]?.label ?? DIFFICULTY_CONFIG[DIFFICULTY.NORMAL].label;
  return `Custom: ${setup.runners}R vs ${setup.chasers}C | Humans: ${setup.humanCount} (${formattedHumanRoles}) | CPUs: ${setup.cpuCount} (${cpuRunners}R/${cpuChasers}C) | CPU difficulty: ${difficultyLabel}`;
}

function readCustomSetupFromInputs() {
  return normalizeCustomSetup({
    runners: parseIntegerInput(view.customRunnersInput.value, 1, 1),
    chasers: parseIntegerInput(view.customChasersInput.value, 1, 1),
    humanOneRole: view.customHumanOneRoleSelect.value === ROLE.CHASER ? ROLE.CHASER : ROLE.RUNNER,
    humanTwoRole: view.customHumanTwoRoleSelect.value === ROLE.CHASER ? ROLE.CHASER : ROLE.RUNNER,
    humanCount: parseIntegerInput(view.customHumanCountInput.value, 1, 1),
    cpuCount: parseIntegerInput(view.customCpuCountInput.value, 0, 0),
    cpuDifficulty: DIFFICULTY_CONFIG[view.customDifficultySelect.value]
      ? view.customDifficultySelect.value
      : DIFFICULTY.NORMAL
  });
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
  const blueColors = LOCAL_TEAM_COLORS[SIDE.BLUE];
  const redColors = LOCAL_TEAM_COLORS[SIDE.RED];
  const blueControlMappings = [CONTROL_MAPPINGS.WASD, CONTROL_MAPPINGS.TFGH];
  const redControlMappings = [CONTROL_MAPPINGS.ARROWS, CONTROL_MAPPINGS.IJKL];
  const entities = [];

  for (let i = 0; i < teamSize; i += 1) {
    entities.push(
      createHumanEntity({
        id: `blue-player-${i + 1}`,
        side: SIDE.BLUE,
        role: state.role,
        color: blueColors[i] ?? blueColors[blueColors.length - 1],
        controlMapping:
          blueControlMappings[i] ?? blueControlMappings[blueControlMappings.length - 1]
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
        controlMapping: redControlMappings[i] ?? redControlMappings[redControlMappings.length - 1]
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
  const blueRole = ROLE.RUNNER;
  const redRole = ROLE.CHASER;
  const blueCount = setup.runners;
  const redCount = setup.chasers;
  const customHumanControls = [CONTROL_MAPPINGS.WASD, CONTROL_MAPPINGS.ARROWS];
  const humanRoles = getActiveCustomHumanRoles(setup);
  const humanRoleCounts = getCustomHumanRoleCounts(setup);
  const blueHumanCount = humanRoleCounts.runners;
  const redHumanCount = humanRoleCounts.chasers;
  const blueCpuCount = Math.max(0, blueCount - blueHumanCount);
  const redCpuCount = Math.max(0, redCount - redHumanCount);
  const entities = [];
  const blueColors = TEAM_COLORS[SIDE.BLUE];
  const redColors = TEAM_COLORS[SIDE.RED];
  let blueHumanIndex = 0;
  let redHumanIndex = 0;

  for (let i = 0; i < humanRoles.length; i += 1) {
    const role = humanRoles[i];
    const side = role === ROLE.RUNNER ? SIDE.BLUE : SIDE.RED;
    const colorSet = side === SIDE.BLUE ? blueColors : redColors;
    const sideHumanIndex = side === SIDE.BLUE ? blueHumanIndex : redHumanIndex;
    const sideHumanId = sideHumanIndex + 1;
    entities.push(
      createHumanEntity({
        id: `custom-${side}-human-${sideHumanId}`,
        side,
        role,
        color: colorSet[sideHumanIndex % colorSet.length],
        controlMapping: customHumanControls[i] ?? customHumanControls[customHumanControls.length - 1]
      })
    );
    if (side === SIDE.BLUE) {
      blueHumanIndex += 1;
    } else {
      redHumanIndex += 1;
    }
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

  for (let i = 0; i < redCpuCount; i += 1) {
    const colorIndex = (i + redHumanCount) % redColors.length;
    entities.push(
      createCpuEntity({
        id: `custom-red-cpu-${i + 1}`,
        side: SIDE.RED,
        role: redRole,
        color: redColors[colorIndex],
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
  if (state.mode === MODE.CUSTOM) {
    return 'CUSTOM';
  }
  return 'SINGLE PLAYER';
}

function getRolesLabel() {
  if (state.mode === MODE.CUSTOM) {
    return `Blue: ${getRoleLabel(ROLE.RUNNER)} | Red: ${getRoleLabel(ROLE.CHASER)}`;
  }
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
  return 'N/A';
}

function getInstructionsText() {
  if (state.mode === MODE.ONE_VS_ONE) {
    return 'Controls: Blue uses WASD, Red uses Arrow Keys. Rule: chasers win by tagging all runners before time runs out.';
  }
  if (state.mode === MODE.TWO_VS_TWO) {
    return 'Controls: Blue P1 uses WASD, Blue P2 uses TFGH, Red P1 uses Arrow Keys, Red P2 uses IJKL. Rule: runners win if at least one survives.';
  }
  if (state.mode === MODE.CUSTOM) {
    return 'Controls: Human 1 uses WASD, Human 2 uses Arrow Keys. In custom mode, each human can choose runner/chaser independently.';
  }
  return 'Controls: move with WASD or Arrow Keys. Rule: survive as runner or tag as chaser before the 60-second timer ends.';
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
  return mode === MODE.ONE_VS_ONE || mode === MODE.TWO_VS_TWO;
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
  return Math.max(0, Math.ceil(state.countdownMs / 1000));
}

function getCountdownDisplaySeconds() {
  return Math.max(CONFIG.MIN_COUNTDOWN_DISPLAY, Math.ceil(state.countdownMs / 1000));
}

function getTimerValue() {
  return `${Math.ceil(state.remainingMs / 1000)}s`;
}

function isRoundInProgress() {
  return state.phase === PHASE.PLAYING || state.phase === PHASE.COUNTDOWN || state.phase === PHASE.PAUSED;
}

function didBlueSideWin(winningRole) {
  return state.role === winningRole;
}

function triggerFeedback(className, durationMs = 420) {
  document.body.classList.remove('feedback-tag', 'feedback-win', 'feedback-loss');
  if (feedbackTimeoutId) {
    clearTimeout(feedbackTimeoutId);
  }
  document.body.classList.add(className);
  feedbackTimeoutId = setTimeout(() => {
    document.body.classList.remove(className);
    feedbackTimeoutId = null;
  }, durationMs);
}

function getOverlayTitle() {
  const { winningRole } = state.lastRound;
  if (!winningRole) {
    return 'Round Over';
  }
  if (isTeamOutcomeMode(state.mode)) {
    return winningRole === ROLE.RUNNER ? 'Runner Side Wins' : 'Chaser Side Wins';
  }
  return didBlueSideWin(winningRole) ? 'You Win' : 'You Lose';
}

function renderOverlay() {
  if (!view.roundOverlayEl) {
    return;
  }
  const showOverlay = state.phase === PHASE.ENDED && !state.overlayDismissed;
  view.roundOverlayEl.hidden = !showOverlay;
  if (!showOverlay) {
    return;
  }
  view.overlayTitleEl.textContent = getOverlayTitle();
  view.overlayMessageEl.textContent = state.lastRound.resultText;
}

function renderMobileWarning() {
  // Removed from redesigned UI.
}

function renderHUD() {
  const isRoundActive = isRoundInProgress();
  const activeCounts = countActiveByRole(state.entities);
  const isCustomMode = state.mode === MODE.CUSTOM;
  const isCpuMode = state.mode === MODE.SINGLE_PLAYER;
  const customValidation = isCustomMode ? getCustomSetupValidation(state.customSetup) : { isValid: true };
  if (view.roleEl) {
    view.roleEl.textContent = getRolesLabel();
  }
  if (view.modeEl) {
    view.modeEl.textContent = getModeLabel();
  }
  if (view.difficultyEl) {
    view.difficultyEl.textContent = getDifficultyLabel();
  }
  if (view.timerEl) {
    view.timerEl.textContent = getTimerValue();
  }
  if (view.scoreEl) {
    view.scoreEl.textContent = `${state.score.runnerWins}-${state.score.chaserWins}`;
  }
  if (view.activeCountsEl) {
    view.activeCountsEl.textContent = `${activeCounts.runners}-${activeCounts.chasers}`;
  }
  if (view.settingsMenuWrapEl) {
    view.settingsMenuWrapEl.hidden = !isCpuMode;
  }
  if (view.roleToggleBtn) {
    view.roleToggleBtn.textContent =
      state.role === ROLE.RUNNER ? 'Play as Chaser' : 'Play as Runner';
    view.roleToggleBtn.disabled = isRoundActive || isCustomMode;
  }
  if (view.difficultySelect) {
    view.difficultySelect.disabled = isRoundActive || !isCpuMode;
  }
  if (view.startBtn) {
    view.startBtn.disabled = isRoundActive || (isCustomMode && !customValidation.isValid) || state.phase === PHASE.PAUSED;
  }
  if (view.pauseBtn) {
    view.pauseBtn.disabled = state.phase !== PHASE.PLAYING;
  }
  if (view.continueBtn) {
    view.continueBtn.disabled = state.phase !== PHASE.PAUSED;
  }
  if (view.restartRoundBtn) {
    view.restartRoundBtn.disabled = isCustomMode && !customValidation.isValid;
  }
  if (view.customSetupPanel) {
    view.customSetupPanel.hidden = !isCustomMode;
  }

  if (view.customRunnersInput) {
    const shouldDisableCustomFields = isRoundActive || !isCustomMode;
    view.customRunnersInput.disabled = shouldDisableCustomFields;
    view.customChasersInput.disabled = shouldDisableCustomFields;
    view.customHumanOneRoleSelect.disabled = shouldDisableCustomFields;
    view.customHumanTwoRoleSelect.disabled = shouldDisableCustomFields || state.customSetup.humanCount < 2;
    view.customHumanCountInput.disabled = shouldDisableCustomFields;
    view.customCpuCountInput.disabled = shouldDisableCustomFields;
    view.customDifficultySelect.disabled = shouldDisableCustomFields;
  }

  if (view.countdownScreenEl && view.countdownScreenValueEl) {
    const showCountdown = state.screen === SCREEN.GAMEPLAY && state.phase === PHASE.COUNTDOWN;
    view.countdownScreenEl.hidden = !showCountdown;
    if (showCountdown) {
      if (state.countdownMs > 0) {
        view.countdownScreenValueEl.textContent = String(getCountdownDisplaySeconds());
      } else {
        view.countdownScreenValueEl.textContent = 'START!';
      }
    }
  }
}

function renderInstructions() {
  // Removed from redesigned UI.
}

function renderScreen() {
  if (view.configViewEl) {
    view.configViewEl.hidden = state.screen !== SCREEN.CONFIG;
  }
  if (view.gameplayViewEl) {
    view.gameplayViewEl.hidden = state.screen !== SCREEN.GAMEPLAY;
  }
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
  renderScreen();
  renderHUD();
  renderEntities();
  renderCustomSetup();
  renderOverlay();
  renderMobileWarning();
}

function endRound(resultText, winningRole) {
  state.phase = PHASE.ENDED;
  state.overlayDismissed = false;
  state.lastRound.resultText = resultText;
  state.lastRound.winningRole = winningRole;
  if (winningRole === ROLE.RUNNER) {
    state.score.runnerWins += 1;
  } else {
    state.score.chaserWins += 1;
  }
  setRoundResult(resultText);
  triggerFeedback(didBlueSideWin(winningRole) ? 'feedback-win' : 'feedback-loss', 650);
  renderHUD();
  renderOverlay();
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

  triggerFeedback('feedback-tag', 240);
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

function startRound(force = false) {
  if (!force && (state.phase === PHASE.COUNTDOWN || state.phase === PHASE.PLAYING)) {
    return;
  }

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
  state.screen = SCREEN.GAMEPLAY;
  state.overlayDismissed = false;
  state.lastRound.resultText = '';
  state.lastRound.winningRole = null;
  if (state.mode === MODE.CUSTOM) {
    setRoundResult(`${getCustomSetupSummary(state.customSetup)} | Starting in ${CONFIG.COUNTDOWN_SECONDS}`);
  } else {
    setRoundResult(`Starting in ${CONFIG.COUNTDOWN_SECONDS}`);
  }
  render();
}

function restartRound() {
  startRound(true);
}

function pauseRound() {
  if (state.phase === PHASE.PLAYING) {
    state.phase = PHASE.PAUSED;
    setRoundResult('Paused');
    renderHUD();
  }
}

function continueRound() {
  if (state.phase === PHASE.PAUSED) {
    state.phase = PHASE.PLAYING;
    setRoundResult('Round in progress');
    renderHUD();
  }
}

function goToConfigurations() {
  state.screen = SCREEN.CONFIG;
  state.phase = PHASE.IDLE;
  state.countdownMs = CONFIG.COUNTDOWN_SECONDS * 1000;
  state.remainingMs = CONFIG.ROUND_MS;
  state.overlayDismissed = true;
  state.lastRound.resultText = '';
  state.lastRound.winningRole = null;
  setRoundResult('Press Start');
  render();
}

function updateCountdown(deltaMs) {
  const startThresholdMs = -CONFIG.COUNTDOWN_START_DELAY_MS;
  state.countdownMs = Math.max(startThresholdMs, state.countdownMs - deltaMs);
  if (state.countdownMs > 0) {
    setRoundResult(`Starting in ${getCountdownDisplaySeconds()}`);
  } else {
    setRoundResult('START!');
    // Keep START! briefly visible before transitioning into active gameplay.
    if (state.countdownMs <= startThresholdMs) {
      state.phase = PHASE.PLAYING;
      setRoundResult('Round in progress');
    }
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
  if (isRoundInProgress()) {
    return;
  }
  if (state.mode === MODE.CUSTOM) {
    return;
  }
  state.role = role;
  setRoundResult('Press Start');
  renderHUD();
  renderEntities();
}

function setDifficulty(difficulty) {
  if (isRoundInProgress()) {
    return;
  }
  if (!DIFFICULTY_CONFIG[difficulty]) {
    return;
  }
  state.difficulty = difficulty;
  setRoundResult('Press Start');
  renderHUD();
}

function setMode(mode) {
  if (isRoundInProgress()) {
    return;
  }
  if (
    mode !== MODE.SINGLE_PLAYER &&
    mode !== MODE.ONE_VS_ONE &&
    mode !== MODE.TWO_VS_TWO &&
    mode !== MODE.CUSTOM
  ) {
    return;
  }
  state.mode = mode;
  state.overlayDismissed = true;

  if (mode === MODE.CUSTOM) {
    state.role = ROLE.RUNNER;
    const validation = getCustomSetupValidation(state.customSetup);
    if (validation.isValid) {
      state.entities = createEntitiesForCurrentMode();
      spawnEntities(state.entities);
      setRoundResult(`${getCustomSetupSummary(state.customSetup)}. Press Start`);
    } else {
      state.entities = [];
      setRoundResult(`Custom setup invalid: ${validation.message}`);
    }
  } else {
    state.entities = createEntitiesForCurrentMode();
    spawnEntities(state.entities);
    setRoundResult('Press Start');
  }

  render();
}

function setCustomSetup(nextSetup) {
  if (isRoundInProgress()) {
    return;
  }

  state.customSetup = normalizeCustomSetup(nextSetup);
  const validation = getCustomSetupValidation(state.customSetup);

  if (state.mode === MODE.CUSTOM) {
    state.role = ROLE.RUNNER;
    if (validation.isValid) {
      state.entities = createEntitiesForCurrentMode();
      spawnEntities(state.entities);
      setRoundResult(`${getCustomSetupSummary(state.customSetup)}. Press Start`);
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

function closeOverlay() {
  state.overlayDismissed = true;
  renderOverlay();
}

/* ------------------------------------------------------------------
   Read the launch config written to sessionStorage by menu.js or
   custom.js, consume it, and return it (or null if none present).
   Also accepts a ?mode=&difficulty= query-string fallback.
   ------------------------------------------------------------------ */
function readLaunchConfig() {
  try {
    const raw = sessionStorage.getItem('gridtag-config');
    if (raw) {
      sessionStorage.removeItem('gridtag-config');
      return JSON.parse(raw);
    }
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode');
    if (mode) {
      return { mode: mode, difficulty: params.get('difficulty') || DIFFICULTY.NORMAL };
    }
  } catch (_) { /* ignore */ }
  return null;
}

function init() {
  // Apply launch config from the main menu (before entities are built)
  const launchConfig = readLaunchConfig();
  const hasLaunchConfig = launchConfig !== null;

  if (launchConfig) {
    const validModes = [
      MODE.SINGLE_PLAYER, MODE.ONE_VS_ONE, MODE.TWO_VS_TWO,
      MODE.CUSTOM
    ];
    if (validModes.includes(launchConfig.mode)) {
      state.mode = launchConfig.mode;
    }
    if (launchConfig.difficulty && DIFFICULTY_CONFIG[launchConfig.difficulty]) {
      state.difficulty = launchConfig.difficulty;
    }
    if (launchConfig.customSetup) {
      state.customSetup = normalizeCustomSetup(
        Object.assign({}, state.customSetup, launchConfig.customSetup)
      );
      state.role = ROLE.RUNNER;
    }
  }

  buildGrid();

  // Sync controls and custom inputs to the (possibly updated) state
  if (view.difficultySelect) {
    view.difficultySelect.value = state.difficulty;
  }
  if (view.customRunnersInput) {
    view.customRunnersInput.value = String(state.customSetup.runners);
    view.customChasersInput.value = String(state.customSetup.chasers);
    view.customHumanOneRoleSelect.value = state.customSetup.humanOneRole;
    view.customHumanTwoRoleSelect.value = state.customSetup.humanTwoRole;
    view.customHumanCountInput.value = String(state.customSetup.humanCount);
    view.customCpuCountInput.value = String(state.customSetup.cpuCount);
    view.customDifficultySelect.value = state.customSetup.cpuDifficulty;
  }

  // See README "Entity architecture" for the full organization and system breakdown.
  state.entities = createEntitiesForCurrentMode();
  spawnEntities(state.entities);
  render();

  document.addEventListener('keydown', onKeydown);

  if (view.startBtn) {
    view.startBtn.addEventListener('click', startRound);
  }
  if (view.pauseBtn) {
    view.pauseBtn.addEventListener('click', pauseRound);
  }
  if (view.continueBtn) {
    view.continueBtn.addEventListener('click', continueRound);
  }
  if (view.restartRoundBtn) {
    view.restartRoundBtn.addEventListener('click', restartRound);
  }
  if (view.backConfigBtn) {
    view.backConfigBtn.addEventListener('click', goToConfigurations);
  }
  if (view.overlayConfigBtn) {
    view.overlayConfigBtn.addEventListener('click', goToConfigurations);
  }
  if (view.configMenuBtn) {
    view.configMenuBtn.addEventListener('click', () => {
      location.href = 'index.html';
    });
  }
  if (view.menuBtn) {
    view.menuBtn.addEventListener('click', () => {
      location.href = 'index.html';
    });
  }
  if (view.overlayMenuBtn) {
    view.overlayMenuBtn.addEventListener('click', () => {
      location.href = 'index.html';
    });
  }
  if (view.overlayRestartBtn) {
    view.overlayRestartBtn.addEventListener('click', restartRound);
  }
  if (view.overlayCloseBtn) {
    view.overlayCloseBtn.addEventListener('click', closeOverlay);
  }
  if (view.roleToggleBtn) {
    view.roleToggleBtn.addEventListener('click', () =>
      setRole(state.role === ROLE.RUNNER ? ROLE.CHASER : ROLE.RUNNER)
    );
  }
  if (view.difficultySelect) {
    view.difficultySelect.addEventListener('change', (event) => setDifficulty(event.target.value));
  }
  if (view.customRunnersInput) {
    view.customRunnersInput.addEventListener('input', onCustomSetupInputChange);
    view.customChasersInput.addEventListener('input', onCustomSetupInputChange);
    view.customHumanOneRoleSelect.addEventListener('change', onCustomSetupInputChange);
    view.customHumanTwoRoleSelect.addEventListener('change', onCustomSetupInputChange);
    view.customHumanCountInput.addEventListener('input', onCustomSetupInputChange);
    view.customCpuCountInput.addEventListener('input', onCustomSetupInputChange);
    view.customDifficultySelect.addEventListener('change', onCustomSetupInputChange);
  }
  window.addEventListener('resize', renderMobileWarning);

  requestAnimationFrame(gameLoop);

  // Auto-start when launched from the main menu with a chosen config
  if (hasLaunchConfig) {
    startRound();
  }
}

init();
