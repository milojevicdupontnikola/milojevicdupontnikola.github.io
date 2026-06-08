# New Website — Landing Page

Full-screen 3D geospatial landing page with 320 extruded Dutch building footprints rendered in Three.js on a black background.

## File Structure

```
milojevicdupontnikola.github.io/
├── index.html                      # Served at root, loads assets/index.js
├── assets/index.js                 # Built Three.js bundle (502KB)
├── footprints_centered.geojson     # 320 building footprints (EPSG:3035, centered at origin)
├── .nojekyll                       # Disables Jekyll on GitHub Pages
├── AGENTS.md
├── source/                         # Vite dev project
│   ├── src/main.js                 # Scene, camera, renderer, labels, hover/click
│   ├── src/loadBuildings.js        # GeoJSON fetch, extrusion, glow, colors
│   ├── index.html                  # Dev entry point (loads /src/main.js)
│   ├── vite.config.js              # Vite config, stable output filename
│   ├── package.json                # prebuild copies geojson to public/ first
│   ├── public/.gitkeep             # (geojson copied here by prebuild)
│   ├── prepare_data.py             # Python script to center GeoJSON coords
│   └── footprints.geojson          # Raw source data (EPSG:3035, uncentered)
```

## How to Rebuild

```sh
cd source && npm install && npm run build
# then copy outputs to root:
cp source/dist/index.html ../
cp source/dist/assets/* ../assets/
cp source/dist/footprints_centered.geojson ../
```

## Key Technical Details

- **Three.js 0.170.0**, Vite 5.4.21, Node 20
- **Camera**: Perspective 45°, at (0, 280, 540), looking at origin
- **Buildings**: ExtrudeGeometry with rotation.x = -PI/2 (maps northing → -Z)
- **Heights**: top 15% area get 20–25m, rest get 10–15m
- **Colors**: mapped from year range 1630–2009 via earth-tone ramp (navy → teal → amber)
- **Target saturation**: 1.8× for target buildings, 0.75× for others
- **White edges**: LineBasicMaterial on EdgesGeometry
- **Neon glow**: 3 layers per target building, AdditiveBlending, scales 1.008/1.02/1.04, pulsing via sine wave
- **Labels**: CSS2DRenderer, monospace 14px uppercase, white fill + 2.5px black stroke, bold 900, letter-spacing 3px, opacity 0.95
- **Label position**: y = height + 2 (just above building top), z = -centroid.z (negated for rotation)
- **Bounce**: sin(elapsed * 1.5 + centroid.x) * 4
- **Hover**: raycaster on pointermove, glow intensity ×1.8, color lerps 40% toward white
- **Click**: logs to console (placeholder)

## Target Buildings

| Label      | Building ID                                       | Glow Color |
|------------|---------------------------------------------------|------------|
| ABOUT      | NL32B_N326E397_Y2596.6553_X3343.2809              | #ff8800    |
| PROJECTS   | NL32B_N326E397_Y2400.9044_X3394.3630              | #6688ff    |

## GeoJSON Data

- Source: 320 Dutch building footprints from EUBUCCO
- Original CRS: EPSG:3035
- Coordinates centered at origin via `prepare_data.py` (subtract min x/y)
- Each feature has `id` and `year` (1630–2009) properties
- Single flat file at repo root, duplicated into `source/public/` via prebuild script

## Build Config

- `vite.config.js` sets `build.target: 'esnext'` (needed for top-level await)
- Stable output filename: `assets/index.js` (no hash)
- `prebuild` script copies `../footprints_centered.geojson` into `public/` before Vite bundles it
- Dev: `npm run dev` in `source/`
