import type { DiceType, DiceDefinition } from './types'
import { D4Definition } from './d4'
import { D6Definition } from './d6'
import { D8Definition } from './d8'
import { D12Definition } from './d12'
import { D20Definition } from './d20'

export type { DiceType, DiceColor, DiceTheme, DiceDefinition } from './types'
export { DICE_COLORS, DICE_THEMES } from './types'

const DEFINITIONS: Record<DiceType, DiceDefinition> = {
  D4: D4Definition,
  D6: D6Definition,
  D8: D8Definition,
  D12: D12Definition,
  D20: D20Definition,
}

export function getDiceDefinition(type: DiceType): DiceDefinition {
  return DEFINITIONS[type]
}

export { D4Definition, D6Definition, D8Definition, D12Definition, D20Definition }
