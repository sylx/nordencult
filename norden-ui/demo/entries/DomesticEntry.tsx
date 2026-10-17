import { useState } from 'react'
import { DomesticScreen } from '../../src'
import { CITY_MAP, cityView, playerCities } from '../mock/data'
import MockMap from '../mock/MockMap'
import { Log, useLog, Workbench } from '../Workbench'

export default function DomesticEntry() {
  const [log, add] = useLog()
  const [cityId, setCityId] = useState(playerCities[0]!)

  return <Workbench variant="screen"
    stage={<>
      <MockMap selected={cityId} />
      <DomesticScreen city={cityView(cityId)} onClose={() => add('閉じる')} />
    </>}
    controls={<>
      <h2>内政画面</h2>
      <p>共通部品 WindowFrame を画面いっぱいに表示しています。右上の × で閉じられます。建設・割当の中身はこれから詰めます。</p>
      <label htmlFor="domestic-city">都市</label>
      <select id="domestic-city" value={cityId} onChange={event => setCityId(event.target.value)}>
        {playerCities.map(id => <option key={id} value={id}>{CITY_MAP[id]?.name}</option>)}
      </select>
      <Log entries={log} />
    </>}
  />
}
