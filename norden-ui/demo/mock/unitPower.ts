import type { InvasionAssignment } from '../../src'
import { KNIGHTS } from './data'

/** Attack and defense rates of the unit types (the game's come from norden-battle) */
const RATES: Record<string, [attack: number, defense: number]> = {
  infantry: [1, 1], archer: [0.9, 0.7], cavalry: [1.2, 0.9], mage: [1.3, 0.6],
}

/** A rough stand-in for the game's basic attack and defense: soldiers and the leader's 統率 */
export function mockUnitPower(unit: InvasionAssignment, commander: string) {
  const [attack, defense] = RATES[unit.unitType] ?? [1, 1]
  const leader = KNIGHTS.find(knight => knight.id === (unit.knightId ?? commander))
  const leadership = Number(leader?.stats?.[0]?.value ?? 50)
  return {
    attack: Math.round(unit.soldiers * 0.12 * attack * (1 + (leadership - 50) * 0.005)),
    defense: Math.round(100 * defense / (1 - (leadership - 50) * 0.004)),
  }
}
