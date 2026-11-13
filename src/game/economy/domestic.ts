import { BUILDING_MAP, upgradesOf } from '../../data/buildings'
import { CHARACTER_MAP } from '../../data/character'
import { CITY_MAP } from '../../data/city'
import { relicName } from '../../data/relics'
import { TECH_MAP } from '../../data/techs'
import { hasOwnSoldiers, isMercenary, mixMorale } from '../army'
import { isSummon } from '../summons/character'
import { GameRuleError } from '../errors'
import { engagementOf, ownerOf } from '../queries'
import { addRelic, facilityRelics, freeFacilityRelic, withRelicItem } from '../relics/box'
import type { AssignmentRole, CharacterId, CityAssignments, CityId, CityState, FundedRole, GameState, OfficerRole, RelicItem } from '../types'
import { AFFAIRS_BUDGET_LIMIT, OFFICERS_PER_ROLE, RECRUIT_GOLD } from './balance'
import { cityOutput } from './output'

/**
 * The domestic commands of a city: assigning its knights, building and
 * recruiting (transports are orders: movement.ts). Each has a `…Problem` function saying why it is not
 * allowed (or null); the command throws GameRuleError with that reason.
 */

export const withCity = (state: GameState, cityId: CityId, change: Partial<CityState>): GameState =>
  ({ ...state, cities: { ...state.cities, [cityId]: { ...state.cities[cityId], ...change } } })

/** Why the active faction cannot give domestic commands to a city now, or null */
export function commandProblem(state: GameState, cityId: CityId): string | null {
  if (state.phase !== 'strategy' || !state.activeFaction) return '手番ではありません'
  if (!state.cities[cityId] || ownerOf(state, cityId) !== state.activeFaction) return '自勢力の都市ではありません'
  return null
}

const check = (problem: string | null) => {
  if (problem) throw new GameRuleError(problem)
}

// ── Assignments ──

export const OFFICER_ROLES: readonly OfficerRole[] = ['commerce', 'production', 'training', 'recruitment', 'research']

const OFFICER_LABELS: Readonly<Record<OfficerRole, string>> = {
  commerce: '商業', production: '生産', training: '訓練', recruitment: '募兵', research: '研究',
}

/** 領主, or the officer of the role (e.g. 商業担当官) */
export const assignmentLabel = (role: AssignmentRole): string => (role === 'governor' ? '領主' : `${OFFICER_LABELS[role]}担当官`)

const officerRoleOf = (assignments: CityAssignments, characterId: CharacterId) =>
  OFFICER_ROLES.find((role) => assignments.officers[role]?.includes(characterId))

/** The assignment a knight holds in their city, or null */
export function assignmentOf(state: GameState, characterId: CharacterId): AssignmentRole | null {
  const cityId = state.characters[characterId]?.cityId
  const assignments = cityId ? state.cities[cityId]?.assignments : undefined
  if (!assignments) return null
  if (assignments.governor === characterId) return 'governor'
  return officerRoleOf(assignments, characterId) ?? null
}

/** The assignments with a knight taken off theirs */
export function withoutAssignee(assignments: CityAssignments, characterId: CharacterId): CityAssignments {
  const role = officerRoleOf(assignments, characterId)
  if (assignments.governor !== characterId && !role) return assignments
  return {
    ...(assignments.governor !== characterId && { governor: assignments.governor }),
    officers: role
      ? { ...assignments.officers, [role]: assignments.officers[role]!.filter((id) => id !== characterId) }
      : assignments.officers,
  }
}

/**
 * The knight to follow a city's lord who leaves it (on a move or an invasion): of the faction's knights serving
 * there and not `excluded` (those leaving too, those on an invasion; a transport's knight is fine; a mercenary or a
 * summoned unit is no lord), the one of the highest 政治, at random among equals; none when there is nobody
 */
export function successorLord(
  state: GameState, cityId: CityId, excluded: ReadonlySet<CharacterId>, random: () => number,
): CharacterId | undefined {
  const owner = ownerOf(state, cityId)
  const candidates = Object.keys(state.characters).sort().filter((id) => {
    const character = state.characters[id]
    return character.cityId === cityId && character.factionId === owner && !character.prisoner && !excluded.has(id) && !hasOwnSoldiers(id)
  })
  const politics = (id: CharacterId) => CHARACTER_MAP[id]?.politics ?? 0
  const best = Math.max(...candidates.map(politics))
  const top = candidates.filter((id) => politics(id) === best)
  return top.length > 0 ? top[Math.floor(random() * top.length)] : undefined
}

/** The assignments with `governor` made the lord (giving up an officer role: a governor holds none); unchanged when undefined */
export const withGovernor = (assignments: CityAssignments, governor: CharacterId | undefined): CityAssignments =>
  (governor ? { ...withoutAssignee(assignments, governor), governor } : assignments)

/** Why the city's lord cannot be replaced, or null: 君主 stays the lord of the city they are in, having become it on arriving */
export function lordChangeProblem(state: GameState, cityId: CityId): string | null {
  const governor = state.cities[cityId]?.assignments.governor
  return governor && CHARACTER_MAP[governor]?.isPatriarch ? '君主のいる都市の領主は交代できません' : null
}

export function assignmentProblem(state: GameState, cityId: CityId, characterId: CharacterId, role: AssignmentRole): string | null {
  const problem = commandProblem(state, cityId)
  if (problem) return problem
  const character = state.characters[characterId]
  if (character?.cityId !== cityId || character.factionId !== ownerOf(state, cityId) || character.prisoner) return `${characterId} はこの都市の騎士ではありません`
  if (isMercenary(characterId)) return '傭兵は内政を担当できません'
  if (isSummon(characterId)) return '召喚ユニットは内政を担当できません'
  // A knight on a transport cannot be made an officer, as an officer cannot take one (transportKnightProblem)
  const engaged = engagementOf(state, characterId)
  if (engaged) return `${engaged}です`
  if (assignmentOf(state, characterId) === role) return `すでに${assignmentLabel(role)}です`
  if (role === 'governor') return lordChangeProblem(state, cityId)
  const assignments = state.cities[cityId].assignments
  if (assignments.governor === characterId) return '領主は担当官になれません'
  if ((assignments.officers[role]?.length ?? 0) >= OFFICERS_PER_ROLE) return `${OFFICER_LABELS[role]}担当官は${OFFICERS_PER_ROLE}人までです`
  return null
}

/**
 * Assigns a knight of the city to a role, taking them off the one they held.
 * A new governor replaces the one before, who is left without an assignment
 */
export function assign(state: GameState, cityId: CityId, characterId: CharacterId, role: AssignmentRole): GameState {
  check(assignmentProblem(state, cityId, characterId, role))
  const rest = withoutAssignee(state.cities[cityId].assignments, characterId)
  const assignments: CityAssignments = role === 'governor'
    ? { governor: characterId, officers: rest.officers }
    : { ...rest, officers: { ...rest.officers, [role]: [...rest.officers[role] ?? [], characterId] } }
  return withCity(state, cityId, { assignments })
}

/**
 * Sets the officers of a role to these knights (OFFICERS_PER_ROLE at most), in this order:
 * those left out lose the role, those added are taken off the one they held
 */
export function setOfficers(state: GameState, cityId: CityId, role: OfficerRole, characterIds: readonly CharacterId[]): GameState {
  check(commandProblem(state, cityId))
  if (characterIds.length > OFFICERS_PER_ROLE) throw new GameRuleError(`${OFFICER_LABELS[role]}担当官は${OFFICERS_PER_ROLE}人までです`)
  const assignments = state.cities[cityId].assignments
  const cleared = withCity(state, cityId, { assignments: { ...assignments, officers: { ...assignments.officers, [role]: [] } } })
  return characterIds.reduce((next, id) => assign(next, cityId, id, role), cleared)
}

/** Takes a knight of the city off their assignment (nothing changes if they hold none) */
export function unassign(state: GameState, cityId: CityId, characterId: CharacterId): GameState {
  check(commandProblem(state, cityId))
  if (state.cities[cityId].assignments.governor === characterId) check(lordChangeProblem(state, cityId))
  const assignments = withoutAssignee(state.cities[cityId].assignments, characterId)
  return assignments === state.cities[cityId].assignments ? state : withCity(state, cityId, { assignments })
}

// ── Budgets of the officers ──

/** The most gold the city's role can have set aside now: AFFAIRS_BUDGET_LIMIT, or what it has and the treasury can add */
export function maxAffairsBudget(state: GameState, cityId: CityId, role: FundedRole): number {
  const budget = state.cities[cityId]?.affairsBudget[role] ?? 0
  return Math.min(AFFAIRS_BUDGET_LIMIT, budget + Math.max(0, state.gold[ownerOf(state, cityId) ?? ''] ?? 0))
}

export function affairsBudgetProblem(state: GameState, cityId: CityId, role: FundedRole, amount: number): string | null {
  const problem = commandProblem(state, cityId)
  if (problem) return problem
  if (!Number.isInteger(amount) || amount < 0) return '金額が正しくありません'
  if (amount > AFFAIRS_BUDGET_LIMIT) return `予算は${AFFAIRS_BUDGET_LIMIT}までです`
  if (amount > maxAffairsBudget(state, cityId, role)) return '金が足りません'
  return null
}

/**
 * Sets the gold the city sets aside for a role's officers to spend, moving the difference between
 * the treasury and the budget (lowering it gives the gold back)
 */
export function setAffairsBudget(state: GameState, cityId: CityId, role: FundedRole, amount: number): GameState {
  check(affairsBudgetProblem(state, cityId, role, amount))
  const city = state.cities[cityId]
  const factionId = state.activeFaction!
  const added = amount - (city.affairsBudget[role] ?? 0)
  const next = withCity(state, cityId, { affairsBudget: { ...city.affairsBudget, [role]: amount } })
  return { ...next, gold: { ...state.gold, [factionId]: state.gold[factionId] - added } }
}

// ── Construction ──

/** The technology a building needs that the city's faction has not researched (a neutral city has researched none), or undefined */
function missingTech(state: GameState, cityId: CityId, buildingId: string): string | undefined {
  const tech = BUILDING_MAP[buildingId]?.requiredTech
  if (!tech) return undefined
  const owner = ownerOf(state, cityId)
  return owner && state.research[owner]?.researched.includes(tech) ? undefined : tech
}

/**
 * Why the city's faction cannot build a building needing a relic (Building.requiredRelic) now: it has no such relic
 * repaired, or the other buildings under way use all it has (RelicItem.buildingIn); null: it can, or the building needs none
 */
function facilityRelicProblem(state: GameState, cityId: CityId, buildingId: string): string | null {
  const relicId = BUILDING_MAP[buildingId]?.requiredRelic
  if (!relicId) return null
  const owner = ownerOf(state, cityId)
  const name = relicName(relicId, true)
  if (!owner || facilityRelics(state, owner, relicId).length === 0) return `遺物「${name}」が必要です`
  return freeFacilityRelic(state, owner, relicId) ? null : `遺物「${name}」はほかの都市の建設に使っています`
}

/** The relic the city's faction would use building it (none for a building needing none, or with no such relic free) */
export function constructionRelic(state: GameState, cityId: CityId, buildingId: string): string | undefined {
  const relicId = BUILDING_MAP[buildingId]?.requiredRelic
  const owner = ownerOf(state, cityId)
  return relicId && owner ? freeFacilityRelic(state, owner, relicId)?.id : undefined
}

/** Why a building cannot be started in the city now, or null (the command's checks too) */
export function buildingProblem(state: GameState, cityId: CityId, buildingId: string): string | null {
  const building = BUILDING_MAP[buildingId]
  if (!building) return `${buildingId} は施設ではありません`
  const city = state.cities[cityId]
  if (!city) return '都市がありません'
  if (city.buildings.includes(buildingId)) return 'すでに建っています'
  const upgraded = upgradesOf(buildingId).find((id) => city.buildings.includes(id))
  if (upgraded) return `${BUILDING_MAP[upgraded].name}が建っています`
  const tags = CITY_MAP[cityId]?.tags ?? []
  if (building.requiredTags && !building.requiredTags.some((tag) => tags.includes(tag))) {
    return `${building.requiredTags.join('・')}の都市で建てられます`
  }
  const tech = missingTech(state, cityId, buildingId)
  if (tech) return `技術「${TECH_MAP[tech]?.name ?? tech}」の研究が必要です`
  const relicProblem = facilityRelicProblem(state, cityId, buildingId)
  if (relicProblem) return relicProblem
  // An upgrade is built over the building it replaces, taking no slot of its own
  if (building.upgradeFrom) {
    return city.buildings.includes(building.upgradeFrom) ? null : `${BUILDING_MAP[building.upgradeFrom]?.name ?? building.upgradeFrom}がある都市で建てられます`
  }
  if (city.buildings.length >= cityOutput(state, cityId).slots) return '施設の空きがありません'
  return null
}

/**
 * Whether the city cannot build it at all yet: a tag, technology or relic it needs is missing (the faction has no such
 * relic repaired; one other buildings use is not missing), the building it upgrades is not standing, or it has been
 * upgraded past (the screens leave such buildings unrevealed)
 */
export function buildingLocked(state: GameState, cityId: CityId, buildingId: string): boolean {
  const building = BUILDING_MAP[buildingId]
  const city = state.cities[cityId]
  if (!building || !city) return true
  const tags = CITY_MAP[cityId]?.tags ?? []
  return upgradesOf(buildingId).some((id) => city.buildings.includes(id))
    || Boolean(building.requiredTags && !building.requiredTags.some((tag) => tags.includes(tag)))
    || Boolean(missingTech(state, cityId, buildingId))
    || Boolean(building.requiredRelic && facilityRelics(state, ownerOf(state, cityId) ?? '', building.requiredRelic).length === 0)
    || Boolean(building.upgradeFrom && !city.buildings.includes(building.upgradeFrom))
}

const BUSY_LABELS = { building: 'ほかの施設を建設中です', relicRepair: 'ほかの遺物を修復中です', relicProduction: 'ほかの遺物を生産中です' } as const

/** Why the city cannot start building, repairing or producing: it does one at a time (null: it is free) */
export function constructionBusyProblem(state: GameState, cityId: CityId): string | null {
  const construction = state.cities[cityId]?.construction
  return construction ? BUSY_LABELS[construction.work.kind] : null
}

export function constructionProblem(state: GameState, cityId: CityId, buildingId: string): string | null {
  const problem = commandProblem(state, cityId) ?? buildingProblem(state, cityId, buildingId) ?? constructionBusyProblem(state, cityId)
  if (problem) return problem
  if ((state.gold[state.activeFaction!] ?? 0) < BUILDING_MAP[buildingId].gold) return '金が足りません'
  return null
}

/**
 * Starts building in the city, paying the building's gold; the city's 生産 goes into it from the next turn.
 * One needing a relic locks a relic of the box for it (constructionRelic, RelicItem.buildingIn)
 */
export function startConstruction(state: GameState, cityId: CityId, buildingId: string): GameState {
  check(constructionProblem(state, cityId, buildingId))
  const building = BUILDING_MAP[buildingId]
  const factionId = state.activeFaction!
  const relicItemId = constructionRelic(state, cityId, buildingId)
  const next = withCity(state, cityId, {
    construction: { work: { kind: 'building', buildingId, ...(relicItemId && { relicItemId }) }, requiredSupplies: building.supplies, investedSupplies: 0 },
  })
  const locked = relicItemId ? withRelicItem(next, factionId, relicItemId, (item) => ({ ...item, buildingIn: cityId })) : next
  return { ...locked, gold: { ...state.gold, [factionId]: state.gold[factionId] - building.gold } }
}

/** The relic no longer locked for a building (RelicItem.buildingIn) */
function unlockRelic(item: RelicItem): RelicItem {
  const unlocked = { ...item }
  delete unlocked.buildingIn
  return unlocked
}

/**
 * Gives up what the city builds, repairs or produces; half of the supplies put into it return to the city's store
 * (the gold paid does not), a relic being repaired goes back into the box, broken, and the relic a building uses is unlocked
 */
export function cancelConstruction(state: GameState, cityId: CityId): GameState {
  check(commandProblem(state, cityId))
  const city = state.cities[cityId]
  if (!city.construction) return state
  const refund = Math.floor(city.construction.investedSupplies / 2)
  const cancelled = withCity(state, cityId, {
    construction: null,
    storedSupplies: city.storedSupplies + refund,
  })
  const { work } = city.construction
  if (work.kind === 'relicRepair') return addRelic(cancelled, state.activeFaction!, work.relicId, false)
  if (work.kind === 'building' && work.relicItemId) {
    return withRelicItem(cancelled, state.activeFaction!, work.relicItemId, unlockRelic)
  }
  return cancelled
}

/** Pauses or resumes what the city builds, repairs or produces; while paused, the city's 生産 goes into its store */
export function pauseConstruction(state: GameState, cityId: CityId, paused = true): GameState {
  check(commandProblem(state, cityId))
  const construction = state.cities[cityId].construction
  if (!construction) return state
  return withCity(state, cityId, { construction: { ...construction, paused } })
}

/** Demolishes a standing building in the city */
export function demolishBuilding(state: GameState, cityId: CityId, buildingId: string): GameState {
  check(commandProblem(state, cityId))
  const buildings = state.cities[cityId].buildings
  if (!buildings.includes(buildingId)) return state
  return withCity(state, cityId, { buildings: buildings.filter((id) => id !== buildingId) })
}

/**
 * Turns until the work is completed at the city's effective 生産: what it builds, repairs or produces now, or
 * something taking `supplies` if it were started now. null when the city produces nothing
 */
export function constructionTurns(state: GameState, cityId: CityId, supplies?: number): number | null {
  const { production } = cityOutput(state, cityId)
  const construction = state.cities[cityId]?.construction
  const left = supplies ?? (construction ? construction.requiredSupplies - construction.investedSupplies : 0)
  if (left <= 0) return 0
  return production > 0 ? Math.ceil(left / production) : null
}

// ── Recruiting ──

export const recruitCost = (soldiers: number) => Math.ceil(soldiers * RECRUIT_GOLD)

/** Soldiers the city can still recruit this turn */
export function recruitLeft(state: GameState, cityId: CityId): number {
  return Math.max(0, cityOutput(state, cityId).recruitCap - (state.cities[cityId]?.recruited ?? 0))
}

/** Most soldiers the city can recruit now: what is left of this turn's, as many as its faction can pay for */
export function maxRecruit(state: GameState, cityId: CityId): number {
  const gold = state.gold[ownerOf(state, cityId) ?? ''] ?? 0
  let soldiers = Math.min(recruitLeft(state, cityId), Math.floor(gold / RECRUIT_GOLD))
  while (soldiers > 0 && recruitCost(soldiers) > gold) soldiers--
  return soldiers
}

export function recruitProblem(state: GameState, cityId: CityId, soldiers: number): string | null {
  const problem = commandProblem(state, cityId)
  if (problem) return problem
  if (!Number.isInteger(soldiers) || soldiers <= 0) return '兵数を選んでください'
  if (soldiers > recruitLeft(state, cityId)) return 'このターンに募兵できる数を超えています'
  if (recruitCost(soldiers) > (state.gold[state.activeFaction!] ?? 0)) return '金が足りません'
  return null
}

/** Recruits soldiers in the city for gold; they come in at the recruits' morale, lowering the city's */
export function recruit(state: GameState, cityId: CityId, soldiers: number): GameState {
  check(recruitProblem(state, cityId, soldiers))
  const city = state.cities[cityId]
  const factionId = state.activeFaction!
  const next = withCity(state, cityId, {
    troops: city.troops + soldiers,
    troopMorale: mixMorale(city.troops, city.troopMorale, soldiers, cityOutput(state, cityId).recruitMorale),
    recruited: city.recruited + soldiers,
  })
  return { ...next, gold: { ...state.gold, [factionId]: state.gold[factionId] - recruitCost(soldiers) } }
}
