import { useState } from 'react'
import { DomesticScreen } from '../../src'
import type { BuildingView, CityView, ConstructionView } from '../../src'
import { BUILDINGS, CITIES, CITY_MAP, FACTION_SUMMARY, buildOptionsFor, cityView, playerCities, withCompleted } from '../mock/data'
import MockMap from '../mock/MockMap'
import { Log, useLog, Workbench } from '../Workbench'

interface CityDomesticState {
  slots: number
  built: BuildingView[]
  construction: ConstructionView | null
  supplies: number
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

  const city: CityView = {
    ...baseCity,
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
        onBuild={handleBuild}
        onDemolish={handleDemolish}
        onCancelConstruction={handleCancelConstruction}
        onPauseConstruction={handlePauseConstruction}
        onClose={() => add('閉じる')}
      />
    </>}
    controls={<>
      <h2>内政画面</h2>
      <p>左上に都市の施設スロット、空きスロットの「+」から右側に追加可能な施設一覧を開いて建設できます。建設済み施設の右下「削除」で確認ダイアログ付きで取り壊せます。</p>
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
