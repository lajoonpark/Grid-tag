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
    runners:       parseInt(document.getElementById('c-runners').value,      10),
    chasers:       parseInt(document.getElementById('c-chasers').value,      10),
    humanRole:     document.getElementById('c-human-role').value,
    humanCount:    parseInt(document.getElementById('c-human-count').value,  10),
    cpuCount:      parseInt(document.getElementById('c-cpu-count').value,    10),
    cpuDifficulty: document.getElementById('c-difficulty').value
  };
}

/* ------------------------------------------------------------------
   Validate (mirrors getCustomSetupValidation in main.js).
   ------------------------------------------------------------------ */
function validate(s) {
  if (!Number.isFinite(s.runners)  || s.runners  < 1)
    return { isValid: false, message: 'Runners must be at least 1.' };
  if (!Number.isFinite(s.chasers)  || s.chasers  < 1)
    return { isValid: false, message: 'Chasers must be at least 1.' };
  if (!Number.isFinite(s.humanCount) || s.humanCount < 1)
    return { isValid: false, message: 'Human Players must be at least 1.' };
  if (!Number.isFinite(s.cpuCount)   || s.cpuCount   < 0)
    return { isValid: false, message: 'CPU Players cannot be negative.' };
  if (!VALID_DIFFICULTIES.includes(s.cpuDifficulty))
    return { isValid: false, message: 'Select a valid CPU difficulty.' };

  const total = s.runners + s.chasers;
  if (total > GRID_TOTAL_CELLS)
    return { isValid: false, message: 'Total entities exceed available grid cells (900).' };

  const roleTotal = s.humanRole === 'runner' ? s.runners : s.chasers;
  if (s.humanCount > roleTotal) {
    const label = s.humanRole === 'runner' ? 'runners' : 'chasers';
    return {
      isValid: false,
      message: 'Human Players cannot exceed total ' + label + ' (' + roleTotal + ').'
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
  const roleLabel = s.humanRole === 'runner' ? 'Runner' : 'Chaser';
  const diffLabel = DIFFICULTY_LABELS[s.cpuDifficulty] || 'NORMAL';
  return (
    s.runners + 'R vs ' + s.chasers + 'C' +
    ' \u2022 You: ' + s.humanCount + '\u00d7' + roleLabel +
    ' \u2022 CPU: ' + s.cpuCount + ' (' + diffLabel + ')'
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

  valEl.textContent  = result.isValid ? '' : result.message;
  sumEl.textContent  = result.isValid ? buildSummary(setup) : '';
  playBtn.disabled   = !result.isValid;
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
  ['c-human-role', 'c-difficulty'].forEach(function (id) {
    document.getElementById(id).addEventListener('change', updateUI);
  });
  document.getElementById('c-play-btn').addEventListener('click', launchCustomGame);

  /* Initial render */
  updateUI();
}());
