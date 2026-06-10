# CONTACT Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a CONTACT panel mode triggered by clicking building `NL32B_N326E397_Y2696.0651_X3149.1638`, mirroring ABOUT behavior with scene sliding right instead of left.

**Architecture:** Register the new building as a target in `loadBuildings.js` with its own highlight color; add a new contact section in `main.js` (panel, open/close functions, typewriter) and unify the slide animation to support both left (about) and right (contact) directions.

**Tech Stack:** Three.js, Vite, CSS2DRenderer

---

### Task 1: Register Contact building as a glow target

**Files:**
- Modify: `source/src/loadBuildings.js:120-128` (isTarget check + glow color logic)
- Modify: `source/src/loadBuildings.js:170-178` (target creation)

- [ ] **Step 1: Add Contact ID to isTarget and restructure glow color logic**

Replace the current `isTarget` check and the hardcoded glow color logic:

Current code (lines 120-128):
```javascript
const isTarget =
  feature.properties.id === 'NL32B_N326E397_Y2596.6553_X3343.2809' ||
  feature.properties.id === 'NL32B_N326E397_Y2400.9044_X3394.3630'
```

Replace with:
```javascript
const isTarget =
  feature.properties.id === 'NL32B_N326E397_Y2596.6553_X3343.2809' ||
  feature.properties.id === 'NL32B_N326E397_Y2400.9044_X3394.3630' ||
  feature.properties.id === 'NL32B_N326E397_Y2696.0651_X3149.1638'
```

- [ ] **Step 2: Update target creation to handle Contact with its own highlight color**

Current code (lines 170-178):
```javascript
if (isTarget) {
  const isBlue = feature.properties.id === 'NL32B_N326E397_Y2400.9044_X3394.3630'
  const glows = addGlow(group, geom, mesh.position, isBlue ? 0x6688ff : 0xff8800)
  for (const g of glows) {
    g.mesh.visible = false
  }
  const centroid = polygonCentroid(exterior)
  glowTargets.push({ glows, mesh, material: fillMat, normalColor, highlightColor, line, height, centroid, label: isBlue ? 'Projects' : 'About', extrudeDelay })
}
```

Replace with:
```javascript
if (isTarget) {
  let label, glowColor
  if (feature.properties.id === 'NL32B_N326E397_Y2400.9044_X3394.3630') {
    label = 'Projects'
    glowColor = 0x6688ff
  } else if (feature.properties.id === 'NL32B_N326E397_Y2696.0651_X3149.1638') {
    label = 'Contact'
    glowColor = highlightColor
  } else {
    label = 'About'
    glowColor = 0xff8800
  }
  const glows = addGlow(group, geom, mesh.position, glowColor)
  for (const g of glows) {
    g.mesh.visible = false
  }
  if (label === 'Contact') {
    for (const g of glows) {
      g.baseOpacity *= 1.5
      g.material.opacity = g.baseOpacity
    }
  }
  const centroid = polygonCentroid(exterior)
  glowTargets.push({ glows, mesh, material: fillMat, normalColor, highlightColor, line, height, centroid, label, extrudeDelay })
}
```

---

### Task 2: Add contact panel DOM and open/close/typewriter functions

**Files:**
- Modify: `source/src/main.js` (after aboutPanel section, line ~311)

- [ ] **Step 1: Add contactPanel DOM elements after the about close button (after line 311)**

Insert after the about closeBtn (after line 311, before `closeBtn.addEventListener('click', closeAbout)`):

```javascript
// --- Contact section ---

const CONTACT_SLIDE_X = 200

const contactPanel = document.createElement('div')
contactPanel.id = 'contact-panel'
contactPanel.style.cssText = [
  'position: fixed',
  'left: 0',
  'top: 10%',
  'width: 44%',
  'height: 80%',
  'z-index: 25',
  'font-family: monospace',
  'color: #fff',
  'pointer-events: none',
  'opacity: 0',
  'transform: translateX(-100%)',
  'transition: none',
].join(';') + ';'
document.body.appendChild(contactPanel)

const contactInner = document.createElement('div')
contactInner.style.cssText = [
  'padding: 4% 8% 0 8%',
  'height: 100%',
  'overflow-y: auto',
  'pointer-events: auto',
  'box-sizing: border-box',
].join(';') + ';'
contactPanel.appendChild(contactInner)

const contactHeading = document.createElement('h1')
contactHeading.style.cssText = [
  'font-size: 20px',
  'font-weight: 700',
  'letter-spacing: 3px',
  'text-transform: uppercase',
  'margin: 0 0 28px 0',
  'min-height: 1.4em',
  'overflow: hidden',
  'white-space: nowrap',
].join(';') + ';'
contactInner.appendChild(contactHeading)

const contactBody = document.createElement('div')
contactBody.style.cssText = [
  'font-size: 14px',
  'line-height: 1.7',
  'letter-spacing: 0.5px',
  'opacity: 0',
].join(';') + ';'
contactBody.textContent = 'milojevic-dupont (at) pm.me'
contactInner.appendChild(contactBody)

const contactCloseBtn = document.createElement('span')
contactCloseBtn.textContent = '[ close ]'
contactCloseBtn.style.cssText = [
  'display: inline-block',
  'margin-top: 6px',
  'font-size: 14px',
  'font-weight: 700',
  'letter-spacing: 2px',
  'cursor: pointer',
  'pointer-events: auto',
  'opacity: 0',
  'transition: opacity 0.3s',
].join(';') + ';'
contactCloseBtn.addEventListener('mouseenter', () => { contactCloseBtn.style.textShadow = '0 0 12px rgba(255,255,255,0.5)' })
contactCloseBtn.addEventListener('mouseleave', () => { contactCloseBtn.style.textShadow = 'none' })
contactInner.appendChild(contactCloseBtn)

contactCloseBtn.addEventListener('click', closeContact)
```

- [ ] **Step 2: Replace existing aboutSlide variables with unified slide system and add contact state**

Find the existing declarations (around line 214-218):
```javascript
const SLIDE_X = 200
const SLIDE_DUR = 1.2
let aboutActive = false
let slideStartTime = 0
let slideDir = 0 // 1 = entering about, -1 = exiting, 0 = idle
let aboutTypingDone = false
```

Replace with:
```javascript
const SLIDE_X = 200
const SLIDE_DUR = 1.2
let aboutActive = false
let contactActive = false
let slideStartTime = 0
let slideDir = 0 // 1 = entering, -1 = exiting, 0 = idle
let slideTargetX = 0
let slidePanel = null
let slidePanelSign = 1 // +1 for right-side panels, -1 for left-side panels
let aboutTypingDone = false
let contactTypingDone = false
```

- [ ] **Step 3: Add `runContactTypewriter` function after `runAboutTypewriter` (after line ~338)**

```javascript
function runContactTypewriter() {
  contactBody.style.opacity = '0'
  contactCloseBtn.style.opacity = '0'
  contactTypingDone = false
  contactHeading.innerHTML = ''
  const txt = document.createTextNode('')
  const cur = makeCursor()
  contactHeading.appendChild(txt)
  contactHeading.appendChild(cur)
  let i = 0
  const word = 'Contact'
  const t = setInterval(() => {
    txt.textContent = word.substring(0, i + 1)
    i++
    if (i >= word.length) {
      clearInterval(t)
      contactHeading.removeChild(cur)
      contactTypingDone = true
      contactBody.style.transition = 'opacity 0.6s'
      contactBody.style.opacity = '1'
      contactCloseBtn.style.transition = 'opacity 0.6s'
      contactCloseBtn.style.opacity = '1'
    }
  }, 60)
}
```

- [ ] **Step 4: Add `openContact` and `closeContact` functions after `closeAbout` (after line ~363)**

```javascript
function openContact() {
  if (contactActive || aboutActive || slideDir !== 0 || projectActive || projectAnimDir !== 0) return
  contactActive = true
  slideDir = 1
  slideTargetX = SLIDE_X
  slidePanel = contactPanel
  slidePanelSign = -1
  slideStartTime = clock.getElapsedTime()
  for (const l of labels) {
    l.el.style.opacity = '0'
  }
  contactPanel.style.opacity = '1'
  contactHeading.innerHTML = ''
  contactBody.style.opacity = '0'
  contactCloseBtn.style.opacity = '0'
  setTimeout(() => runContactTypewriter(), 900)
}

function closeContact() {
  if (!contactActive || slideDir !== 0) return
  contactActive = false
  slideDir = -1
  slideStartTime = clock.getElapsedTime()
  for (const l of labels) {
    l.el.style.opacity = '0.95'
  }
}
```

- [ ] **Step 5: Update `openAbout` to use unified slide values**

Replace the current `openAbout` function with:
```javascript
function openAbout() {
  if (aboutActive || contactActive || slideDir !== 0 || projectActive || projectAnimDir !== 0) return
  aboutActive = true
  slideDir = 1
  slideTargetX = -SLIDE_X
  slidePanel = aboutPanel
  slidePanelSign = 1
  slideStartTime = clock.getElapsedTime()
  for (const l of labels) {
    l.el.style.opacity = '0'
  }
  aboutPanel.style.opacity = '1'
  aboutHeading.innerHTML = ''
  aboutBody.style.opacity = '0'
  closeBtn.style.opacity = '0'
  setTimeout(() => runAboutTypewriter(), 900)
}
```

- [ ] **Step 6: Update `closeAbout` to use unified slide values**

Replace the current `closeAbout` function with:
```javascript
function closeAbout() {
  if (!aboutActive || slideDir !== 0) return
  aboutActive = false
  slideDir = -1
  slideStartTime = clock.getElapsedTime()
  for (const l of labels) {
    l.el.style.opacity = '0.95'
  }
}
```

---

### Task 3: Update animation loop and click handler

**Files:**
- Modify: `source/src/main.js` (animation loop ~line 870, click handler ~line 719, project mode guard ~line 536)

- [ ] **Step 1: Unify the slide animation in the animation loop**

Find the current slide section (lines 870-883):
```javascript
  // slide scene left for about section
  if (slideDir !== 0) {
    const t = Math.min(1, (elapsed - slideStartTime) / SLIDE_DUR)
    const et = easeInOutQuad(t)
    const srcX = slideDir === 1 ? 0 : -SLIDE_X
    const dstX = slideDir === 1 ? -SLIDE_X : 0
    container.position.x = srcX + (dstX - srcX) * et
    const panelSrc = slideDir === 1 ? 100 : 0
    const panelDst = slideDir === 1 ? 0 : 100
    const tx = panelSrc + (panelDst - panelSrc) * et
    aboutPanel.style.transform = 'translateX(' + tx + '%)'
    aboutPanel.style.opacity = String(t)
    if (t >= 1) slideDir = 0
  }
```

Replace with:
```javascript
  // slide scene for about/contact panels
  if (slideDir !== 0) {
    const t = Math.min(1, (elapsed - slideStartTime) / SLIDE_DUR)
    const et = easeInOutQuad(t)
    const srcX = slideDir === 1 ? 0 : slideTargetX
    const dstX = slideDir === 1 ? slideTargetX : 0
    container.position.x = srcX + (dstX - srcX) * et
    const panelSrc = slideDir === 1 ? slidePanelSign * 100 : 0
    const panelDst = slideDir === 1 ? 0 : slidePanelSign * 100
    const tx = panelSrc + (panelDst - panelSrc) * et
    slidePanel.style.transform = 'translateX(' + tx + '%)'
    slidePanel.style.opacity = String(t)
    if (t >= 1) slideDir = 0
  }
```

- [ ] **Step 2: Add Contact case to click handler**

Find the click handler (lines 719-738). Add `contactActive` to the guard and add the Contact case:

Current guard (line 720):
```javascript
  if (!animDone || projectAnimDir !== 0 || aboutActive) return
```

Replace with:
```javascript
  if (!animDone || projectAnimDir !== 0 || aboutActive || contactActive) return
```

Current About/Projects case:
```javascript
  for (const target of hovered) {
    if (target.label === 'About') {
      openAbout()
    } else if (target.label === 'Projects') {
      if (!projectActive) openProjectMode()
    } else {
      console.log('Clicked:', target.label)
    }
  }
```

Replace with:
```javascript
  for (const target of hovered) {
    if (target.label === 'About') {
      openAbout()
    } else if (target.label === 'Projects') {
      if (!projectActive) openProjectMode()
    } else if (target.label === 'Contact') {
      openContact()
    } else {
      console.log('Clicked:', target.label)
    }
  }
```

- [ ] **Step 3: Add contactActive guard to openProjectMode**

Find the guard in `openProjectMode` (line 536):
```javascript
  if (projectActive || projectAnimDir !== 0 || aboutActive || slideDir !== 0) return
```

Replace with:
```javascript
  if (projectActive || projectAnimDir !== 0 || aboutActive || contactActive || slideDir !== 0) return
```

---

### Task 4: Build and verify

**Files:**
- No file changes

- [ ] **Step 1: Build the project**

Run:
```bash
cd source && npm run build
```
Expected: success, no errors

- [ ] **Step 2: Verify built output**

Check that `assets/index.js` and `index.html` exist in the repo root:
```bash
ls -la ../assets/index.js ../index.html
```
Expected: files exist and have non-zero size

- [ ] **Step 3: Start dev server to verify in browser (optional)**

Run:
```bash
npm run dev
```
Expected: Vite dev server starts, no errors in console
