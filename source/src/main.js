import * as THREE from 'three'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { loadBuildings } from './loadBuildings.js'
import { gsap } from 'gsap'
import { vertexShader, fragmentShader } from './waveShader.js'
import { pixelReveal } from './pixelReveal.js'

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
  const s = new THREE.Vector2()
  renderer.getDrawingBufferSize(s)
  if (targetA) targetA.setSize(s.x, s.y)
  if (targetB) targetB.setSize(s.x, s.y)
  if (overlayQuad) {
    overlayQuad.material.uniforms.uResolution.value.set(s.x, s.y)
  }
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
const LINE_CLASS = 'font-size: clamp(18px, 2.2vw, 22px); font-weight: 700; letter-spacing: 2px; white-space: nowrap; overflow: hidden; min-height: 1.4em;'

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
  'font-size: clamp(12px, 1.4vw, 16px)',
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
        const cursorHtml = '<span style="animation:cur-blink 0.8s step-end infinite">\u2588</span>'
        html += cursorHtml
        titleLine2Div.innerHTML = html
        j++
        if (j >= TITLE_LINE2.length) {
          clearInterval(t2)
          titleLine2Div.innerHTML = html.replace(cursorHtml, '')
          titleComplete = true
        }
      }, 25)
      titleTimers.push(t2)
    }
  }, 30)
  titleTimers.push(t1)
}

// animation state machine
let st = 0 // 0=sub1 typing, 1=sub1 hold, 2=sub2 typing, 3=sub2 hold, 4=wave, 5=extrusion, 6=glow+sub3, 7=sub3 hold, 8=title, 9=done
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
  }, 30)
}

function startWaveTransition() {
  overlayActive = true
  overlayDone = false
  for (const b of allBuildings) {
    b._origColor = b.material.color.clone()
    if (b.colorPhase === 2) {
      b.material.color.copy(b.baseColor)
    } else {
      b.material.color.set(0x000000)
    }
  }
  renderer.setRenderTarget(targetA)
  renderer.render(scene, camera)
  for (const b of allBuildings) {
    b.material.color.copy(b.baseColor)
  }
  renderer.setRenderTarget(targetB)
  renderer.render(scene, camera)
  renderer.setRenderTarget(null)
  for (const b of allBuildings) {
    b.material.color.copy(b._origColor)
    delete b._origColor
  }
  overlayQuad.material.uniforms.uTexture1.value = targetA.texture
  overlayQuad.material.uniforms.uTexture2.value = targetB.texture
  overlayQuad.material.uniforms.uTexture1Size.value.set(targetA.width, targetA.height)
  overlayQuad.material.uniforms.uTexture2Size.value.set(targetB.width, targetB.height)
  overlayQuad.material.uniforms.uProgress.value = 0
  gsap.to(overlayQuad.material.uniforms.uProgress, {
    value: 1,
    duration: 1.8,
    ease: 'power4.in',
    onComplete: () => {
      overlayDone = true
    },
  })
}

// --- About section ---

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
let skillsActive = false

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
  'font-size: clamp(15px, 1.8vw, 20px)',
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
  'font-size: clamp(10px, 1.1vw, 13px)',
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
  'font-size: clamp(10px, 1.1vw, 13px)',
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
  }, 30)
}

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
      setTimeout(() => pixelReveal(contactImgWrapper), 500)
      contactCloseBtn.style.transition = 'opacity 0.6s'
      contactCloseBtn.style.opacity = '1'
    }
  }, 30)
}

function openAbout() {
  if (aboutActive || contactActive || skillsActive || topicsActive || slideDir !== 0 || projectActive || projectAnimDir !== 0) return
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

function closeAbout() {
  if (!aboutActive || slideDir !== 0) return
  aboutActive = false
  slideDir = -1
  slideStartTime = clock.getElapsedTime()
  for (const l of labels) {
    l.el.style.opacity = '0.95'
  }
}

// --- Construction banner ---

const constructionBanner = document.createElement('div')
constructionBanner.style.cssText = [
  'position: fixed',
  'bottom: 24px',
  'left: 24px',
  'z-index: 20',
  'font-family: monospace',
  'font-size: clamp(12px, 1.4vw, 16px)',
  'font-weight: 700',
  'color: #000',
  'background: #fff',
  'padding: 10px 18px',
  'line-height: 1',
  'pointer-events: none',
  '-webkit-mask-image: linear-gradient(to right, transparent 0px, black 8px calc(100% - 8px), transparent 100%), linear-gradient(to bottom, transparent 0px, black 8px calc(100% - 8px), transparent 100%)',
  '-webkit-mask-composite: intersect',
  'mask-image: linear-gradient(to right, transparent 0px, black 8px calc(100% - 8px), transparent 100%), linear-gradient(to bottom, transparent 0px, black 8px calc(100% - 8px), transparent 100%)',
  'mask-composite: intersect',
].join(';') + ';'
constructionBanner.textContent = '\u{1F6A7} website under construction'
document.body.appendChild(constructionBanner)

// --- Contact section ---

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
  'font-size: clamp(15px, 1.8vw, 20px)',
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
  'font-size: clamp(10px, 1.1vw, 13px)',
  'line-height: 1.7',
  'letter-spacing: 0.5px',
  'opacity: 0',
].join(';') + ';'
contactBody.textContent = 'milojevic-dupont (at) pm.me'
contactInner.appendChild(contactBody)

const contactImgWrapper = document.createElement('div')
contactImgWrapper.style.cssText = [
  'display: block',
  'width: 62.5%',
  'margin-top: 28px',
  'position: relative',
  'overflow: hidden',
  '-webkit-mask-image: linear-gradient(to right, transparent 0px, black 20px calc(100% - 20px), transparent 100%), linear-gradient(to bottom, transparent 0px, black 20px calc(100% - 20px), transparent 100%)',
  '-webkit-mask-composite: intersect',
  'mask-image: linear-gradient(to right, transparent 0px, black 20px calc(100% - 20px), transparent 100%), linear-gradient(to bottom, transparent 0px, black 20px calc(100% - 20px), transparent 100%)',
  'mask-composite: intersect',
].join(';') + ';'

const contactImg = document.createElement('img')
contactImg.src = 'imgs/profile.webp'
contactImg.style.cssText = [
  'display: block',
  'width: 100%',
  'opacity: 1',
  'clip-path: inset(0 0 100% 0)',
].join(';') + ';'
contactImg.alt = 'Profile photo'
contactImgWrapper.appendChild(contactImg)
contactInner.appendChild(contactImgWrapper)

const contactCloseBtn = document.createElement('span')
contactCloseBtn.textContent = '[ close ]'
contactCloseBtn.style.cssText = [
  'display: inline-block',
  'margin-top: 24px',
  'font-size: clamp(10px, 1.1vw, 13px)',
  'font-weight: 700',
  'letter-spacing: 2px',
  'cursor: pointer',
  'pointer-events: auto',
  'opacity: 0',
  'transition: opacity 0.3s',
].join(';') + ';'
contactCloseBtn.addEventListener('mouseenter', () => { contactCloseBtn.style.textShadow = '0 0 12px rgba(255,255,255,0.5)' })
contactCloseBtn.addEventListener('mouseleave', () => { contactCloseBtn.style.textShadow = 'none' })
contactCloseBtn.addEventListener('click', closeContact)
contactInner.appendChild(contactCloseBtn)

function openContact() {
  if (contactActive || aboutActive || skillsActive || topicsActive || slideDir !== 0 || projectActive || projectAnimDir !== 0) return
  contactActive = true
  slideDir = 1
  slideTargetX = 120
  slidePanel = contactPanel
  slidePanelSign = -1
  slideStartTime = clock.getElapsedTime()
  for (const l of labels) {
    l.el.style.opacity = '0'
  }
  contactPanel.style.opacity = '1'
  contactHeading.innerHTML = ''
  contactBody.style.opacity = '0'
  contactImg.style.clipPath = 'inset(0 0 100% 0)'
  const oldGrid = contactImgWrapper.querySelector('.pixel-reveal-grid')
  if (oldGrid) oldGrid.remove()
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

// --- Skills section ---

const skillsPanel = document.createElement('div')
skillsPanel.style.cssText = [
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
document.body.appendChild(skillsPanel)

const skillsInner = document.createElement('div')
skillsInner.style.cssText = [
  'padding: 4% 8% 0 8%',
  'height: 100%',
  'overflow-y: auto',
  'pointer-events: auto',
  'box-sizing: border-box',
  'display: flex',
  'flex-direction: column',
].join(';') + ';'
skillsPanel.appendChild(skillsInner)

const skillsHeading = document.createElement('h1')
skillsHeading.textContent = 'SKILLS'
skillsHeading.style.cssText = [
  'font-size: clamp(15px, 1.8vw, 20px)',
  'font-weight: 700',
  'letter-spacing: 3px',
  'text-transform: uppercase',
  'text-align: center',
  'margin: 0 0 28px 0',
  'min-height: 1.4em',
].join(';') + ';'
skillsInner.appendChild(skillsHeading)

const skillsGrid = document.createElement('div')
skillsGrid.style.cssText = [
  'display: grid',
  'grid-template-columns: 1fr 1fr',
  'gap: 16px',
  'flex: 1',
  'align-content: center',
].join(';') + ';'

const skillNames = [
  'Applied Machine\nLearning',
  'Geospatial Data\nEngineering',
  'Desk Research /\nWriting',
  'Education',
  'Project\nManagement',
  'Design',
]
for (const name of skillNames) {
  const box = document.createElement('div')
  box.textContent = name
  box.style.cssText = [
    'background: #000',
    'border: 1px solid #fff',
    'border-radius: 8px',
    'padding: 18px 16px',
    'font-size: clamp(12px, 1.4vw, 16px)',
    'line-height: 1.4',
    'text-align: center',
    'white-space: pre-wrap',
    'pointer-events: auto',
    'cursor: pointer',
    'display: flex',
    'align-items: center',
    'justify-content: center',
    'transition: border-color 0.2s, background 0.2s',
  ].join(';') + ';'
  box.addEventListener('mouseenter', () => {
    box.style.borderColor = '#88ccff'
    box.style.background = '#111'
  })
  box.addEventListener('mouseleave', () => {
    box.style.borderColor = '#fff'
    box.style.background = '#000'
  })
  skillsGrid.appendChild(box)
}
skillsInner.appendChild(skillsGrid)

const skillsCloseBtn = document.createElement('span')
skillsCloseBtn.textContent = '[ close ]'
skillsCloseBtn.style.cssText = [
  'display: inline-block',
  'margin-top: 6px',
  'margin-bottom: 24px',
  'font-size: clamp(10px, 1.1vw, 13px)',
  'font-weight: 700',
  'letter-spacing: 2px',
  'cursor: pointer',
  'pointer-events: auto',
  'opacity: 0',
  'transition: opacity 0.3s',
  'align-self: center',
].join(';') + ';'
skillsCloseBtn.addEventListener('mouseenter', () => { skillsCloseBtn.style.textShadow = '0 0 12px rgba(255,255,255,0.5)' })
skillsCloseBtn.addEventListener('mouseleave', () => { skillsCloseBtn.style.textShadow = 'none' })
skillsCloseBtn.addEventListener('click', closeSkills)
skillsInner.appendChild(skillsCloseBtn)

function openSkills() {
  if (skillsActive || topicsActive || aboutActive || contactActive || slideDir !== 0 || projectActive || projectAnimDir !== 0) return
  skillsActive = true
  slideDir = 1
  slideTargetX = -SLIDE_X
  slidePanel = skillsPanel
  slidePanelSign = 1
  slideStartTime = clock.getElapsedTime()
  for (const l of labels) l.el.style.opacity = '0'
  skillsPanel.style.opacity = '1'
  skillsCloseBtn.style.opacity = '0'
  setTimeout(() => {
    skillsCloseBtn.style.transition = 'opacity 0.6s'
    skillsCloseBtn.style.opacity = '1'
  }, 1300)
}

function closeSkills() {
  if (!skillsActive || slideDir !== 0) return
  skillsActive = false
  slideDir = -1
  slideStartTime = clock.getElapsedTime()
  for (const l of labels) l.el.style.opacity = '0.95'
}

// --- Topics section ---

let topicsActive = false

const topicsPanel = document.createElement('div')
topicsPanel.style.cssText = [
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
document.body.appendChild(topicsPanel)

const topicsInner = document.createElement('div')
topicsInner.style.cssText = [
  'padding: 4% 8% 0 8%',
  'height: 100%',
  'overflow-y: auto',
  'pointer-events: auto',
  'box-sizing: border-box',
  'display: flex',
  'flex-direction: column',
].join(';') + ';'
topicsPanel.appendChild(topicsInner)

const topicsHeading = document.createElement('h1')
topicsHeading.textContent = 'TOPICS'
topicsHeading.style.cssText = [
  'font-size: clamp(15px, 1.8vw, 20px)',
  'font-weight: 700',
  'letter-spacing: 3px',
  'text-transform: uppercase',
  'text-align: center',
  'margin: 0 0 28px 0',
  'min-height: 1.4em',
].join(';') + ';'
topicsInner.appendChild(topicsHeading)

const topicsGrid = document.createElement('div')
topicsGrid.style.cssText = [
  'display: grid',
  'grid-template-columns: 1fr 1fr',
  'gap: 16px',
  'flex: 1',
  'align-content: center',
].join(';') + ';'

const topicNames = [
  'Spatial\nInvestigations',
  'AI for Climate',
  'Geospatial AI\nDevelopment',
  'Livable &\nSustainable Cities',
  'Science\nCommunication',
  'Open Data\nStrategies',
]
for (const name of topicNames) {
  const box = document.createElement('div')
  box.textContent = name
  box.style.cssText = [
    'background: #000',
    'border: 1px solid #fff',
    'border-radius: 8px',
    'padding: 18px 16px',
    'font-size: clamp(12px, 1.4vw, 16px)',
    'line-height: 1.4',
    'text-align: center',
    'white-space: pre-wrap',
    'pointer-events: auto',
    'cursor: pointer',
    'display: flex',
    'align-items: center',
    'justify-content: center',
    'transition: border-color 0.2s, background 0.2s',
  ].join(';') + ';'
  box.addEventListener('mouseenter', () => {
    box.style.borderColor = '#88ccff'
    box.style.background = '#111'
  })
  box.addEventListener('mouseleave', () => {
    box.style.borderColor = '#fff'
    box.style.background = '#000'
  })
  topicsGrid.appendChild(box)
}
topicsInner.appendChild(topicsGrid)

const topicsCloseBtn = document.createElement('span')
topicsCloseBtn.textContent = '[ close ]'
topicsCloseBtn.style.cssText = [
  'display: inline-block',
  'margin-top: 6px',
  'margin-bottom: 24px',
  'font-size: clamp(10px, 1.1vw, 13px)',
  'font-weight: 700',
  'letter-spacing: 2px',
  'cursor: pointer',
  'pointer-events: auto',
  'opacity: 0',
  'transition: opacity 0.3s',
  'align-self: center',
].join(';') + ';'
topicsCloseBtn.addEventListener('mouseenter', () => { topicsCloseBtn.style.textShadow = '0 0 12px rgba(255,255,255,0.5)' })
topicsCloseBtn.addEventListener('mouseleave', () => { topicsCloseBtn.style.textShadow = 'none' })
topicsCloseBtn.addEventListener('click', closeTopics)
topicsInner.appendChild(topicsCloseBtn)

function openTopics() {
  if (topicsActive || skillsActive || aboutActive || contactActive || slideDir !== 0 || projectActive || projectAnimDir !== 0) return
  topicsActive = true
  slideDir = 1
  slideTargetX = SLIDE_X
  slidePanel = topicsPanel
  slidePanelSign = -1
  slideStartTime = clock.getElapsedTime()
  for (const l of labels) l.el.style.opacity = '0'
  topicsPanel.style.opacity = '1'
  topicsCloseBtn.style.opacity = '0'
  setTimeout(() => {
    topicsCloseBtn.style.transition = 'opacity 0.6s'
    topicsCloseBtn.style.opacity = '1'
  }, 1300)
}

function closeTopics() {
  if (!topicsActive || slideDir !== 0) return
  topicsActive = false
  slideDir = -1
  slideStartTime = clock.getElapsedTime()
  for (const l of labels) l.el.style.opacity = '0.95'
}

// --- Info panels (EUBUCCO / DBSM) ---

const linkStyle = 'color:#88bbff;text-decoration:underline;pointer-events:auto'
const infoData = {
  EUBUCCO: 'EUBUCCO is a scientific database of individual building footprints for 322+ million buildings across the 27 European Union countries, Norway, Switzerland, and the UK. It is composed of 55 open datasets, including government registries (62.2%), OpenStreetMap (17.4%), and Microsoft building footprints (20.4%) that have been collected, harmonized, and validated.',
  DBSM: 'The EU Digital Building Stock Model (DBSM) provides a detailed and comprehensive and homogeneous geospatial database of individual buildings across the European Union. While primarily focused on energy-related characteristics, the model supports a broad range of applications. DBSM enables bottom-up solutions from individual building level to entire neighborhoods and national scales.',
  'AI Climate Institute': 'Preparation, coordination, delivery and curation of an online repository for a 3-day capacity building event in Bel\u00e9m, Brazil, together with the CCAI leadership. Curriculum designed to provide a critical understanding of how AI can be applied ethically, effectively, and in context to mitigate and adapt to the climate crisis.<br><br>Work for CCAI and Open Society Foundation; with support from the COP30 Presidency and Brazilian Ministry of Foreign Affairs, and others.<br><br><a style="' + linkStyle + '" href="https://www.climatechange.ai/events/ai_climate_institute" target="_blank">event</a> \u2022 <a style="' + linkStyle + '" href="https://www.climatechange.ai/events/ai_climate_institute/repository" target="_blank">resource repository</a>',
  "CCAI's Data Gaps": 'Auditing and consolidation of an online repository aiming to identify and catalog critical data gaps that impede AI/ML applications in addressing climate change, and lay out pathways for filling these gaps.<br><br>Work for CCAI and Google DeepMind.<br><br><a style="' + linkStyle + '" href="https://www.climatechange.ai/dev/datagaps" target="_blank">Learn more</a>',
  'Academic Research': 'My work has broadly investigated the pathway from research to deployment of AI systems for climate action in cities, focusing on narratives, data needs, tool development, and practical deployment considerations. <a style="' + linkStyle + '" href="https://scholar.google.com/citations?user=49xLPo8AAAAJ&amp;hl=de" target="_blank">Google Scholar</a><br><br>I am co-author of the foundational paper \u201CTackling Climate Change with Machine Learning\u201D that contributed to start the research field of AI for Climate. <a style="' + linkStyle + '" href="https://dl.acm.org/doi/full/10.1145/3485128" target="_blank">ACM</a><br><br>This thesis explores how the increasing availability of geospatial data on cities and artificial intelligence (AI) algorithms used to process them may provide new insights for addressing these urban planning issues. Indeed, available data now allows us to study building stocks, streets, and other urban land uses \u2013 together forming urban form \u2013 at high resolution, but also in a scalable way from neighborhoods to countries. We investigate whether this may help bridge the gap between localized and scalable urban climate solutions... <a style="' + linkStyle + '" href="https://depositonce.tu-berlin.de/items/da94c4cc-c088-4b8d-836e-5cfc37d2c149" target="_blank">PhD thesis</a>',
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
  'font-size: clamp(15px, 1.8vw, 20px)',
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
  'font-size: clamp(10px, 1.1vw, 13px)',
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
  'font-size: clamp(10px, 1.1vw, 13px)',
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

const infoImgPanel = document.createElement('div')
infoImgPanel.style.cssText = [
  'position: fixed',
  'bottom: 8%',
  'z-index: 31',
  'opacity: 0',
  'transition: opacity 0.4s',
  'pointer-events: none',
  '-webkit-mask-image: linear-gradient(to right, transparent 0px, black 10px calc(100% - 10px), transparent 100%), linear-gradient(to bottom, transparent 0px, black 10px calc(100% - 10px), transparent 100%)',
  '-webkit-mask-composite: intersect',
  'mask-image: linear-gradient(to right, transparent 0px, black 10px calc(100% - 10px), transparent 100%), linear-gradient(to bottom, transparent 0px, black 10px calc(100% - 10px), transparent 100%)',
  'mask-composite: intersect',
].join(';') + ';'
const infoImg = document.createElement('img')
infoImg.style.cssText = 'display:block;clip-path:inset(0 0 100% 0)'
infoImg.alt = ''
infoImgPanel.appendChild(infoImg)
document.body.appendChild(infoImgPanel)

const extraImages = {
  'AI Climate Institute': { src: '/imgs/RAF_1922.webp', width: 400, side: 'right', bottom: '8%' },
  "CCAI's Data Gaps": { src: '/imgs/data_gaps.webp', width: 672, side: 'right', bottom: '8%' },
  'Academic Research': { src: '/imgs/thesis.webp', width: 400, side: 'right', bottom: '8%' },
  'EUBUCCO': { src: '/imgs/EUBUCCO.webp', width: 600, side: 'right', bottom: '12%' },
  'DBSM': { src: '/imgs/DBSM.webp', width: 600, side: 'left', bottom: '12%' },
}

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
      p.style.margin = '0 0 0.6em 0'
      p.style.lineHeight = '1.7'
      p.innerHTML = infoData[word]
      infoBody.innerHTML = ''
      infoBody.appendChild(p)

      infoBody.style.transition = 'opacity 0.6s'
      infoBody.style.opacity = '1'
      infoCloseBtn.style.transition = 'opacity 0.6s'
      infoCloseBtn.style.opacity = '1'
      setTimeout(() => {
        const imgCfg = extraImages[extra.label]
        if (imgCfg) {
          infoImg.style.clipPath = 'inset(0 0 100% 0)'
          const oldGrid = infoImgPanel.querySelector('.pixel-reveal-grid')
          if (oldGrid) oldGrid.remove()
          const doReveal = () => {
            pixelReveal(infoImgPanel)
          }
          infoImg.addEventListener('load', doReveal, { once: true })
          infoImg.src = imgCfg.src
          infoImg.style.width = imgCfg.width + 'px'
          infoImgPanel.style.right = imgCfg.side === 'left' ? 'auto' : '3%'
          infoImgPanel.style.left = imgCfg.side === 'left' ? '3%' : 'auto'
          infoImgPanel.style.bottom = imgCfg.bottom || '8%'
          infoImgPanel.style.opacity = '1'
          if (infoImg.complete) doReveal()
        } else {
          infoImgPanel.style.opacity = '0'
        }
      }, 600)
    }
  }, 30)

  infoPanel.style.opacity = '1'
}

function closeInfoPanel() {
  if (!infoActive) return
  infoActive = false
  infoTarget = null
  infoImgPanel.style.opacity = '0'
  infoPanel.style.opacity = '0'
  const oldGrid = infoImgPanel.querySelector('.pixel-reveal-grid')
  if (oldGrid) oldGrid.remove()
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
  const imgCfg = extraImages[infoTarget.label]
  if (imgCfg) {
    const shift = imgCfg.width + 40
    left += imgCfg.side === 'left' ? shift : -shift
  }
  infoPanel.style.left = Math.max(GAP, Math.min(left, window.innerWidth - pw - GAP)) + 'px'

  let top = (window.innerHeight - ph) / 2
  top = Math.max(GAP, Math.min(top, window.innerHeight * 0.74 - ph))
  infoPanel.style.top = top + 'px'
}

function openProjectMode() {
  if (projectActive || projectAnimDir !== 0 || aboutActive || contactActive || skillsActive || topicsActive || slideDir !== 0) return
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
  const word = 'Recent Projects'
  const t = setInterval(() => {
    txt.textContent = word.substring(0, i + 1)
    i++
    if (i >= word.length) {
      clearInterval(t)
      projHeading.removeChild(cur)
    }
  }, 30)
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
  'font-size: clamp(10px, 1.1vw, 13px)',
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
  'font-size: clamp(15px, 1.8vw, 20px)',
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
  el.innerHTML = extra.displayLabel
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

let animDone = false
let targetA, targetB, overlayScene, overlayCamera, overlayQuad, overlayActive = false, overlayDone = false

// overlay setup
const dSize = new THREE.Vector2()
renderer.getDrawingBufferSize(dSize)
targetA = new THREE.WebGLRenderTarget(dSize.x, dSize.y)
targetB = new THREE.WebGLRenderTarget(dSize.x, dSize.y)
overlayScene = new THREE.Scene()
overlayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
const overlayMat = new THREE.ShaderMaterial({
  uniforms: {
    uTexture1: { value: null },
    uTexture2: { value: null },
    uProgress: { value: 0 },
    uResolution: { value: new THREE.Vector2(dSize.x, dSize.y) },
    uTexture1Size: { value: new THREE.Vector2(dSize.x, dSize.y) },
    uTexture2Size: { value: new THREE.Vector2(dSize.x, dSize.y) },
  },
  vertexShader,
  fragmentShader,
  side: THREE.DoubleSide,
  depthWrite: false,
  depthTest: false,
})
const overlayGeo = new THREE.PlaneGeometry(2, 2)
overlayQuad = new THREE.Mesh(overlayGeo, overlayMat)
overlayScene.add(overlayQuad)

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const hovered = new Set()
const meshes = glowTargets.map(t => t.mesh)
const extraMeshes = projectExtras.map(e => e.mesh)
const allClickMeshes = meshes.concat(extraMeshes)

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
    !projectActive && hovered.size > 0 || projectActive && extraHovered.size > 0 ? 'pointer' : 'default'
})

renderer.domElement.addEventListener('click', () => {
  if (!animDone || projectAnimDir !== 0 || aboutActive || contactActive || skillsActive || topicsActive) return
  for (const target of hovered) {
    if (target.label === 'About') {
      openAbout()
    } else if (target.label === 'Projects') {
      if (!projectActive) openProjectMode()
    } else if (target.label === 'Contact') {
      openContact()
    } else if (target.label === 'SKILLS') {
      openSkills()
    } else if (target.label === 'TOPICS') {
      openTopics()
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
      startSubtitle(1)
    }
    // 2: sub2 typing
    if (st === 2 && subTypingDone && subIdx === 1) {
      st = 3
      subHoldUntil = elapsed + 2.0
    }
    // 3: sub2 hold
    if (st === 3 && elapsed >= subHoldUntil) {
      subtitleEl.style.transition = 'opacity 0.3s'
      subtitleEl.style.opacity = '0'
      st = 4
      stStart = elapsed
    }
    // 4: wave overlay
    if (st === 4) {
      if (!overlayActive && !overlayDone) {
        startWaveTransition()
      }
      if (overlayDone) {
        for (const b of allBuildings) {
          b.material.color.copy(b.baseColor)
        }
        overlayActive = false
        overlayDone = false
        st = 5
        stStart = elapsed
      }
    }
    // 5: extrusion
    if (st === 5) {
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
      if (elapsed - stStart >= 3.2) {
        st = 6
        stStart = elapsed
        startSubtitle(2)
      }
    }
    // 6: glow + sub3 typing
    if (st >= 6 && st < 8) {
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
      if (st === 6 && subTypingDone && subIdx === 2) {
        st = 7
        subHoldUntil = elapsed + 2.0
      }
    }
    // 7: sub3 hold
    if (st === 7 && elapsed >= subHoldUntil) {
      subtitleEl.style.transition = 'opacity 0.3s'
      subtitleEl.style.opacity = '0'
      st = 8
      if (!titleStarted) runTitleWriter()
    }
    // 8: title typing - glow static
    if (st === 8) {
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
    if (elapsed - titleEndTime >= 1.0 && st < 9) {
      st = 9
      animDone = true
      for (const l of labels) l.el.style.opacity = '0.95'
    }
  }

  // slide scene for about/contact panels
  if (slideDir !== 0) {
    const t = Math.min(1, (elapsed - slideStartTime) / SLIDE_DUR)
    const et = easeInOutQuad(t)
    const srcX = slideDir === 1 ? 0 : slideTargetX
    const dstX = slideDir === 1 ? slideTargetX : 0
    container.position.x = srcX + (dstX - srcX) * et
    const targetScale = slidePanel === aboutPanel || slidePanel === skillsPanel || slidePanel === topicsPanel ? 0.8 : 1.0
    const srcS = slideDir === 1 ? 1 : targetScale
    const dstS = slideDir === 1 ? targetScale : 1
    container.scale.setScalar(srcS + (dstS - srcS) * et)
    const panelSrc = slideDir === 1 ? slidePanelSign * 100 : 0
    const panelDst = slideDir === 1 ? 0 : slidePanelSign * 100
    const tx = panelSrc + (panelDst - panelSrc) * et
    slidePanel.style.transform = 'translateX(' + tx + '%)'
    slidePanel.style.opacity = String(slideDir === 1 ? t : 1 - t)
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

  if (st < 9) {
    if (overlayActive && overlayQuad) {
      renderer.render(overlayScene, overlayCamera)
    } else {
      renderer.render(scene, camera)
      labelRenderer.render(scene, camera)
    }
    return
  }

  // post-animation: glow pulse, hover, bounce
  const t = Math.sin(elapsed * 2) * 0.5 + 0.5

  for (const target of glowTargets) {
    const isHovered = !projectActive && hovered.has(target)
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
      const c = extra.highlightColor.clone()
      c.lerp(new THREE.Color(0xffffff), isHovered ? 0.4 : 0.2)
      extra.material.color.copy(c)
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
