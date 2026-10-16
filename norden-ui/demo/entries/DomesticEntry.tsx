import { useState } from 'react'
import { DomesticScreen } from '../../src'
import type { DomesticTab } from '../../src'
import { useMockDomestic } from '../mock/domestic'
import { CITY_MAP, playerCities } from '../mock/data'
import MockMap from '../mock/MockMap'
import { Log, useLog, Workbench } from '../Workbench'

export default function DomesticEntry() {
  const [log, add] = useLog()
  const [cityId, setCityId] = useState(playerCities[0]!)
  const [tab, setTab] = useState<DomesticTab>('build')
  const domestic = useMockDomestic(add)

  return <Workbench variant="screen"
    stage={<>
      <MockMap selected={cityId} />
      <DomesticScreen key={`${cityId}-${tab}`} {...domestic.props(cityId)} tab={tab} onClose={() => add('閉じる')} />
    </>}
    controls={<>
      <h2>内政画面</h2>
      <p>建設（施設スロットと建てられる施設・着工・中止）と割当（代官・軍事担当と補正の見込み）をタブで切り替えます。枠組みだけで、装飾は後で詰めます。</p>
      <label htmlFor="domestic-city">都市</label>
      <select id="domestic-city" value={cityId} onChange={event => setCityId(event.target.value)}>
        {playerCities.map(id => <option key={id} value={id}>{CITY_MAP[id]?.name}</option>)}
      </select>
      <label htmlFor="domestic-tab">最初のタブ</label>
      <select id="domestic-tab" value={tab} onChange={event => setTab(event.target.value as DomesticTab)}>
        <option value="build">建設</option><option value="assign">割当</option>
      </select>
      <Log entries={log} />
    </>}
  />
}
