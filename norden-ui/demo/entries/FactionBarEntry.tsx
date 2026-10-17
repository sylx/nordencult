import { useState } from 'react'
import { FactionBar } from '../../src'
import { Log, useLog, Workbench } from '../Workbench'

const cities = ['フルーエン', 'ヴェステル', 'ミルデン']

export default function FactionBarEntry() {
  const [log, add] = useLog()
  const [gold, setGold] = useState(500)
  const [forecast, setForecast] = useState(110)
  const [production, setProduction] = useState(820)
  const [troops, setTroops] = useState(4500)
  const [city, setCity] = useState(0)
  const [withSummary, setWithSummary] = useState(true)
  const step = (delta: number) => {
    const next = (city + delta + cities.length) % cities.length
    setCity(next)
    add(`都市: ${cities[next]}`)
  }
  return <Workbench
    stageClassName="backdrop-dark"
    stage={<div className="demo-top-left">
      <FactionBar summary={withSummary ? { gold, goldForecast: forecast, production, troops } : undefined}
        cityName={cities[city]!} cityPosition={{ index: city, count: cities.length }} onPrevCity={() => step(-1)} onNextCity={() => step(1)} />
    </div>}
    controls={<>
      <h2>勢力の情報</h2>
      <p>都市コマンド画面の左上。金（次のターンの増減）・総生産・総兵力と、自勢力の都市の切り替え。装飾は仮です。</p>
      <label htmlFor="faction-gold">金</label>
      <input id="faction-gold" type="number" value={gold} onChange={event => setGold(Number(event.target.value))} />
      <label htmlFor="faction-forecast">次のターンの増減</label>
      <input id="faction-forecast" type="number" value={forecast} onChange={event => setForecast(Number(event.target.value))} />
      <label htmlFor="faction-production">総生産</label>
      <input id="faction-production" type="number" value={production} onChange={event => setProduction(Number(event.target.value))} />
      <label htmlFor="faction-troops">総兵力</label>
      <input id="faction-troops" type="number" value={troops} onChange={event => setTroops(Number(event.target.value))} />
      <label className="checkbox"><input type="checkbox" checked={withSummary} onChange={event => setWithSummary(event.target.checked)} />勢力の情報を出す（外すと都市の切り替えだけ）</label>
      <Log entries={log} />
    </>}
  />
}
