import { MAX_SOLDIERS, MAX_UNITS, defaultUnitType, isMercenary } from './army'
import { canCommand, commandRank, leadingKnight } from './queries'
import type { ArmyUnit, BattleArmy, CharacterId, CityId, FactionId, GameState } from './types'

/** Units a city without knights defends with, led by nobody */
const GARRISON_UNITS = 2

/**
 * The army a city defends with against an invasion. Provisional until the defending
 * faction forms it itself (choosing the knights, unit types and soldiers like an invasion):
 * - the city's knights of the highest rank first and the mercenaries after them, MAX_UNITS at most, each leading
 *   their default unit type (the army's knights); the first of them leads the army,
 * - the city's soldiers shared out evenly among the knights, MAX_SOLDIERS at most in each unit, each mercenary
 *   leading their own,
 * - a city without knights defends with GARRISON_UNITS infantry units nobody leads,
 * - the morale of the city's soldiers.
 */
export function defenderArmy(
  state: GameState, cityId: CityId, factionId: FactionId | null, knights: readonly CharacterId[],
): BattleArmy {
  const city = state.cities[cityId]
  const pool = city?.troops ?? 0
  const leading = [...knights]
    .sort((a, b) => Number(canCommand(b)) - Number(canCommand(a)) || commandRank(state, b) - commandRank(state, a))
    .slice(0, MAX_UNITS)
  const share = (count: number) => Math.floor(pool / count / 10) * 10
  const regulars = leading.filter(canCommand).length
  const units: ArmyUnit[] = leading.length > 0
    ? leading.map((id) => ({
      knightId: id, unitType: defaultUnitType(id),
      soldiers: isMercenary(id) ? state.mercenaries[id]?.soldiers ?? 0 : Math.min(MAX_SOLDIERS, share(regulars)),
    }))
    : Array.from({ length: GARRISON_UNITS }, () => ({ knightId: null, unitType: 'infantry', soldiers: share(GARRISON_UNITS) }))
  return {
    factionId,
    // Those leading the units, in the order given
    knights: knights.filter((id) => leading.includes(id)),
    commander: leadingKnight(state, leading) ?? null,
    units: units.filter((u) => u.soldiers > 0),
    morale: city?.troopMorale ?? 0,
  }
}
