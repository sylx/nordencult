import { CHARACTER_MAP } from '../data/character'
import { CITY_MAP } from '../data/city'
import { factionName } from '../data/faction'
import type { CharacterState, GameState } from '../game'

const cityName = (id: string | null | undefined) => (id ? CITY_MAP[id]?.name ?? id : 'なし')
const signed = (value: number) => (value > 0 ? `+${value}` : `${value}`)
const keys = (a: object, b: object) => [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()

/** Who a character serves and where */
function belonging(character: CharacterState | undefined): string {
  if (!character) return 'なし'
  if (character.prisoner) return `捕虜（${cityName(character.cityId)}）`
  if (!character.factionId) return `所属なし（${cityName(character.roaming ?? character.cityId)}）`
  return `${factionName(character.factionId)}（${cityName(character.cityId)}）`
}

/** What a dialogue scene changed: gold, supplies and soldiers, flags, who the characters serve and the mercenaries' contracts */
export function stateChanges(before: GameState, after: GameState): string[] {
  const lines: string[] = []
  for (const id of keys(before.gold, after.gold)) {
    const [from, to] = [before.gold[id] ?? 0, after.gold[id] ?? 0]
    if (from !== to) lines.push(`金 ${factionName(id)}: ${from} → ${to}（${signed(to - from)}）`)
  }
  for (const id of keys(before.cities, after.cities)) {
    const [from, to] = [before.cities[id], after.cities[id]]
    if (from?.storedSupplies !== to?.storedSupplies) lines.push(`物資 ${cityName(id)}: ${from?.storedSupplies ?? 0} → ${to?.storedSupplies ?? 0}（${signed((to?.storedSupplies ?? 0) - (from?.storedSupplies ?? 0))}）`)
    if (from?.troops !== to?.troops) lines.push(`兵 ${cityName(id)}: ${from?.troops ?? 0} → ${to?.troops ?? 0}`)
  }
  for (const key of keys(before.flags, after.flags)) {
    const [from, to] = [before.flags[key], after.flags[key]]
    if (from !== to) lines.push(`フラグ ${key}: ${from ?? 'なし'} → ${to ?? 'なし'}`)
  }
  for (const id of keys(before.characters, after.characters)) {
    const [from, to] = [belonging(before.characters[id]), belonging(after.characters[id])]
    if (from !== to) lines.push(`${CHARACTER_MAP[id]?.name ?? id}: ${from} → ${to}`)
  }
  for (const id of keys(before.mercenaries, after.mercenaries)) {
    const [from, to] = [before.mercenaries[id]?.contract, after.mercenaries[id]?.contract]
    if (Boolean(from) !== Boolean(to)) {
      const company = CHARACTER_MAP[id]?.mercenaryInfo?.name ?? id
      lines.push(to ? `${company}: 契約（月額 ${to.monthly}）` : `${company}: 契約の終わり`)
    }
  }
  return lines
}
