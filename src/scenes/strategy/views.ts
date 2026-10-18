import { createElement } from 'react'
import { basicAttack, basicDefense, mightFor } from '@norden/battle-runtime'
import type { UnitType } from '@norden/map-runtime/core/units'
import type {
  BuildOptionView, BuildingView, CityStatView, CityView, DomesticBudgetsView, DomesticOfficerRole, DomesticOfficersView, FactionSummaryView, FactionView, InvasionAssignment, KnightView, PopulationGrowthView, TurnView, UnitTypeView,
} from 'norden-ui'
import type { MapCity, MapSeason, PlaceType } from 'norden-strategy'
import buildingSheet from '../../assets/buildings.webp'
import { CharacterImage } from '../../components/CharacterImage'
import { BUILDING_LIST, BUILDING_MAP, describeEffect, type BuildingEffectKind, type CityTier } from '../../data/buildings'
import buildingSprite from '../../data/buildingSprite.json'
import { CHARACTER_MAP, CHARACTER_TYPE_LABELS } from '../../data/character'
import { FACTION_MAP, factionEmblem } from '../../data/faction'
import { CITY_MAP } from '../../data/city'
import { UNIT_TYPES } from '../../data/unitTypes'
import {
  assignmentOf, BALANCE, buildingLocked, charactersIn, citiesOf, cityOutput, commandRank, constructionProblem, constructionTurns, dateOf, defaultUnitType,
  FUNDED_ROLES, governorOf, indirectMaxSoldiers, officerTraining,
  MAX_MORALE, maxSoldiers, neighbours, orderOf, ownerOf, seasonOf, tierOf, treasuryForecast, turnsToNextTier, unitTypesOf, type AssignmentRole, type GameState,
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

/** The pictures of the tiers on the map: 小さな町, 大きな街, 大都市 */
const TIER_PLACE_TYPES: Readonly<Record<CityTier, PlaceType>> = { 1: 'town', 2: 'city', 3: 'metropolice' }

/** A city's picture on the map (and its scale): its fixed one (聖地・要塞), or by its tier now */
export function placeTypeOf(game: GameState, id: string): PlaceType {
  const state = game.cities[id]
  return CITY_MAP[id]?.image ?? (state ? TIER_PLACE_TYPES[tierOf(state.population)] : 'town')
}

/** The cities as the map draws them: names, pictures (growing with their tiers) and factions */
export function mapCities(game: GameState): MapCity[] {
  return Object.keys(game.cities).map((id) => ({
    id, name: CITY_MAP[id]?.name ?? id, type: placeTypeOf(game, id), belongTo: ownerOf(game, id),
  }))
}

const ASSIGNMENT_LABELS: Readonly<Record<AssignmentRole, string>> = {
  governor: '領主', commerce: '商業担当官', production: '生産担当官', training: '訓練担当官', recruitment: '募兵担当官',
}


export function buildingView(id: string): BuildingView {
  const building = BUILDING_MAP[id]
  if (!building) return { id, name: id }
  return {
    id,
    name: building.name,
    description: building.description,
    effects: building.effects.map(describeEffect),
    upgradeFrom: building.upgradeFrom,
    image: building.sprite && {
      src: buildingSheet,
      sheetWidth: buildingSprite.width,
      sheetHeight: buildingSprite.height,
      ...building.sprite,
      width: buildingSprite.cellWidth,
      height: buildingSprite.cellHeight,
    },
  }
}

export const cityName = (id: string) => CITY_MAP[id]?.name ?? id

/** undefined: neutral */
export function factionView(factionId: string | null | undefined): FactionView | undefined {
  const faction = factionId ? FACTION_MAP[factionId] : undefined
  return faction && { name: faction.name, emblem: factionEmblem(faction.id) }
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
    abilities: {
      leadership: character.leadership,
      strength: character.strength,
      intelligence: character.intelligence,
      politics: character.politics,
      charm: character.charm,
    },
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
  const knights = charactersIn(game, id)
  const lord = CHARACTER_MAP[governorOf(game, id) ?? '']
  const state = game.cities[id]
  const output = cityOutput(game, id)
  return {
    id,
    name: city.name,
    faction,
    typeLabel: CITY_TYPE_LABELS[city.type] ?? city.type,
    scaleLabel: SCALE_LABELS[placeTypeOf(game, id)],
    population: state.population,
    // A 聖地・要塞 keeps its scale whatever its tier
    tier: output.fixedScale ? undefined : output.tier,
    special: city.special,
    // height: auto keeps the 2:3 figure; the window crops it from the top
    lord: lord && {
      id: lord.id,
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
        turnsLeft: state.construction.paused ? null : constructionTurns(game, id),
        paused: state.construction.paused,
      },
    },
    tags: city.tags,
    knights: knights.map((knight) => knightView(game, knight)),
    neighbours: neighbours(id).map((other) => ({ id: other, name: cityName(other), faction: factionView(ownerOf(game, other)) })),
  }
}

/**
 * The domestic screen's bars: 商業・生産 with the governor's and the buildings' shares stacked on the city's base
 * (which the officers raise), the soldiers' 練度 with its training, and the morale of new recruits with the buildings' share
 */
export function domesticStats(game: GameState, cityId: string): CityStatView[] {
  const output = cityOutput(game, cityId)
  const buildings = game.cities[cityId].buildings
  const governor = CHARACTER_MAP[governorOf(game, cityId) ?? '']
  // Each building's effects of the kind, e.g. 市場: 商業 +5%
  const details = (kind: BuildingEffectKind) => buildings.flatMap((id) => (BUILDING_MAP[id]?.effects ?? [])
    .filter((effect) => effect.kind === kind)
    .map((effect) => `${BUILDING_MAP[id].name}: ${describeEffect(effect)}`))
  const boosted = (label: string, base: number, value: number, governorShare: number, role: 'commerce' | 'production',
    kind: BuildingEffectKind, max: number): CityStatView => {
    const fromGovernor = Math.round(base * governorShare)
    const affairs = output.affairs[role]
    return {
      label, value, max, base,
      boosts: [
        ...(fromGovernor ? [{ label: '領主', value: fromGovernor, details: governor ? [governor.name] : [] }] : []),
        { label: '施設', value: value - base - fromGovernor, source: 'building' as const, details: details(kind) },
      ],
      ...(affairs && { notes: [affairs.spend[1] > 0 ? `担当官: 基礎 ${range(affairs.gain)}/ターン` : '担当官: 予算なし'] }),
    }
  }
  return [
    boosted('商業', output.baseMarket, output.market, output.governor.market, 'commerce', 'marketPct', 720),
    boosted('生産', output.baseProduction, output.production, output.governor.production, 'production', 'productionPct', 640),
    {
      label: '練度', kind: 'morale', value: game.cities[cityId].troopMorale, max: MAX_MORALE,
      notes: [output.training > 0 ? `訓練 +${output.training}/ターン` : '兵がいないため訓練なし', ...details('trainingPct')],
    },
    {
      label: '新兵の練度', kind: 'morale', value: output.recruitMorale, max: MAX_MORALE, base: BALANCE.RECRUIT_MORALE,
      boosts: [{ label: '施設', value: output.recruitMorale - BALANCE.RECRUIT_MORALE, source: 'building', details: details('recruitMorale') }],
    },
  ]
}

/**
 * The city's population growth next turn at its base 商業・生産 now (the officers' raise this turn adds to it),
 * the turns until its next tier at that growth (none for a 聖地・要塞), and how the growth is made up
 */
export function populationGrowthView(game: GameState, cityId: string): PopulationGrowthView {
  const { tier, fixedScale, populationGrowth: growth } = cityOutput(game, cityId)
  const city = game.cities[cityId]
  const lord = CHARACTER_MAP[governorOf(game, cityId) ?? '']
  const fixed = (value: number) => Math.round(value).toLocaleString()
  return {
    perTurn: growth.total,
    ...(!fixedScale && tier < 3 && { nextTier: { tier: tier + 1, turns: turnsToNextTier(city.population, growth.total) } }),
    details: [
      `経済 +${fixed(growth.economy)}（商業 ${city.market}×${BALANCE.POP_GROWTH_COEF_MARKET} + 生産 ${city.production}×${BALANCE.POP_GROWTH_COEF_PRODUCTION}）`,
      `施設 +${fixed(growth.facilities)}（${city.buildings.length}件×${BALANCE.POP_GROWTH_FACILITY_BASE}）`,
      lord ? `領主 ×${growth.governor.toFixed(2)}（${lord.name}: 政治 ${lord.politics} + 魅力 ${lord.charm}）` : '領主 ×1.00（不在）',
      ...(growth.buildingPct ? [`人口の伸び +${Math.round(growth.buildingPct * 100)}%（施設の効果）`] : []),
    ],
  }
}

/** Buildings the city could start (not standing or being built), with why each cannot be started now and whether it is locked */
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
      locked: buildingLocked(game, cityId, b.id),
    }))
}

/** e.g. +4〜7, or +5 when the least and the most are the same */
const range = ([low, high]: readonly [number, number]) => (low === high ? `+${low}` : `+${low}〜${high}`)

/** The city's domestic officers, for the domestic screen */
export function officersView(game: GameState, cityId: string): DomesticOfficersView {
  return game.cities[cityId].assignments.officers
}

/** Gold the city has set aside for its officers to spend, for the domestic screen */
export function budgetsView(game: GameState, cityId: string): DomesticBudgetsView {
  return game.cities[cityId].affairsBudget
}

const AFFAIRS_LABELS = { commerce: '商業', production: '生産', recruitment: '兵' } as const

/**
 * What each role's officers will do next turn, e.g. 商業 +4〜7/ターン（金 80〜150）or 練度 +15/ターン
 * (roles without officers left out)
 */
export function officerEffects(game: GameState, cityId: string): Partial<Record<DomesticOfficerRole, string>> {
  const output = cityOutput(game, cityId)
  const effects: Partial<Record<DomesticOfficerRole, string>> = {}
  for (const role of FUNDED_ROLES) {
    const affairs = output.affairs[role]
    if (!affairs) continue
    effects[role] = affairs.spend[1] > 0
      ? `${AFFAIRS_LABELS[role]} ${range(affairs.gain)}/ターン（金 ${range(affairs.spend).slice(1)}）`
      : '予算なし'
  }
  if (output.officers.training > 0) {
    effects.training = game.cities[cityId].troops > 0
      ? `練度 +${Math.round(officerTraining(output.officers.training))}/ターン`
      : '兵がいないため訓練なし'
  }
  return effects
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
  return {
    turn: game.turn,
    phaseLabel: phaseLabel(game.phase),
    dateLabel: dateLabel(game.turn),
    activeFaction: game.activeFaction ? factionView(game.activeFaction) : null,
  }
}

/** The player's faction on the faction bar: the treasury and its change next turn, the 生産 and soldiers of its cities */
export function factionSummary(game: GameState): FactionSummaryView {
  const treasury = treasuryForecast(game, game.playerFaction)
  const cities = citiesOf(game, game.playerFaction)
  return {
    gold: treasury.before,
    goldForecast: treasury.after - treasury.before,
    production: cities.reduce((sum, id) => sum + cityOutput(game, id).production, 0),
    troops: cities.reduce((sum, id) => sum + game.cities[id].troops, 0),
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
