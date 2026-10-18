import { CHARACTER_MAP, CHARACTER_START } from '../data/character'
import { CITY_LIST, type City } from '../data/city'
import { INITIAL_GOLD, INITIAL_MORALE, INITIAL_SUPPLIES_PER_PRODUCTION, INITIAL_TROOPS_PER_PRODUCTION } from './economy/balance'
import { turnOrder } from './queries'
import type { CharacterId, CharacterState, CityState, FactionId, GameState } from './types'
import { FACTION_IDS, isFactionId } from './world'

/** The faction the player leads unless the URL says otherwise */
export const DEFAULT_PLAYER_FACTION: FactionId = 'carta'

/** ?faction=<id> picks the player's faction; anything else falls back to the default */
export function readPlayerFaction(search: string): FactionId {
  const id = new URLSearchParams(search).get('faction')
  if (isFactionId(id)) return id
  if (id !== null) console.warn(`?faction=${id} は勢力のIDではありません。${DEFAULT_PLAYER_FACTION} で始めます`)
  return DEFAULT_PLAYER_FACTION
}

/** A city as its data starts it, with its lord as the governor */
function initialCity(city: City, governor: CharacterId | undefined): CityState {
  return {
    population: city.population,
    market: city.market,
    production: city.production,
    storedSupplies: city.storedSupplies ?? city.production * INITIAL_SUPPLIES_PER_PRODUCTION,
    troops: city.troops ?? city.production * INITIAL_TROOPS_PER_PRODUCTION,
    troopMorale: city.troopMorale ?? INITIAL_MORALE,
    buildings: city.buildings ?? [],
    construction: null,
    assignments: { ...(governor && { governor }), officers: {} },
    affairsBudget: {},
    recruited: 0,
  }
}

/** Turn 1, the player's strategy phase, with the cities and characters where the data puts them */
export function createInitialState(playerFaction: FactionId = DEFAULT_PLAYER_FACTION): GameState {
  const cityOwners: Record<string, FactionId> = {}
  for (const city of CITY_LIST) if (city.belongTo) cityOwners[city.id] = city.belongTo
  const characters: Record<string, CharacterState> = {}
  const lords = new Map<string, CharacterId>()
  for (const start of CHARACTER_START) {
    // Characters without a faction of their own serve the faction of their city, except mercenaries:
    // they wait to be hired (the mercenary market is open to every city for now, so their city is dropped)
    const mercenary = Boolean(CHARACTER_MAP[start.id]?.mercenaryInfo)
    const factionId = start.factionId ?? (mercenary ? null : cityOwners[start.cityId] ?? null)
    characters[start.id] = { cityId: factionId ? start.cityId : null, factionId }
    // The lord of a city starts as its governor
    if (factionId && start.isLord && !lords.has(start.cityId)) lords.set(start.cityId, start.id)
  }
  const state: GameState = {
    turn: 1,
    phase: 'strategy',
    activeFaction: null,
    playerFaction,
    cityOwners,
    characters,
    cities: Object.fromEntries(CITY_LIST.map((city) => [city.id, initialCity(city, lords.get(city.id))])),
    gold: Object.fromEntries(FACTION_IDS.map((id) => [id, INITIAL_GOLD])),
    lastEconomy: null,
    orders: [],
    march: null,
    lastBattle: null,
    serial: 1,
  }
  return { ...state, activeFaction: turnOrder(state)[0] ?? null }
}
