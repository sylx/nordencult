import { CHARACTER_MAP } from '../../data/character'
import {
  MERCENARY_RECOVERY_RATE, MERCENARY_RENEWAL_CHANCE, MERCENARY_RENEWAL_MIN_MONTHS, STANDING_GUILD, STANDING_TAVERN,
} from '../economy/balance'
import { citiesOf, isPlayerFaction } from '../queries'
import type { CharacterId, FactionId, GameEvent, GameState, MercenaryState } from '../types'
import { FACTION_IDS } from '../world'
import { releaseMercenary, renewalPrice, withStanding } from './mercenaries'

/** Standing a faction gains in an economy run from its 酒場 and 傭兵ギルド */
function buildingStanding(state: GameState, factionId: FactionId): number {
  return citiesOf(state, factionId).flatMap((id) => state.cities[id].buildings)
    .reduce((sum, id) => sum + (id === 'tavern' ? STANDING_TAVERN : id === 'guild' ? STANDING_GUILD : 0), 0)
}

/**
 * The mercenaries in the economy run, after everything else (`turn`: the turn starting):
 * 1. the contracts of those not paid (`unpaid`, of mercenaryFees) end; a faction the player plays is told (MercenaryUnpaid),
 * 2. every mercenary, hired or not, recovers MERCENARY_RECOVERY_RATE of their 最大兵力,
 * 3. the factions gain the standing of their 酒場 and 傭兵ギルド,
 * 4. those of a faction the player plays whose contract was made or renewed MERCENARY_RENEWAL_MIN_MONTHS ago or more
 *    ask for the renewal fee at MERCENARY_RENEWAL_CHANCE (MercenaryRenewal, one at a time: it waits for decideRenewal).
 */
export function runMercenaries(state: GameState, turn: number, unpaid: readonly CharacterId[], random: () => number = Math.random): GameState {
  let next = state
  const told: GameEvent[] = []
  const event = () => ({ id: `event-${next.serial}`, turn })
  const tick = () => { next = { ...next, serial: next.serial + 1 } }

  for (const characterId of unpaid) {
    const factionId = next.characters[characterId].factionId!
    next = releaseMercenary(next, characterId)
    if (!isPlayerFaction(next, factionId)) continue
    told.push({ ...event(), kind: 'mercenaryUnpaid', factionId, characterId })
    tick()
  }

  const mercenaries: Record<CharacterId, MercenaryState> = {}
  for (const [id, mercenary] of Object.entries(next.mercenaries)) {
    const most = CHARACTER_MAP[id].mercenaryInfo!.maxSoldiers
    mercenaries[id] = { ...mercenary, soldiers: Math.min(most, mercenary.soldiers + Math.ceil(most * MERCENARY_RECOVERY_RATE)) }
  }
  next = { ...next, mercenaries }

  for (const factionId of FACTION_IDS) next = withStanding(next, factionId, buildingStanding(next, factionId))

  for (const characterId of Object.keys(next.mercenaries).sort()) {
    const contract = next.mercenaries[characterId].contract
    const factionId = next.characters[characterId]?.factionId
    if (!contract || !factionId || !isPlayerFaction(next, factionId) || turn - contract.since < MERCENARY_RENEWAL_MIN_MONTHS) continue
    if (next.events.some((e) => e.kind === 'mercenaryRenewal' && e.characterId === characterId)) continue
    if (random() >= MERCENARY_RENEWAL_CHANCE) continue
    told.push({ ...event(), kind: 'mercenaryRenewal', factionId, characterId, gold: renewalPrice(next, factionId, characterId) })
    tick()
  }
  return { ...next, events: [...next.events, ...told] }
}
