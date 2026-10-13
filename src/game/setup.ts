import { CHARACTER_MAP, CHARACTER_START } from '../data/character'
import { CITY_LIST } from '../data/city'
import { INITIAL_MORALE } from './army'
import { turnOrder } from './queries'
import type { CharacterState, FactionId, GameState } from './types'
import { isFactionId } from './world'

/** The faction the player leads unless the URL says otherwise */
export const DEFAULT_PLAYER_FACTION: FactionId = 'carta'

/** ?faction=<id> picks the player's faction; anything else falls back to the default */
export function readPlayerFaction(search: string): FactionId {
  const id = new URLSearchParams(search).get('faction')
  if (isFactionId(id)) return id
  if (id !== null) console.warn(`?faction=${id} は勢力のIDではありません。${DEFAULT_PLAYER_FACTION} で始めます`)
  return DEFAULT_PLAYER_FACTION
}

/** Turn 1, the player's strategy phase, with the cities and characters where the data puts them */
export function createInitialState(playerFaction: FactionId = DEFAULT_PLAYER_FACTION): GameState {
  const cityOwners: Record<string, FactionId> = {}
  for (const city of CITY_LIST) if (city.belongTo) cityOwners[city.id] = city.belongTo
  const characters: Record<string, CharacterState> = {}
  for (const start of CHARACTER_START) {
    // Characters without a faction of their own serve the faction of their city, except mercenaries:
    // they wait to be hired (the mercenary market is open to every city for now, so their city is dropped)
    const mercenary = Boolean(CHARACTER_MAP[start.id]?.mercenaryInfo)
    const factionId = start.factionId ?? (mercenary ? null : cityOwners[start.cityId] ?? null)
    characters[start.id] = {
      cityId: factionId ? start.cityId : null,
      factionId,
      isLord: Boolean(factionId && start.isLord),
    }
  }
  const state: GameState = {
    turn: 1,
    phase: 'strategy',
    activeFaction: null,
    playerFaction,
    cityOwners,
    characters,
    cityMorale: Object.fromEntries(CITY_LIST.map((city) => [city.id, INITIAL_MORALE])),
    orders: [],
    march: null,
    lastBattle: null,
    serial: 1,
  }
  return { ...state, activeFaction: turnOrder(state)[0] ?? null }
}
