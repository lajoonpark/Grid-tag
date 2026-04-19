const CONFIG = {
  GRID_SIZE: 30,
  ROUND_MS: 60000,
  COUNTDOWN_SECONDS: 3
};

const PHASE = {
  IDLE: 'idle',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  PAUSED: 'paused',
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
  mobileWarningEl: document.getElementById('mobile-warning'),
  roundOverlayEl: document.getElementById('round-overlay'),
  overlayTitleEl: document.getElementById('overlay-title'),
  overlayMessageEl: document.getElementById('overlay-message'),
  startBtn: document.getElementById('start-btn'),
  pauseBtn: document.getElementById('pause-btn'),
  restartRoundBtn: document.getElementById('restart-round-btn'),
  overlayRestartBtn: document.getElementById('overlay-restart-btn'),
  overlayCloseBtn: document.getElementById('overlay-close-btn'),
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
  const minOpposingDistance = Math.max(4, Math.floor(CONFIG.GRID_SIZE / 5));

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
    runners: parseIntegerInput(view.customRunnersInput.value, 1, 1),
    chasers: parseIntegerInput(view.customChasersInput.value, 1, 1),
    humanRole: view.customHumanRoleSelect.value === ROLE.CHASER ? ROLE.CHASER : ROLE.RUNNER,
    humanCount: parseIntegerInput(view.customHumanCountInput.value, 1, 1),
    cpuCount: parseIntegerInput(view.customCpuCountInput.value, 0, 0),
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
  const blueColors = LOCAL_TEAM_COLORS[SIDE.BLUE];
  const redColors = LOCAL_TEAM_COLORS[SIDE.RED];
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
  const blueColors = TEAM_COLORS[SIDE.BLUE];
  const redColors = TEAM_COLORS[SIDE.RED];

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
  return 'N/A';
}

function getInstructionsText() {
  if (state.mode === MODE.ONE_VS_ONE) {
    return 'Controls: Blue uses WASD, Red uses Arrow Keys. Rule: chasers win by tagging all runners before time runs out.';
  }
  if (state.mode === MODE.TWO_VS_TWO || state.mode === MODE.THREE_VS_THREE) {
    return 'Controls: Blue team uses WASD (shared), Red team uses Arrow Keys (shared). Rule: runners win if at least one survives.';
  }
  if (state.mode === MODE.CUSTOM) {
    return 'Controls: all human-controlled entities move together with WASD or Arrow Keys. Use Pause/Restart to manage rounds quickly.';
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
  return Math.max(0, Math.ceil(state.countdownMs / 1000));
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
  if (!view.mobileWarningEl) {
    return;
  }
  const prefersTouch = window.matchMedia?.('(pointer: coarse)').matches;
  const narrowScreen = window.innerWidth < 760;
  view.mobileWarningEl.hidden = !(prefersTouch || narrowScreen);
}

function renderHUD() {
  const isRoundActive = isRoundInProgress();
  const activeCounts = countActiveByRole(state.entities);
  const isCustomMode = state.mode === MODE.CUSTOM;
  const customValidation = isCustomMode ? getCustomSetupValidation(state.customSetup) : { isValid: true };
  view.roleEl.textContent = getRolesLabel();
  view.modeEl.textContent = getModeLabel();
  view.difficultyEl.textContent = getDifficultyLabel();
  view.timerEl.textContent = getTimerValue();
  view.scoreEl.textContent = `${state.score.runnerWins}-${state.score.chaserWins}`;
  view.activeCountsEl.textContent = `${activeCounts.runners}-${activeCounts.chasers}`;
  view.roleRunnerBtn.disabled = isRoundActive || isCustomMode;
  view.roleChaserBtn.disabled = isRoundActive || isCustomMode;
  view.modeSelect.disabled = isRoundActive;
  view.difficultySelect.disabled = isRoundActive || state.mode !== MODE.SINGLE_PLAYER;
  view.startBtn.disabled = isRoundActive || (isCustomMode && !customValidation.isValid) || state.phase === PHASE.PAUSED;
  view.pauseBtn.disabled = state.phase !== PHASE.PLAYING && state.phase !== PHASE.PAUSED;
  view.pauseBtn.textContent = state.phase === PHASE.PAUSED ? 'Resume' : 'Pause';
  view.restartRoundBtn.disabled = isCustomMode && !customValidation.isValid;
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
    view.countdownEl.classList.add('active');
  } else {
    view.countdownEl.textContent = '-';
    view.countdownEl.classList.remove('active');
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

function togglePause() {
  if (state.phase === PHASE.PLAYING) {
    state.phase = PHASE.PAUSED;
    setRoundResult('Paused');
    renderHUD();
    return;
  }
  if (state.phase === PHASE.PAUSED) {
    state.phase = PHASE.PLAYING;
    setRoundResult('Round in progress');
    renderHUD();
  }
}

function updateCountdown(deltaMs) {
  state.countdownMs = Math.max(0, state.countdownMs - deltaMs);
  const seconds = getCountdownValue();
  if (seconds > 0) {
    setRoundResult(`Starting in ${seconds}`);
  } else {
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
  if (isRoundInProgress()) {
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
  if (isRoundInProgress()) {
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
  if (isRoundInProgress()) {
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
  state.overlayDismissed = true;

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
  if (isRoundInProgress()) {
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

function closeOverlay() {
  state.overlayDismissed = true;
  renderOverlay();
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
  view.pauseBtn.addEventListener('click', togglePause);
  view.restartRoundBtn.addEventListener('click', restartRound);
  view.overlayRestartBtn.addEventListener('click', restartRound);
  view.overlayCloseBtn.addEventListener('click', closeOverlay);
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
  window.addEventListener('resize', renderMobileWarning);

  requestAnimationFrame(gameLoop);
}

init();
