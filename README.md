# Priority Seven

A browser board game about Deep Space Network antenna time. NASA Space Apps Challenge 2026.

## Play

Open `index.html`. It needs no build step, server, framework or account. It runs from `file://`, from GitHub Pages and inside a sandboxed preview frame. The fonts load from Google Fonts and fall back to system faces offline.

For GitHub Pages, push this folder and enable Pages on the branch root.

## Files

| Path | What it is |
|---|---|
| `index.html` | The whole game: the engine (between `/*ENGINE-BEGIN*/` and `/*ENGINE-END*/`), the UI and an inline copy of the fallback data |
| `assets/cards/` | Line-art panels cropped from the printed card set (29 small PNGs). Card text and numbers are generated from the game data in `index.html` |
| `assets/fallback.json` | Cached responses from NASA Images, JPL Horizons, JPL SBDB, NTRS and the DONKI flare seed. The page reads this file first and falls back to its inline copy when `file://` blocks the fetch |
| `SUBMISSION.md` | Project-page copy |
| `design/original-cards/` | The full-size printed cards as supplied. Not used by the game; kept for printing |
| `tools/crop-card-art.js` | Crops the art panel out of each card PNG: `node tools/crop-card-art.js design/original-cards assets/cards` |
| `tools/balance-sim.js` | 1,200-game balance simulation run against `index.html`: `node tools/balance-sim.js index.html 150` |
| `tools/build-fallback.js` | Rebuilds `assets/fallback.json` from `tools/api-snapshots/` |
| `tools/serve.js` | Dev-only static server on port 8077 |

After rebuilding `assets/fallback.json`, also paste it into the `<script id="fallback-data">` block in `index.html` so `file://` play uses the new data.

## Architecture

`index.html` keeps one state object (`APP`, which holds the game state). Every game action is a pure function `(state, args) → new state` in the `P7` engine, followed by a single `render()`. Animations are triggered by effect records (`state.fx`) that the engine emits and the renderer consumes. `localStorage` is used only for the sound toggle and resuming a game, and every access is wrapped in `try/catch`.

Each week starts face down: the event deck must be drawn (button, or the D key) before any seat can act. The draw is a pure engine function, `P7.draw(state)`. Simulations and tests create games with `autoDraw` on (the default), and the page creates them with it off.

Keyboard: Tab through everything, use the arrow keys between wells, and press D (draw the event card), R (request), U (upload), K (calibrate), W (end week) or S (spoken status in audio-only mode).
