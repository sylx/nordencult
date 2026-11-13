import { isPlayerFaction, ownerOf } from '../queries'
import type { CityEconomy, CityId, FactionId, GameState, RelicCompleted, RelicItem } from '../types'
import { CITY_IDS, FACTION_IDS } from '../world'
import { addRelic, relicsOf, withoutRelicItem, withRelics } from './box'

/**
 * The relics of the economy run (`reports`: what each city did in it):
 * 1. a relic repaired or produced in a city comes into the box of the city's faction, repaired, and the relic a
 *    building completed used (施設の遺物) leaves it for good,
 * 2. those 法王府 was asked to repair (whether it still stands or not) are repaired.
 * A faction the player plays is told (RelicCompleted on `turn`, the turn starting)
 */
export function runRelics(state: GameState, turn: number, reports: Readonly<Record<CityId, CityEconomy>>): GameState {
  const told: RelicCompleted[] = []
  const tell = (next: GameState, factionId: FactionId, relicId: string, cityId: CityId | null): GameState => {
    if (!isPlayerFaction(next, factionId)) return next
    told.push({ id: `event-${next.serial}`, kind: 'relicCompleted', turn, factionId, relicId, cityId })
    return { ...next, serial: next.serial + 1 }
  }

  let next = state
  for (const cityId of CITY_IDS) {
    const factionId = ownerOf(state, cityId)
    if (!factionId) continue
    for (const event of reports[cityId].events) {
      if (event.kind === 'relicCompleted') next = tell(addRelic(next, factionId, event.relicId, true), factionId, event.relicId, cityId)
      if (event.kind === 'buildingCompleted' && event.relicItemId) next = withoutRelicItem(next, factionId, event.relicItemId)
    }
  }
  for (const factionId of FACTION_IDS) {
    const asked = relicsOf(next, factionId).filter((item) => item.papalRepair)
    if (asked.length === 0) continue
    const repaired = relicsOf(next, factionId).map(({ papalRepair, ...item }): RelicItem => (papalRepair ? { ...item, repaired: true } : item))
    next = withRelics(next, factionId, repaired)
    for (const item of asked) next = tell(next, factionId, item.relicId, null)
  }
  return { ...next, events: [...next.events, ...told] }
}
