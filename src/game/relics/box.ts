import type { Faction } from '../../data/faction'
import type { FactionId, GameState, RelicItem } from '../types'

/** A faction's アイテムボックス */

export const relicsOf = (state: GameState, factionId: FactionId): readonly RelicItem[] => state.relics[factionId] ?? []

export const withRelics = (state: GameState, factionId: FactionId, relics: readonly RelicItem[]): GameState =>
  ({ ...state, relics: { ...state.relics, [factionId]: relics } })

/** The box a faction starts with: the relics of its data, the broken ones first */
export const startingRelics = (faction: Pick<Faction, 'id' | 'relics' | 'repairedRelics'>): RelicItem[] =>
  [
    ...(faction.relics ?? []).map((relicId) => ({ relicId, repaired: false })),
    ...(faction.repairedRelics ?? []).map((relicId) => ({ relicId, repaired: true })),
  ].map((relic, index) => ({ id: `${faction.id}-${index}`, ...relic }))

/** A relic comes into the faction's box, broken or repaired */
export function addRelic(state: GameState, factionId: FactionId, relicId: string, repaired: boolean): GameState {
  const item: RelicItem = { id: `relic-${state.serial}`, relicId, repaired }
  return { ...withRelics(state, factionId, [...relicsOf(state, factionId), item]), serial: state.serial + 1 }
}
