# New Website — Landing Page

Full-screen 3D geospatial landing page with 320 extruded Dutch building footprints rendered in Three.js on a black background, with an animated intro sequence and typewriter title overlay.

**Status**: live on GitHub Pages at `https://milojevicdupontnikola.github.io/`, served from the `new-website` branch.

## File Structure

```
milojevicdupontnikola.github.io/
├── index.html                      # Entry point, loads assets/index.js
├── assets/index.js                 # Built Three.js bundle (~505KB)
├── footprints_centered.geojson     # 320 building footprints (EPSG:3035, centered)
├── .nojekyll                       # Disables Jekyll on GitHub Pages
├── AGENTS.md                       # This file — project context
├── source/                         # Vite dev project (all source files)
│   ├── src/main.js                 # Scene, camera, animation, labels, hover/click
│   ├── src/loadBuildings.js        # GeoJSON fetch, extrusion, glow, colors
│   ├── index.html                  # Dev entry point (loads /src/main.js)
│   ├── vite.config.js              # Vite config (esnext target, stable filename)
│   ├── package.json                # prebuild copies geojson to public/ first
│   ├── public/.gitkeep             # geojson copied here by prebuild during dev
│   ├── prepare_data.py             # Python script to center GeoJSON coords
│   └── footprints.geojson          # Raw source data (EPSG:3035, uncentered)
```

## Branch Management

The website runs on the **`new-website`** branch. The `master` branch contains the old Jekyll site and is unused.

```sh
git checkout new-website   # switch to the active branch
```

## Build & Deploy (Full Rebuild)

Run these steps whenever you make changes to source files:

```sh
# 1. Go to source directory
cd source

# 2. Install dependencies (only needed first time or after dep changes)
npm install

# 3. Build the production bundle
npm run build

# 4. Copy build outputs to repo root (for GitHub Pages serving)
cd ..
cp source/dist/index.html .
cp source/dist/assets/* assets/

# 5. Clean up temp files (prebuild copies geojson to public/)
rm -f source/public/footprints_centered.geojson
rm -rf source/node_modules source/dist

# 6. Verify what changed
git diff --stat

# 7. Stage, commit, and push
git add -A
git commit -m "description of changes"
git push origin new-website
```

The site updates automatically on GitHub Pages after the push.

## Quick Dev Workflow (no deploy)

```sh
cd source
npm install      # if not already installed
npm run dev      # starts Vite dev server at localhost:5173
```

The dev server auto-reloads on file changes. The geojson file is automatically copied to `public/` via the `predev` script.

## Intro Animation (6 Phases)

Total duration ~12s. Phases auto-advance based on clock.

| # | Name | Start | Duration | What happens |
|---|------|-------|----------|-------------|
| 0 | PITCH_BLACK | 0.0s | - | Black screen, nothing visible |
| 1 | EDGES | 0.8s | 1.5s | White building edges fade in, fill stays black |
| 2 | SAMPLE_20 | 2.5s | instant | Random 20% of buildings snap to their year color instantly |
| - | (pause) | 2.5–5.0s | 2.5s | Only 20% colored — dramatic pause |
| 3 | ALL_COLOR | 5.0s | 1.8s | Remaining 80% transition from black to year color |
| 4 | EXTRUDE | 7.5s | 1.5s | Buildings grow from flat to full height (staggered random delay per building, 0–0.8s) |
| 5 | TITLE | 10.0s | - | Title typewriter starts (line 1 at 35ms/char, then line 2 at 30ms/char) |
| - | REVEAL | after title | 1.5s | Target buildings fade in with glow + labels after typewriter finishes (both lines complete) |
| DONE | - | after reveal | - | Hover/click/bounce activated |

**During animation**: target buildings are completely hidden (`visible = false`) until phase 5.

## Title Overlay

Appears during phase 5 via typewriter effect (left-to-right character reveal):

- **Top 3%**: `Nikola Milojevic-Dupont – Scientific Consulting` (20px bold, white monospace)
- **Bottom 3%**: `Geospatial Data + AI -> Climate + Cities` (20px bold, white monospace)
- Line 1 types at 35ms/char (~1.6s), then line 2 types at 30ms/char (~1.3s) after line 1 finishes
- **Target buildings only appear after the typewriter fully completes** — they fade in over 1.5s after both lines are done
- Fixed position, centered, z-index 20 (above 3D canvas)

## Key Technical Details

- **Node 20**, **Three.js 0.170.0**, **Vite 5.4.21**
- **Camera**: Perspective 45°, at (0, 280, 540), looking at origin
- **Buildings**: ExtrudeGeometry with `rotation.x = -PI/2` (maps northing → -Z)
- **Heights**: top 15% by area get 20–25m, rest get 10–15m (randomized)
- **Colors**: mapped from year range 1630–2009 via earth-tone ramp (navy → teal → amber)
- **Saturation**: target buildings 1.8×, others 0.75× (via HSL)
- **White edges**: shared `LineBasicMaterial` on `EdgesGeometry`, starts at opacity 0, fades in phase 1
- **Neon glow**: 3 layers per target building, `AdditiveBlending`, scales 1.008/1.02/1.04, pulsing via sine wave
- **Extrusion animation**: `mesh.scale.z` and `line.scale.z` animate 0→1 (local Z is extrusion axis, maps to world Y after rotation)
- **ABOUT label**: CSS2DRenderer, 14px uppercase monospace, white fill + 2.5px black stroke, bold 900, letter-spacing 3px
- **PROJECTS label**: same style, positioned at different 3D centroid
- **Label bounce**: `sin(elapsed * 1.5 + centroid.x) * 4`
- **Hover**: raycaster on pointermove, glow intensity ×1.8, fill color lerps 40% toward white
- **Click**: logs to console (placeholder for future navigation)

## Target Buildings

| Label | Building ID | Glow Color | Phase |
|-------|-------------|------------|-------|
| ABOUT | `NL32B_N326E397_Y2596.6553_X3343.2809` | `#ff8800` (warm orange) | hidden until typewriter finishes, then fade in over 1.5s |
| PROJECTS | `NL32B_N326E397_Y2400.9044_X3394.3630` | `#6688ff` (blue) | hidden until typewriter finishes, then fade in over 1.5s |

Both are rendered with normal fill + edges like all buildings, but their mesh/line/glow have `visible = false` until the title typewriter completes both lines. Not included in `allBuildings[]` so phases 1–4 don't touch them.

## GeoJSON Data

- Source: 320 Dutch building footprints from EUBUCCO
- Original CRS: EPSG:3035
- Coordinates centered at origin via `prepare_data.py` (subtracts min x/min y from all coords)
- Each feature has `id` (string) and `year` (integer 1630–2009) properties
- Single canonical file at repo root; copied into `source/public/` by `prebuild` script before Vite bundling
- Also at root for production serving (`/footprints_centered.geojson`)

## Build Config

- `vite.config.js`: `build.target: 'esnext'` (supports top-level await), stable output filename via `rollupOptions.output.entryFileNames: 'assets/index.js'`
- `package.json`: `predev` and `prebuild` scripts copy `../footprints_centered.geojson` to `public/` so Vite serves/bundles it

## Animations & CSS2DRenderer Layering

- Labels use `CSS2DRenderer` with `zIndex: 10` (on top of WebGL canvas)
- Title overlay uses fixed-position divs with `z-index: 20`
- Both are added to `document.body` after the WebGL renderer's canvas
