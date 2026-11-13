import type { Faction } from '../../data/faction'
import { RELIC_MAP, type SpellId } from '../../data/relics'
import type { CharacterId, FactionId, GameState, RelicItem, UnitTypeId } from '../types'

/** A faction's アイテムボックス */

export const relicsOf = (state: GameState, factionId: FactionId): readonly RelicItem[] => state.relics[factionId] ?? []

export const withRelics = (state: GameState, factionId: FactionId, relics: readonly RelicItem[]): GameState =>
  ({ ...state, relics: { ...state.relics, [factionId]: relics } })

/** The box a faction starts with: the relics of its data */
export const startingRelics = (faction: Pick<Faction, 'id' | 'relics'>): RelicItem[] =>
  (faction.relics ?? []).map((relic, index) => ({ id: `${faction.id}-${index}`, ...relic }))

/** A relic comes into the faction's box, broken or repaired */
export function addRelic(state: GameState, factionId: FactionId, relicId: string, repaired: boolean): GameState {
  const item: RelicItem = { id: `relic-${state.serial}`, relicId, repaired }
  return { ...withRelics(state, factionId, [...relicsOf(state, factionId), item]), serial: state.serial + 1 }
}

/** The relics of the box a knight wears (RelicItem.equippedBy), any slot: those of the box of the faction they serve */
export function equippedItems(state: GameState, characterId: CharacterId): RelicItem[] {
  const factionId = state.characters[characterId]?.factionId
  return factionId ? relicsOf(state, factionId).filter((item) => item.equippedBy?.characterId === characterId) : []
}

/** What a knight's equipment gives, every slot's together without repeats: the unit types they can lead besides their type's and the spells they cast */
export function equipmentEffects(state: GameState, characterId: CharacterId): { unitTypes: UnitTypeId[]; spells: SpellId[] } {
  const effects = equippedItems(state, characterId).flatMap((item) => (RELIC_MAP[item.relicId]?.equipment ? [RELIC_MAP[item.relicId].equipment!] : []))
  return {
    unitTypes: [...new Set(effects.flatMap((e) => e.unitTypes ?? []))],
    spells: [...new Set(effects.flatMap((e) => e.spells ?? []))],
  }
}
