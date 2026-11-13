import { basicAttack, basicDefense, type UnitPower } from '@norden/battle-runtime/rules'
import type { UnitType } from '@norden/map-runtime/core/units'
import { SUMMON_MORALE } from '../economy/balance'
import type { CharacterId, GameState } from '../types'

/** What the screens show of a summoned unit in place of its 統率・武力・知力 */
export interface SummonStrength {
  hp: number
  maxHp: number
  /** norden-battle's 基本攻撃力: the damage of a normal attack on the standard unit. A monster attacks with fixed soldiers: its HP does not lower it */
  attack: number
  /** norden-battle's 基本防御力: how little a normal attack of the standard unit hurts it (the standard unit's is 100), whatever its HP */
  defense: number
}

/**
 * A summoned unit's HP, attack and defense, by norden-battle's rules (basicAttack, basicDefense) at its HP now, its
 * 統率・武力 and SUMMON_MORALE (a monster fights with its 武力, not its 知力). undefined: not a summoned unit
 */
export function summonStrength(state: Pick<GameState, 'summons'>, id: CharacterId): SummonStrength | undefined {
  const summon = state.summons[id]
  if (!summon) return undefined
  const power: UnitPower = {
    type: summon.unitType as UnitType, soldiers: summon.hp, morale: SUMMON_MORALE, leadership: summon.leadership, strength: summon.strength,
  }
  return { hp: summon.hp, maxHp: summon.maxHp, attack: basicAttack(power), defense: basicDefense(power) }
}
