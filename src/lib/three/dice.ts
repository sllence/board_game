import * as THREE from 'three'

const D6_DOTS: Record<number, number[][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
}

function generateDiceTexture(faceValue: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, 256, 256)

  ctx.fillStyle = '#1A1A1A'
  const dots = D6_DOTS[faceValue] || []
  const radius = 20

  dots.forEach(([px, py]) => {
    const x = (px / 100) * 256
    const y = (py / 100) * 256
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

export function createD6Dice(): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(1, 1, 1)

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
