import { FACE_COUNT, troopStatus, type Troop, type TroopFactory, type UnitStatus } from '@norden/battle-runtime'
import type { UnitType } from '@norden/map-runtime/core/units'
import { CHARACTER_MAP } from '../../data/character'
import type { Battle, BattleSide, CharacterId } from '../../game'

/** Abilities of the leader of units nobody leads (the garrison of a city without knights). Provisional */
const GARRISON_LEADER = { leadership: 40, strength: 40, intelligence: 40 }

const SIDES: readonly BattleSide[] = ['attacker', 'defender']

export interface BattleTroops {
  /** The battle screen's troops: each side's units with their unit type, soldiers, morale, leader and commander */
  troops: TroopFactory
  /** The knight leading the unit of a battle status; null for the units led indirectly or by nobody */
  knightOf: (status: UnitStatus) => CharacterId | null
}

/**
 * The units of both sides as the battle screen's troops. A knight's unit has the knight's id as its
 * troop id (retreats and wipeouts report it back); the others are `<side>-indirect-<n>`. Units led
 * indirectly have their commander's abilities. The faces are norden-battle's placeholders for now.
 */
export function battleTroops(battle: Battle): BattleTroops {
  const knights = new Map<UnitStatus, CharacterId | null>()
  const troops: TroopFactory = () => {
    knights.clear()
    return SIDES.flatMap((side, s): Troop[] => {
      const army = battle[side]
      let indirect = 0
      return army.units.map((unit, i) => {
        const leader = CHARACTER_MAP[unit.knightId ?? army.commander ?? '']
        const status = troopStatus(unit.unitType as UnitType, {
          soldiers: unit.soldiers,
          morale: army.morale,
          ...(leader
            ? { leadership: leader.leadership, strength: leader.strength, intelligence: leader.intelligence }
            : GARRISON_LEADER),
          face: (s * 4 + i) % FACE_COUNT,
          commander: unit.knightId !== null && unit.knightId === army.commander,
        })
        knights.set(status, unit.knightId)
        return { id: unit.knightId ?? `${side}-indirect-${++indirect}`, side, type: unit.unitType as UnitType, status }
      })
    })
  }
  return { troops, knightOf: (status) => knights.get(status) ?? null }
}
