import * as THREE from 'three-platformize'
import * as CANNON from 'cannon-es'
import { physicsWorld } from '@/lib/physics/world'
import type { DiceColor, DiceDefinition } from './types'
import { generateNumberTexture } from './textures'

const D12_SIZE = 0.7

function extractConvexData(geometry: THREE.BufferGeometry): { vertices: CANNON.Vec3[]; faces: number[][] } {
  const posAttr = geometry.attributes.position as THREE.BufferAttribute
  const indexAttr = geometry.index

  const vertexMap = new Map<string, number>()
  const vertices: CANNON.Vec3[] = []

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i)
    const y = posAttr.getY(i)
    const z = posAttr.getZ(i)
    const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`
    if (!vertexMap.has(key)) {
      vertexMap.set(key, vertices.length)
      vertices.push(new CANNON.Vec3(x * D12_SIZE, y * D12_SIZE, z * D12_SIZE))
    }
  }

  const keyFromIndex = (idx: number) => {
    const x = posAttr.getX(idx)
    const y = posAttr.getY(idx)
    const z = posAttr.getZ(idx)
    return `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`
  }

  const faces: number[][] = []
  if (indexAttr) {
    for (let i = 0; i < indexAttr.count; i += 3) {
      const a = indexAttr.getX(i)
      const b = indexAttr.getX(i + 1)
      const c = indexAttr.getX(i + 2)
      faces.push([vertexMap.get(keyFromIndex(a))!, vertexMap.get(keyFromIndex(b))!, vertexMap.get(keyFromIndex(c))!])
    }
  } else {
    for (let i = 0; i < posAttr.count; i += 3) {
      faces.push([vertexMap.get(keyFromIndex(i))!, vertexMap.get(keyFromIndex(i + 1))!, vertexMap.get(keyFromIndex(i + 2))!])
    }
  }

  geometry.dispose()
  return { vertices, faces }
}

function computeFaceNormal(va: CANNON.Vec3, vb: CANNON.Vec3, vc: CANNON.Vec3): CANNON.Vec3 {
  const ab = new CANNON.Vec3()
  const ac = new CANNON.Vec3()
  va.vsub(vb, ab)
  va.vsub(vc, ac)
  const normal = new CANNON.Vec3()
  ab.cross(ac, normal)
  normal.normalize()
  return normal
}

const dodecaGeo = new THREE.DodecahedronGeometry(D12_SIZE, 0)
const d12Data = extractConvexData(dodecaGeo)

const D12_NORMALS = d12Data.faces.map((face) =>
  computeFaceNormal(d12Data.vertices[face[0]], d12Data.vertices[face[1]], d12Data.vertices[face[2]])
)

const D12_FACE_CENTROIDS = d12Data.faces.map((face) => {
  const v0 = d12Data.vertices[face[0]], v1 = d12Data.vertices[face[1]], v2 = d12Data.vertices[face[2]]
  const cx = (v0.x + v1.x + v2.x) / 3, cy = (v0.y + v1.y + v2.y) / 3, cz = (v0.z + v1.z + v2.z) / 3
  const len = Math.sqrt(cx * cx + cy * cy + cz * cz) || 1
  return { x: cx / len, y: cy / len, z: cz / len }
})

export const D12Definition: DiceDefinition = {
  createMesh(color: DiceColor): THREE.Mesh {
    const geometry = new THREE.DodecahedronGeometry(D12_SIZE, 0)
    const posAttr = geometry.attributes.position

    // D12 has 36 triangles (3 per pentagonal face × 12 faces)
    const materialIndexForTri: number[] = []
    for (let t = 0; t < posAttr.count / 3; t++) {
      const i = t * 9
      const ax = posAttr.array[i], ay = posAttr.array[i + 1], az = posAttr.array[i + 2]
      const bx = posAttr.array[i + 3], by = posAttr.array[i + 4], bz = posAttr.array[i + 5]
      const cx = posAttr.array[i + 6], cy = posAttr.array[i + 7], cz = posAttr.array[i + 8]
      const abx = bx - ax, aby = by - ay, abz = bz - az
      const acx = cx - ax, acy = cy - ay, acz = cz - az
      let nx = aby * acz - abz * acy
      let ny = abz * acx - abx * acz
      let nz = abx * acy - aby * acx
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
      nx /= len; ny /= len; nz /= len

      let bestAbsDot = -2
      for (let f = 0; f < D12_NORMALS.length; f++) {
        const absDot = Math.abs(nx * D12_NORMALS[f].x + ny * D12_NORMALS[f].y + nz * D12_NORMALS[f].z)
        if (absDot > bestAbsDot) bestAbsDot = absDot
      }
      const candidates: number[] = []
      for (let f = 0; f < D12_NORMALS.length; f++) {
        const absDot = Math.abs(nx * D12_NORMALS[f].x + ny * D12_NORMALS[f].y + nz * D12_NORMALS[f].z)
        if (Math.abs(absDot - bestAbsDot) < 0.001) candidates.push(f)
      }
      let best = candidates[0]
      if (candidates.length > 1) {
        const tcx = (ax + bx + cx) / 3, tcy = (ay + by + cy) / 3, tcz = (az + bz + cz) / 3
        const tlen = Math.sqrt(tcx * tcx + tcy * tcy + tcz * tcz) || 1
        let bestCDot = -2
        for (const f of candidates) {
          const dot = (tcx / tlen) * D12_FACE_CENTROIDS[f].x + (tcy / tlen) * D12_FACE_CENTROIDS[f].y + (tcz / tlen) * D12_FACE_CENTROIDS[f].z
          if (dot > bestCDot) { bestCDot = dot; best = f }
        }
      }
      materialIndexForTri.push(best)
    }

    for (let t = 0; t < materialIndexForTri.length; t++) {
      geometry.addGroup(t * 3, 3, materialIndexForTri[t])
    }

    const materials = Array.from({ length: 12 }, (_, i) => {
      const texture = generateNumberTexture(i + 1, color.bgColor, color.dotColor)
      return new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.3,
        metalness: 0.1,
        envMapIntensity: 0.5,
      })
    })
    const dice = new THREE.Mesh(geometry, materials)
    dice.castShadow = true
    dice.receiveShadow = true
    return dice
  },

  createBody(): CANNON.Body {
    const body = new CANNON.Body({
      mass: 1,
      material: physicsWorld.materials.dice,
    })
    body.addShape(new CANNON.ConvexPolyhedron({ vertices: d12Data.vertices, faces: d12Data.faces }))
    body.linearDamping = 0.3
    body.angularDamping = 0.4
    body.allowSleep = true
    body.sleepSpeedLimit = 0.1
    body.sleepTimeLimit = 0.5
    return body
  },

  faceNormals: D12_NORMALS,

  getFaceValue(faceIndex: number): number {
    return faceIndex + 1
  },

  dispose(mesh: THREE.Mesh): void {
    mesh.geometry.dispose()
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((m) => {
        if (m instanceof THREE.MeshStandardMaterial) {
          m.map?.dispose()
        }
        m.dispose()
      })
    }
  },
}
