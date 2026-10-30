import { useState } from 'react'
import type { CSSProperties } from 'react'
import { FactionBar } from '../../src'
import { FACTIONS, PLAYER } from '../mock/data'
import { Log, useLog, Workbench } from '../Workbench'

const cities = ['フルーエン', 'ヴェステル', 'ミルデン']

/** The 研究 stat: researching a technology, points but nothing researched, nothing at all, or every technology researched */
const RESEARCH = {
  researching: { perTurn: [12, 15], tech: { name: '兵法', progress: 40, cost: 200, turns: 12 } },
  unset: { perTurn: [12, 15] },
  idle: { perTurn: [0, 0] },
  complete: { perTurn: [12, 15], complete: true },
} as const

export default function FactionBarEntry() {
  const [log, add] = useLog()
  const [gold, setGold] = useState(500)
  const [forecast, setForecast] = useState(110)
  const [production, setProduction] = useState(820)
  const [troops, setTroops] = useState(4500)
  const [city, setCity] = useState(0)
  const [withSummary, setWithSummary] = useState(true)
  const [research, setResearch] = useState<keyof typeof RESEARCH | 'none'>('researching')
  const [factionId, setFactionId] = useState(PLAYER)
  const [movable, setMovable] = useState(true)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [backdrop, setBackdrop] = useState('dark')
  const [barHeight, setBarHeight] = useState(56)
  const [orbSize, setOrbSize] = useState(88)
  const [fitContent, setFitContent] = useState(true)
  const [barWidth, setBarWidth] = useState(720)
  const step = (delta: number) => {
    const next = (city + delta + cities.length) % cities.length
    setCity(next)
    add(`都市: ${cities[next]}`)
  }
  return <Workbench
    stageClassName={`backdrop-${backdrop}`}
    stage={<div className="demo-top-left">
      <FactionBar faction={FACTIONS[factionId]} movable={movable} position={position} onPositionChange={setPosition}
        style={{ width: fitContent ? 'max-content' : barWidth, '--faction-bar-height': `${barHeight}px`, '--faction-orb-size': `${orbSize}px` } as CSSProperties}
        summary={withSummary ? { gold, goldForecast: forecast, production, troops, research: research === 'none' ? undefined : RESEARCH[research] } : undefined}
        onOpenResearch={() => add('研究: 技術画面を開く')}
        cityName={cities[city]!} cityPosition={{ index: city, count: cities.length }} onPrevCity={() => step(-1)} onNextCity={() => step(1)} />
    </div>}
    controls={<>
      <h2>勢力の情報</h2>
      <p>左端の球をドラッグするとバー全体が動きます。球にフォーカスして矢印キーでも移動できます。Shiftで1pxずつ微調整、Homeで元の位置に戻ります。</p>
      <label className="checkbox"><input type="checkbox" checked={fitContent} onChange={event => setFitContent(event.target.checked)} />内容に幅を合わせる</label>
      <label htmlFor="faction-bar-width">バー全体の幅（px）</label>
      <input id="faction-bar-width" type="number" min={240} max={1600} disabled={fitContent} value={barWidth} onChange={event => {
        const value = event.target.valueAsNumber
        if (Number.isFinite(value)) setBarWidth(Math.max(240, Math.min(1600, value)))
      }} />
      <label htmlFor="faction-bar-height">バー部分の高さ（px）</label>
      <input id="faction-bar-height" type="number" min={68} max={160} value={barHeight} onChange={event => {
        const value = event.target.valueAsNumber
        if (Number.isFinite(value)) setBarHeight(Math.max(68, Math.min(160, value)))
      }} />
      <label htmlFor="faction-orb-size">球の装飾サイズ（px）</label>
      <input id="faction-orb-size" type="number" min={64} max={128} value={orbSize} onChange={event => {
        const value = event.target.valueAsNumber
        if (Number.isFinite(value)) setOrbSize(Math.max(64, Math.min(128, value)))
      }} />
      <label htmlFor="faction-emblem">球に表示する勢力</label>
      <select id="faction-emblem" value={factionId} onChange={event => setFactionId(event.target.value)}>
        {Object.entries(FACTIONS).map(([id, faction]) => <option key={id} value={id}>{faction.name}</option>)}
        <option value="none">エンブレムなし</option>
      </select>
      <label htmlFor="faction-backdrop">透過確認の背景</label>
      <select id="faction-backdrop" value={backdrop} onChange={event => setBackdrop(event.target.value)}>
        <option value="dark">暗い背景</option><option value="light">白い背景</option><option value="checker">市松模様</option>
      </select>
      <label className="checkbox"><input type="checkbox" checked={movable} onChange={event => setMovable(event.target.checked)} />球をドラッグして移動する</label>
      <button className="reset-button" onClick={() => { setPosition({ x: 0, y: 0 }); add('位置をリセット') }}>位置をリセット</button>
      <label htmlFor="faction-gold">金</label>
      <input id="faction-gold" type="number" value={gold} onChange={event => setGold(Number(event.target.value))} />
      <label htmlFor="faction-forecast">次のターンの増減</label>
      <input id="faction-forecast" type="number" value={forecast} onChange={event => setForecast(Number(event.target.value))} />
      <label htmlFor="faction-production">総生産</label>
      <input id="faction-production" type="number" value={production} onChange={event => setProduction(Number(event.target.value))} />
      <label htmlFor="faction-troops">総兵力</label>
      <input id="faction-troops" type="number" value={troops} onChange={event => setTroops(Number(event.target.value))} />
      <label className="checkbox"><input type="checkbox" checked={withSummary} onChange={event => setWithSummary(event.target.checked)} />勢力の情報を出す（外すと都市の切り替えだけ）</label>
      <label htmlFor="faction-bar-research">研究</label>
      <select id="faction-bar-research" value={research} onChange={event => setResearch(event.target.value as typeof research)}>
        <option value="researching">研究中（兵法）</option>
        <option value="unset">研究先なし（研究ポイントあり）</option>
        <option value="idle">研究先なし（研究ポイントなし・目立たせない）</option>
        <option value="complete">全技術研究済み（目立たせない）</option>
        <option value="none">出さない</option>
      </select>
      <dl className="demo-readout"><div><dt>移動量</dt><dd>{Math.round(position.x)}, {Math.round(position.y)} px</dd></div></dl>
      <Log entries={log} />
    </>}
  />
}
