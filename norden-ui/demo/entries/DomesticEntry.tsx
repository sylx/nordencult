import { useState } from 'react'
import { DomesticScreen } from '../../src'
import type {
  BuildingView, CityView, ConstructionView, DomesticBudgetsView, DomesticFundedRole, DomesticOfficerRole, DomesticOfficersView, KnightView,
} from '../../src'
import {
  BUILDINGS, CITIES, CITY_MAP, FACTION_SUMMARY, buildOptionsFor, cityView, domesticStatsFor, knightsIn, lordView, playerCities, withCompleted,
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
}

const OFFICER_LABELS: Record<DomesticOfficerRole, string> = { commerce: '商業', production: '生産', training: '訓練', recruitment: '募兵' }

/** Demo-only effects of the officers, after the game's rules: the roles' aptitudes summed, the gold rolled 80〜150 */
function officerEffectsFor(officers: DomesticOfficersView, budgets: DomesticBudgetsView, knights: readonly KnightView[]) {
  const ability = (id: string, key: 'politics' | 'intelligence' | 'leadership' | 'strength' | 'charm') =>
    knights.find(knight => knight.id === id)?.abilities?.[key] ?? 0
  const power = (role: DomesticOfficerRole, weigh: (id: string) => number) => (officers[role] ?? []).reduce((sum, id) => sum + weigh(id), 0)
  const powers: Record<DomesticOfficerRole, number> = {
    commerce: power('commerce', id => (ability(id, 'politics') * 2 + ability(id, 'intelligence')) / 3),
    production: power('production', id => (ability(id, 'politics') * 2 + ability(id, 'intelligence')) / 3),
    training: power('training', id => (ability(id, 'strength') * 2 + ability(id, 'leadership')) / 3),
    recruitment: power('recruitment', id => (ability(id, 'charm') * 3 + ability(id, 'strength')) / 4),
  }
  const effects: Partial<Record<DomesticOfficerRole, string>> = {}
  const funded = (role: DomesticFundedRole, label: string, gain: (spent: number) => number) => {
    if (!powers[role]) return
    const budget = budgets[role] ?? 0
    const [low, high] = [Math.min(budget, 80), Math.min(budget, 150)]
    effects[role] = budget > 0 ? `${label} +${gain(low)}〜${gain(high)}/ターン` : '予算なし'
  }
  const growth = (power: number) => (spent: number) => Math.round(Math.max(1, spent * power / 100 * 0.033))
  funded('commerce', '商業', growth(powers.commerce))
  funded('production', '生産', growth(powers.production))
  funded('recruitment', '兵', spent => Math.floor(spent * powers.recruitment / 100))
  if (powers.training) effects.training = `練度 +${Math.round(Math.max(1, powers.training * 0.2))}/ターン`
  return effects
}

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
    }]
  }))
}

export default function DomesticEntry() {
  const [log, add] = useLog()
  const [cityId, setCityId] = useState(playerCities[0]!)
  const [gold, setGold] = useState(FACTION_SUMMARY.gold)
  const [states, setStates] = useState<Record<string, CityDomesticState>>(createInitialDomesticState)

  const baseCity = cityView(cityId)
  const current = states[cityId]!
  const production = baseCity.stats?.find(stat => stat.label === '生産')?.value ?? 100

  const turnsFor = (invested: number, required: number) =>
    production > 0 ? Math.max(0, Math.ceil((required - invested) / production)) : null

  // The lord's mark follows the lord when they are replaced
  const knights = knightsIn(cityId).map(knight => {
    const titles = (knight.subtitle ?? '').split(' / ').filter(title => title && title !== '領主')
    return { ...knight, subtitle: [...titles, ...(knight.id === current.lordId ? ['領主'] : [])].join(' / ') }
  })

  const city: CityView = {
    ...baseCity,
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

  const advanceTurn = () => {
    if (current.construction && !current.construction.paused) {
      const nextInvested = current.construction.invested + production
      if (nextInvested >= current.construction.required) {
        const surplus = nextInvested - current.construction.required
        const finished = current.construction.building
        updateCity({
          built: withCompleted(current.built, finished),
          construction: null,
          supplies: current.supplies + surplus,
        })
        add(`${city.name}: 「${finished.name}」が完成！（余剰物資 +${surplus}）`)
      } else {
        updateCity({
          construction: { ...current.construction, invested: nextInvested },
        })
        add(`${city.name}: 建設進捗 +${production}（${nextInvested} / ${current.construction.required}）`)
      }
    } else {
      updateCity({
        supplies: current.supplies + production,
      })
      add(`${city.name}: 備蓄物資 +${production}（計 ${current.supplies + production}）`)
    }
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
    setGold(FACTION_SUMMARY.gold)
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
        stats={domesticStatsFor(city)}
        onBuild={handleBuild}
        onDemolish={handleDemolish}
        onCancelConstruction={handleCancelConstruction}
        onPauseConstruction={handlePauseConstruction}
        officers={current.officers}
        officerEffects={officerEffectsFor(current.officers, current.budgets, knights)}
        budgets={current.budgets}
        onChangeBudget={handleChangeBudget}
        onChangeLord={handleChangeLord}
        onAssignOfficers={handleAssignOfficers}
        onClose={() => add('閉じる')}
      />
    </>}
    controls={<>
      <h2>内政画面</h2>
      <p>最上段に都市の現状（商業・生産・新兵の練度のグラフと人口・物資・金）。グラフの縞模様の部分が施設によるブーストで、マウスオーバーかクリックで内訳を表示します。その下に都市の施設スロット、空きスロットの「+」から右側に追加可能な施設一覧を開いて建設できます。建設済み施設に上位の施設があれば「アップグレード」から右側にアップグレード先を開いて改築でき、完成すると同じスロットで置き換わります（スロットは増えません）。「削除」で確認ダイアログ付きで取り壊せます。その都市でまだ建てられない施設（必要な都市の特性・遺物・元の施設が無いもの）は一覧に出しません。</p>
      <p>最上段の左に領主の顔と「交代」。交代を押すと右側に領地の騎士一覧（政治・魅力）が開き、任命で領主を替えます。最下段の内政担当官は商業・生産（政治2・知力1）・訓練（武力2・統率1）・募兵（魅力3・武力1）にそれぞれ2人まで任命でき、枠を押すと右側に適性の高い順で騎士一覧が開きます（領主とほかの役職の担当官は選べず、担当官を領主にするとその役職から外れます）。商業・生産・募兵はスライダで予算（1000まで）を割り当て、担当官が毎ターン 80〜150 ずつ使って基礎値や兵数を上げます。訓練は金を使いません。効果の数値はゲームと同じ式のデモ用の計算です（ターンを進めても予算は減りません）。</p>
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
        1ターン進める（生産 +{production}）
      </button>
      <button type="button" className="reset-button" onClick={reset}>
        初期状態に戻す
      </button>
      <dl className="demo-readout">
        <div><dt>備蓄物資</dt><dd>{current.supplies.toLocaleString()}</dd></div>
        <div><dt>金</dt><dd>{gold.toLocaleString()}</dd></div>
        <div><dt>施設数</dt><dd>{current.built.length} / {current.slots}</dd></div>
      </dl>
      <Log entries={log} />
    </>}
  />
}
