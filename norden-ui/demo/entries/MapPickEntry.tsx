import { MapPickScreen } from '../../src'
import { CITY_MAP, invasionTargets } from '../mock/data'
import MockMap from '../mock/MockMap'
import { Log, useLog, Workbench } from '../Workbench'

export default function MapPickEntry() {
  const [log, add] = useLog()
  const from = 'P012'
  return <Workbench variant="screen"
    stage={<>
      <MockMap selected={from} candidates={invasionTargets(from)} onSelect={id => add(`選択: ${CITY_MAP[id]?.name}`)} />
      <MapPickScreen message={`${CITY_MAP[from]!.name}からの侵攻先を選んでください`} onCancel={() => add('やめる')} />
    </>}
    controls={<>
      <h2>地図で選ぶ</h2>
      <p>画面が出すのは案内の帯だけです。候補の強調（ここでは仮の地図）と選択は呼び出し側が行います。</p>
      <Log entries={log} />
    </>}
  />
}
