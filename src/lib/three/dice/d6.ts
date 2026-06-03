import * as THREE from 'three-platformize'
import { RoundedBoxGeometry } from 'three-platformize/examples/jsm/geometries/RoundedBoxGeometry.js'
import * as CANNON from 'cannon-es'
import type { DiceColor, DiceDefinition } from './types'
import { generateDiceTexture } from './textures'
import { physicsWorld } from '@/lib/physics/world'

const D6_SIZE = 1.0

const D6_FACE_VALUES = [3, 4, 2, 5, 1, 6]

export const D6_FACE_NORMALS = [
  new CANNON.Vec3(0, 0, 1),
  new CANNON.Vec3(0, 1, 0),
  new CANNON.Vec3(1, 0, 0),
  new CANNON.Vec3(-1, 0, 0),
  new CANNON.Vec3(0, -1, 0),
  new CANNON.Vec3(0, 0, -1),
]

export const D6Definition: DiceDefinition = {
  createMesh(color: DiceColor): THREE.Mesh {
    const geometry = new RoundedBoxGeometry(D6_SIZE, D6_SIZE, D6_SIZE, 4, 0.15)
    const materials = D6_FACE_VALUES.map((faceValue) => {
      const texture = generateDiceTexture(faceValue, color.bgColor, color.dotColor)
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
    const shape = new CANNON.Box(new CANNON.Vec3(D6_SIZE / 2, D6_SIZE / 2, D6_SIZE / 2))
    const body = new CANNON.Body({
      mass: 1,
      material: physicsWorld.materials.dice,
    })
    body.addShape(shape)
    body.linearDamping = 0.3
    body.angularDamping = 0.4
    body.allowSleep = true
    body.sleepSpeedLimit = 0.1
    body.sleepTimeLimit = 0.5
    return body
  },

  faceNormals: D6_FACE_NORMALS,

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
