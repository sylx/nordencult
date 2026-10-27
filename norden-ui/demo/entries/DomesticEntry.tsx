import { useState } from 'react'
import { DomesticScreen } from '../../src'
import type {
  BuildingView, CityView, ConstructionView, DomesticBudgetsView, DomesticFundedRole, DomesticOfficerRole, DomesticOfficersView, KnightView,
} from '../../src'
import {
  BUILDINGS, CITIES, CITY_MAP, buildOptionsFor, cityView, domesticStatsFor, knightsIn, lordView, playerCities, populationGrowthFor, withCompleted,
} from '../mock/data'
import MockMap from '../mock/MockMap'
import { Log, useLog, Workbench } from '../Workbench'

interface CityDomesticState {
  slots: number
  built: BuildingView[]
  construction: ConstructionView | null
  supplies: number
  lordId?: string
  officers: DomesticOfficersView
  budgets: DomesticBudgetsView
  /** What the officers have raised the base 商業・生産 by */
  raised: { market: number; production: number }
  troops: number
  troopMorale: number
}

const OFFICER_LABELS: Record<DomesticOfficerRole, string> = { commerce: '商業', production: '生産', training: '訓練', recruitment: '募兵' }

// The game's rules of the officers (its balance.ts), for the demo
const BUDGET_MIN = 80
const BUDGET_MAX = 150
const GROWTH_COEF = 0.033
const TRAINING_COEF = 0.2
const NATURAL_TRAINING = 1

/** Each role's power: its officers' abilities weighed as the role weighs them, summed */
function officerPowers(officers: DomesticOfficersView, knights: readonly KnightView[]): Record<DomesticOfficerRole, number> {
  const ability = (id: string, key: 'politics' | 'intelligence' | 'leadership' | 'strength' | 'charm') =>
    knights.find(knight => knight.id === id)?.abilities?.[key] ?? 0
  const power = (role: DomesticOfficerRole, weigh: (id: string) => number) => (officers[role] ?? []).reduce((sum, id) => sum + weigh(id), 0)
  return {
    commerce: power('commerce', id => (ability(id, 'politics') * 2 + ability(id, 'intelligence')) / 3),
    production: power('production', id => (ability(id, 'politics') * 2 + ability(id, 'intelligence')) / 3),
    training: power('training', id => (ability(id, 'strength') * 2 + ability(id, 'leadership')) / 3),
    recruitment: power('recruitment', id => (ability(id, 'charm') * 3 + ability(id, 'strength')) / 4),
  }
}

/**
 * What a funded role's officers of this power raise spending this much gold, the fraction of 商業・生産 rounded up
 * when `roll` is below it (Math.random() for a turn; 1 for the least, 0 for the most)
 */
function affairsGain(role: DomesticFundedRole, power: number, spent: number, roll: number) {
  if (spent <= 0 || power <= 0) return 0
  if (role === 'recruitment') return Math.floor(spent * power / 100)
  const growth = spent * power / 100 * GROWTH_COEF
  return Math.floor(growth) + (roll < growth - Math.floor(growth) ? 1 : 0)
}

const officerTraining = (power: number) => (power > 0 ? Math.round(Math.max(1, power * TRAINING_COEF)) : 0)

const AFFAIRS_LABELS: Record<DomesticFundedRole, string> = { commerce: '商業', production: '生産', recruitment: '兵' }
const FUNDED_ROLES: readonly DomesticFundedRole[] = ['commerce', 'production', 'recruitment']

/** What each role's officers will do next turn, the gold rolled 80〜150 */
function officerEffectsFor(officers: DomesticOfficersView, budgets: DomesticBudgetsView, knights: readonly KnightView[]) {
  const powers = officerPowers(officers, knights)
  const effects: Partial<Record<DomesticOfficerRole, string>> = {}
  for (const role of FUNDED_ROLES) {
    if (!powers[role]) continue
    const budget = budgets[role] ?? 0
    const [low, high] = [Math.min(budget, BUDGET_MIN), Math.min(budget, BUDGET_MAX)]
    effects[role] = budget > 0
      ? `${AFFAIRS_LABELS[role]} +${affairsGain(role, powers[role], low, 1)}〜${affairsGain(role, powers[role], high, 0)}/ターン（金 ${low}〜${high}）`
      : '予算なし'
  }
  if (powers.training) effects.training = `練度 +${officerTraining(powers.training)}/ターン`
  return effects
}

/** The treasury the demo starts with: enough to try the officers' budgets (1000 at most each) */
const INITIAL_GOLD = 2000

function createInitialDomesticState(): Record<string, CityDomesticState> {
  return Object.fromEntries(CITIES.map(city => {
    const base = cityView(city.id)
    return [city.id, {
      slots: base.buildings?.slots ?? 4,
      built: [...(base.buildings?.built ?? [])],
      // Start P012 with an empty slot (+ visible immediately) while keeping other cities' initial construction
      construction: city.id === 'P012' ? null : (base.buildings?.construction ?? null),
      supplies: base.supplies ?? 0,
      lordId: base.lord?.id,
      officers: {},
      budgets: {},
      raised: { market: 0, production: 0 },
      troops: base.troops ?? 0,
      troopMorale: base.troopMorale ?? 0,
    }]
  }))
}

export default function DomesticEntry() {
  const [log, add] = useLog()
  const [cityId, setCityId] = useState(playerCities[0]!)
  const [gold, setGold] = useState(INITIAL_GOLD)
  const [states, setStates] = useState<Record<string, CityDomesticState>>(createInitialDomesticState)

  const current = states[cityId]!
  // The base 商業・生産 raised by the officers (the effective values with them)
  const raisedBy: Record<string, number> = { 商業: current.raised.market, 生産: current.raised.production }
  const baseCity = cityView(cityId)
  const stats = baseCity.stats?.map(stat => {
    const raised = raisedBy[stat.label] ?? 0
    return { ...stat, value: stat.value + raised, ...(stat.base !== undefined && { base: stat.base + raised }) }
  })
  const production = stats?.find(stat => stat.label === '生産')?.value ?? 100

  const turnsFor = (invested: number, required: number) =>
    production > 0 ? Math.max(0, Math.ceil((required - invested) / production)) : null

  // The lord's mark follows the lord when they are replaced
  const knights = knightsIn(cityId).map(knight => {
    const titles = (knight.subtitle ?? '').split(' / ').filter(title => title && title !== '領主')
    return { ...knight, subtitle: [...titles, ...(knight.id === current.lordId ? ['領主'] : [])].join(' / ') }
  })

  const city: CityView = {
    ...baseCity,
    stats,
    troops: current.troops,
    troopMorale: current.troopMorale,
    lord: current.lordId ? lordView(current.lordId) : undefined,
    knights,
    supplies: current.supplies,
    buildings: {
      slots: current.slots,
      built: current.built,
      construction: current.construction && {
        ...current.construction,
        turnsLeft: current.construction.paused ? null : turnsFor(current.construction.invested, current.construction.required),
      },
    },
  }

  const options = buildOptionsFor(city, gold)

  const updateCity = (patch: Partial<CityDomesticState>) => {
    setStates(prev => ({ ...prev, [cityId]: { ...prev[cityId]!, ...patch } }))
  }

  const handleBuild = (buildingId: string) => {
    const spec = BUILDINGS[buildingId]
    if (!spec) return
    setGold(prev => Math.max(0, prev - spec.gold))
    updateCity({
      construction: {
        building: spec,
        invested: 0,
        required: spec.supplies,
        turnsLeft: turnsFor(0, spec.supplies),
        paused: false,
      },
    })
    add(`${city.name}: 「${spec.name}」の建設を開始（金 -${spec.gold}）`)
  }

  const handleDemolish = (buildingId: string) => {
    const target = current.built.find(item => item.id === buildingId)
    updateCity({
      built: current.built.filter(item => item.id !== buildingId),
    })
    add(`${city.name}: 「${target?.name ?? buildingId}」を取り壊しました`)
  }

  const handleCancelConstruction = () => {
    if (!current.construction) return
    const refund = Math.floor(current.construction.invested / 2)
    const name = current.construction.building.name
    updateCity({
      construction: null,
      supplies: current.supplies + refund,
    })
    add(`${city.name}: 「${name}」の建設を取り消し（備蓄物資 +${refund}）`)
  }

  const handlePauseConstruction = (paused: boolean) => {
    if (!current.construction) return
    const name = current.construction.building.name
    updateCity({
      construction: { ...current.construction, paused },
    })
    add(`${city.name}: 「${name}」の建設を${paused ? '中断（生産物資は備蓄へ）' : '再開'}`)
  }

  /** A turn of the city: its officers at work (as the game's economy run), then its 生産 into the construction or the store */
  const advanceTurn = () => {
    const lines: string[] = []
    const powers = officerPowers(current.officers, knights)
    const budgets = { ...current.budgets }
    const gains: Record<DomesticFundedRole, number> = { commerce: 0, production: 0, recruitment: 0 }
    for (const role of FUNDED_ROLES) {
      const budget = budgets[role] ?? 0
      if (!powers[role] || budget <= 0) continue
      const spent = Math.min(budget, BUDGET_MIN + Math.floor(Math.random() * (BUDGET_MAX - BUDGET_MIN + 1)))
      budgets[role] = budget - spent
      gains[role] = affairsGain(role, powers[role], spent, Math.random())
      lines.push(`${OFFICER_LABELS[role]}担当官: 金 ${spent} を使い${AFFAIRS_LABELS[role]} +${gains[role]}（予算の残り ${budgets[role]}）`)
    }
    // The soldiers train, then the recruits join at the recruits' morale
    const training = current.troops > 0 ? NATURAL_TRAINING + officerTraining(powers.training) : 0
    const trained = Math.min(100, current.troopMorale + training)
    const recruitMorale = domesticStatsFor(city).find(stat => stat.label === '新兵の練度')?.value ?? 20
    const troops = current.troops + gains.recruitment
    const troopMorale = troops > 0 ? Math.round((current.troops * trained + gains.recruitment * recruitMorale) / troops) : trained
    if (training > 0) lines.push(`訓練: 練度 +${trained - current.troopMorale}`)
    if (gains.recruitment > 0) lines.push(`募兵: 兵 ${current.troops} → ${troops}、練度 ${trained} → ${troopMorale}`)

    const patch: Partial<CityDomesticState> = {
      budgets,
      raised: { market: current.raised.market + gains.commerce, production: current.raised.production + gains.production },
      troops,
      troopMorale,
    }
    // This turn's 生産 is the one before the officers raised it, as in the game
    if (current.construction && !current.construction.paused) {
      const nextInvested = current.construction.invested + production
      if (nextInvested >= current.construction.required) {
        const surplus = nextInvested - current.construction.required
        const finished = current.construction.building
        Object.assign(patch, { built: withCompleted(current.built, finished), construction: null, supplies: current.supplies + surplus })
        lines.push(`「${finished.name}」が完成！（余剰物資 +${surplus}）`)
      } else {
        patch.construction = { ...current.construction, invested: nextInvested }
        lines.push(`建設進捗 +${production}（${nextInvested} / ${current.construction.required}）`)
      }
    } else {
      patch.supplies = current.supplies + production
      lines.push(`備蓄物資 +${production}（計 ${current.supplies + production}）`)
    }
    updateCity(patch)
    for (const line of lines) add(`${city.name}: ${line}`)
  }

  const handleChangeLord = (knightId: string) => {
    // The lord serves as no officer
    const officers = Object.fromEntries(Object.entries(current.officers).map(([role, ids]) => [role, ids.filter(id => id !== knightId)]))
    updateCity({ lordId: knightId, officers })
    add(`${city.name}: 領主を${knights.find(knight => knight.id === knightId)?.name ?? knightId}に交代`)
  }

  const handleAssignOfficers = (role: DomesticOfficerRole, knightIds: readonly string[]) => {
    updateCity({ officers: { ...current.officers, [role]: knightIds } })
    const names = knightIds.map(id => knights.find(knight => knight.id === id)?.name ?? id)
    add(`${city.name}: ${OFFICER_LABELS[role]}担当官 ${names.length > 0 ? names.join('・') : 'なし'}`)
  }

  const handleChangeBudget = (role: DomesticFundedRole, amount: number) => {
    setGold(prev => prev - (amount - (current.budgets[role] ?? 0)))
    updateCity({ budgets: { ...current.budgets, [role]: amount } })
    add(`${city.name}: ${OFFICER_LABELS[role]}の予算 ${amount}`)
  }

  const reset = () => {
    setStates(createInitialDomesticState())
    setGold(INITIAL_GOLD)
    add('初期状態に戻しました')
  }

  return <Workbench variant="screen"
    stage={<>
      <MockMap selected={cityId} />
      <DomesticScreen
        key={cityId}
        city={city}
        buildOptions={options}
        gold={gold}
        populationGrowth={populationGrowthFor(city)}
        stats={domesticStatsFor(city)}
        onBuild={handleBuild}
        onDemolish={handleDemolish}
        onCancelConstruction={handleCancelConstruction}
        onPauseConstruction={handlePauseConstruction}
        officers={current.officers}
        officerEffects={officerEffectsFor(current.officers, current.budgets, knights)}
        budgets={current.budgets}
        budgetPerTurn={[BUDGET_MIN, BUDGET_MAX]}
        onChangeBudget={handleChangeBudget}
        onChangeLord={handleChangeLord}
        onAssignOfficers={handleAssignOfficers}
        onClose={() => add('閉じる')}
      />
    </>}
    controls={<>
      <h2>内政画面</h2>
      <label htmlFor="domestic-city">都市</label>
      <select id="domestic-city" value={cityId} onChange={event => setCityId(event.target.value)}>
        {playerCities.map(id => <option key={id} value={id}>{CITY_MAP[id]?.name}</option>)}
      </select>
      <label htmlFor="domestic-slots">施設スロット数</label>
      <input
        id="domestic-slots"
        type="number"
        min={1}
        max={8}
        value={current.slots}
        onChange={event => {
          const next = event.target.valueAsNumber
          if (Number.isFinite(next)) updateCity({ slots: Math.max(1, Math.min(8, next)) })
        }}
      />
      <button type="button" className="reset-button" onClick={advanceTurn}>
        1ターン進める（内政処理）
      </button>
      <button type="button" className="reset-button" onClick={reset}>
        初期状態に戻す
      </button>
      <dl className="demo-readout">
        <div><dt>商業</dt><dd>{stats?.find(stat => stat.label === '商業')?.value ?? '—'}（担当官 +{current.raised.market}）</dd></div>
        <div><dt>生産</dt><dd>{production}（担当官 +{current.raised.production}）</dd></div>
        <div><dt>兵数</dt><dd>{current.troops.toLocaleString()}</dd></div>
        <div><dt>練度</dt><dd>{current.troopMorale}</dd></div>
        <div><dt>備蓄物資</dt><dd>{current.supplies.toLocaleString()}</dd></div>
        <div><dt>金</dt><dd>{gold.toLocaleString()}</dd></div>
        <div><dt>予算</dt><dd>商業 {current.budgets.commerce ?? 0}・生産 {current.budgets.production ?? 0}・募兵 {current.budgets.recruitment ?? 0}</dd></div>
        <div><dt>施設数</dt><dd>{current.built.length} / {current.slots}</dd></div>
      </dl>
      <Log entries={log} />
    </>}
  />
}
