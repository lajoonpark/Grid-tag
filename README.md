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
- Difficulty selector with four CPU difficulty levels (single-player):
  - `Normal`: 70% optimal routing, speed random from 1 to 2 tiles/sec
  - `Hard`: 80% optimal routing, speed random from 3 to 5 tiles/sec
  - `Insane`: 95% optimal routing, speed random from 5 to 7 tiles/sec
  - `Demon`: 100% optimal routing, speed random from 7 to 10 tiles/sec
- Difficulty is shown in HUD and can be changed before round start.
- CPU movement is tile-by-tile, role-aware (chase/evade), and clamped to grid bounds.
- Collision on same tile counts as tag/catch.
- Game mode selector:
  - `Single Player`: blue human vs red CPU
  - `Local 1v1`: blue human vs red human on one keyboard
  - `Local 2v2`: two blue humans vs two red humans on one keyboard
  - `Local 3v3`: three blue humans vs three red humans on one keyboard
  - `Custom`: configurable runners/chasers with mixed human/CPU counts
- Local 1v1 controls:
  - Blue player: `WASD`
  - Red player: `Arrow Keys`
- Local 2v2 and 3v3 controls (shared-team local controls):
  - Blue team: `WASD` (all blue teammates move together)
  - Red team: `Arrow Keys` (all red teammates move together)
- Both modes use the same 3-2-1 countdown and 60-second round timer.
- Round outcomes are role-based:
  - runner survives 60 seconds -> runner side wins
  - chaser tags runner -> chaser side wins
- Team round outcomes (1v1/2v2/3v3):
  - runner team wins if at least one runner survives until timer ends
  - chaser team wins if all runners are tagged before timer ends
- Custom mode setup supports:
  - number of runners
  - number of chasers
  - human role (`runner` or `chaser`)
  - number of human-controlled entities
  - number of CPU-controlled entities
  - CPU difficulty (`Normal`, `Hard`, `Insane`, `Demon`)
- Custom mode validation prevents invalid setups (for example mismatched totals or too many humans for the selected human role).
- Custom mode summary is shown before round start.
- Round result text:
  - `You survived`
  - `You were caught`
  - `You caught the CPU`
  - `Runner side wins: survived 60 seconds`
  - `Chaser side wins: all runners were tagged`
  - `Time ran out`
- Simple score display (`runner wins - chaser wins`).
- Active entity display (`active runners - active chasers`).
- Game loop driven by `requestAnimationFrame` with modular state/update/render flow.

## Entity architecture (refactor for multi-unit modes)

The game now uses an entity-based model instead of fixed `human`/`cpu` position variables.

Each entity stores:

- `id`
- `side` (team/side)
- `role` (`runner` or `chaser`)
- `color`
- `x`, `y` position
- `isHuman` / `isCPU`
- `controlMapping` (when human-controlled)
- `cpuSettings` (when CPU-controlled)

Core systems in `main.js` are organized around that entity shape:

- **Entity creation**: `createEntity`, `createHumanEntity`, `createCpuEntity`
- **Spawning**: `spawnEntities`, `getSpawnQueueForSide`
- **Movement**: `moveEntity`, `moveHumanByKey`, `updateCpuMovement`, `moveCpuEntity`
- **Collision / tag resolution**: `findTagEvents`, `resolveCollision`
- **Rendering**: `renderEntities`

`state.entities` is now the single source of truth for all player/CPU units.

## Future mode readiness

The architecture is prepared for future modes by keeping mode definitions and entity systems mode-agnostic:

- split-screen multiplayer
- 1v1
- 2v2
- 3v3
- custom mode with arbitrary counts

Gameplay now includes single-player and local team modes while keeping the entity systems ready for custom scaling of runner/chaser counts.
