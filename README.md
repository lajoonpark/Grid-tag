# Grid-tag

A simple browser-based 2D grid chase game scaffold built with plain HTML, CSS, and JavaScript.

## How to run locally

1. Open the repository folder.
2. Launch `index.html` in any modern browser.
   - Example using Python:
     - `python -m http.server 8080`
     - Open `http://localhost:8080`

## Implemented features

- 30x30 visible square-cell game grid.
- Top HUD with:
  - current role
  - countdown timer
  - score
  - game control buttons (start, pause/resume, reset)
- Placeholder mode selection section wired for future expansion.
- Keyboard movement for the runner (Arrow keys + WASD).
- Basic CPU chaser movement and tag detection.
- Timer-based round and score accumulation.
- Code in `main.js` organized by:
  - constants/config
  - game state
  - rendering
  - input
  - CPU logic
  - game flow

## Expansion-ready structure

The code is prepared for future support of:

- single player improvements
- split-screen multiplayer
- 1v1, 2v2, 3v3 modes
- custom runner/chaser counts

Core values like grid size, timing, modes, and defaults are centralized in constants to make future scaling easier.
