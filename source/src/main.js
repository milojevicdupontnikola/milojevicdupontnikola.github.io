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

const container = new THREE.Group()
scene.add(container)

const { group, glowTargets, allBuildings, projectExtras } = await loadBuildings()
container.add(group)

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
  container.add(label)
  labels.push({ label, target, el, baseY: yOff })
}

const TITLE_LINE1 = 'Nikola Milojevic-Dupont \u2013 Scientific Consulting'
const TITLE_LINE2 = 'Geospatial Data + AI  \u2192  Climate + Cities'
const ARROW_HTML = '<span style="font-family:\'Noto Sans Math\',serif;display:inline-block;transform:translateY(-0.08em)">\u2192</span>'

const TITLE_CLASS = 'position: fixed; left: 50%; transform: translateX(-50%); z-index: 20; text-align: center; font-family: monospace; color: #fff; opacity: 0; pointer-events: none;'
const LINE_CLASS = 'font-size: 24px; font-weight: 700; letter-spacing: 2px; white-space: nowrap; overflow: hidden; min-height: 1.4em;'

const titleLine1 = document.createElement('div')
titleLine1.style.cssText = TITLE_CLASS + ' top: 3%; ' + LINE_CLASS
document.body.appendChild(titleLine1)

const titleLine2Div = document.createElement('div')
titleLine2Div.style.cssText = TITLE_CLASS + ' bottom: 3%; ' + LINE_CLASS
document.body.appendChild(titleLine2Div)

const SUBTITLES = [
  'Where sensing our environment produced digital representations...',
  '...using AI critically to enhance sense-making capabilities...',
  '...to target action on socio-environmental challenges.',
]
const subtitleEl = document.createElement('div')
subtitleEl.style.cssText = [
  'position: fixed',
  'top: 14%',
  'right: 5%',
  'z-index: 20',
  'font-family: monospace',
  'color: #fff',
  'font-size: 16px',
  'font-weight: 700',
  'letter-spacing: 1px',
  'opacity: 0',
  'pointer-events: none',
  'text-align: right',
  'overflow: hidden',
  'white-space: nowrap',
].join(';') + ';'
document.body.appendChild(subtitleEl)

const cursorStyle = document.createElement('style')
cursorStyle.textContent = '@keyframes cur-blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }'
document.head.appendChild(cursorStyle)

function makeCursor() {
  const s = document.createElement('span')
  s.textContent = '\u2588'
  s.style.animation = 'cur-blink 0.8s step-end infinite'
  return s
}

let titleStarted = false
let titleComplete = false
let titleEndTime = 0
const titleTimers = []

function runTitleWriter() {
  titleStarted = true
  titleLine1.style.opacity = '1'
  titleLine2Div.style.opacity = '1'
  const txt1 = document.createTextNode('')
  const cur1 = makeCursor()
  titleLine1.innerHTML = ''
  titleLine1.appendChild(txt1)
  titleLine1.appendChild(cur1)
  let i = 0
  const t1 = setInterval(() => {
    txt1.textContent = TITLE_LINE1.substring(0, i + 1)
    i++
    if (i >= TITLE_LINE1.length) {
      clearInterval(t1)
      titleLine1.removeChild(cur1)
      titleLine2Div.innerHTML = ''
      let j = 0
      const t2 = setInterval(() => {
        const soFar = TITLE_LINE2.substring(0, j + 1)
        const ai = soFar.indexOf('\u2192')
        let html = ''
        if (ai >= 0) {
          html += TITLE_LINE2.substring(0, ai)
          html += ARROW_HTML
          html += TITLE_LINE2.substring(ai + 1, j + 1)
        } else {
          html += soFar
        }
        html += '<span style="animation:cur-blink 0.8s step-end infinite">\u2588</span>'
        titleLine2Div.innerHTML = html
        j++
        if (j >= TITLE_LINE2.length) {
          clearInterval(t2)
          titleLine2Div.innerHTML = html.replace(' style="animation:cur-blink 0.8s step-end infinite"', '')
          titleComplete = true
        }
      }, 50)
      titleTimers.push(t2)
    }
  }, 60)
  titleTimers.push(t1)
}

// animation state machine
let st = 0 // 0=sub1 typing, 1=sub1 hold, 2=color, 3=extrude+sub2, 4=sub2 hold, 5=glow+sub3, 6=sub3 hold, 7=title, 8=done
let stStart = 0

let subIdx = -1
let subTypingDone = false
let subHoldUntil = 0

function startSubtitle(idx) {
  if (idx >= SUBTITLES.length) return
  subIdx = idx
  subTypingDone = false
  subtitleEl.innerHTML = ''
  subtitleEl.style.transition = 'opacity 0s'
  subtitleEl.style.opacity = '1'
  const txt = document.createTextNode('')
  const cur = makeCursor()
  subtitleEl.appendChild(txt)
  subtitleEl.appendChild(cur)
  let i = 0
  const t = setInterval(() => {
    txt.textContent = SUBTITLES[idx].substring(0, i + 1)
    i++
    if (i >= SUBTITLES[idx].length) {
      clearInterval(t)
      subtitleEl.removeChild(cur)
      subTypingDone = true
    }
  }, 60)
}

// --- About section ---

const SLIDE_X = 200
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
  'top: 10%',
  'width: 44%',
  'height: 80%',
  'z-index: 25',
  'font-family: monospace',
  'color: #fff',
  'pointer-events: none',
  'opacity: 0',
  'transform: translateX(100%)',
  'transition: none',
].join(';') + ';'
document.body.appendChild(aboutPanel)

const aboutInner = document.createElement('div')
aboutInner.style.cssText = [
  'padding: 4% 8% 0 8%',
  'height: 100%',
  'overflow-y: auto',
  'pointer-events: auto',
  'box-sizing: border-box',
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
].join(';') + ';'

const bodyParagraphs = [
  'I am a freelancer based in Berlin, Germany.',
  'I am available for missions in the space of AI, geospatial data, climate change, urban planning \u2013 or an intersection of these topics.',
  'My expertise includes:',
  '\u2022 Data science project implementation',
  '\u2022 Consulting, management, or auditing of AI for Climate projects',
  '\u2022 Development and delivery of education programs',
  'My work has broadly investigated the pathway from research to deployment of AI systems for climate action in cities, focusing on narratives, data needs, tool development, and practical deployment considerations. I have particular expertise in geospatial data science, gained, for example, from leading the development of the EUBUCCO building stock dataset (eubucco.com).',
  'I hold a PhD from the Technical University Berlin and wrote my doctoral dissertation on \u201CGeospatial artificial intelligence for scaling low-carbon planning\u201D under the supervision of Felix Creutzig. I worked for 7 years in Felix Creutzig\u2019s lab at MCC Berlin, now part of the renowned Potsdam Institute for Climate Impact Research (PIK).',
  'I am also a founding member of Climate Change AI (CCAI), a global non-profit aiming to catalyze impactful work at the intersection of climate change and machine learning, where I have taken on various roles, including chairing the organization\u2019s educational content committee and being a member of its board of directors.',
]
for (let i = 0; i < bodyParagraphs.length; i++) {
  const p = document.createElement('p')
  p.textContent = bodyParagraphs[i]
  p.style.margin = '0 0 0.6em 0'
  if (i >= 3 && i <= 5) p.style.fontWeight = '700'
  if (i === 6) p.style.marginTop = '1.2em'
  aboutBody.appendChild(p)
}
aboutInner.appendChild(aboutBody)

const closeBtn = document.createElement('span')
closeBtn.textContent = '[ close ]'
closeBtn.style.cssText = [
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
closeBtn.addEventListener('mouseenter', () => { closeBtn.style.textShadow = '0 0 12px rgba(255,255,255,0.5)' })
closeBtn.addEventListener('mouseleave', () => { closeBtn.style.textShadow = 'none' })
aboutInner.appendChild(closeBtn)

closeBtn.addEventListener('click', closeAbout)

function runAboutTypewriter() {
  aboutBody.style.opacity = '0'
  closeBtn.style.opacity = '0'
  aboutTypingDone = false
  aboutHeading.innerHTML = ''
  const txt = document.createTextNode('')
  const cur = makeCursor()
  aboutHeading.appendChild(txt)
  aboutHeading.appendChild(cur)
  let i = 0
  const word = 'About'
  const t = setInterval(() => {
    txt.textContent = word.substring(0, i + 1)
    i++
    if (i >= word.length) {
      clearInterval(t)
      aboutHeading.removeChild(cur)
      aboutTypingDone = true
      aboutBody.style.transition = 'opacity 0.6s'
      aboutBody.style.opacity = '1'
      closeBtn.style.transition = 'opacity 0.6s'
      closeBtn.style.opacity = '1'
    }
  }, 60)
}

function openAbout() {
  if (aboutActive || slideDir !== 0 || projectActive || projectAnimDir !== 0) return
  aboutActive = true
  slideDir = 1
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

function closeAbout() {
  if (!aboutActive || slideDir !== 0) return
  aboutActive = false
  slideDir = -1
  slideStartTime = clock.getElapsedTime()
  for (const l of labels) {
    l.el.style.opacity = '0.95'
  }
}

// --- Info panels (EUBUCCO / DBSM) ---

const infoData = {
  EUBUCCO: 'EUBUCCO is a scientific database of individual building footprints for 322+ million buildings across the 27 European Union countries, Norway, Switzerland, and the UK. It is composed of 55 open datasets, including government registries (62.2%), OpenStreetMap (17.4%), and Microsoft building footprints (20.4%) that have been collected, harmonized, and validated.',
  DBSM: 'The EU Digital Building Stock Model (DBSM) provides a detailed and comprehensive and homogeneous geospatial database of individual buildings across the European Union. While primarily focused on energy-related characteristics, the model supports a broad range of applications. DBSM enables bottom-up solutions from individual building level to entire neighborhoods and national scales.',
}

let infoActive = false
let infoTarget = null
let infoLabel = ''
const infoVec3 = new THREE.Vector3()

const FEATHER = 20
const infoPanel = document.createElement('div')
infoPanel.style.cssText = [
  'position: fixed',
  'z-index: 30',
  'width: 43%',
  'height: 66%',
  'font-family: monospace',
  'color: #fff',
  'pointer-events: none',
  'opacity: 0',
  'transition: opacity 0.4s',
  'background: #000',
  '-webkit-mask-image: linear-gradient(to right, transparent 0px, black ' + FEATHER + 'px calc(100% - ' + FEATHER + 'px), transparent 100%), linear-gradient(to bottom, transparent 0px, black ' + FEATHER + 'px calc(100% - ' + FEATHER + 'px), transparent 100%)',
  '-webkit-mask-composite: intersect',
  'mask-image: linear-gradient(to right, transparent 0px, black ' + FEATHER + 'px calc(100% - ' + FEATHER + 'px), transparent 100%), linear-gradient(to bottom, transparent 0px, black ' + FEATHER + 'px calc(100% - ' + FEATHER + 'px), transparent 100%)',
  'mask-composite: intersect',
].join(';') + ';'
document.body.appendChild(infoPanel)

const infoInner = document.createElement('div')
infoInner.style.cssText = [
  'padding: 8% 10% 0 10%',
  'height: 100%',
  'overflow-y: auto',
  'pointer-events: none',
  'box-sizing: border-box',
].join(';') + ';'
infoPanel.appendChild(infoInner)

const infoHeading = document.createElement('h1')
infoHeading.style.cssText = [
  'font-size: 20px',
  'font-weight: 700',
  'letter-spacing: 3px',
  'text-transform: uppercase',
  'margin: 0 0 20px 0',
  'min-height: 1.4em',
  'overflow: hidden',
  'white-space: nowrap',
].join(';') + ';'
infoInner.appendChild(infoHeading)

const infoBody = document.createElement('div')
infoBody.style.cssText = [
  'font-size: 14px',
  'line-height: 1.7',
  'letter-spacing: 0.5px',
  'opacity: 0',
].join(';') + ';'
infoInner.appendChild(infoBody)

const infoCloseBtn = document.createElement('span')
infoCloseBtn.textContent = '[ close ]'
infoCloseBtn.style.cssText = [
  'display: inline-block',
  'margin-top: 12px',
  'font-size: 14px',
  'font-weight: 700',
  'letter-spacing: 2px',
  'cursor: pointer',
  'pointer-events: auto',
  'opacity: 0',
  'transition: opacity 0.3s',
].join(';') + ';'
infoCloseBtn.addEventListener('mouseenter', () => { infoCloseBtn.style.textShadow = '0 0 12px rgba(255,255,255,0.5)' })
infoCloseBtn.addEventListener('mouseleave', () => { infoCloseBtn.style.textShadow = 'none' })
infoCloseBtn.addEventListener('click', closeInfoPanel)
infoInner.appendChild(infoCloseBtn)

function openInfoPanel(extra) {
  if (projectAnimDir !== 0) return
  if (infoActive) {
    if (infoTarget === extra) return
    closeInfoPanel()
    infoHeading.innerHTML = ''
    infoHeading.textContent = ''
    infoBody.innerHTML = ''
    infoBody.style.opacity = '0'
    infoCloseBtn.style.opacity = '0'
    infoPanel.style.opacity = '0'
  }
  infoActive = true
  infoTarget = extra
  infoLabel = extra.label

  infoHeading.innerHTML = ''
  infoHeading.textContent = ''
  infoBody.style.opacity = '0'
  infoCloseBtn.style.opacity = '0'

  const txt = document.createTextNode('')
  const cur = makeCursor()
  infoHeading.appendChild(txt)
  infoHeading.appendChild(cur)
  let i = 0
  const word = extra.label
  const t = setInterval(() => {
    txt.textContent = word.substring(0, i + 1)
    i++
    if (i >= word.length) {
      clearInterval(t)
      infoHeading.removeChild(cur)

      const p = document.createElement('p')
      p.textContent = infoData[word]
      p.style.margin = '0 0 0.6em 0'
      infoBody.innerHTML = ''
      infoBody.appendChild(p)

      infoBody.style.transition = 'opacity 0.6s'
      infoBody.style.opacity = '1'
      infoCloseBtn.style.transition = 'opacity 0.6s'
      infoCloseBtn.style.opacity = '1'
    }
  }, 60)

  infoPanel.style.opacity = '1'
}

function closeInfoPanel() {
  if (!infoActive) return
  infoActive = false
  infoTarget = null
  infoPanel.style.opacity = '0'
}

function updateInfoPanelPosition() {
  if (!infoActive || !infoTarget) return
  const pw = window.innerWidth * 0.43
  const ph = window.innerHeight * 0.66
  const GAP = 30
  const BUFFER = 60

  infoVec3.set(infoTarget.centroid.x, infoTarget.height * 0.5, -infoTarget.centroid.z)
  infoVec3.project(camera)
  const sx = (infoVec3.x * 0.5 + 0.5) * window.innerWidth

  const projTarget = glowTargets.find(t => t.label === 'Projects')
  let px = sx
  if (projTarget) {
    infoVec3.set(projTarget.centroid.x, projTarget.height * 0.5, -projTarget.centroid.z)
    infoVec3.project(camera)
    px = (infoVec3.x * 0.5 + 0.5) * window.innerWidth
  }

  const anchor = Math.max(sx, px) + BUFFER
  let left = anchor + GAP
  if (left + pw > window.innerWidth - GAP) {
    left = Math.min(sx, px) - BUFFER - pw - GAP
  }
  infoPanel.style.left = Math.max(GAP, Math.min(left, window.innerWidth - pw - GAP)) + 'px'

  let top = (window.innerHeight - ph) / 2
  top = Math.max(GAP, Math.min(top, window.innerHeight * 0.74 - ph))
  infoPanel.style.top = top + 'px'
}

function openProjectMode() {
  if (projectActive || projectAnimDir !== 0 || aboutActive || slideDir !== 0) return
  projectActive = true
  projectAnimDir = 1
  projectAnimStart = clock.getElapsedTime()

  for (const l of labels) l.el.style.opacity = '0'
  for (const l of extraLabels) l.el.style.opacity = '1'
  projHeading.style.opacity = '1'
  runProjectTypewriter()

  const building = glowTargets.find(t => t.label === 'Projects')
  const box = new THREE.Box3().setFromObject(building.mesh)
  for (const extra of projectExtras) {
    box.expandByObject(extra.mesh)
  }
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const width = Math.max(size.x, size.z)
  const aspect = window.innerWidth / window.innerHeight
  const vFov = 45 * Math.PI / 180
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect)
  const d = (width * 1.4) / (2 * Math.tan(hFov / 2))

  projCamA.copy(camera.position)
  projLookA.set(0, 0, 0)
  projLookB.copy(center)
  const dir = new THREE.Vector3(-200, 320, 450).normalize()
  projCamB.copy(center).add(dir.multiplyScalar(Math.max(d, 15)))

  projCloseBtn.style.opacity = '1'
}

function closeProjectMode() {
  if (!projectActive || projectAnimDir !== 0) return
  projectActive = false
  projectAnimDir = -1
  projectAnimStart = clock.getElapsedTime()
  if (infoActive) closeInfoPanel()

  projCamA.copy(camera.position)
  projLookA.copy(projLookB)
  projCamB.set(0, 280, 540)
  projLookB.set(0, 0, 0)

  for (const l of labels) l.el.style.opacity = '0.95'
  for (const l of extraLabels) l.el.style.opacity = '0'
  projHeading.style.opacity = '0'
  projHeading.innerHTML = ''
  projCloseBtn.style.opacity = '0'
}

function runProjectTypewriter() {
  projHeading.innerHTML = ''
  const txt = document.createTextNode('')
  const cur = makeCursor()
  projHeading.appendChild(txt)
  projHeading.appendChild(cur)
  let i = 0
  const word = 'Projects'
  const t = setInterval(() => {
    txt.textContent = word.substring(0, i + 1)
    i++
    if (i >= word.length) {
      clearInterval(t)
      projHeading.removeChild(cur)
    }
  }, 60)
}

// --- Project mode ---

const PROJ_DUR = 1.0
let projectActive = false
let projectAnimDir = 0 // 1=entering, -1=exiting
let projectAnimStart = 0
const projCamA = new THREE.Vector3()
const projCamB = new THREE.Vector3()
const projLookA = new THREE.Vector3()
const projLookB = new THREE.Vector3()
const extraHovered = new Set()
let closestExtra = null
const extraLabels = []

const projCloseBtn = document.createElement('span')
projCloseBtn.textContent = '[ close ]'
projCloseBtn.style.cssText = [
  'position: fixed',
  'bottom: 10%',
  'left: 50%',
  'transform: translateX(-50%)',
  'z-index: 30',
  'font-family: monospace',
  'color: #fff',
  'font-size: 14px',
  'font-weight: 700',
  'letter-spacing: 2px',
  'cursor: pointer',
  'opacity: 0',
  'transition: opacity 0.3s',
  'pointer-events: auto',
].join(';') + ';'
projCloseBtn.addEventListener('mouseenter', () => { projCloseBtn.style.textShadow = '0 0 12px rgba(255,255,255,0.5)' })
projCloseBtn.addEventListener('mouseleave', () => { projCloseBtn.style.textShadow = 'none' })
projCloseBtn.addEventListener('click', closeProjectMode)
document.body.appendChild(projCloseBtn)

const projHeading = document.createElement('div')
projHeading.style.cssText = [
  'position: fixed',
  'bottom: 18%',
  'left: 50%',
  'transform: translateX(-50%)',
  'z-index: 30',
  'font-family: monospace',
  'color: #fff',
  'font-size: 20px',
  'font-weight: 700',
  'letter-spacing: 3px',
  'text-transform: uppercase',
  'opacity: 0',
  'transition: opacity 0.3s',
  'pointer-events: none',
].join(';') + ';'
document.body.appendChild(projHeading)

for (const extra of projectExtras) {
  const el = document.createElement('div')
  el.textContent = extra.label
  el.style.color = '#fff'
  el.style.fontFamily = 'monospace'
  el.style.fontSize = '16px'
  el.style.fontWeight = '900'
  el.style.webkitTextStroke = '2.5px #000'
  el.style.paintOrder = 'stroke fill'
  el.style.textShadow = '0 0 20px rgba(0, 0, 0, 0.8)'
  el.style.letterSpacing = '3px'
  el.style.textTransform = 'uppercase'
  el.style.opacity = '0'
  el.style.pointerEvents = 'none'

  const yOff = extra.height + 2
  const lx = extra.centroid.x
  const lz = -extra.centroid.z
  const label = new CSS2DObject(el)
  label.position.set(lx, yOff, lz)
  container.add(label)
  extraLabels.push({ label, extra, el, baseY: yOff })
}

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const hovered = new Set()
const meshes = glowTargets.map(t => t.mesh)
const extraMeshes = projectExtras.map(e => e.mesh)
const allClickMeshes = meshes.concat(extraMeshes)
let animDone = false

renderer.domElement.addEventListener('pointermove', e => {
  if (!animDone) {
    renderer.domElement.style.cursor = 'default'
    return
  }
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
  raycaster.setFromCamera(pointer, camera)

  const hits = raycaster.intersectObjects(allClickMeshes)
  hovered.clear()
  extraHovered.clear()
  closestExtra = null
  for (const hit of hits) {
    const target = glowTargets.find(t => t.mesh === hit.object)
    if (target) hovered.add(target)
    const extra = projectExtras.find(e => e.mesh === hit.object)
    if (extra) {
      extraHovered.add(extra)
      if (!closestExtra) closestExtra = extra
    }
  }
  renderer.domElement.style.cursor =
    hovered.size > 0 || (projectActive && extraHovered.size > 0) ? 'pointer' : 'default'
})

renderer.domElement.addEventListener('click', () => {
  if (!animDone || projectAnimDir !== 0 || aboutActive) return
  for (const target of hovered) {
    if (target.label === 'About') {
      openAbout()
    } else if (target.label === 'Projects') {
      if (!projectActive) openProjectMode()
    } else {
      console.log('Clicked:', target.label)
    }
  }
  if (closestExtra && projectActive) {
    if (extraHovered.size > 1 && closestExtra === infoTarget) {
      const other = projectExtras.find(e => e !== closestExtra && extraHovered.has(e))
      if (other) { closeInfoPanel(); openInfoPanel(other) }
      else { openInfoPanel(closestExtra) }
    } else {
      openInfoPanel(closestExtra)
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

  // edges fade in (fixed time)
  if (elapsed >= PHASE.start[PHASES.EDGES] && elapsed < phaseEnd(PHASES.EDGES)) {
    const p = progress(elapsed, PHASES.EDGES)
    if (allBuildings.length > 0) allBuildings[0].line.material.opacity = p
  } else if (elapsed >= phaseEnd(PHASES.EDGES)) {
    if (allBuildings.length > 0) allBuildings[0].line.material.opacity = 1
  }

  // phase 2+: snapshot 20% + state machine
  if (elapsed >= PHASE.start[PHASES.SAMPLE_20]) {
    for (const b of allBuildings) {
      if (b.colorPhase === 2) b.material.color.copy(b.baseColor)
    }

    if (subIdx === -1) {
      startSubtitle(0)
      stStart = elapsed
    }

    // 0: sub1 typing
    if (st === 0 && subTypingDone) {
      st = 1
      subHoldUntil = elapsed + 2.0
    }
    // 1: sub1 hold
    if (st === 1 && elapsed >= subHoldUntil) {
      subtitleEl.style.transition = 'opacity 0.3s'
      subtitleEl.style.opacity = '0'
      st = 2
      stStart = elapsed
    }
    // 2: color fill
    if (st >= 2) {
      const p = st === 2 ? Math.min(1, (elapsed - stStart) / PHASE.dur[PHASES.ALL_COLOR]) : 1
      for (const b of allBuildings) {
        if (b.colorPhase === 3) b.material.color.copy(b.baseColor).multiplyScalar(p)
      }
      if (st === 2 && p >= 1) {
        st = 3
        stStart = elapsed
        startSubtitle(1)
      }
    }
    // 3: extrusion + sub2 typing
    if (st === 3) {
      for (const b of allBuildings) {
        const start = stStart + b.extrudeDelay
        const p = elapsed <= start ? 0 : Math.min(1, (elapsed - start) / PHASE.dur[PHASES.EXTRUDE])
        b.mesh.scale.z = p
        b.line.scale.z = p
      }
      for (const target of glowTargets) {
        const start = stStart + target.extrudeDelay
        const p = elapsed <= start ? 0 : Math.min(1, (elapsed - start) / PHASE.dur[PHASES.EXTRUDE])
        for (const g of target.glows) g.mesh.scale.z = p
      }
      if (subTypingDone && subIdx === 1) {
        st = 4
        subHoldUntil = elapsed + 2.0
      }
    }
    // 4: sub2 hold
    if (st === 4 && elapsed >= subHoldUntil) {
      subtitleEl.style.transition = 'opacity 0.3s'
      subtitleEl.style.opacity = '0'
      st = 5
      stStart = elapsed
      startSubtitle(2)
    }
    // 5: glow instant + sub3 typing + pulsing
    if (st >= 5 && st < 7) {
      for (const target of glowTargets) {
        target.material.color.copy(target.highlightColor)
        for (const g of target.glows) {
          g.mesh.visible = true
        }
      }
      const puls = Math.sin(elapsed * 2) * 0.5 + 0.5
      for (const target of glowTargets) {
        for (const g of target.glows) {
          g.material.opacity = g.baseOpacity * (0.85 + puls * 0.15)
          const s = 1 + puls * 0.002
          g.mesh.scale.set(s, s, s)
        }
      }
      if (st === 5 && subTypingDone && subIdx === 2) {
        st = 6
        subHoldUntil = elapsed + 2.0
      }
    }
    // 6: sub3 hold
    if (st === 6 && elapsed >= subHoldUntil) {
      subtitleEl.style.transition = 'opacity 0.3s'
      subtitleEl.style.opacity = '0'
      st = 7
      if (!titleStarted) runTitleWriter()
    }
    // 7: title typing - glow static
    if (st === 7) {
      for (const target of glowTargets) {
        target.material.color.copy(target.highlightColor)
        for (const g of target.glows) {
          g.mesh.visible = true
          g.material.opacity = g.baseOpacity
        }
      }
    }
  }

  // 1s after title completes, enable bounce/hover/click
  if (titleComplete) {
    if (titleEndTime === 0) titleEndTime = elapsed
    if (elapsed - titleEndTime >= 1.0 && st < 8) {
      st = 8
      animDone = true
      for (const l of labels) l.el.style.opacity = '0.95'
    }
  }

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

  // project mode camera zoom
  if (projectAnimDir !== 0) {
    const t = Math.min(1, (elapsed - projectAnimStart) / PROJ_DUR)
    const et = easeInOutQuad(t)
    camera.position.lerpVectors(projCamA, projCamB, et)
    const look = new THREE.Vector3().lerpVectors(projLookA, projLookB, et)
    camera.lookAt(look)
    if (t >= 1) projectAnimDir = 0
  }

  updateInfoPanelPosition()

  if (st < 8) {
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
      const c = target.highlightColor.clone()
      c.lerp(new THREE.Color(0xffffff), 0.4)
      target.material.color.copy(c)
    } else {
      target.material.color.copy(target.highlightColor)
    }
  }

  // project extras glow + hover (only during project mode)
  if (projectActive) {
    for (const extra of projectExtras) {
      const isHovered = extraHovered.has(extra)
      const boost = isHovered ? 1.8 : 1
      const intensity = 0.85 + t * 0.15 * boost
      for (const g of extra.glows) {
        g.mesh.visible = true
        g.material.opacity = g.baseOpacity * intensity
        const s = 1 + t * 0.002 * boost
        g.mesh.scale.set(s, s, s)
      }
      if (isHovered) {
        const c = extra.highlightColor.clone()
        c.lerp(new THREE.Color(0xffffff), 0.4)
        extra.material.color.copy(c)
      } else {
        extra.material.color.copy(extra.highlightColor)
      }
    }
  }
  // extra labels bounce
  for (const l of extraLabels) {
    l.label.position.y = l.baseY + Math.sin(elapsed * 1.5) * 2
  }

  for (const l of labels) {
    const bounce = Math.sin(elapsed * 1.5 + l.target.centroid.x) * 4
    l.label.position.y = l.baseY + bounce
  }

  renderer.render(scene, camera)
  labelRenderer.render(scene, camera)
}
animate()
