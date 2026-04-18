# Grid-tag

First playable browser-based grid tag game built with plain HTML, CSS, and JavaScript.

## How to run locally

1. Open the repository folder.
2. Launch `index.html` in any modern browser.
   - Example using Python:
     - `python -m http.server 8080`
     - Open `http://localhost:8080`

## Implemented features (first playable version)

- 30x30 visible square-cell grid.
- Single-player round with one human (blue) and one CPU (red).
- Role selection buttons:
  - Choose Role: Runner
  - Choose Role: Chaser
- Start Game button with visible `3, 2, 1` countdown before movement starts.
- Human movement:
  - Arrow keys + WASD
  - one key press = one tile move
  - movement clamped to grid bounds
- Opposite-corner spawning each round.
- Round timer (60 seconds) and top HUD role display (`RUNNER`/`CHASER`).
- Difficulty selector with four CPU difficulty levels:
  - `Normal`: 70% optimal routing, speed random from 2 to 4 tiles/sec
  - `Hard`: 80% optimal routing, speed random from 4 to 7 tiles/sec
  - `Insane`: 95% optimal routing, speed random from 7 to 10 tiles/sec
  - `Demon`: 100% optimal routing, speed random from 10 to 14 tiles/sec
- Difficulty is shown in HUD and can be changed before round start.
- CPU movement is tile-by-tile, role-aware (chase/evade), and clamped to grid bounds.
- Collision on same tile counts as tag/catch.
- Round result text:
  - `You survived`
  - `You were caught`
  - `You caught the CPU`
  - `Time ran out`
- Simple score display (`wins-losses`).
- Game loop driven by `requestAnimationFrame` with modular state/update/render flow.
