import * as THREE from 'three-platformize'
import * as CANNON from 'cannon-es'
import { physicsWorld } from '@/lib/physics/world'
import type { DiceColor, DiceDefinition } from './types'
import { generateNumberTexture } from './textures'

const D20_SIZE = 0.7

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
      vertices.push(new CANNON.Vec3(x * D20_SIZE, y * D20_SIZE, z * D20_SIZE))
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

const icosahedronGeo = new THREE.IcosahedronGeometry(D20_SIZE, 0)
const d20Data = extractConvexData(icosahedronGeo)

const D20_NORMALS = d20Data.faces.map((face) =>
  computeFaceNormal(d20Data.vertices[face[0]], d20Data.vertices[face[1]], d20Data.vertices[face[2]])
)

export const D20Definition: DiceDefinition = {
  createMesh(color: DiceColor): THREE.Mesh {
    const geometry = new THREE.IcosahedronGeometry(D20_SIZE, 0)
    const materials = Array.from({ length: 20 }, (_, i) => {
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
    body.addShape(new CANNON.ConvexPolyhedron({ vertices: d20Data.vertices, faces: d20Data.faces }))
    body.linearDamping = 0.3
    body.angularDamping = 0.4
    body.allowSleep = true
    body.sleepSpeedLimit = 0.1
    body.sleepTimeLimit = 0.5
    return body
  },

  faceNormals: D20_NORMALS,

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
