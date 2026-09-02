# AGENTS.md

Guidance for AI coding agents working in this repository.

## Layout

- The app lives in `matrix-escape/`; the repo root holds a short landing
  `README.md`, `LICENSE`, CI (`.github/workflows/ci.yml`), and tool config.
- `matrix-escape/src/` modules:
  - `constants.js` — tuning constants, level-data tables, quote lists
  - `logic.js` — pure helpers (`whichRoom`, `clampJoy`, `hitWall`,
    `approach`, `inMoveZone`, dynamic-resolution state machine)
  - `audio.js` — synthesized WebAudio SFX; every function safely no-ops
    when no AudioContext is available (tests, old browsers)
  - `canvasFx.js` — speech-bubble and matrix-code canvas helpers
  - `MatrixRain.jsx` — code-rain background component
  - `AgentSmith.js` — Agent Smith character model
  - `App.jsx` — the `MatrixGame` component (~4,000 lines): Three.js scene
    setup and the game loop in one large `useEffect`, plus HUD JSX

## Commands

Run all commands from `matrix-escape/`:

- `npm install` — install dependencies
- `npm run dev` — Vite dev server at `http://localhost:5173`
- `npm test` — Vitest unit tests (`src/*.test.js`)
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`)
- `npm run format` / `npm run format:check` — Prettier
- `npm run build` — production build to `dist/`
- `npm run deploy` — publish `dist/` to GitHub Pages (CI also deploys on
  pushes to `main`)

There is no type checker configured. CI runs lint, format check, tests,
and build on every push and pull request.

## Conventions

- Code style is intentionally ES5-flavored inside `App.jsx` (`var`,
  `function` expressions); match it when editing that file.
- Tests are colocated with source (`src/*.test.js`) using Vitest.
- Rule files for various AI tools live under `.claude/rules/`,
  `.cursor/rules/`, etc. The single source of truth is
  `.claude/rules/ai-rules/`; edit rules there and run
  `scripts/sync-ai-rules.sh` to regenerate the other copies
  (CI enforces this with `--check`). Never edit the derived copies
  directly.
- `eslint-plugin-react-hooks` is pinned to v5: the v7 compiler-based
  rules hang (minutes of CPU) on the very large effect in `src/App.jsx`.
  Don't upgrade it without re-checking `npm run lint` completes.
