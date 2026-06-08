import * as THREE from 'three'

function polygonArea(coords) {
  let area = 0
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    area += (coords[j][0] + coords[i][0]) * (coords[j][1] - coords[i][1])
  }
  return Math.abs(area) / 2
}

function yearColor(t) {
  const c = new THREE.Color()
  if (t < 0.5) {
    c.lerpColors(
      new THREE.Color('#1a2a6c'),
      new THREE.Color('#3a7ca5'),
      t * 2
    )
  } else {
    c.lerpColors(
      new THREE.Color('#3a7ca5'),
      new THREE.Color('#d4a843'),
      (t - 0.5) * 2
    )
  }
  return c
}

function polygonCentroid(coords) {
  let cx = 0, cy = 0, area = 0
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const a = coords[j][0] * coords[i][1] - coords[i][0] * coords[j][1]
    area += a
    cx += (coords[j][0] + coords[i][0]) * a
    cy += (coords[j][1] + coords[i][1]) * a
  }
  area /= 2
  return { x: cx / (6 * area), z: cy / (6 * area) }
}

function adjustSaturation(color, factor) {
  const hsl = {}
  color.getHSL(hsl)
  hsl.s = Math.min(1, Math.max(0, hsl.s * factor))
  return color.setHSL(hsl.h, hsl.s, hsl.l)
}

function addGlow(group, geom, pos, color) {
  const layers = [
    { scale: 1.008, opacity: 0.2 },
    { scale: 1.02, opacity: 0.06 },
    { scale: 1.04, opacity: 0.02 },
  ]

  const glows = []
  for (const layer of layers) {
    const g = geom.clone()
    g.scale(layer.scale, layer.scale, 1)
    const m = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: layer.opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    const mesh = new THREE.Mesh(g, m)
    mesh.rotation.x = -Math.PI / 2
    mesh.scale.z = 0
    mesh.position.copy(pos)
    group.add(mesh)
    glows.push({ mesh, material: m, baseOpacity: layer.opacity })
  }
  return glows
}

export async function loadBuildings() {
  const response = await fetch('/footprints_centered.geojson')
  const data = await response.json()

  const features = data.features.filter(f => f.geometry.type === 'Polygon')

  const years = features.map(f => f.properties.year)
  const minYear = Math.min(...years)
  const maxYear = Math.max(...years)

  const polyData = features.map(f => ({
    exterior: f.geometry.coordinates[0],
    area: polygonArea(f.geometry.coordinates[0]),
  }))

  polyData.sort((a, b) => a.area - b.area)
  const areaThreshold = polyData[Math.floor(polyData.length * 0.85)].area

  const group = new THREE.Group()
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
  const allBuildings = []
  const glowTargets = []

  for (const feature of features) {
    const geo = feature.geometry
    if (geo.type !== 'Polygon') continue

    const exterior = geo.coordinates[0]
    const holes = geo.coordinates.slice(1).map(ring =>
      ring.map(([x, y]) => new THREE.Vector2(x, y))
    )

    const shape = new THREE.Shape(
      exterior.map(([x, y]) => new THREE.Vector2(x, y))
    )

    for (const hole of holes) {
      shape.holes.push(new THREE.Path(hole))
    }

    const t = (feature.properties.year - minYear) / (maxYear - minYear)

    const isTarget =
      feature.properties.id === 'NL32B_N326E397_Y2596.6553_X3343.2809' ||
      feature.properties.id === 'NL32B_N326E397_Y2400.9044_X3394.3630'

    const color = yearColor(t)
    adjustSaturation(color, isTarget ? 1.8 : 0.75)
    const baseColor = color.clone()
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.DoubleSide,
    })

    const area = polygonArea(exterior)
    const height = area > areaThreshold
      ? 20 + Math.random() * 5
      : 10 + Math.random() * 5

    const extrudeSettings = { depth: height, bevelEnabled: false }
    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings)

    const mesh = new THREE.Mesh(geom, fillMat)
    mesh.rotation.x = -Math.PI / 2
    mesh.scale.z = 0
    group.add(mesh)

    const edges = new THREE.EdgesGeometry(geom)
    const line = new THREE.LineSegments(edges, edgeMat)
    line.rotation.x = -Math.PI / 2
    line.scale.z = 0
    group.add(line)

    const extrudeDelay = Math.random() * 0.8
    const colorPhase = Math.random() < 0.2 ? 2 : 3

    if (!isTarget) {
      allBuildings.push({ mesh, line, material: fillMat, baseColor, height, extrudeDelay, colorPhase })
    }

    if (isTarget) {
      mesh.visible = false
      line.visible = false
      const isBlue = feature.properties.id === 'NL32B_N326E397_Y2400.9044_X3394.3630'
      const glows = addGlow(group, geom, mesh.position, isBlue ? 0x6688ff : 0xff8800)
      for (const g of glows) {
        g.mesh.visible = false
      }
      const centroid = polygonCentroid(exterior)
      glowTargets.push({ glows, mesh, material: fillMat, baseColor, line, height, centroid, label: isBlue ? 'Projects' : 'About', extrudeDelay })
    }
  }

  return { group, glowTargets, allBuildings }
}
