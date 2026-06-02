import * as THREE from 'three-platformize'
import { RoundedBoxGeometry } from 'three-platformize/examples/jsm/geometries/RoundedBoxGeometry.js'

const D6_DOTS: Record<number, number[][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
}

const TEX_SIZE = 256

function generateDiceTexture(faceValue: number): THREE.Texture {
  const data = new Uint8Array(TEX_SIZE * TEX_SIZE * 4)
  const dots = D6_DOTS[faceValue] || []
  const radius = 20

  for (let y = 0; y < TEX_SIZE; y++) {
    for (let x = 0; x < TEX_SIZE; x++) {
      const i = (y * TEX_SIZE + x) * 4
      let isDot = false
      for (const [px, py] of dots) {
        const cx = (px / 100) * TEX_SIZE
        const cy = (py / 100) * TEX_SIZE
        if ((x - cx) ** 2 + (y - cy) ** 2 <= radius * radius) {
          isDot = true
          break
        }
      }
      if (isDot) {
        data[i] = 0x1A
        data[i + 1] = 0x1A
        data[i + 2] = 0x1A
        data[i + 3] = 255
      } else {
        data[i] = 0xFF
        data[i + 1] = 0xFF
        data[i + 2] = 0xFF
        data[i + 3] = 255
      }
    }
  }

  const texture = new THREE.DataTexture(data, TEX_SIZE, TEX_SIZE, THREE.RGBAFormat)
  texture.needsUpdate = true
  return texture
}

export function createD6Dice(): THREE.Mesh {
  // 使用圆角立方体，radius 控制圆角大小
  const geometry = new RoundedBoxGeometry(1, 1, 1, 4, 0.15)

  // BoxGeometry face order: +x, -x, +y, -y, +z, -z
  // D6 face mapping: right(3), left(4), top(2), bottom(5), front(1), back(6)
  const faceValues = [3, 4, 2, 5, 1, 6]

  const materials = faceValues.map((faceValue) => {
    const texture = generateDiceTexture(faceValue)
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
}

export function updateDiceTransform(
  dice: THREE.Mesh,
  position: { x: number; y: number; z: number },
  quaternion: { x: number; y: number; z: number; w: number }
): void {
  dice.position.set(position.x, position.y, position.z)
  dice.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w)
}

export function disposeD6Dice(dice: THREE.Mesh): void {
  dice.geometry.dispose()
  if (Array.isArray(dice.material)) {
    dice.material.forEach((m) => {
      if (m instanceof THREE.MeshStandardMaterial) {
        m.map?.dispose()
      }
      m.dispose()
    })
  }
}
