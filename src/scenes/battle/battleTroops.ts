import { FACE_COUNT, troopStatus, type Portrait, type Troop, type TroopFactory, type UnitStatus } from '@norden/battle-runtime'
import type { UnitType } from '@norden/map-runtime/core/units'
import spriteSheet from '../../assets/character.webp'
import { CHARACTER_MAP, type Character } from '../../data/character'
import characterSprite from '../../data/characterSprite.json'
import type { Battle, BattleSide, CharacterId } from '../../game'

/** Abilities of the leader of units nobody leads (the garrison of a city without knights). Provisional */
const GARRISON_LEADER = { leadership: 40, strength: 40, intelligence: 40 }

const SIDES: readonly BattleSide[] = ['attacker', 'defender']

/** A character's face on the sprite sheet (as CharacterImage cuts it out), for the battle screen */
function portraitOf({ imageInfo: { sprite, faceRect } }: Character): Portrait {
  return {
    url: spriteSheet,
    width: characterSprite.width,
    height: characterSprite.height,
    rect: { x: sprite.x + faceRect.x, y: sprite.y + faceRect.y, width: faceRect.width, height: faceRect.height },
  }
}

export interface BattleTroops {
  /** The battle screen's troops: each side's units with their unit type, soldiers, morale, leader and commander */
  troops: TroopFactory
  /** The knight leading the unit of a battle status; null for the units led indirectly or by nobody */
  knightOf: (status: UnitStatus) => CharacterId | null
}

/**
 * The units of both sides as the battle screen's troops. A knight's unit has the knight's id as its
 * troop id (retreats and wipeouts report it back); the others are `<side>-indirect-<n>`. Units led
 * indirectly have their commander's abilities and face; the garrison nobody leads has norden-battle's placeholder faces.
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
            ? { leadership: leader.leadership, strength: leader.strength, intelligence: leader.intelligence, portrait: portraitOf(leader) }
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
