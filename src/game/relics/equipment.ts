import { CHARACTER_MAP } from '../../data/character'
import { RELIC_MAP, type SpellId } from '../../data/relics'
import { isMercenary } from '../army'
import { EQUIPMENT_SLOTS } from '../economy/balance'
import { GameRuleError } from '../errors'
import { orderOf } from '../queries'
import type { Battle, CharacterId, FactionId, GameState, RelicItem } from '../types'
import { equipmentEffects, relicsOf, withRelics } from './box'

/**
 * Knights wearing relics (装備): each knight serving a faction, mercenaries and summoned units aside, has EQUIPMENT_SLOTS slots, each
 * holding a repaired equipment relic of the faction's box (RelicItem.equippedBy: the relic stays the faction's). What it gives is
 * the relic's Relic.equipment: unit types to lead (unitTypesOf) and spells to cast in battle (battleSpells).
 * A knight leaving the faction (captured, wandering, a contract ending, the faction falling) takes nothing along: releaseEquipment
 * takes it off, back into the box of the faction they served
 */

const check = (problem: string | null) => {
  if (problem) throw new GameRuleError(problem)
}

const nameOf = (characterId: CharacterId) => CHARACTER_MAP[characterId]?.name ?? characterId

/** A knight serving a faction: not a prisoner nor serving nobody */
function servedFaction(state: GameState, characterId: CharacterId): FactionId | null {
  const character = state.characters[characterId]
  return character?.factionId && !character.prisoner && !character.roaming ? character.factionId : null
}

const isSlot = (slot: number) => Number.isInteger(slot) && slot >= 0 && slot < EQUIPMENT_SLOTS

/** A knight's slots in order: the relic in each, or null when empty */
export function equipmentOf(state: GameState, characterId: CharacterId): (RelicItem | null)[] {
  const factionId = servedFaction(state, characterId)
  const items = factionId ? relicsOf(state, factionId).filter((item) => item.equippedBy?.characterId === characterId) : []
  return Array.from({ length: EQUIPMENT_SLOTS }, (_, slot) => items.find((item) => item.equippedBy!.slot === slot) ?? null)
}

/** The first empty slot of a knight's, or null when every one holds a relic */
export function freeSlot(state: GameState, characterId: CharacterId): number | null {
  const slot = equipmentOf(state, characterId).indexOf(null)
  return slot < 0 ? null : slot
}

/** Why the knight cannot have their equipment changed now: not their faction's turn, not serving it, a mercenary, sent on an invasion this turn */
function wearerProblem(state: GameState, characterId: CharacterId): string | null {
  const factionId = servedFaction(state, characterId)
  if (!factionId) return '勢力に仕える騎士ではありません'
  if (state.phase !== 'strategy' || state.activeFaction !== factionId) return '手番ではありません'
  if (isMercenary(characterId)) return '傭兵は装備できません'
  if (CHARACTER_MAP[characterId]?.type === 'summon') return '召喚ユニットは装備できません'
  // The unit type (and the spells) of the invasion were chosen with what they wear
  if (orderOf(state, characterId)) return '侵攻予約中は装備を変えられません'
  return null
}

/**
 * Why the knight cannot wear the relic of their faction's box in the slot now, or null. Another knight's relic is taken off them
 * (equipRelic), as long as their equipment can change too
 */
export function equipProblem(state: GameState, characterId: CharacterId, slot: number, itemId: string): string | null {
  const problem = wearerProblem(state, characterId)
  if (problem) return problem
  if (!isSlot(slot)) return `装備の枠は${EQUIPMENT_SLOTS}つです`
  const item = relicsOf(state, servedFaction(state, characterId)!).find((i) => i.id === itemId)
  if (!item) return '遺物がありません'
  const relic = RELIC_MAP[item.relicId]
  if (!item.repaired) return '修復されていない遺物です'
  if (relic?.use !== 'equipment' || !relic.equipment) return '装備できない遺物です'
  const { wearer, minIntelligence } = relic.equipment
  const magician = CHARACTER_MAP[characterId]?.type === 'magician'
  if (wearer === 'magician' && !magician) return '魔術師だけが装備できます'
  if (wearer === 'nonMagician' && magician) return '魔術師は装備できません'
  if (minIntelligence !== undefined && (CHARACTER_MAP[characterId]?.intelligence ?? 0) < minIntelligence) return `知力 ${minIntelligence} が必要です`
  const holder = item.equippedBy
  if (holder?.characterId === characterId && holder.slot === slot) return '装備しています'
  const twin = equipmentOf(state, characterId).some((other, s) => s !== slot && other && other.id !== itemId && other.relicId === item.relicId)
  if (twin) return '同じ遺物をもう一方の枠に装備しています'
  if (holder && holder.characterId !== characterId && orderOf(state, holder.characterId)) return `装備している${nameOf(holder.characterId)}が侵攻予約中です`
  return null
}

/** Takes the relics matching `off` off whoever wears them, back into the boxes */
function takeOff(state: GameState, factionId: FactionId, off: (item: RelicItem) => boolean): GameState {
  return withRelics(state, factionId, relicsOf(state, factionId).map((item) => {
    if (!item.equippedBy || !off(item)) return item
    const rest = { ...item }
    delete rest.equippedBy
    return rest
  }))
}

/**
 * The knight wears the relic in the slot: one already there goes back into the box (付け替え), and the relic comes off the knight
 * (or the slot of theirs) wearing it, in a single command
 */
export function equipRelic(state: GameState, characterId: CharacterId, slot: number, itemId: string): GameState {
  check(equipProblem(state, characterId, slot, itemId))
  const factionId = servedFaction(state, characterId)!
  const cleared = takeOff(state, factionId, (item) => item.id === itemId || (item.equippedBy!.characterId === characterId && item.equippedBy!.slot === slot))
  return withRelics(cleared, factionId, relicsOf(cleared, factionId).map((item) => (item.id === itemId ? { ...item, equippedBy: { characterId, slot } } : item)))
}

/** Why the knight cannot take the relic of the slot off now, or null */
export function unequipProblem(state: GameState, characterId: CharacterId, slot: number): string | null {
  const problem = wearerProblem(state, characterId)
  if (problem) return problem
  if (!isSlot(slot)) return `装備の枠は${EQUIPMENT_SLOTS}つです`
  return equipmentOf(state, characterId)[slot] ? null : '装備していません'
}

/** The relic of the slot goes back into the box */
export function unequipRelic(state: GameState, characterId: CharacterId, slot: number): GameState {
  check(unequipProblem(state, characterId, slot))
  return takeOff(state, servedFaction(state, characterId)!, (item) => item.equippedBy!.characterId === characterId && item.equippedBy!.slot === slot)
}

/**
 * The relics of the faction's box the knight can wear in the slot now (equipProblem), those other knights wear included; the slot
 * omitted: the first empty one (the first when none is)
 */
export function equippableRelics(state: GameState, characterId: CharacterId, slot = freeSlot(state, characterId) ?? 0): RelicItem[] {
  const factionId = servedFaction(state, characterId)
  return factionId ? relicsOf(state, factionId).filter((item) => !equipProblem(state, characterId, slot, item.id)) : []
}

/**
 * The knights of the faction who can wear the relic of its box now, the one wearing it aside, in id order: in their first empty slot
 * (the first when none is)
 */
export function equippableKnights(state: GameState, factionId: FactionId, itemId: string): CharacterId[] {
  const holder = relicsOf(state, factionId).find((item) => item.id === itemId)?.equippedBy?.characterId
  return Object.keys(state.characters).sort().filter((id) => id !== holder && servedFaction(state, id) === factionId
    && !equipProblem(state, id, freeSlot(state, id) ?? 0, itemId))
}

/**
 * The spells the knights of both sides of a battle cast with what they wear (魔導書), those with none left out. The battle screen
 * casts them only for a unit of 魔術師 (TroopInit.spells), and never for a unit led indirectly
 */
export function battleSpells(state: GameState, battle: Battle): Readonly<Record<CharacterId, readonly SpellId[]>> {
  const knights = [...battle.attacker.knights, ...battle.defender.knights]
  return Object.fromEntries(knights.flatMap((id) => {
    const { spells } = equipmentEffects(state, id)
    return spells.length > 0 ? [[id, spells]] : []
  }))
}

/**
 * Takes every relic off the knights who wear it but no longer serve the faction of its box (captured, wandering, a contract ended,
 * the faction fallen and its box gone to another, no longer in the game): it stays in that box, nobody wearing it. Every way a
 * knight leaves a faction comes here; it changes nothing when nobody did
 */
export function releaseEquipment(state: GameState): GameState {
  let next = state
  for (const [factionId, items] of Object.entries(state.relics)) {
    if (items.some((item) => item.equippedBy && servedFaction(state, item.equippedBy.characterId) !== factionId)) {
      next = takeOff(next, factionId, (item) => servedFaction(state, item.equippedBy!.characterId) !== factionId)
    }
  }
  return next
}

/** Debugging: `change` made as in the strategy phase of the knight's faction with no invasion ordered, the turn and the orders left as they are */
function asTheirTurn(state: GameState, characterId: CharacterId, change: (turn: GameState) => GameState): GameState {
  const factionId = servedFaction(state, characterId)
  if (!factionId) throw new GameRuleError('勢力に仕える騎士ではありません')
  const changed = change({ ...state, phase: 'strategy', activeFaction: factionId, orders: [] })
  return { ...changed, phase: state.phase, activeFaction: state.activeFaction, orders: state.orders }
}

/**
 * Debugging: the knight wears the relic of their faction's box in the slot (the first empty one, or the first, when omitted) whatever
 * the turn and their orders; the rest as equipRelic (not a mercenary, the relic repaired and for them)
 */
export const debugEquipRelic = (state: GameState, characterId: CharacterId, itemId: string, slot?: number): GameState =>
  asTheirTurn(state, characterId, (turn) => equipRelic(turn, characterId, slot ?? freeSlot(turn, characterId) ?? 0, itemId))

/** Debugging: the relic of the knight's slot goes back into the box whatever the turn and their orders */
export const debugUnequipRelic = (state: GameState, characterId: CharacterId, slot: number): GameState =>
  asTheirTurn(state, characterId, (turn) => unequipRelic(turn, characterId, slot))
