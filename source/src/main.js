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

const { group, glowTargets } = await loadBuildings()
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
  el.style.opacity = '0.95'
  el.style.cursor = 'pointer'
  el.style.pointerEvents = 'auto'

  const yOff = target.height + 2
  const lx = target.centroid.x
  const lz = -target.centroid.z
  console.log('Label:', target.label, 'at', lx.toFixed(1), yOff.toFixed(1), lz.toFixed(1))

  const label = new CSS2DObject(el)
  label.position.set(lx, yOff, lz)
  scene.add(label)
  labels.push({ label, target, el, baseY: yOff })
}

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const hovered = new Set()
const meshes = glowTargets.map(t => t.mesh)

renderer.domElement.addEventListener('pointermove', e => {
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
  for (const target of hovered) {
    console.log('Clicked:', target.label, target.mesh.position)
  }
})

const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const elapsed = clock.getElapsedTime()
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
