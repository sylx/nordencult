import { createElement } from 'react'
import { basicAttack, basicDefense, mightFor } from '@norden/battle-runtime'
import type { UnitType } from '@norden/map-runtime/core/units'
import type {
  AssignmentRoleView, BuildOptionView, BuildingView, CityView, FactionView, InvasionAssignment, KnightView, TurnView, UnitTypeView,
} from 'norden-ui'
import { FACTION_MAP, PLACES, emblemUrl, type MapSeason, type PlaceType } from 'norden-strategy'
import { CharacterImage } from '../../components/CharacterImage'
import { BUILDING_LIST, BUILDING_MAP, describeEffect } from '../../data/buildings'
import { CHARACTER_MAP, CHARACTER_TYPE_LABELS } from '../../data/character'
import { CITY_MAP } from '../../data/city'
import { UNIT_TYPES } from '../../data/unitTypes'
import {
  assignmentOf, charactersIn, cityOutput, commandRank, constructionProblem, constructionTurns, dateOf, defaultUnitType, governorBonus,
  governorOf, indirectMaxSoldiers, militaryBonus, type GovernorBonus, type MilitaryBonus,
  maxSoldiers, neighbours, orderOf, ownerOf, seasonOf, treasuryForecast, unitTypesOf, type AssignmentRole, type GameState,
  type Season,
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

const ASSIGNMENT_LABELS: Readonly<Record<AssignmentRole, string>> = { governor: '代官', military: '軍事担当' }

/** Building images written by norden-data (src/assets/buildings/<id>.webp) */
const BUILDING_IMAGES = import.meta.glob<string>('../../assets/buildings/*.webp', { eager: true, query: '?url', import: 'default' })

export function buildingView(id: string): BuildingView {
  const building = BUILDING_MAP[id]
  if (!building) return { id, name: id }
  return {
    id,
    name: building.name,
    description: building.description,
    effects: building.effects.map(describeEffect),
    image: building.image ? BUILDING_IMAGES[`../../assets/buildings/${building.image}`] : undefined,
  }
}

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
  const assignment = assignmentOf(game, id)
  return {
    id,
    name: character.name,
    portrait: createElement(CharacterImage, { character, mode: 'face' }),
    subtitle: [
      CHARACTER_TYPE_LABELS[character.type],
      ...(assignment ? [ASSIGNMENT_LABELS[assignment]] : []),
      ...(order ? [`${cityName(order.to)}へ侵攻予約中`] : []),
    ].join(' / '),
    stats: [
      { label: '統率', value: character.leadership },
      { label: '武力', value: character.strength },
      { label: '知力', value: character.intelligence },
    ],
    maxSoldiers: maxSoldiers(id),
    defaultUnitType: defaultUnitType(id),
    unitTypes: unitTypesOf(id),
    commandRank: commandRank(game, id),
    indirectSoldiers: indirectMaxSoldiers(id),
    unavailableReason: order ? '侵攻予約中' : undefined,
  }
}

export function cityView(game: GameState, id: string): CityView {
  const city = CITY_MAP[id]
  const faction = factionView(ownerOf(game, id))
  if (!city) return { id, name: id, faction }
  const type = PLACE_TYPES.get(id) ?? 'town'
  const knights = charactersIn(game, id)
  const lord = CHARACTER_MAP[governorOf(game, id) ?? '']
  const state = game.cities[id]
  const output = cityOutput(game, id)
  return {
    id,
    name: city.name,
    faction,
    typeLabel: CITY_TYPE_LABELS[city.type] ?? city.type,
    scaleLabel: SCALE_LABELS[type],
    population: state.population,
    tier: output.tier,
    special: city.special,
    // height: auto keeps the 2:3 figure; the window crops it from the top
    lord: lord && {
      name: lord.name,
      image: createElement(CharacterImage, { character: lord, style: { height: 'auto' } }),
    },
    stats: [
      { label: '商業', value: output.market, max: 720, base: output.baseMarket },
      { label: '生産', value: output.production, max: 640, base: output.baseProduction },
    ],
    troops: state.troops,
    troopMorale: state.troopMorale,
    supplies: state.storedSupplies,
    buildings: {
      slots: output.slots,
      built: state.buildings.map(buildingView),
      construction: state.construction && {
        building: buildingView(state.construction.buildingId),
        invested: state.construction.investedSupplies,
        required: state.construction.requiredSupplies,
        turnsLeft: constructionTurns(game, id),
      },
    },
    tags: city.tags,
    knights: knights.map((knight) => knightView(game, knight)),
    neighbours: neighbours(id).map((other) => ({ id: other, name: cityName(other), faction: factionView(ownerOf(game, other)) })),
  }
}

/** Buildings the city could start (not standing or being built), with why each cannot be started now */
export function buildOptions(game: GameState, cityId: string): BuildOptionView[] {
  const city = game.cities[cityId]
  return BUILDING_LIST
    .filter((b) => !city.buildings.includes(b.id) && city.construction?.buildingId !== b.id)
    .map((b) => ({
      ...buildingView(b.id),
      supplies: b.supplies,
      gold: b.gold,
      turns: constructionTurns(game, cityId, b.id),
      unavailableReason: constructionProblem(game, cityId, b.id) ?? undefined,
    }))
}

const percent = (value: number) => `+${Math.round(value * 100)}%`

/** A governor's bonuses as text, e.g. 商業 +12% (those of 0 left out) */
export function governorLines(bonus: GovernorBonus): string[] {
  return [['商業', bonus.market], ['生産', bonus.production], ['人口の伸び', bonus.growth]]
    .flatMap(([label, value]) => (Number(value) > 0 ? [`${label} ${percent(Number(value))}`] : []))
}

/** The military officers' bonuses as text, e.g. 訓練 +1.6/ターン */
export function militaryLines(bonus: MilitaryBonus): string[] {
  return [
    ...(bonus.training > 0 ? [`訓練 +${bonus.training.toFixed(1)}/ターン`] : []),
    ...(bonus.recruit > 0 ? [`募兵 ${percent(bonus.recruit)}`] : []),
  ]
}

/** The role's bonuses if the knight were given it (the military officers' together) */
export function assignmentForecast(game: GameState, cityId: string, knightId: string, role: AssignmentRoleView): string[] {
  if (role === 'governor') return governorLines(governorBonus(knightId))
  const others = game.cities[cityId].assignments.military.filter((id) => id !== knightId)
  return militaryLines(militaryBonus([...others, knightId]))
}

/** e.g. 灰歴312年4月 春 */
export function dateLabel(turn: number) {
  const { year, month } = dateOf(turn)
  return `灰歴${year}年${month}月 ${seasonOf(month)}`
}

const MAP_SEASONS: Readonly<Record<Season, MapSeason>> = { 春: 'spring', 夏: 'summer', 秋: 'autumn', 冬: 'winter' }

/** The season the strategy map shows on this turn */
export const mapSeason = (turn: number) => MAP_SEASONS[seasonOf(dateOf(turn).month)]

export const phaseLabel = (phase: GameState['phase']) => PHASE_LABELS[phase]

export function turnView(game: GameState): TurnView {
  const treasury = treasuryForecast(game, game.playerFaction)
  return {
    turn: game.turn,
    phaseLabel: phaseLabel(game.phase),
    dateLabel: dateLabel(game.turn),
    activeFaction: game.activeFaction ? factionView(game.activeFaction) : null,
    gold: treasury.before,
    goldForecast: treasury.after - treasury.before,
  }
}

/** The battle screen's unit sprites (norden-battle/assets/units/<unit type>.png), facing right */
const UNIT_IMAGES = import.meta.glob<string>('../../../norden-battle/assets/units/*.png', { eager: true, query: '?url', import: 'default' })

export const UNIT_TYPE_VIEWS: readonly UnitTypeView[] = UNIT_TYPES.map((type) => ({
  ...type, image: UNIT_IMAGES[`../../../norden-battle/assets/units/${type.id}.png`],
}))

/**
 * Basic attack and defense of a unit of an invasion from `from` (norden-battle's rules): its soldiers and unit type,
 * the city's morale, and its knight's 統率・武力 (知力 for mages), or the commander's for an indirect unit
 */
export function unitPower(game: GameState, from: string, unit: InvasionAssignment, commander: string) {
  const leader = CHARACTER_MAP[unit.knightId ?? commander]
  const type = unit.unitType as UnitType
  const power = {
    type,
    soldiers: unit.soldiers,
    morale: game.cities[from]?.troopMorale ?? 0,
    leadership: leader?.leadership ?? 0,
    strength: leader ? mightFor(type, leader) : 0,
  }
  return { attack: basicAttack(power), defense: basicDefense(power) }
}
