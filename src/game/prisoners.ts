import { CHARACTER_MAP } from '../data/character'
import { withoutAssignee } from './economy/domestic'
import { escapeOf } from './movement'
import { citiesOf, prisonerMovementOf } from './queries'
import type { CharacterId, CharacterState, CityId, GameState, Movement } from './types'

/**
 * Prisoners (捕虜): knights captured in a battle are held in a city of the faction that took them
 * (CharacterState.prisoner). In each progress phase they may escape (runEscapes) and ride alone to the nearest city of
 * their faction; they can be taken to another city on a move or a transport (MoveOrder.prisoners).
 */

/** A prisoner of 武力 or 知力 100 escapes in a progress phase at this rate (in proportion to the higher of them) */
export const ESCAPE_RATE = 0.25
/** A prisoner being taken along on a move or a transport escapes this many times as often */
export const ESCAPE_RATE_MOVING = 2

/**
 * The chance a prisoner escapes in a progress phase: the higher of 武力・知力 × 0.01 × ESCAPE_RATE, ESCAPE_RATE_MOVING
 * times that on the way. None when their faction has fallen (it holds no city)
 */
export function escapeChance(state: GameState, characterId: CharacterId): number {
  const character = state.characters[characterId]
  const data = CHARACTER_MAP[characterId]
  if (!character?.prisoner || !data || !character.factionId || citiesOf(state, character.factionId).length === 0) return 0
  const chance = Math.max(data.strength, data.intelligence) * 0.01 * ESCAPE_RATE
  return Math.min(1, prisonerMovementOf(state, characterId) ? chance * ESCAPE_RATE_MOVING : chance)
}

/**
 * The prisoners' escapes at the start of a progress phase (before its moves, so the map shows them on their way):
 * each prisoner, in id order, escapes at escapeChance and rides alone (as 単騎移動) from where they are to the
 * nearest city of their faction (escapeOf: an 'escape' movement), leaving the move or the transport they were on
 */
export function runEscapes(state: GameState, random: () => number = Math.random): GameState {
  const escaped = Object.keys(state.characters).sort().filter((id) => {
    const chance = escapeChance(state, id)
    return chance > 0 && random() < chance
  })
  if (escaped.length === 0) return state
  const characters: Record<string, CharacterState> = { ...state.characters }
  let movements: Movement[] = [...state.movements]
  let serial = state.serial
  for (const id of escaped) {
    const carrying = prisonerMovementOf(state, id)
    const at = carrying ? carrying.route[0] : characters[id].cityId!
    const escape = escapeOf(state, id, at, `escape-${serial++}`)
    characters[id] = escape.character
    movements = movements.map((m) => (m.prisoners?.includes(id) ? { ...m, prisoners: m.prisoners.filter((p) => p !== id) } : m))
    if (escape.movement) movements.push(escape.movement)
  }
  return { ...state, characters, movements, serial }
}

/**
 * Debugging: the knight held prisoner in `cityId`, as if captured there: they leave their assignment in the city they
 * served in and keep their faction (none for one serving nobody). The caller checks they may be (not a mercenary,
 * not away on a movement, the city another faction's)
 */
export function debugImprison(state: GameState, characterId: CharacterId, cityId: CityId): GameState {
  const before = state.characters[characterId]
  const served = before?.cityId ? state.cities[before.cityId] : undefined
  const cities = served && !before.prisoner
    ? { ...state.cities, [before.cityId!]: { ...served, assignments: withoutAssignee(served.assignments, characterId) } }
    : state.cities
  return { ...state, cities, characters: { ...state.characters, [characterId]: { cityId, factionId: before?.factionId ?? null, prisoner: true } } }
}
