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
- Left joystick — Move
- Drag anywhere — Look around
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

## 🌐 Deploy to GitHub Pages

### Option 1: Automatic (gh-pages package)

1. Create a GitHub repository and push your code
2. Update `vite.config.js` with your repo name:

```js
export default defineConfig({
  plugins: [react()],
  base: '/your-repo-name/',
})
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
- **gh-pages** — Deployment

## 🎯 Features

- 5 rooms with unique themes and furniture
- 7 agents with AI pathfinding around obstacles
- Gun combat with shooting mechanics
- Matrix Time (bullet-time) ability
- Easter eggs: floating spoon, red/blue pills, white rabbit, phone booth, black cats
- Wall art with Matrix humor
- Speech bubbles with funny quotes
- Mobile touch controls with virtual joystick
- Options menu (sensitivity, brightness, enemy speed)
- Matrix code rain on all overlay screens

## 📄 License

MIT
