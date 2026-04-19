/* menu.js – interactions for index.html (main menu page) */

'use strict';

/* ------------------------------------------------------------------
   State passing: write a config object to sessionStorage so game.html
   can read it on load and start the correct mode.
   ------------------------------------------------------------------ */
function launchGame(mode, difficulty) {
  const config = { mode: mode, difficulty: difficulty || 'normal' };
  try {
    sessionStorage.setItem('gridtag-config', JSON.stringify(config));
  } catch (_) {
    /* sessionStorage unavailable – fall back to query string */
    const qs = new URLSearchParams({ mode: mode, difficulty: difficulty || 'normal' }).toString();
    location.href = 'game.html?' + qs;
    return;
  }
  location.href = 'game.html';
}

/* ------------------------------------------------------------------
   Mobile / touch / click-based fallback for the sub-panels.
   Desktop users rely on CSS :hover + :has().  On touch devices hover
   doesn't work the same way, so we expose JS-driven toggle classes.
   ------------------------------------------------------------------ */
(function initMenuInteractions() {
  const modeGroup = document.getElementById('mode-group');
  const optCpu    = document.getElementById('opt-cpu');
  const optMulti  = document.getElementById('opt-multi');
  const optCustom = document.getElementById('opt-custom');

  if (!modeGroup || !optCpu || !optMulti) return;

  /* CSS :has() rules handle desktop hover visuals automatically.
     JS classes (show-cpu / show-multi) provide the click-toggle path
     for keyboard and touch users. */

  function clearSubs() {
    modeGroup.classList.remove('show-cpu', 'show-multi');
  }

  function toggleSub(name) {
    const active = modeGroup.classList.contains(name);
    clearSubs();
    if (!active) modeGroup.classList.add(name);
  }

  /* CPU click handler */
  optCpu.addEventListener('click', function (e) {
    /* On desktop, clicking an option that has a sub-panel should toggle
       the JS class (for keyboards / touch).  Prevent the click from
       immediately closing via the document listener below. */
    e.stopPropagation();
    toggleSub('show-cpu');
  });

  /* Multiplayer click handler */
  optMulti.addEventListener('click', function (e) {
    e.stopPropagation();
    toggleSub('show-multi');
  });

  /* Custom goes straight to the custom page */
  if (optCustom) {
    optCustom.addEventListener('click', function () {
      location.href = 'custom.html';
    });
  }

  /* Sub-panel clicks must not bubble to the document listener */
  document.querySelectorAll('.sub-panel').forEach(function (panel) {
    panel.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  });

  /* Clicking anywhere outside the mode group collapses the JS classes */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#mode-group')) {
      clearSubs();
    }
  });

  /* Keyboard: Escape closes any open sub-panel */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') clearSubs();
  });
}());
