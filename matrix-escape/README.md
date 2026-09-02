# 🟢 Escape The Matrix

A 3D first-person Matrix-themed escape room game built with React and Three.js.

## 🎮 Gameplay

- Explore 5 interconnected rooms in a Matrix-coded environment
- Find 3 colored keys to unlock doors
- Grab a gun from the glass case in the Hub
- Defeat agents in the Exit Hall with your weapon
- Use Matrix Time (bullet-time slow motion) to dodge bullets
- Escape through the hallway to win!

## 🕹️ Controls

**Desktop:**

- WASD / Arrow Keys — Move
- Mouse — Look around
- Click — Shoot (when gun equipped)
- Shift — Sprint
- Space — Matrix Time
- Escape — Pause

**Mobile:**

- Touch the left side of the screen — a floating joystick appears under your finger (Move)
- Drag anywhere else — Look around
- FIRE button — Shoot
- SPRINT button — Toggle sprint
- MATRIX TIME button — Slow motion

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:5173
```

## 📦 Build for Production

```bash
npm run build
```

The built files will be in the `dist/` folder.

## 🧪 Run Tests

```bash
npm test
```

Unit tests are written with [Vitest](https://vitest.dev/) and live next to the source (`src/logic.test.js`, `src/constants.test.js`). They cover the room-lookup and joystick-clamping helpers plus consistency checks on the level data (keys, doors, walls, and agent spawns).

## 🧹 Lint & Format

```bash
npm run lint
```

```bash
npm run format
```

ESLint (with the React and react-hooks plugins) and Prettier are configured in `eslint.config.mjs` and `.prettierrc.json`. CI runs `lint`, `format:check`, `test`, and `build` on every push and pull request (see `.github/workflows/ci.yml` at the repo root), and deploys `dist/` to GitHub Pages on pushes to `main`.

## 📁 Source Layout

- `src/constants.js` — tuning constants, level-data tables, and quote lists
- `src/logic.js` — pure helpers (`whichRoom`, `clampJoy`, `hitWall`, `approach`, dynamic-resolution state)
- `src/audio.js` — WebAudio sound effects (synthesized, no assets; no-ops when audio is unavailable)
- `src/canvasFx.js` — speech-bubble and matrix-code canvas texture helpers
- `src/MatrixRain.jsx` — code-rain background component for overlay screens
- `src/AgentSmith.js` — the Agent Smith character model and fade rig
- `src/App.jsx` — the `MatrixGame` component: scene setup, game loop, HUD

## 🌐 Deploy to GitHub Pages

### Option 1: Automatic (gh-pages package)

1. Create a GitHub repository and push your code
2. Update `vite.config.js` with your repo name:

```js
export default defineConfig({
  plugins: [react()],
  base: "/your-repo-name/"
});
```

3. Deploy:

```bash
npm run deploy
```

4. Go to your repo Settings → Pages → Source: "Deploy from a branch" → Branch: `gh-pages`

5. Your game will be live at `https://yourusername.github.io/your-repo-name/`

### Option 2: Manual

1. Run `npm run build`
2. Push the `dist/` folder contents to a `gh-pages` branch
3. Enable GitHub Pages in repo settings

## 🏗️ Tech Stack

- **React 18** — UI framework
- **Three.js** — 3D rendering
- **Vite** — Build tool
- **Vitest** — Unit testing
- **gh-pages** — Deployment

## 🎯 Features

- 5 rooms with unique themes and furniture
- 7 agents with AI pathfinding around obstacles
- Gun combat with shooting mechanics
- Matrix Time (bullet-time) ability
- Easter eggs: floating spoon, red/blue pills, white rabbit, phone booth, black cats
- Wall art with Matrix humor
- Speech bubbles with funny quotes
- Mobile touch controls with a floating virtual joystick and haptic feedback
- Synthesized sound effects (shots, pickups, doors, hits) and Matrix Time music (minor pad + arpeggio)
- Real pause on desktop: losing pointer lock freezes the simulation and silences audio
- Hit feedback: damage vignette and crosshair hit-marker pulse
- Sprint FOV kick and eased Matrix Time slow-motion ramp
- Dynamic resolution scaling that steps down under sustained load
- Options menu (sensitivity, brightness, enemy speed, field of view, invert-Y, sound)
- Matrix code rain on all overlay screens

## 📄 License

MIT
