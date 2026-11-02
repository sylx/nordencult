import { CHARACTER_MAP } from '../data/character'
import { ROAM_MOVE_CHANCE } from './economy/balance'
import { nearestCity, ownerOf } from './queries'
import type { CharacterState, CityId, FactionId, GameState } from './types'
import { neighbours } from './world'

/**
 * 放浪: knights serving nobody are not nowhere: they are in a city (CharacterState.roaming), going on to another
 * now and then, as mercenaries not hired do. They wander when their faction falls.
 */

/** A character serving nobody, in `at`, holding a grudge against the faction that destroyed theirs */
export const wanderer = (at: CityId, grudge?: FactionId): CharacterState =>
  ({ cityId: null, factionId: null, roaming: at, ...(grudge && { grudge }) })

/**
 * Where a knight of a faction still standing goes when they have nowhere to retreat to from `at`: the city of the
 * head of the faction (君主), or the faction's city nearest to `at` when the head is held prisoner, is not in a city of
 * the faction, or is the one going. null when the faction has no city left. `state` must already have the city lost
 * in the battle out of the faction's hands
 */
export function rejoinCity(state: GameState, factionId: FactionId, at: CityId): CityId | null {
  const head = Object.keys(state.characters).find((id) => CHARACTER_MAP[id]?.isPatriarch && state.characters[id].factionId === factionId)
  const city = head && !state.characters[head].prisoner ? state.characters[head].cityId : null
  return city && ownerOf(state, city) === factionId ? city : nearestCity(state, factionId, at)
}

/**
 * At the start of a progress phase (after the prisoners' escapes), each mercenary not hired and each 放浪 knight, in
 * id order, goes on to a neighbouring city at ROAM_MOVE_CHANCE, any of them alike and whoever holds it, or stays
 */
export function runRoaming(state: GameState, random: () => number = Math.random): GameState {
  const characters: Record<string, CharacterState> = { ...state.characters }
  for (const id of Object.keys(characters).sort()) {
    const { roaming } = characters[id]
    if (!roaming || random() >= ROAM_MOVE_CHANCE) continue
    const next = neighbours(roaming)
    if (next.length > 0) characters[id] = { ...characters[id], roaming: next[Math.floor(random() * next.length)] }
  }
  return { ...state, characters }
}
