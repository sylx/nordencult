import { CHARACTER_LIST, CHARACTER_START } from '../data/character'
import { CITY_LIST, type City } from '../data/city'
import { FACTION_LIST } from '../data/faction'
import { cityRecord } from './economy/cityLog'
import { INITIAL_GOLD, INITIAL_MORALE, INITIAL_SUPPLIES_PER_PRODUCTION, INITIAL_TROOPS_PER_PRODUCTION } from './economy/balance'
import { turnOrder } from './queries'
import { NO_RESEARCH } from './research/research'
import { wanderer } from './roaming'
import { startingRelics } from './relics/box'
import type { CharacterId, CharacterState, CityState, FactionId, GameState, MercenaryState } from './types'
import { isFactionId } from './world'

/** The faction the player leads unless the URL says otherwise */
export const DEFAULT_PLAYER_FACTION: FactionId = 'carta'

/**
 * ?faction=<id> picks the player's faction; more of them (?faction=leonis&faction=carta) let the player play each.
 * Ids that are not factions are left out; with none left the player plays the default
 */
export function readPlayerFactions(search: string): FactionId[] {
  const ids: FactionId[] = []
  for (const id of new URLSearchParams(search).getAll('faction')) {
    if (!isFactionId(id)) console.warn(`?faction=${id} は勢力のIDではありません`)
    else if (!ids.includes(id)) ids.push(id)
  }
  return ids.length > 0 ? ids : [DEFAULT_PLAYER_FACTION]
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

/** Turn 1, the strategy phase of the first faction to play, with the cities and characters where the data puts them */
export function createInitialState(playerFactions: readonly FactionId[] = [DEFAULT_PLAYER_FACTION]): GameState {
  const cityOwners: Record<string, FactionId> = {}
  for (const city of CITY_LIST) if (city.belongTo) cityOwners[city.id] = city.belongTo
  const characters: Record<string, CharacterState> = {}
  const lords = new Map<string, CharacterId>()
  for (const start of CHARACTER_START) {
    // A prisoner is held in a city of another faction (one of the city's own is just its knight)
    if (start.isPrisoner && cityOwners[start.cityId] && start.factionId !== cityOwners[start.cityId]) {
      characters[start.id] = { cityId: start.cityId, factionId: start.factionId ?? null, prisoner: true }
      continue
    }
    // Serving nobody, they go from city to city from there: mercenaries waiting to be hired, and the 放浪 knights
    if (!start.factionId) {
      characters[start.id] = wanderer(start.cityId, start.grudge)
      continue
    }
    characters[start.id] = { cityId: start.cityId, factionId: start.factionId }
    // The lord of a city starts as its governor
    if (start.isLord && !lords.has(start.cityId)) lords.set(start.cityId, start.id)
  }
  const cities = Object.fromEntries(CITY_LIST.map((city) => [city.id, initialCity(city, lords.get(city.id))]))
  const mercenaries: Record<CharacterId, MercenaryState> = {}
  for (const { id, mercenaryInfo } of CHARACTER_LIST) if (mercenaryInfo) mercenaries[id] = { soldiers: mercenaryInfo.maxSoldiers, contract: null }
  const state: GameState = {
    turn: 1,
    phase: 'strategy',
    activeFaction: null,
    playerFactions: [...playerFactions],
    cityOwners,
    characters,
    cities,
    gold: Object.fromEntries(FACTION_LIST.map((f) => [f.id, f.gold ?? INITIAL_GOLD])),
    research: Object.fromEntries(FACTION_LIST.map((f) => [f.id, NO_RESEARCH])),
    relics: Object.fromEntries(FACTION_LIST.map((f) => [f.id, startingRelics(f)])),
    mercenaries,
    mercenaryStanding: Object.fromEntries(FACTION_LIST.map((f) => [f.id, 0])),
    lastEconomy: null,
    cityHistory: Object.fromEntries(Object.entries(cities).map(([id, city]) => [id, [cityRecord(city, id, 1)]])),
    orders: [],
    moveOrders: [],
    transportOrders: [],
    movements: [],
    march: null,
    lastBattle: null,
    events: [],
    flags: {},
    serial: 1,
  }
  return { ...state, activeFaction: turnOrder(state)[0] ?? null }
}
