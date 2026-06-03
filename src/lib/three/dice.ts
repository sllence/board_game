import * as THREE from 'three-platformize'
import { RoundedBoxGeometry } from 'three-platformize/examples/jsm/geometries/RoundedBoxGeometry.js'

export interface DiceTheme {
  key: string
  label: string
  bgColor: [number, number, number]
  dotColor: [number, number, number]
  pageBg: string
  sceneBg: number
  textColor: string
  subTextColor: string
}

export const DICE_THEMES: DiceTheme[] = [
  { key: 'white', label: '白色', bgColor: [0xFF, 0xFF, 0xFF], dotColor: [0x1A, 0x1A, 0x1A], pageBg: '#F5F5F5', sceneBg: 0xE8E8E8, textColor: '#1A1A1A', subTextColor: '#6B7280' },
  { key: 'black', label: '黑色', bgColor: [0x1A, 0x1A, 0x1A], dotColor: [0xFF, 0xFF, 0xFF], pageBg: '#1A1A2E', sceneBg: 0x1A1A2E, textColor: '#FFFFFF', subTextColor: '#9CA3AF' },
  { key: 'red', label: '红色', bgColor: [0xDC, 0x26, 0x26], dotColor: [0xFF, 0xFF, 0xFF], pageBg: '#1A1A2E', sceneBg: 0x2D1A1A, textColor: '#FFFFFF', subTextColor: '#9CA3AF' },
  { key: 'blue', label: '蓝色', bgColor: [0x25, 0x63, 0xEB], dotColor: [0xFF, 0xFF, 0xFF], pageBg: '#1A1A2E', sceneBg: 0x1A1A2E, textColor: '#FFFFFF', subTextColor: '#9CA3AF' },
  { key: 'green', label: '绿色', bgColor: [0x16, 0xA3, 0x4A], dotColor: [0xFF, 0xFF, 0xFF], pageBg: '#1A1A2E', sceneBg: 0x1A2D1A, textColor: '#FFFFFF', subTextColor: '#9CA3AF' },
  { key: 'purple', label: '紫色', bgColor: [0x93, 0x33, 0xEA], dotColor: [0xFF, 0xFF, 0xFF], pageBg: '#1A1A2E', sceneBg: 0x2D1A2E, textColor: '#FFFFFF', subTextColor: '#9CA3AF' },
]

const D6_DOTS: Record<number, number[][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
}

const TEX_SIZE = 256

function generateDiceTexture(
  faceValue: number,
  bgColor: [number, number, number],
  dotColor: [number, number, number]
): THREE.Texture {
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
        data[i] = dotColor[0]
        data[i + 1] = dotColor[1]
        data[i + 2] = dotColor[2]
        data[i + 3] = 255
      } else {
        data[i] = bgColor[0]
        data[i + 1] = bgColor[1]
        data[i + 2] = bgColor[2]
        data[i + 3] = 255
      }
    }
  }

  const texture = new THREE.DataTexture(data, TEX_SIZE, TEX_SIZE, THREE.RGBAFormat)
  texture.needsUpdate = true
  return texture
}

export function createD6Dice(theme: DiceTheme = DICE_THEMES[0]): THREE.Mesh {
  const geometry = new RoundedBoxGeometry(1, 1, 1, 4, 0.15)

  // BoxGeometry face order: +x, -x, +y, -y, +z, -z
  // D6 face mapping: right(3), left(4), top(2), bottom(5), front(1), back(6)
  const faceValues = [3, 4, 2, 5, 1, 6]

  const materials = faceValues.map((faceValue) => {
    const texture = generateDiceTexture(faceValue, theme.bgColor, theme.dotColor)
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
