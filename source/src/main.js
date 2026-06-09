import * as THREE from 'three'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { loadBuildings } from './loadBuildings.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000000)

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 5000)
camera.position.set(0, 280, 540)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const labelRenderer = new CSS2DRenderer()
labelRenderer.setSize(window.innerWidth, window.innerHeight)
labelRenderer.domElement.style.position = 'absolute'
labelRenderer.domElement.style.top = '0'
labelRenderer.domElement.style.left = '0'
labelRenderer.domElement.style.zIndex = '10'
labelRenderer.domElement.style.pointerEvents = 'none'
document.body.appendChild(labelRenderer.domElement)

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  labelRenderer.setSize(window.innerWidth, window.innerHeight)
})

const PHASES = {
  PITCH_BLACK: 0,
  EDGES: 1,
  SAMPLE_20: 2,
  ALL_COLOR: 3,
  EXTRUDE: 4,
  GLOW: 5,
}

const PHASE = {
  start: [0, 0.8, 2.5, 5.0, 7.5, 10.0],
  dur:   [0, 1.5, 0.1, 1.8, 1.5, 2.0],
}

function phaseEnd(i) { return PHASE.start[i] + PHASE.dur[i] }

const { group, glowTargets, allBuildings } = await loadBuildings()
scene.add(group)

const labels = []
for (const target of glowTargets) {
  const el = document.createElement('div')
  el.textContent = target.label
  el.style.color = '#fff'
  el.style.fontFamily = 'monospace'
  el.style.fontSize = '14px'
  el.style.fontWeight = '900'
  el.style.webkitTextStroke = '2.5px #000'
  el.style.paintOrder = 'stroke fill'
  el.style.textShadow = '0 0 20px rgba(0, 0, 0, 0.8)'
  el.style.letterSpacing = '3px'
  el.style.textTransform = 'uppercase'
  el.style.opacity = '0'
  el.style.cursor = 'pointer'
  el.style.pointerEvents = 'auto'

  const yOff = target.height + 2
  const lx = target.centroid.x
  const lz = -target.centroid.z

  const label = new CSS2DObject(el)
  label.position.set(lx, yOff, lz)
  scene.add(label)
  labels.push({ label, target, el, baseY: yOff })
}

const TITLE_LINE1 = 'Nikola Milojevic-Dupont \u2013 Scientific Consulting'
const TITLE_LINE2 = 'Geospatial Data + AI  ->  Climate + Cities'

const TITLE_CLASS = 'position: fixed; left: 50%; transform: translateX(-50%); z-index: 20; text-align: center; font-family: monospace; color: #fff; opacity: 0; pointer-events: none;'
const LINE_CLASS = 'font-size: 20px; font-weight: 700; letter-spacing: 2px; white-space: nowrap; overflow: hidden; min-height: 1.4em;'

const titleLine1 = document.createElement('div')
titleLine1.style.cssText = TITLE_CLASS + ' top: 3%; ' + LINE_CLASS
document.body.appendChild(titleLine1)

const titleLine2Div = document.createElement('div')
titleLine2Div.style.cssText = TITLE_CLASS + ' bottom: 3%; ' + LINE_CLASS
document.body.appendChild(titleLine2Div)

let titleStarted = false
let titleComplete = false
let revealStartTime = 0
const REVEAL_DELAY = 1.0
const REVEAL_DUR = 2.5
const titleTimers = []

function runTitleWriter() {
  titleStarted = true
  titleLine1.style.opacity = '1'
  titleLine2Div.style.opacity = '1'
  let i = 0
  const t1 = setInterval(() => {
    titleLine1.textContent += TITLE_LINE1[i]
    i++
    if (i >= TITLE_LINE1.length) {
      clearInterval(t1)
      let j = 0
      const t2 = setInterval(() => {
        titleLine2Div.textContent += TITLE_LINE2[j]
        j++
        if (j >= TITLE_LINE2.length) {
          clearInterval(t2)
          titleComplete = true
        }
      }, 30)
      titleTimers.push(t2)
    }
  }, 35)
  titleTimers.push(t1)
}

// --- About section ---

const ABOUT_CAM_X = 280
const SLIDE_DUR = 1.2
let aboutActive = false
let slideStartTime = 0
let slideDir = 0 // 1 = entering about, -1 = exiting, 0 = idle
let aboutTypingDone = false

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

const aboutPanel = document.createElement('div')
aboutPanel.id = 'about-panel'
aboutPanel.style.cssText = [
  'position: fixed',
  'right: 0',
  'top: 0',
  'width: 44%',
  'height: 100%',
  'z-index: 25',
  'font-family: monospace',
  'color: #fff',
  'display: flex',
  'flex-direction: column',
  'justify-content: center',
  'pointer-events: none',
  'opacity: 0',
  'transform: translateX(100%)',
  'transition: none',
].join(';') + ';'
document.body.appendChild(aboutPanel)

const aboutInner = document.createElement('div')
aboutInner.style.cssText = [
  'padding: 10% 8%',
  'max-height: 80%',
  'overflow-y: auto',
  'pointer-events: auto',
].join(';') + ';'
aboutPanel.appendChild(aboutInner)

const aboutHeading = document.createElement('h1')
aboutHeading.style.cssText = [
  'font-size: 20px',
  'font-weight: 700',
  'letter-spacing: 3px',
  'text-transform: uppercase',
  'margin: 0 0 28px 0',
  'min-height: 1.4em',
  'overflow: hidden',
  'white-space: nowrap',
].join(';') + ';'
aboutInner.appendChild(aboutHeading)

const aboutBody = document.createElement('div')
aboutBody.style.cssText = [
  'font-size: 14px',
  'line-height: 1.7',
  'letter-spacing: 0.5px',
  'opacity: 0',
  'white-space: pre-wrap',
].join(';') + ';'
aboutBody.textContent = [
  'I am a freelancer based in Berlin, Germany.',
  '',
  'I am available for missions in the space of AI, geospatial data, climate change, urban planning \u2013 or an intersection of these topics.',
  '',
  'My expertise includes:',
  '',
  '\u2022 Data science project implementation',
  '\u2022 Consulting, management, or auditing of AI for Climate projects',
  '\u2022 Development and delivery of education programs',
  '______________________________________________',
  '',
  'My work has broadly investigated the pathway from research to deployment of AI systems for climate action in cities, focusing on narratives, data needs, tool development, and practical deployment considerations. I have particular expertise in geospatial data science, gained, for example, from leading the development of the EUBUCCO building stock dataset (eubucco.com).',
  '',
  'I hold a PhD from the Technical University Berlin and wrote my doctoral dissertation on \u201CGeospatial artificial intelligence for scaling low-carbon planning\u201D under the supervision of Felix Creutzig. I worked for 7 years in Felix Creutzig\u2019s lab at MCC Berlin, now part of the renowned Potsdam Institute for Climate Impact Research (PIK).',
  '',
  'I am also a founding member of Climate Change AI (CCAI), a global non-profit aiming to catalyze impactful work at the intersection of climate change and machine learning, where I have taken on various roles, including chairing the organization\u2019s educational content committee and being a member of its board of directors.',
].join('\n\n')
aboutInner.appendChild(aboutBody)

const closeBtn = document.createElement('span')
closeBtn.textContent = '[ close ]'
closeBtn.style.cssText = [
  'display: inline-block',
  'margin-top: 32px',
  'font-size: 14px',
  'font-weight: 700',
  'letter-spacing: 2px',
  'cursor: pointer',
  'pointer-events: auto',
  'opacity: 0',
  'transition: opacity 0.3s',
].join(';') + ';'
closeBtn.addEventListener('mouseenter', () => { closeBtn.style.textShadow = '0 0 12px rgba(255,255,255,0.5)' })
closeBtn.addEventListener('mouseleave', () => { closeBtn.style.textShadow = 'none' })
aboutInner.appendChild(closeBtn)

closeBtn.addEventListener('click', closeAbout)

function runAboutTypewriter() {
  aboutHeading.textContent = ''
  aboutBody.style.opacity = '0'
  closeBtn.style.opacity = '0'
  aboutTypingDone = false
  let i = 0
  const word = 'About'
  const t = setInterval(() => {
    aboutHeading.textContent += word[i]
    i++
    if (i >= word.length) {
      clearInterval(t)
      aboutTypingDone = true
      aboutBody.style.transition = 'opacity 0.6s'
      aboutBody.style.opacity = '1'
      closeBtn.style.transition = 'opacity 0.6s'
      closeBtn.style.opacity = '1'
    }
  }, 35)
}

function openAbout() {
  if (aboutActive || slideDir !== 0) return
  aboutActive = true
  slideDir = 1
  slideStartTime = clock.getElapsedTime()
  titleLine1.style.opacity = '0'
  titleLine2Div.style.opacity = '0'
  for (const l of labels) {
    l.el.style.opacity = '0'
  }
  aboutPanel.style.opacity = '1'
  runAboutTypewriter()
}

function closeAbout() {
  if (!aboutActive || slideDir !== 0) return
  aboutActive = false
  slideDir = -1
  slideStartTime = clock.getElapsedTime()
  titleLine1.style.opacity = '1'
  titleLine2Div.style.opacity = '1'
  for (const l of labels) {
    l.el.style.opacity = '0.95'
  }
}

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const hovered = new Set()
const meshes = glowTargets.map(t => t.mesh)
let animDone = false

renderer.domElement.addEventListener('pointermove', e => {
  if (!animDone) return
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
  raycaster.setFromCamera(pointer, camera)

  const hits = raycaster.intersectObjects(meshes)
  hovered.clear()
  for (const hit of hits) {
    const target = glowTargets.find(t => t.mesh === hit.object)
    if (target) hovered.add(target)
  }
})

renderer.domElement.addEventListener('click', () => {
  if (!animDone) return
  for (const target of hovered) {
    if (target.label === 'About') {
      openAbout()
    } else {
      console.log('Clicked:', target.label, target.mesh.position)
    }
  }
})

const clock = new THREE.Clock()

function progress(elapsed, phaseIdx) {
  return Math.min(1, Math.max(0, (elapsed - PHASE.start[phaseIdx]) / PHASE.dur[phaseIdx]))
}

function animate() {
  requestAnimationFrame(animate)
  const elapsed = clock.getElapsedTime()

  // phase 1: edges fade in
  if (elapsed >= PHASE.start[PHASES.EDGES] && elapsed < phaseEnd(PHASES.EDGES)) {
    const p = progress(elapsed, PHASES.EDGES)
    if (allBuildings.length > 0) allBuildings[0].line.material.opacity = p
  } else if (elapsed >= phaseEnd(PHASES.EDGES)) {
    if (allBuildings.length > 0) allBuildings[0].line.material.opacity = 1
  }

  // phase 2: random 20% buildings snap to color instantly
  if (elapsed >= PHASE.start[PHASES.SAMPLE_20] && elapsed < phaseEnd(PHASES.SAMPLE_20)) {
    for (const b of allBuildings) {
      if (b.colorPhase === 2) {
        b.material.color.copy(b.baseColor)
      }
    }
  }

  // phase 3: remaining 80% get color
  if (elapsed >= PHASE.start[PHASES.ALL_COLOR]) {
    const p = elapsed < phaseEnd(PHASES.ALL_COLOR) ? progress(elapsed, PHASES.ALL_COLOR) : 1
    for (const b of allBuildings) {
      if (b.colorPhase === 3) {
        b.material.color.copy(b.baseColor).multiplyScalar(p)
      }
    }
  }

  // phase 4: extrusion with staggered random delay
  if (elapsed >= PHASE.start[PHASES.EXTRUDE]) {
    for (const b of allBuildings) {
      const start = PHASE.start[PHASES.EXTRUDE] + b.extrudeDelay
      const p = elapsed <= start ? 0 : Math.min(1, (elapsed - start) / PHASE.dur[PHASES.EXTRUDE])
      b.mesh.scale.z = p
      b.line.scale.z = p
    }
    for (const target of glowTargets) {
      const start = PHASE.start[PHASES.EXTRUDE] + target.extrudeDelay
      const p = elapsed <= start ? 0 : Math.min(1, (elapsed - start) / PHASE.dur[PHASES.EXTRUDE])
      for (const g of target.glows) {
        g.mesh.scale.z = p
      }
    }
  }

  // phase 5: title starts typing
  if (elapsed >= PHASE.start[PHASES.GLOW] && !titleStarted) {
    runTitleWriter()
  }

  // after title completes with delay, reveal target buildings
  if (titleComplete) {
    if (revealStartTime === 0) revealStartTime = elapsed
    const delay = REVEAL_DELAY
    const t = Math.max(0, elapsed - revealStartTime - delay)
    const p = Math.min(1, t / REVEAL_DUR)
    for (const target of glowTargets) {
      target.mesh.visible = true
      target.line.visible = true
      target.material.color.copy(target.baseColor).multiplyScalar(p)
      target.mesh.scale.z = p
      target.line.scale.z = p
      for (const g of target.glows) {
        g.mesh.visible = true
        g.material.opacity = g.baseOpacity * p
      }
    }
    for (const l of labels) {
      l.el.style.opacity = String(0.95 * p)
    }
    if (p >= 1 && !animDone) animDone = true
  }

  // camera slide for about section
  if (slideDir !== 0) {
    const t = Math.min(1, (elapsed - slideStartTime) / SLIDE_DUR)
    const et = easeInOutQuad(t)
    const srcX = slideDir === 1 ? 0 : ABOUT_CAM_X
    const dstX = slideDir === 1 ? ABOUT_CAM_X : 0
    camera.position.x = srcX + (dstX - srcX) * et
    camera.lookAt(0, 0, 0)
    const panelSrc = slideDir === 1 ? 100 : 0
    const panelDst = slideDir === 1 ? 0 : 100
    const tx = panelSrc + (panelDst - panelSrc) * et
    aboutPanel.style.transform = 'translateX(' + tx + '%)'
    aboutPanel.style.opacity = String(t)
    if (t >= 1) {
      slideDir = 0
    }
  }

  if (!animDone) {
    renderer.render(scene, camera)
    labelRenderer.render(scene, camera)
    return
  }

  // post-animation: glow pulse, hover, bounce
  const t = Math.sin(elapsed * 2) * 0.5 + 0.5

  for (const target of glowTargets) {
    const isHovered = hovered.has(target)
    const boost = isHovered ? 1.8 : 1
    const intensity = 0.85 + t * 0.15 * boost

    for (const g of target.glows) {
      g.material.opacity = g.baseOpacity * intensity
      const s = 1 + t * 0.002 * boost
      g.mesh.scale.set(s, s, s)
    }

    if (isHovered) {
      const c = target.baseColor.clone()
      c.lerp(new THREE.Color(0xffffff), 0.4)
      target.material.color.copy(c)
    } else {
      target.material.color.copy(target.baseColor)
    }
  }

  for (const l of labels) {
    const bounce = Math.sin(elapsed * 1.5 + l.target.centroid.x) * 4
    l.label.position.y = l.baseY + bounce
  }

  renderer.render(scene, camera)
  labelRenderer.render(scene, camera)
}
animate()
