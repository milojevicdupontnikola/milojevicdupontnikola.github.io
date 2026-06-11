# New Website — Landing Page

Full-screen 3D geospatial landing page with 320 extruded Dutch building footprints rendered in Three.js on a black background, with an animated intro sequence, typewriter subtitle/title overlays, and interactive About/Projects/Info panels.

**Status**: live on GitHub Pages at `https://milojevicdupontnikola.github.io/`, served from the `new-website` branch.

## File Structure

```
milojevicdupontnikola.github.io/
├── index.html                      # Entry point, loads assets/index.js
├── assets/index.js                 # Built Three.js bundle (~603KB)
├── footprints_centered.geojson     # 320 building footprints (EPSG:3035, centered)
├── .nojekyll                       # Disables Jekyll on GitHub Pages
├── AGENTS.md                       # This file — project context
├── google22f79760268f6855.html     # Google Search Console verification (master)
├── source/                         # Vite dev project (all source files)
│   ├── src/main.js                 # Scene, camera, animation, labels, hover/click, panels, wave overlay
│   ├── src/loadBuildings.js        # GeoJSON fetch, extrusion, glow, colors
│   ├── src/waveShader.js           # Vertex + fragment shader for wave overlay (lens distortion bubble)
│   ├── index.html                  # Dev entry point (loads /src/main.js)
│   ├── vite.config.js              # Vite config (esnext target, stable filename)
│   ├── package.json                # prebuild copies geojson to public/ first, GSAP dep
│   ├── public/.gitkeep             # geojson copied here by prebuild during dev
│   ├── prepare_data.py             # Python script to center GeoJSON coords
│   └── footprints.geojson          # Raw source data (EPSG:3035, uncentered)
```

## Branch Management

The website runs on the **`new-website`** branch. The `master` branch contains the old Jekyll site and is unused.

```sh
git checkout new-website
```

## Build & Deploy

```sh
cd source
npm run build
cp dist/assets/index.js ../assets/index.js
cp dist/index.html ../index.html
```

The site updates automatically on GitHub Pages after pushing `new-website`.

## Quick Dev

```sh
cd source
npm install
npm run dev      # Vite dev server at localhost:5173, auto-reloads on changes
```

## Intro Animation (Event-Driven State Machine)

After 2.5s, the animation switches to an event-driven state machine (states 0–9) replacing rigid phase timing for all subsequent transitions.

| # | Phase | Trigger | What happens |
|---|-------|---------|-------------|
| 0 | SUB1_TYPING | 2.5s elapsed | First subtitle types at 60ms/char with terminal cursor |
| 1 | SUB1_HOLD | typing done | 2s hold |
| 2 | SUB2_TYPING | hold done | Second subtitle types (before wave, not during extrusion). |
| 3 | SUB2_HOLD | typing done | 2s hold |
| 4 | WAVE | hold done | GSAP-driven wave overlay: buildings start dark, wave bubble expands (1.8s, power4.in ease), revealing colored buildings behind. ShaderMaterial with lens distortion + linearToSRGB(). |
| 5 | EXTRUDE | wave done | Buildings extrude 0→1 over 1.5s (staggered 0–0.8s). No subtitle. |
| 6 | GLOW+SUB3 | 2s after extrude starts | Target buildings: instant highlight color + sine-wave pulsing. Third subtitle types. |
| 7 | SUB3_HOLD | typing done | 2s hold |
| 8 | TITLE | hold done | Title typewriter: line 1 at 60ms/char, line 2 at 50ms/char |
| 9 | DONE | 1s after title done | Labels visible (opacity 0.95), hover/click/bounce enabled |

Extrusion runs only during state 5, never repeats. Glow activation is instant (no 1s lerp) with immediate sine-wave pulsing.

### Wave Overlay

- Renders buildings in dark state on overlay render target, then reveals via GSAP-animated bubble (round lens distortion, `radius` 0→1.6, `origin` at screen center)
- Custom `ShaderMaterial` with `getCoverUV` (fill-screen texture mapping), `getLensDistortion` (UV displacement around origin), and `linearToSRGB()` for correct sRGB output (Three.js r170 doesn't auto-encode custom ShaderMaterial)
- Render targets sized with `renderer.getDrawingBufferSize()` (physical pixels, not CSS px) to avoid Retina color shift
- When `overlayActive` is true, only the overlay renders (skips main scene) — avoids blending artifacts
- Subtitle 2 types and holds (states 2–3) before the wave, so the wave plays during a moment with typewriter on screen

## Subtitles

Three-line subtitle sequence types at the top-right (right-aligned, 16px, 60ms/char):
1. `Where sensing our environment produced digital representations...`
2. `...using AI critically to enhance sense-making capabilities...`
3. `...to target action on socio-environmental challenges.`

Each holds for 2s after completing before the next phase.

## Title Overlay

Fixed, centered monospace (24px, bold 700, letter-spacing 2px). Types at 60ms/char (line 1) then 50ms/char (line 2):

- **Top 3%**: `Nikola Milojevic-Dupont – Scientific Consulting`
- **Bottom 3%**: `Geospatial Data + AI  →  Climate + Cities` (→ renders in Noto Sans Math)

Terminal cursor (blinking █) on all typewriter animations. 1s pause after title complete before enabling labels/bounce/hover/click.

## Target Buildings

| Label | Building ID | Glow Color | Extras |
|-------|-------------|------------|--------|
| ABOUT | `NL32B_N326E397_Y2596.6553_X3343.2809` | warm orange `#ff8800` | — |
| PROJECTS | `NL32B_N326E397_Y2400.9044_X3394.3630` | blue `#6688ff` | — |
| EUBUCCO | `NL32B_N326E397_Y2442.3019_X3430.7208` | green `#44dd88` | Detected by ID, extra building in project mode |
| DBSM | `NL32B_N326E397_Y2450.6257_X3407.2096` | purple `#8844dd` | Detected by ID, extra building in project mode |

Target buildings (About + Projects) are hidden until the title typewriter completes + 1s pause. EUBUCCO/DBSM are labelled at 16px (vs 14px for About/Projects), synced lower bounce (`sin(elapsed * 1.5) * 2`).

## Key Technical Details

- **Node 20**, **Three.js 0.170.0**, **Vite 5.4.21**
- **Camera**: Perspective 45°, default at (0, 280, 540), looking at origin
- **Buildings**: ExtrudeGeometry with `rotation.x = -PI/2` (maps northing → -Z)
- **Heights**: top 15% by area get 20–25m, rest get 10–15m (randomized)
- **Colors**: mapped from year range 1630–2009 via earth-tone ramp (navy → teal → amber)
- **Saturation**: targets/extras 1.8× (highlight), others 0.75× (normal), via HSL
- **White edges**: shared `LineBasicMaterial` on `EdgesGeometry`, fades in at phase 1 (0.8–2.3s)
- **Neon glow**: 3 layers per glowing building, `AdditiveBlending`, scales 1.008/1.02/1.04, sine-wave pulsing
- **Extrusion**: `mesh.scale.z` and `line.scale.z` animate 0→1
- **Container group**: scene slides via `container.position.x` for About mode (not camera position)
- **Raycaster**: on pointermove after animDone, checks both main targets + project extras
- **Hover**: glow intensity ×1.8, fill lerps 40% toward white. Canvas cursor set to `pointer`.
- **About/Projects mode**: mutually exclusive via guards, blocked during transitions

## About Section

**Trigger**: Click the ABOUT building after intro completes.

**Behavior**:
- Container slides left (x: 0 → -200) over 1.2s easeInOutQuad. Title/labels fade out.
- About panel (fixed, right 44%, full height, z-index 25) slides in from right
- 900ms delay, then "About" heading typewrites at 60ms/char with terminal cursor
- Body text fades in 0.6s after heading finishes. `[ close ]` reverses everything.

**Body content**: 9 paragraphs (14px monospace, line-height 1.7, letter-spacing 0.5px). Bullet points (indices 3–5) bold.

**Styling**: `padding: 4% 8%`, `overflow-y: auto`, close button `margin-top: 6px`.

## Project Mode

**Trigger**: Click the PROJECTS building after intro completes.

**Behavior**:
- Camera zooms to frame the combined bounding box of Projects + EUBUCCO + DBSM buildings
- Camera moves to anticlockwise offset `(-200, 320, 450)` normalized, distance = `boxWidth × 1.4 / 2tan(hFov/2)`
- Elevation ~35°, camera animation over 1s easeInOutQuad
- "Projects" heading typewrites at 60ms/char with terminal cursor (centered, `bottom: 18%`)
- `[ close ]` at `bottom: 10%` — reverses camera, resets labels

**EUBUCCO/DBSM panels**: clicking either opens a black info panel (43% × 66%, z-index 30, feather-edged mask). Screen-space position: adjacent to building, flips to left if near right edge, vertically screen-centered. Typewriter heading + fade-in body + `[ close ]`. No overlap with PROJECTS title (clamped to `74vh`). Extra labels hidden outside project mode, shown at `opacity: 1` during.

**Hover/click**: `closestExtra` tracked by raycaster distance. Both extras clickable — cycling supported when both hovered. `openInfoPanel` supports switching (closes current, opens new). Canvas cursor shows pointer on hover.

## GeoJSON Data

- Source: 320 Dutch building footprints from EUBUCCO (EPSG:3035)
- Coordinates centered at origin via `prepare_data.py`
- Each feature: `id` (string), `year` (integer 1630–2009)
- Single canonical file at repo root; copied to `source/public/` by prebuild

## Build Config

- `vite.config.js`: `build.target: 'esnext'`, stable `entryFileNames: 'assets/index.js'`
- `package.json`: prebuild copies geojson to `public/`

## Animations & Layering

| Element | Layer |
|---------|-------|
| WebGL canvas | base |
| CSS2D labels | z-index 10 |
| Title/subtitle overlay | z-index 20 |
| About panel | z-index 25 |
| EUBUCCO/DBSM info panels | z-index 30 |

## CSS2DRenderer

- `position: absolute`, `pointer-events: none` on container so clicks pass through to canvas
- Individual label elements: `pointer-events: none` (rendered as overlay only)
- Labels use monospace, uppercase, white + 2.5px black stroke, bold 900, letter-spacing 3px
- Bounce: main labels `sin(elapsed * 1.5 + centroid.x) * 4`; extras `sin(elapsed * 1.5) * 2`

## Info Panels (EUBUCCO / DBSM)

- `position: fixed`, black background, `pointer-events: none` on outer (passes through to canvas)
- Rectangular feather mask: two intersecting linear gradients (top/bottom + left/right), 20px feather
- Close button: `pointer-events: auto`, hover glow
- Screen-space position computed each frame via `Vector3.project(camera)`
- Info data: EUBUCCO (paragraph about the scientific database) and DBSM (paragraph about the Digital Building Stock Model)
- Panel opens from click handler (guarded by project mode), closes via close button or project mode exit
