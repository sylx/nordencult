import { createElement } from 'react'
import { basicAttack, basicDefense, mightFor } from '@norden/battle-runtime'
import type { UnitType } from '@norden/map-runtime/core/units'
import type {
  BuildOptionView, BuildingView, CityStatView, CityView, ConstructionView, DomesticBudgetsView, DomesticOfficerRole, DomesticOfficersView, EventDetail, FactionResearchSummaryView,
  FactionSummaryView, FactionView, InvasionAssignment, KnightView, PopulationGrowthView, RelicOptionView, RelicProductionView, RelicView, SpriteImage, TechView, TurnView, UnitTypeView,
} from 'norden-ui'
import type { MapCity, MapSeason, PlaceType } from 'norden-strategy'
import buildingSheet from '../../assets/buildings.webp'
import { CharacterImage } from '../../components/CharacterImage'
import { BUILDING_LIST, BUILDING_MAP, describeEffect, type BuildingEffectKind, type CityTier } from '../../data/buildings'
import buildingSprite from '../../data/buildingSprite.json'
import relicSheet from '../../assets/relics.webp'
import relicSprite from '../../data/relicSprite.json'
import { RELIC_MAP, RELIC_USE_LABELS, relicName, relicRarity, type Relic } from '../../data/relics'
import techSheet from '../../assets/techs.webp'
import techSprite from '../../data/techSprite.json'
import { TECH_BRANCH_LABELS, TECH_LIST, TECH_MAP, techChildren } from '../../data/techs'
import { CHARACTER_MAP, CHARACTER_TYPE_LABELS } from '../../data/character'
import { FACTION_MAP, factionEmblem } from '../../data/faction'
import { CITY_MAP } from '../../data/city'
import { UNIT_TYPES } from '../../data/unitTypes'
import {
  assignmentLabel, assignmentOf, awayReason, BALANCE, buildingLocked, charactersIn, citiesOf, cityOutput, commandRank, constructionProblem, constructionTurns, dateOf, defaultUnitType,
  availableTechs, engagementOf, FUNDED_ROLES, governorOf, officerTraining, producibleRelics, productionProblem, relicItemInfo, relicsOf, relicWorks, repairableRelics, repairProblem,
  researchOf, researchOutput, researchProblem, researchTurns, techStatus,
  MAX_MORALE, moveOrderOf, movementOf, orderOf, ownerOf, prisonerMovementOf, prisonerOrderOf, prisonersIn, seasonOf, tierOf, transportKnightProblem, transportOrderOf, treasuryForecast,
  turnsToNextTier, unitAbilities, unitTypesOf, viewFaction, type CityConstruction, type CityLogStat,
  type GameEvent, type GameState, type RelicItem, type RelicWork, type Season,
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

const PHASE_LABELS = { strategy: '戦略フェーズ', march: '進行フェーズ' } as const

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

/** A technology's picture on src/assets/techs.webp */
export function techImage(id: string): SpriteImage | undefined {
  const sprite = TECH_MAP[id]?.sprite
  return sprite && {
    src: techSheet, sheetWidth: techSprite.width, sheetHeight: techSprite.height, ...sprite, width: techSprite.cellWidth, height: techSprite.cellHeight,
  }
}

/** A technology as the faction sees it (a hidden one shows only its place in the tree) */
export function techView(game: GameState, factionId: string, id: string): TechView {
  const tech = TECH_MAP[id]
  const research = researchOf(game, factionId)
  const known = techStatus(game, factionId, id)
  const status = research.current === id ? 'researching' : known
  if (!tech || status === 'hidden') return { id, status: 'hidden', requires: tech?.requires ?? [], alignWith: tech?.alignWith }
  return {
    id,
    status,
    requires: tech.requires,
    alignWith: tech.alignWith,
    name: tech.name,
    image: techImage(id),
    description: tech.description,
    effects: tech.effects.map(describeEffect),
    cost: tech.cost,
    progress: research.progress[id] ?? 0,
    turns: researchTurns(game, factionId, id),
    unavailableReason: known === 'researched' ? undefined : researchProblem(game, factionId, id) ?? undefined,
  }
}

/** The technology screen's technologies for the faction, in data order */
export const techsView = (game: GameState, factionId: string): TechView[] => TECH_LIST.map((t) => techView(game, factionId, t.id))

/** How the faction's research points a turn are made up, e.g. 施設 +17.5（物理文明 5・魔法文明 10、研究中の系統 +50%） */
export function researchPointDetails(game: GameState, factionId: string): string[] {
  const forecast = researchOutput(game, factionId)
  const { physical, arcane } = forecast.branches
  const branch = researchOf(game, factionId).current ? TECH_MAP[researchOf(game, factionId).current!]?.branch : undefined
  const bonus = branch ? `、研究中の${TECH_BRANCH_LABELS[branch]}の施設 +${BALANCE.RESEARCH_BRANCH_BONUS * 100}%` : ''
  return [
    `施設 +${Math.round(forecast.buildings * 10) / 10}（物理文明 ${physical}・魔法文明 ${arcane}${bonus}）`,
    `研究担当官 ${range(forecast.officers)}`,
  ]
}

/** The research points the faction gets next turn, least and most */
export const researchPerTurn = (game: GameState, factionId: string): readonly [number, number] => researchOutput(game, factionId).total

/** The faction's research on the faction bar */
export function researchSummary(game: GameState, factionId: string): FactionResearchSummaryView {
  const research = researchOf(game, factionId)
  const tech = research.current ? TECH_MAP[research.current] : undefined
  return {
    perTurn: researchOutput(game, factionId).total,
    tech: tech && {
      name: tech.name, progress: research.progress[tech.id] ?? 0, cost: tech.cost, turns: researchTurns(game, factionId, tech.id),
    },
    complete: availableTechs(game, factionId).length === 0,
  }
}

/** A relic's picture on src/assets/relics.webp, broken or repaired (one with no broken state has the one) */
export function relicImage(id: string, repaired: boolean): SpriteImage | undefined {
  const relic = RELIC_MAP[id]
  const sprite = repaired ? relic?.sprite : relic?.brokenSprite ?? relic?.sprite
  return sprite && {
    src: relicSheet, sheetWidth: relicSprite.width, sheetHeight: relicSprite.height, ...sprite, width: relicSprite.cellWidth, height: relicSprite.cellHeight,
  }
}

/** A relic as a building to draw */
const relicBuildingView = (id: string, repaired: boolean): BuildingView =>
  ({ id, name: relicName(id, repaired), image: relicImage(id, repaired), description: RELIC_MAP[id]?.description })

/** The relic of a repair (broken still) or a production (repaired) */
const workRelicView = (work: RelicWork) => relicBuildingView(work.relicId, work.kind === 'relicProduction')

/** undefined: neutral */
export function factionView(factionId: string | null | undefined): FactionView | undefined {
  const faction = factionId ? FACTION_MAP[factionId] : undefined
  return faction && { name: faction.name, emblem: factionEmblem(faction.id) }
}

export function knightView(game: GameState, id: string): KnightView {
  const character = CHARACTER_MAP[id]
  if (!character) return { id, name: id }
  const order = orderOf(game, id)
  const moveOrder = moveOrderOf(game, id)
  const transportOrder = transportOrderOf(game, id)
  const movement = movementOf(game, id)
  const away = awayReason(game, id)
  const assignment = assignmentOf(game, id)
  const prisoner = game.characters[id]?.prisoner
  // The head of a faction goes by its title (e.g. レオニス帝国皇帝) in place of 領主
  const headOf = character.isPatriarch ? FACTION_MAP[game.characters[id]?.factionId ?? ''] : undefined
  // A prisoner being taken away, or to be this turn
  const carried = prisonerMovementOf(game, id)
  const carriedOrder = prisonerOrderOf(game, id)
  return {
    id,
    name: character.name,
    portrait: createElement(CharacterImage, { character, mode: 'face' }),
    // height: auto keeps the 2:3 figure; the profile crops it from the top
    image: createElement(CharacterImage, { character, style: { height: 'auto' } }),
    faction: factionView(game.characters[id]?.factionId) ?? null,
    location: game.characters[id]?.cityId ? cityName(game.characters[id].cityId) : undefined,
    biography: character.biography,
    subtitle: [
      CHARACTER_TYPE_LABELS[character.type],
      ...(prisoner ? ['捕虜'] : []),
      ...(carriedOrder ? [`${cityName(carriedOrder.to)}へ移送予約中`] : []),
      ...(carried ? [`${cityName(carried.to)}へ移送中`] : []),
      ...(headOf ? [`${headOf.name}${headOf.patriarchLabel}`] : []),
      ...(assignment && !(headOf && assignment === 'governor') ? [assignmentLabel(assignment)] : []),
      ...(order ? [`${cityName(order.to)}へ侵攻予約中`] : []),
      ...(moveOrder ? [`${cityName(moveOrder.to)}へ移動予約中`] : []),
      ...(transportOrder ? [`${cityName(transportOrder.to)}へ輸送予約中`] : []),
      ...(movement ? [`${cityName(movement.to)}へ${movement.kind === 'return' ? '帰還中' : away}`] : []),
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
    defaultUnitType: defaultUnitType(id),
    unitTypes: unitTypesOf(id),
    commandRank: commandRank(game, id),
    unavailableReason: engagementOf(game, id) ?? (carried ? '移送中' : carriedOrder ? '移送予約中' : undefined),
  }
}

/** A knight on the transport screen: an officer cannot take a transport (transportKnightProblem) */
export const transportKnightView = (game: GameState, id: string): KnightView =>
  ({ ...knightView(game, id), unavailableReason: transportKnightProblem(game, id) ?? undefined })

const CITY_LOG_LABELS: Readonly<Record<CityLogStat, string>> = {
  population: '人口', baseMarket: '商業（基礎）', baseProduction: '生産（基礎）', market: '商業', production: '生産',
}

/** Full length of the 商業・生産 bars, the same for every city (a value past it fills the bar) */
const OUTPUT_BAR_MAX = 1000

/** What the city builds, repairs or produces, for the screens */
function constructionView(game: GameState, cityId: string, construction: CityConstruction): ConstructionView {
  const { work } = construction
  return {
    building: work.kind === 'building' ? buildingView(work.buildingId) : workRelicView(work),
    kind: work.kind,
    invested: construction.investedSupplies,
    required: construction.requiredSupplies,
    turnsLeft: construction.paused ? null : constructionTurns(game, cityId),
    paused: construction.paused,
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
      { label: '商業', value: output.market, max: OUTPUT_BAR_MAX },
      { label: '生産', value: output.production, max: OUTPUT_BAR_MAX },
    ],
    troops: state.troops,
    troopMorale: state.troopMorale,
    supplies: state.storedSupplies,
    buildings: {
      slots: output.slots,
      built: state.buildings.map(buildingView),
      construction: state.construction && constructionView(game, id, state.construction),
    },
    tags: city.tags,
    knights: knights.map((knight) => knightView(game, knight)),
    prisoners: prisonersIn(game, id).map((prisoner) => knightView(game, prisoner)),
    history: (game.cityHistory[id] ?? []).map(({ turn, population, market, production, log }) => ({
      turn, population, market, production,
      log: log.map(({ stat, ...line }) => ({ ...line, label: CITY_LOG_LABELS[stat] })),
    })),
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
    boosted('商業', output.baseMarket, output.market, output.governor.market, 'commerce', 'marketPct', OUTPUT_BAR_MAX),
    boosted('生産', output.baseProduction, output.production, output.governor.production, 'production', 'productionPct', OUTPUT_BAR_MAX),
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
  const work = city.construction?.work
  return BUILDING_LIST
    .filter((b) => !city.buildings.includes(b.id) && !(work?.kind === 'building' && work.buildingId === b.id))
    .map((b) => ({
      ...buildingView(b.id),
      supplies: b.supplies,
      gold: b.gold,
      turns: constructionTurns(game, cityId, b.supplies),
      unavailableReason: constructionProblem(game, cityId, b.id) ?? undefined,
      locked: buildingLocked(game, cityId, b.id),
    }))
}

/** The relics the city could repair or produce (those the faction has the technology for), with why each cannot be started now */
export function relicOptions(game: GameState, cityId: string): RelicOptionView[] {
  const factionId = ownerOf(game, cityId)
  if (!factionId) return []
  const repairs = repairableRelics(game, factionId).map((item): RelicOptionView => {
    const cost = RELIC_MAP[item.relicId].repair!
    return {
      ...relicBuildingView(item.relicId, false), id: item.id, kind: 'relicRepair', supplies: cost.supplies, gold: cost.gold,
      turns: constructionTurns(game, cityId, cost.supplies), unavailableReason: repairProblem(game, cityId, item.id) ?? undefined,
    }
  })
  const productions = producibleRelics(game, factionId).map((relic): RelicOptionView => {
    const cost = relic.production!
    return {
      ...relicBuildingView(relic.id, true), kind: 'relicProduction', supplies: cost.supplies, gold: cost.gold,
      turns: constructionTurns(game, cityId, cost.supplies), unavailableReason: productionProblem(game, cityId, relic.id) ?? undefined,
    }
  })
  return [...repairs, ...productions]
}

const relicSummary = (relic: Relic, repaired: boolean) => ({ rarity: relicRarity(relic, repaired), useLabel: RELIC_USE_LABELS[relic.use], description: relic.description })

const relicStatus = (item: RelicItem) => (item.repaired ? 'repaired' : item.papalRepair ? 'papalRepair' : 'broken')

/** The faction's box, what it can do with each relic (repairing in `cityId`), then the relics being repaired or produced in its cities */
export function relicsView(game: GameState, factionId: string, cityId: string): RelicView[] {
  const box = relicsOf(game, factionId).flatMap((item): RelicView[] => {
    const info = relicItemInfo(game, factionId, cityId, item.id)
    if (!info) return []
    const { relic, repair, papalGold, dismantlePoints } = info
    return [{
      ...relicSummary(relic, item.repaired),
      id: item.id,
      status: relicStatus(item),
      name: relicName(item.relicId, item.repaired),
      image: relicImage(item.relicId, item.repaired),
      dismantle: dismantlePoints === undefined ? undefined : { points: dismantlePoints, unavailableReason: info.dismantleProblem ?? undefined },
      repair: repair && {
        supplies: repair.supplies, gold: repair.gold, turns: constructionTurns(game, cityId, repair.supplies), unavailableReason: info.repairProblem ?? undefined,
      },
      papalRepair: papalGold === undefined ? undefined : { gold: papalGold, unavailableReason: info.papalProblem ?? undefined },
    }]
  })
  const works = relicWorks(game, factionId).flatMap(({ cityId: workCity, work }): RelicView[] => {
    const relic = RELIC_MAP[work.relicId]
    if (!relic) return []
    const repairing = work.kind === 'relicRepair'
    return [{
      ...relicSummary(relic, !repairing),
      id: `work-${workCity}`,
      status: repairing ? 'repairing' : 'producing',
      name: relicName(work.relicId, !repairing),
      image: relicImage(work.relicId, !repairing),
      cityName: cityName(workCity),
    }]
  })
  return [...box, ...works]
}

/** The relics the faction has the technology to produce, with why each cannot be started in `cityId` now */
export function relicProductionsView(game: GameState, factionId: string, cityId: string): RelicProductionView[] {
  return producibleRelics(game, factionId).map((relic) => ({
    ...relicSummary(relic, true),
    id: relic.id,
    name: relic.name,
    image: relicImage(relic.id, true),
    supplies: relic.production!.supplies,
    gold: relic.production!.gold,
    turns: constructionTurns(game, cityId, relic.production!.supplies),
    unavailableReason: productionProblem(game, cityId, relic.id) ?? undefined,
  }))
}

/** What was lost with a city, e.g. 壊れたライフルの修復 */
export const relicWorkLabel = (work: RelicWork) => `${relicName(work.relicId, work.kind === 'relicProduction')}の${work.kind === 'relicRepair' ? '修復' : '生産'}`

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

const AFFAIRS_LABELS = { commerce: '商業', production: '生産', recruitment: '兵', research: '研究' } as const

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

/**
 * How an event is told: the cut-in (its template and texts; none: the notice at once), then the notice (its cut or
 * picture, words and the knights it concerns), with its sound effect (none: silent)
 */
export interface EventView {
  cutIn?: { template: string; text: string; subText: string }
  sound?: string
  cut?: string
  picture?: BuildingView
  title: string
  message: string
  details: EventDetail[]
  knights: readonly string[]
}

export function eventView(event: GameEvent): EventView {
  if (event.kind === 'techCompleted') {
    const tech = TECH_MAP[event.techId]
    const name = tech?.name ?? event.techId
    return {
      sound: 'complete',
      picture: { id: event.techId, name, image: techImage(event.techId) },
      title: '研究完了',
      message: `${name}の研究が完了しました。`,
      details: [
        { label: '効果', value: tech && tech.effects.length > 0 ? tech.effects.map(describeEffect).join('・') : 'なし' },
        { label: '解禁された技術', value: techChildren(event.techId).map((t) => t.name).join('・') || 'なし' },
      ],
      knights: [],
    }
  }
  if (event.kind === 'relicCompleted') {
    const name = relicName(event.relicId, true)
    const relic = RELIC_MAP[event.relicId]
    return {
      sound: 'complete',
      picture: { id: event.relicId, name, image: relicImage(event.relicId, true) },
      title: '遺物の完成',
      message: `${name}が完成しました。`,
      details: [
        { label: '場所', value: event.cityId ? cityName(event.cityId) : '法王府' },
        ...(relic ? [{ label: '使い道', value: RELIC_USE_LABELS[relic.use] }] : []),
      ],
      knights: [],
    }
  }
  const faction = FACTION_MAP[event.factionId]?.name ?? event.factionId
  return {
    cutIn: { template: 'faction_destruction', text: `${faction}滅亡`, subText: dateLabel(event.turn) },
    cut: 'faction_destruction',
    title: '勢力滅亡',
    message: `${faction}は${cityName(event.cityId)}を失い、滅亡しました。`,
    details: [
      { label: '最後の拠点', value: cityName(event.cityId) },
      { label: '攻め落とした勢力', value: FACTION_MAP[event.by]?.name ?? event.by },
      { label: '在野になった騎士', value: event.knights.length > 0 ? `${event.knights.length}人` : 'なし' },
    ],
    knights: event.knights,
  }
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

/**
 * The player's faction shown (viewFaction) on the faction bar: the treasury and its change next turn, the 生産 and
 * soldiers of its cities, and its research
 */
export function factionSummary(game: GameState): FactionSummaryView {
  const treasury = treasuryForecast(game, viewFaction(game))
  const cities = citiesOf(game, viewFaction(game))
  return {
    gold: treasury.before,
    goldForecast: treasury.after - treasury.before,
    production: cities.reduce((sum, id) => sum + cityOutput(game, id).production, 0),
    troops: cities.reduce((sum, id) => sum + game.cities[id].troops, 0),
    research: researchSummary(game, viewFaction(game)),
  }
}

/** The battle screen's unit sprites (norden-battle/assets/units/<unit type>.webp), facing right */
const UNIT_IMAGES = import.meta.glob<string>('../../../norden-battle/assets/units/*.webp', { eager: true, query: '?url', import: 'default' })

export const UNIT_TYPE_VIEWS: readonly UnitTypeView[] = UNIT_TYPES.map((type) => ({
  ...type, image: UNIT_IMAGES[`../../../norden-battle/assets/units/${type.id}.webp`],
}))

/**
 * Basic attack and defense of a unit of an invasion from `from` (norden-battle's rules): its soldiers and unit type,
 * the city's morale, and its knight's 統率・武力 (知力 for mages), or half of the commander's for an indirect unit
 */
export function unitPower(game: GameState, from: string, unit: InvasionAssignment, commander: string) {
  const leader = unitAbilities(unit.knightId, commander)
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

/** A knight's name (the id when unknown) */
export const knightName = (id: string) => CHARACTER_MAP[id]?.name ?? id

/** Knights of a move, e.g. マルクス・カルタほか2人 */
export function knightsLabel(ids: readonly string[]) {
  const first = ids[0] === undefined ? '' : knightName(ids[0])
  return ids.length > 1 ? `${first}ほか${ids.length - 1}人` : first
}
