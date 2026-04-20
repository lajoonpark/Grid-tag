/* custom.js – logic for the Custom Game setup page (custom.html) */

'use strict';

/* ------------------------------------------------------------------
   Minimal constants mirrored from main.js (kept in sync by value).
   ------------------------------------------------------------------ */
const DIFFICULTY_LABELS = {
  normal: 'NORMAL',
  hard:   'HARD',
  insane: 'INSANE',
  demon:  'DEMON'
};
const VALID_DIFFICULTIES = Object.keys(DIFFICULTY_LABELS);
const GRID_TOTAL_CELLS   = 30 * 30; /* 900 */

/* ------------------------------------------------------------------
   Read current form values into a plain object.
   ------------------------------------------------------------------ */
function readForm() {
  return {
    runners: parseInt(document.getElementById('c-runners').value, 10),
    chasers: parseInt(document.getElementById('c-chasers').value, 10),
    humanOneRole: document.getElementById('c-human-one-role').value,
    humanTwoRole: document.getElementById('c-human-two-role').value,
    humanCount: parseInt(document.getElementById('c-human-count').value, 10),
    cpuCount: parseInt(document.getElementById('c-cpu-count').value, 10),
    cpuDifficulty: document.getElementById('c-difficulty').value
  };
}

function isValidRole(role) {
  return role === 'runner' || role === 'chaser';
}

function getActiveHumanRoles(s) {
  const roles = [s.humanOneRole];
  if (s.humanCount >= 2) {
    roles.push(s.humanTwoRole);
  }
  return roles;
}

/* ------------------------------------------------------------------
   Validate (mirrors getCustomSetupValidation in main.js).
   ------------------------------------------------------------------ */
function validate(s) {
  if (!Number.isFinite(s.runners)  || s.runners  < 1)
    return { isValid: false, message: 'Runners must be at least 1.' };
  if (!Number.isFinite(s.chasers)  || s.chasers  < 1)
    return { isValid: false, message: 'Chasers must be at least 1.' };
  if (!Number.isFinite(s.humanCount) || s.humanCount < 1 || s.humanCount > 2)
    return { isValid: false, message: 'Human Players must be 1 or 2.' };
  if (!Number.isFinite(s.cpuCount)   || s.cpuCount   < 0)
    return { isValid: false, message: 'CPU Players cannot be negative.' };
  if (!isValidRole(s.humanOneRole) || (s.humanCount >= 2 && !isValidRole(s.humanTwoRole)))
    return { isValid: false, message: 'Select valid role(s) for all human players.' };
  if (!VALID_DIFFICULTIES.includes(s.cpuDifficulty))
    return { isValid: false, message: 'Select a valid CPU difficulty.' };

  const total = s.runners + s.chasers;
  if (total > GRID_TOTAL_CELLS)
    return { isValid: false, message: 'Total entities exceed available grid cells (900).' };

  const humanRoles = getActiveHumanRoles(s);
  const humanRunnerCount = humanRoles.filter(function (role) { return role === 'runner'; }).length;
  const humanChaserCount = humanRoles.filter(function (role) { return role === 'chaser'; }).length;

  if (humanRunnerCount > s.runners) {
    return {
      isValid: false,
      message: 'Human runner selections cannot exceed total runners (' + s.runners + ').'
    };
  }
  if (humanChaserCount > s.chasers) {
    return {
      isValid: false,
      message: 'Human chaser selections cannot exceed total chasers (' + s.chasers + ').'
    };
  }
  if (s.humanCount + s.cpuCount !== total) {
    return {
      isValid: false,
      message: 'Human + CPU Players must equal Runners + Chasers (' + total + ').'
    };
  }
  return { isValid: true, message: '' };
}

/* ------------------------------------------------------------------
   Build a human-readable summary (mirrors getCustomSetupSummary).
   ------------------------------------------------------------------ */
function buildSummary(s) {
  const humanRoles = getActiveHumanRoles(s);
  const humanRunnerCount = humanRoles.filter(function (role) { return role === 'runner'; }).length;
  const humanChaserCount = humanRoles.filter(function (role) { return role === 'chaser'; }).length;
  const humanRolesLabel = humanRoles.map(function (role, index) {
    return 'H' + (index + 1) + ':' + role.toUpperCase();
  }).join(', ');
  const diffLabel = DIFFICULTY_LABELS[s.cpuDifficulty] || 'NORMAL';
  return (
    s.runners + 'R vs ' + s.chasers + 'C' +
    ' \u2022 Humans: ' + s.humanCount + ' (' + humanRolesLabel + ')' +
    ' \u2022 CPU: ' + s.cpuCount + ' (' + (s.runners - humanRunnerCount) + 'R/' + (s.chasers - humanChaserCount) + 'C, ' + diffLabel + ')'
  );
}

/* ------------------------------------------------------------------
   Update UI (validation message, summary, Play button state).
   ------------------------------------------------------------------ */
function updateUI() {
  const setup      = readForm();
  const result     = validate(setup);
  const valEl      = document.getElementById('c-validation');
  const sumEl      = document.getElementById('c-summary');
  const playBtn    = document.getElementById('c-play-btn');
  const humanTwoEl = document.getElementById('c-human-two-role');

  valEl.textContent  = result.isValid ? '' : result.message;
  sumEl.textContent  = result.isValid ? buildSummary(setup) : '';
  playBtn.disabled   = !result.isValid;
  humanTwoEl.disabled = setup.humanCount < 2;
}

/* ------------------------------------------------------------------
   Launch the game with the custom setup.
   ------------------------------------------------------------------ */
function launchCustomGame() {
  const setup  = readForm();
  const result = validate(setup);
  if (!result.isValid) return;

  const config = { mode: 'custom', customSetup: setup };
  try {
    sessionStorage.setItem('gridtag-config', JSON.stringify(config));
  } catch (_) { /* ignore */ }
  location.href = 'game.html';
}

/* ------------------------------------------------------------------
   Wire up events.
   ------------------------------------------------------------------ */
(function init() {
  ['c-runners', 'c-chasers', 'c-human-count', 'c-cpu-count'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', updateUI);
  });
  ['c-human-one-role', 'c-human-two-role', 'c-difficulty'].forEach(function (id) {
    document.getElementById(id).addEventListener('change', updateUI);
  });
  document.getElementById('c-play-btn').addEventListener('click', launchCustomGame);

  /* Initial render */
  updateUI();
}());
