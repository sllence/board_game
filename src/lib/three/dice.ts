export type { DiceColor, DiceTheme, DiceType, DiceDefinition } from './dice/types'
export { DICE_COLORS, DICE_THEMES } from './dice/types'
export { D6Definition, D6_FACE_NORMALS } from './dice/d6'

import { D6Definition } from './dice/d6'
import type { DiceColor } from './dice/types'
import type * as THREE from 'three-platformize'

export function createD6Dice(color: DiceColor): THREE.Mesh {
  return D6Definition.createMesh(color)
}

export function disposeD6Dice(dice: THREE.Mesh): void {
  D6Definition.dispose(dice)
}

export function updateDiceTransform(
  dice: THREE.Mesh,
  position: { x: number; y: number; z: number },
  quaternion: { x: number; y: number; z: number; w: number }
): void {
  dice.position.set(position.x, position.y, position.z)
  dice.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w)
}
