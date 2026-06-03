import * as THREE from 'three-platformize'

export const TEX_SIZE = 256

// 5×7 pixel dot-matrix font for digits 0-9
// Each digit is 7 rows, each row is a 5-bit value (bits 4-0 = columns)
export const FONT_5x7: Record<number, number[]> = {
  1: [0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E],
  2: [0x0E, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1F],
  3: [0x0E, 0x11, 0x01, 0x06, 0x01, 0x11, 0x0E],
  4: [0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02],
  5: [0x1F, 0x10, 0x1E, 0x01, 0x01, 0x11, 0x0E],
  6: [0x06, 0x08, 0x10, 0x1E, 0x11, 0x11, 0x0E],
  7: [0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  8: [0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E],
  9: [0x0E, 0x11, 0x11, 0x0F, 0x01, 0x02, 0x0C],
  0: [0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E],
}

// Dot positions for D6 faces (percentages of texture size)
export const D6_DOTS: Record<number, number[][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
}

export function generateDiceTexture(
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

export function generateNumberTexture(
  faceValue: number,
  bgColor: [number, number, number],
  dotColor: [number, number, number]
): THREE.Texture {
  const data = new Uint8Array(TEX_SIZE * TEX_SIZE * 4)

  // Fill background
  for (let i = 0; i < TEX_SIZE * TEX_SIZE * 4; i += 4) {
    data[i] = bgColor[0]
    data[i + 1] = bgColor[1]
    data[i + 2] = bgColor[2]
    data[i + 3] = 255
  }

  const pixelSize = 6
  const charWidth = 5 * pixelSize
  const charHeight = 7 * pixelSize
  const gap = pixelSize * 2

  const digits = faceValue >= 10
    ? [Math.floor(faceValue / 10), faceValue % 10]
    : [faceValue]

  const totalWidth = digits.length * charWidth + (digits.length - 1) * gap
  const startX = Math.floor((TEX_SIZE - totalWidth) / 2)
  const startY = Math.floor((TEX_SIZE - charHeight) / 2)

  for (let d = 0; d < digits.length; d++) {
    const glyph = FONT_5x7[digits[d]]
    if (!glyph) continue

    const offsetX = startX + d * (charWidth + gap)

    for (let row = 0; row < 7; row++) {
      const bits = glyph[row]
      for (let col = 0; col < 5; col++) {
        if (bits & (1 << col)) {
          for (let py = 0; py < pixelSize; py++) {
            for (let px = 0; px < pixelSize; px++) {
              const x = offsetX + col * pixelSize + px
              const y = startY + row * pixelSize + py
              if (x < TEX_SIZE && y < TEX_SIZE) {
                const i = (y * TEX_SIZE + x) * 4
                data[i] = dotColor[0]
                data[i + 1] = dotColor[1]
                data[i + 2] = dotColor[2]
                data[i + 3] = 255
              }
            }
          }
        }
      }
    }
  }

  const texture = new THREE.DataTexture(data, TEX_SIZE, TEX_SIZE, THREE.RGBAFormat)
  texture.needsUpdate = true
  return texture
}
