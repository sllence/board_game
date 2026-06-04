import * as THREE from 'three-platformize'
import * as CANNON from 'cannon-es'
import { physicsWorld } from '@/lib/physics/world'
import type { DiceColor, DiceDefinition } from './types'
import { generateNumberTexture } from './textures'

const D4_SIZE = 0.7

const D4_VERTICES: CANNON.Vec3[] = [
  new CANNON.Vec3(1, 1, 1),
  new CANNON.Vec3(1, -1, -1),
  new CANNON.Vec3(-1, 1, -1),
  new CANNON.Vec3(-1, -1, 1),
]

const D4_FACES = [
  [0, 2, 1],
  [0, 1, 3],
  [0, 3, 2],
  [1, 2, 3],
]

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

const D4_NORMALS = D4_FACES.map((face) =>
  computeFaceNormal(D4_VERTICES[face[0]], D4_VERTICES[face[1]], D4_VERTICES[face[2]])
)

const D4_FACE_CENTROIDS = D4_FACES.map((face) => {
  const v0 = D4_VERTICES[face[0]], v1 = D4_VERTICES[face[1]], v2 = D4_VERTICES[face[2]]
  const cx = (v0.x + v1.x + v2.x) / 3, cy = (v0.y + v1.y + v2.y) / 3, cz = (v0.z + v1.z + v2.z) / 3
  const len = Math.sqrt(cx * cx + cy * cy + cz * cz) || 1
  return { x: cx / len, y: cy / len, z: cz / len }
})

export const D4Definition: DiceDefinition = {
  createMesh(color: DiceColor): THREE.Mesh {
    const geometry = new THREE.TetrahedronGeometry(D4_SIZE, 0)
    const posAttr = geometry.attributes.position

    // Match geometry triangles to physics faces using normal + centroid tiebreak
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
      for (let f = 0; f < D4_NORMALS.length; f++) {
        const absDot = Math.abs(nx * D4_NORMALS[f].x + ny * D4_NORMALS[f].y + nz * D4_NORMALS[f].z)
        if (absDot > bestAbsDot) bestAbsDot = absDot
      }
      const candidates: number[] = []
      for (let f = 0; f < D4_NORMALS.length; f++) {
        const absDot = Math.abs(nx * D4_NORMALS[f].x + ny * D4_NORMALS[f].y + nz * D4_NORMALS[f].z)
        if (Math.abs(absDot - bestAbsDot) < 0.001) candidates.push(f)
      }
      let best = candidates[0]
      if (candidates.length > 1) {
        const tcx = (ax + bx + cx) / 3, tcy = (ay + by + cy) / 3, tcz = (az + bz + cz) / 3
        const tlen = Math.sqrt(tcx * tcx + tcy * tcy + tcz * tcz) || 1
        let bestCDot = -2
        for (const f of candidates) {
          const dot = (tcx / tlen) * D4_FACE_CENTROIDS[f].x + (tcy / tlen) * D4_FACE_CENTROIDS[f].y + (tcz / tlen) * D4_FACE_CENTROIDS[f].z
          if (dot > bestCDot) { bestCDot = dot; best = f }
        }
      }
      materialIndexForTri.push(best)
    }

    for (let t = 0; t < materialIndexForTri.length; t++) {
      geometry.addGroup(t * 3, 3, materialIndexForTri[t])
    }

    const materials = Array.from({ length: 4 }, (_, i) => {
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
    body.addShape(new CANNON.ConvexPolyhedron({ vertices: D4_VERTICES, faces: D4_FACES }))
    body.linearDamping = 0.3
    body.angularDamping = 0.4
    body.allowSleep = true
    body.sleepSpeedLimit = 0.1
    body.sleepTimeLimit = 0.5
    return body
  },

  faceNormals: D4_NORMALS,

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
