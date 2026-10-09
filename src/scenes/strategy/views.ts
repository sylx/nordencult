import { createElement } from 'react'
import type { CityView, FactionView, KnightView, TurnView, UnitTypeView } from 'norden-ui'
import { CITY_MAP, FACTION_MAP, PLACE_ART, PLACES, emblemUrl, type PlaceType } from 'norden-strategy'
import { CharacterImage } from '../../components/CharacterImage'
import { CHARACTER_MAP, CHARACTER_TYPE_LABELS } from '../../data/character'
import { UNIT_TYPES } from '../../data/unitTypes'
import {
  charactersIn, defaultUnitType, maxSoldiers, neighbours, orderOf, ownerOf, type GameState,
} from '../../game'

/** The game state turned into the view types norden-ui's screens draw */

const CITY_TYPE_LABELS: Readonly<Record<string, string>> = {
  pope_city: '聖都',
  port_city: '港湾都市',
  farm_city: '農業都市',
  trade_city: '交易都市',
  military_city: '軍事都市',
  ruin_city: '遺跡都市',
  frontier_city: '辺境都市',
}

const SCALE_LABELS: Readonly<Record<PlaceType, string>> = {
  town: '小さな町',
  city: '大きな街',
  metropolice: '大都市',
  fortress1: '要塞',
  fortress2: '要塞',
  temple: '聖地',
}

const PHASE_LABELS = { strategy: '戦略フェーズ', march: '行軍フェーズ' } as const

const PLACE_TYPES = new Map(PLACES.map((p) => [p.id, p.type]))

export const cityName = (id: string) => CITY_MAP[id]?.name ?? id

/** undefined: neutral */
export function factionView(factionId: string | null | undefined): FactionView | undefined {
  const faction = factionId ? FACTION_MAP[factionId] : undefined
  return faction && { name: faction.name, emblem: emblemUrl(faction.id) }
}

export function knightView(game: GameState, id: string): KnightView {
  const character = CHARACTER_MAP[id]
  if (!character) return { id, name: id }
  const order = orderOf(game, id)
  return {
    id,
    name: character.name,
    portrait: createElement(CharacterImage, { character, mode: 'face' }),
    subtitle: [
      CHARACTER_TYPE_LABELS[character.type],
      ...(game.characters[id]?.isLord ? ['領主'] : []),
      ...(order ? [`${cityName(order.to)}へ侵攻予約中`] : []),
    ].join(' / '),
    stats: [
      { label: '統率', value: character.leadership },
      { label: '武力', value: character.strength },
      { label: '知力', value: character.intelligence },
    ],
    maxSoldiers: maxSoldiers(id),
    defaultUnitType: defaultUnitType(id),
    unavailableReason: order ? '侵攻予約中' : undefined,
  }
}

export function cityView(game: GameState, id: string): CityView {
  const city = CITY_MAP[id]
  const faction = factionView(ownerOf(game, id))
  if (!city) return { id, name: id, faction }
  const type = PLACE_TYPES.get(id) ?? 'town'
  return {
    id,
    name: city.name,
    faction,
    typeLabel: CITY_TYPE_LABELS[city.type] ?? city.type,
    scaleLabel: SCALE_LABELS[type],
    population: city.population,
    art: PLACE_ART[type].url,
    special: city.special,
    stats: [
      { label: '農業', value: city.agriculture, max: 720 },
      { label: '商業', value: city.market, max: 720 },
      { label: '軍事', value: city.military, max: 640 },
    ],
    tags: city.tags,
    knights: charactersIn(game, id).map((knight) => knightView(game, knight)),
    neighbours: neighbours(id).map((other) => ({ id: other, name: cityName(other), faction: factionView(ownerOf(game, other)) })),
  }
}

/** The game has no calendar yet: the turn number takes the place of the date */
export function turnView(game: GameState): TurnView {
  return {
    turn: game.turn,
    phaseLabel: PHASE_LABELS[game.phase],
    dateLabel: `第${game.turn}ターン`,
    activeFaction: game.activeFaction ? factionView(game.activeFaction) : null,
  }
}

export const UNIT_TYPE_VIEWS: readonly UnitTypeView[] = UNIT_TYPES
