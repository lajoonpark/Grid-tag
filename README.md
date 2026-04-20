# Grid-tag

Browser-based grid tag game built with plain HTML, CSS, and JavaScript (no frameworks).

## How to run

1. Open this repository folder.
2. Start a local server or open `index.html` directly.
   - Example:
     - `python -m http.server 8080`
     - Open `http://localhost:8080`

## Game modes

- **Single Player**
  - Blue side is human-controlled.
  - Red side is CPU-controlled.
  - Choose your role (`Runner` or `Chaser`) and CPU difficulty.
- **Local 1v1**
  - Blue side and Red side are both human-controlled on one keyboard.
- **Local 2v2**
  - Two blue entities vs two red entities.
  - Each human has independent movement controls.
- **Custom**
  - Configure runner/chaser counts.
  - Configure up to 2 human players with independent roles, plus CPU count and CPU difficulty.
  - Validation prevents invalid setups.

## Controls

### Round controls

- **Start Game**: begin a new round with countdown.
- **Pause / Resume**: pause or resume active round.
- **Restart Round**: restart current mode/setup immediately.

### Movement controls

- **Single Player**
  - Human side: `WASD` or `Arrow Keys`
- **Local 1v1**
  - Blue side: `WASD`
  - Red side: `Arrow Keys`
- **Local 2v2**
  - Blue Player 1: `WASD`
  - Blue Player 2: `TFGH`
  - Red Player 1: `Arrow Keys`
  - Red Player 2: `IJKL`
- **Custom**
  - Human 1: `WASD`
  - Human 2: `Arrow Keys`

## Rules

- Grid size is **30x30**.
- Each round has a **3-second countdown** and a **60-second timer**.
- Roles:
  - **Runner**: survive until timer reaches 0.
  - **Chaser**: tag opposing runner(s) before timer ends.
- A tag happens when runner and chaser occupy the same tile.
- Team outcomes:
  - **Runners win** if at least one runner survives to timeout.
  - **Chasers win** if all opposing runners are tagged.
- Score tracks total round wins by role:
  - `Runner wins - Chaser wins`

## UX and HUD highlights

- Clear HUD labels for **Mode**, **Role**, **Difficulty**, **Timer**, **Score**, **Active counts**, and **Countdown**.
- Countdown is visually emphasized.
- End-of-round overlay provides clear result feedback and quick replay action.
- Visual feedback flashes on tag / win / loss.
- Mobile warning appears on touch/narrow devices because keyboard play is preferred.

## Known limitations

- No online multiplayer.
- Single keyboard local play means key rollover/ghosting can vary by hardware.
- No sound effects yet.
- No obstacle tiles or map variations yet.

## Future improvement ideas

- Optional per-entity controls in team/custom modes.
- Online multiplayer or LAN play.
- Additional map types (obstacles, zones, power-ups).
- Accessibility options (high contrast presets, remappable keys).
- Audio cues and richer round-end animations.
