import { createElement } from 'react'
import type { KnightView, MercenaryProfileView } from 'norden-ui'
import { CharacterImage } from '../../components/CharacterImage'
import { CHARACTER_MAP, CHARACTER_TYPE_LABELS } from '../../data/character'
import { CITY_MAP } from '../../data/city'
import { UNIT_TYPE_MAP } from '../../data/unitTypes'
import { defaultUnitType, mercenaryAt, mercenaryRank, type GameState } from '../../game'

// Apart from views.ts, which brings the battle's and the map's code with it: the dialogue editor shows this too

const UNIT_IMAGE_FILES = import.meta.glob<string>('../../../norden-battle/assets/units/*.webp', { eager: true, query: '?url', import: 'default' })

/** The battle screen's unit sprites (norden-battle/assets/units/<unit type>.webp), facing right, by unit type */
export const UNIT_IMAGES: Readonly<Record<string, string>> =
  Object.fromEntries(Object.entries(UNIT_IMAGE_FILES).map(([path, url]) => [path.replace(/^.*\//, '').replace(/\.webp$/, ''), url]))

/** A mercenary's unit type, which is fixed: its name and picture */
function mercenaryUnit(id: string) {
  // A mercenary is one of the data's characters, never a summoned unit
  const type = defaultUnitType({ summons: {} }, id)
  return { unitType: UNIT_TYPE_MAP[type]?.name ?? type, unitImage: UNIT_IMAGES[type] }
}

/** A mercenary's knight as their profile shows them, without what the game state says of them: face, figure, type and abilities */
export function mercenaryKnight(id: string): KnightView {
  const character = CHARACTER_MAP[id]
  return {
    id,
    name: character.name,
    portrait: createElement(CharacterImage, { character, mode: 'face' }),
    image: createElement(CharacterImage, { character, style: { height: 'auto' } }),
    subtitle: CHARACTER_TYPE_LABELS[character.type],
    biography: character.biography,
    abilities: {
      leadership: character.leadership, strength: character.strength, intelligence: character.intelligence, politics: character.politics, charm: character.charm,
    },
  }
}

/**
 * Who a mercenary is, for their profile: their company, unit, strength, rank and the city they are in, hired or not.
 * `knight` is their knight's view (the screens give knightView's)
 */
export function mercenaryProfile(game: GameState, id: string, knight: KnightView = mercenaryKnight(id)): MercenaryProfileView {
  const info = CHARACTER_MAP[id].mercenaryInfo!
  const city = mercenaryAt(game, id) ?? game.characters[id].roaming ?? ''
  return {
    knight, company: info.name, ...mercenaryUnit(id), soldiers: game.mercenaries[id].soldiers, maxSoldiers: info.maxSoldiers,
    rank: mercenaryRank(id), cityName: CITY_MAP[city]?.name ?? city,
  }
}
