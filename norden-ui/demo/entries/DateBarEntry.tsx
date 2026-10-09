import { useState } from 'react'
import { Button, DateBar } from '../../src'
import { Log, useLog, Workbench } from '../Workbench'

export default function DateBarEntry() {
  const [log, add] = useLog()
  const [phaseLabel, setPhaseLabel] = useState('戦略フェーズ')
  const [factionName, setFactionName] = useState('カルタ書院')
  const [dateLabel, setDateLabel] = useState('王歴312年4月')
  const [resolving, setResolving] = useState(false)
  const [withMenu, setWithMenu] = useState(true)
  const [backdrop, setBackdrop] = useState('dark')
  return <Workbench
    stageClassName={`backdrop-${backdrop}`}
    stage={<div className="demo-date-top-right">
      <DateBar phaseLabel={phaseLabel} factionName={resolving ? null : factionName} dateLabel={dateLabel}>
        {withMenu ? <div className="demo-menu">
          <Button variant="quiet" onClick={() => add('セーブ')}>セーブ</Button>
          <Button variant="quiet" onClick={() => add('音量設定')}>音量設定</Button>
        </div> : undefined}
      </DateBar>
    </div>}
    controls={<>
      <h2>ターン情報</h2>
      <label htmlFor="date-phase">フェーズ</label>
      <input id="date-phase" type="text" value={phaseLabel} onChange={event => setPhaseLabel(event.target.value)} />
      <label htmlFor="date-faction">勢力名</label>
      <input id="date-faction" type="text" value={factionName} onChange={event => setFactionName(event.target.value)} />
      <label htmlFor="date-calendar">年月</label>
      <input id="date-calendar" type="text" value={dateLabel} onChange={event => setDateLabel(event.target.value)} />
      <label className="checkbox"><input type="checkbox" checked={resolving} onChange={event => setResolving(event.target.checked)} />全勢力の行動を解決中</label>
      <label className="checkbox"><input type="checkbox" checked={withMenu} onChange={event => setWithMenu(event.target.checked)} />設定メニューを付ける</label>
      <label htmlFor="date-backdrop">透過確認の背景</label>
      <select id="date-backdrop" value={backdrop} onChange={event => setBackdrop(event.target.value)}>
        <option value="dark">暗い背景</option><option value="light">白い背景</option><option value="checker">市松模様</option>
      </select>
      <Log entries={log} />
    </>}
  />
}
