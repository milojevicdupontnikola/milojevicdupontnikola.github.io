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

function inflateGeometry(geom, offset) {
  const g = geom.clone()
  g.computeVertexNormals()
  const pos = g.attributes.position
  const norm = g.attributes.normal
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i,
      pos.getX(i) + norm.getX(i) * offset,
      pos.getY(i) + norm.getY(i) * offset,
      pos.getZ(i) + norm.getZ(i) * offset
    )
  }
  pos.needsUpdate = true
  return g
}

function addGlow(group, geom, pos, color, scaleFactor = 1, inflationOffsets = null) {
  const defaultScales = [
    1 + (1.008 - 1) * scaleFactor,
    1 + (1.02 - 1) * scaleFactor,
    1 + (1.04 - 1) * scaleFactor,
  ]
  const layers = inflationOffsets
    ? [
        { offset: inflationOffsets[0], opacity: 0.2 },
        { offset: inflationOffsets[1], opacity: 0.06 },
        { offset: inflationOffsets[2], opacity: 0.02 },
      ]
    : [
        { scale: defaultScales[0], opacity: 0.2 },
        { scale: defaultScales[1], opacity: 0.06 },
        { scale: defaultScales[2], opacity: 0.02 },
      ]

  const glows = []
  for (const layer of layers) {
    const g = inflationOffsets
      ? inflateGeometry(geom, layer.offset)
      : geom.clone()
    if (!inflationOffsets) g.scale(layer.scale, layer.scale, layer.scale)
    const m = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: layer.opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
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
  const projectExtras = []

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
      feature.properties.id === 'NL32B_N326E397_Y2400.9044_X3394.3630' ||
      feature.properties.id === 'NL32B_N326E397_Y2696.0651_X3149.1638' ||
      feature.properties.id === 'NL32B_N326E397_Y2375.0403_X3192.4111'

    const PROJECT_EXTRA_IDS = {
      'NL32B_N326E397_Y2442.3019_X3430.7208': 'EUBUCCO',
      'NL32B_N326E397_Y2450.6257_X3407.2096': 'DBSM',
      'NL32B_N326E397_Y2430.4532_X3460.0532': 'AI Climate Institute',
      'NL32B_N326E397_Y2428.6069_X3491.8848': "CCAI's Data Gaps",
      'NL32B_N326E397_Y2453.8555_X3347.7617': 'Academic Research',
    }
    const isExtra = feature.properties.id in PROJECT_EXTRA_IDS
    const needsHighlight = isTarget || isExtra

    const color = yearColor(t)
    const normalColor = color.clone()
    adjustSaturation(normalColor, 0.75)
    if (feature.properties.id === 'NL32B_N326E397_Y2375.0403_X3192.4111') {
      normalColor.setHex(0x555555)
    }
    if (feature.properties.id === 'NL32B_N326E397_Y2428.6069_X3491.8848') {
      normalColor.setHex(0x949089)
    }

    let highlightColor
    if (needsHighlight) {
      highlightColor = color.clone()
      adjustSaturation(highlightColor, 1.8)
      if (feature.properties.id === 'NL32B_N326E397_Y2375.0403_X3192.4111') {
        highlightColor.setHex(0x555555)
      }
      if (feature.properties.id === 'NL32B_N326E397_Y2428.6069_X3491.8848') {
        highlightColor.setHex(0x9b9380)
      }
    }

    const fillMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.DoubleSide,
    })

    const area = polygonArea(exterior)
    const height = (area > areaThreshold
      ? 20 + Math.random() * 5
      : 10 + Math.random() * 5) + (feature.properties.id === 'NL32B_N326E397_Y2696.0651_X3149.1638' ? 5 : 0) + (feature.properties.id === 'NL32B_N326E397_Y2375.0403_X3192.4111' ? 3 : 0)

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

    allBuildings.push({ mesh, line, material: fillMat, baseColor: normalColor, height, extrudeDelay, colorPhase })

    if (isTarget) {
      let label, glowColor
      if (feature.properties.id === 'NL32B_N326E397_Y2400.9044_X3394.3630') {
        label = 'Projects'
        glowColor = 0x6688ff
      } else if (feature.properties.id === 'NL32B_N326E397_Y2696.0651_X3149.1638') {
        label = 'Contact'
        glowColor = highlightColor.clone()
        adjustSaturation(glowColor, 3.0)
        const hsl = {}
        glowColor.getHSL(hsl)
        glowColor.setHSL(hsl.h, hsl.s, Math.min(1, hsl.l * 1.3))
      } else if (feature.properties.id === 'NL32B_N326E397_Y2375.0403_X3192.4111') {
        label = 'THEMES'
        glowColor = 0x555555
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
      if (label === 'THEMES') {
        for (const g of glows) {
          g.baseOpacity *= 1.4
          g.material.opacity = g.baseOpacity
        }
      }
      const centroid = polygonCentroid(exterior)
      glowTargets.push({ glows, mesh, material: fillMat, normalColor, highlightColor, line, height, centroid, label, extrudeDelay })
    }

    if (isExtra) {
      const label = PROJECT_EXTRA_IDS[feature.properties.id]
      const glowColor = label === 'EUBUCCO' ? 0x44dd88 : label === 'DBSM' ? 0x8844dd : label === 'AI Climate Institute' ? 0xdd8844 : label === 'Academic Research' ? 0xdd6677 : 0x44aadd
      const glows = addGlow(group, geom, mesh.position, glowColor, 1, [0.15, 0.3, 0.5])
      for (const g of glows) {
        g.mesh.visible = false
        g.baseOpacity *= 2.0
        g.material.opacity = g.baseOpacity
      }
      const displayLabel = label === 'AI Climate Institute' ? 'AI Climate<br>Institute' : label === "CCAI's Data Gaps" ? "CCAI's<br>Data Gaps" : label === 'Academic Research' ? 'Academic<br>Research' : label
      const centroid = polygonCentroid(exterior)
      projectExtras.push({ glows, mesh, material: fillMat, normalColor, highlightColor, line, height, centroid, label, displayLabel, extrudeDelay })
    }
  }

  return { group, glowTargets, allBuildings, projectExtras }
}
