import { gsap } from 'gsap'

function hash(row, col, seed) {
  const raw = Math.sin(row * seed + col * (seed * 2.45)) * 43758.5453
  return raw - Math.floor(raw)
}

export function pixelReveal(container, options = {}) {
  const {
    cellSize = 5,
    duration = 1,
    color = '#fff',
    spreadAbove = 0.25,
    spreadBelow = 0.25,
    scatterIntensity = 0.15,
    solidCoreRadius = 0.025,
    minScatterAtCenter = 0.3,
    visibilityThreshold = 0.65,
  } = options

  const w = container.offsetWidth
  const h = container.offsetHeight
  if (!w || !h) return

  const cols = Math.ceil(w / cellSize)
  const rows = Math.ceil(h / cellSize)
  const totalTravel = 1 + spreadAbove + spreadBelow
  const eps = 1e-6

  // Hide image behind clip — revealed in sync with pixel fall
  const img = container.querySelector('img')
  if (img) {
    img.style.opacity = '1'
    img.style.clipPath = 'inset(0 0 100% 0)'
  }

  const grid = document.createElement('div')
  grid.className = 'pixel-reveal-grid'
  grid.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;pointer-events:none;z-index:2;will-change:transform;'
  container.appendChild(grid)

  const cells = []
  const cellEls = []

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const el = document.createElement('div')
      el.style.cssText = `position:absolute;will-change:transform,opacity;left:${col * cellSize}px;top:${row * cellSize}px;width:${cellSize}px;height:${cellSize}px;background:${color};`
      grid.appendChild(el)
      cellEls.push(el)
      cells.push({ row, col, normalizedY: (row + 0.5) / rows })
    }
  }

  const visRandoms = cells.map(c => hash(c.row, c.col, 127.1))
  const scatterOffsets = cells.map(c => (hash(c.row, c.col, 269.3) - 0.5) * scatterIntensity)

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }

  gsap.to({}, {
    duration,
    ease: 'power2.out',
    onUpdate: function () {
      const progress = this.progress()
      const bandCenterY = -spreadAbove + progress * totalTravel

      // Reveal image from top: where band has passed, image shows
      if (img) {
        const revealPct = clamp(bandCenterY, 0, 1)
        img.style.clipPath = `inset(0 0 ${(1 - revealPct) * 100}% 0)`
      }

      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i]
        const rawDist = Math.abs(cell.normalizedY - bandCenterY)
        const scatterStrength = clamp(minScatterAtCenter, 1, rawDist / (solidCoreRadius + eps))
        const scatteredDist = cell.normalizedY - bandCenterY + scatterOffsets[i] * scatterStrength
        const normalizedDist = scatteredDist >= 0
          ? scatteredDist / spreadBelow
          : Math.abs(scatteredDist) / spreadAbove

        if (normalizedDist >= 1) {
          cellEls[i].style.opacity = '0'
          cellEls[i].style.transform = `translateY(${cellSize}px)`
          continue
        }

        const density = (1 - normalizedDist) * (1 - normalizedDist)
        const isVisible = density > visRandoms[i] * visibilityThreshold
        if (isVisible) {
          cellEls[i].style.opacity = '1'
          cellEls[i].style.transform = 'translateY(0)'
        } else {
          cellEls[i].style.opacity = '0'
          cellEls[i].style.transform = `translateY(${cellSize * (1 - density)}px)`
        }
      }
    },
    onComplete: () => {
      const g = container.querySelector('.pixel-reveal-grid')
      if (g) g.remove()
      if (img) img.style.clipPath = ''
    },
  })
}
