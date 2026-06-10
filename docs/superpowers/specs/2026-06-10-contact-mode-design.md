# CONTACT Mode — Design Spec

## Overview

Add a third interactive panel mode (alongside ABOUT and PROJECTS) triggered by clicking building `NL32B_N326E397_Y2696.0651_X3149.1638`. The CONTACT mode mirrors ABOUT behavior but pushes the 3D scene to the **right** instead of left, with the panel appearing on the left side.

## Changes

### loadBuildings.js

1. Add `NL32B_N326E397_Y2696.0651_X3149.1638` to the `isTarget` check.
2. Use the building's own `highlightColor` (year-based, 1.8× saturation) for glow layers instead of a hardcoded color. Boost glow base opacities by 1.5× (for "stronger" effect).
3. Assign label `'Contact'`.

### main.js — New Contact Section

Parallel state to the existing ABOUT section:

| Variable | Purpose |
|----------|---------|
| `contactActive` | Whether contact mode is open |
| `contactSlideDir` | 1 = entering, -1 = exiting |
| `contactSlideStartTime` | Animation timing |

**Panel DOM** (`contactPanel`):
- `position: fixed`, `left: 0`, `z-index: 25`, `width: 44%`
- Slides in from `translateX(-100%)` (left side)
- Heading: `"Contact"` typewriter at 60ms/char with terminal cursor
- Body: single line `milojevic-dupont (at) pm.me` fades in after heading
- Close button `[ close ]` reverses everything

### Animation Loop

Container slide logic extended:
- ABOUT slides `container.position.x` 0 → **-200**
- CONTACT slides `container.position.x` 0 → **+200**
- Both use 1.2s easeInOutQuad
- Panel opacity/transform animated in parallel

### Guards

- CONTACT and ABOUT are mutually exclusive; blocked during transitions
- CONTACT also blocked when PROJECT mode is active or animating
- Same guard pattern as existing `openAbout()`/`closeAbout()`

### Click Handler

Add `'Contact'` case alongside existing `'About'` / `'Projects'` cases in the click event.

### Building Color

Year 1988 maps to ~94% in the year range (1630–2009), landing near amber on the earth-tone ramp. Highlight color (1.8× sat) yields a warm gold — similar warmth to About's orange but naturally derived.

## Files Modified

- `source/src/main.js`
- `source/src/loadBuildings.js`
