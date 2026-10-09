import { useState } from 'react'
import { InvasionScreen } from '../../src'
import type { InvasionDraft } from '../../src'
import { CITY_MAP, UNIT_TYPES, cityView, knightsIn } from '../mock/data'
import MockMap from '../mock/MockMap'
import { Log, useLog, Workbench } from '../Workbench'

const describe = (draft: InvasionDraft) =>
  draft.map(item => `${item.knightId}:${UNIT_TYPES.find(type => type.id === item.unitType)?.name}×${item.soldiers}`).join(', ')

export default function InvasionEntry() {
  const [log, add] = useLog()
  const [pool, setPool] = useState(1200)
  const [limit, setLimit] = useState(false)
  const [busy, setBusy] = useState(true)
  const [instance, setInstance] = useState(0)
  const knights = knightsIn('P012').map(knight => (busy && knight.id === 'k1' ? { ...knight, unavailableReason: '内政を担当中' } : knight))

  return <Workbench variant="screen"
    stage={<>
      <MockMap routes={[{ from: 'P012', to: 'P004', color: '#ff6a3d' }]} />
      <InvasionScreen key={`${instance}-${pool}`} from={cityView('P012')} to={cityView('P004')} defenders={knightsIn('P004').length}
        knights={knights} unitTypes={UNIT_TYPES} soldierPool={pool}
        validate={limit ? draft => (draft.length > 2 ? '一度に出撃できるのは2人までです' : null) : undefined}
        onConfirm={draft => add(`予約: ${describe(draft)}`)} onCancel={() => add('やめる')} />
    </>}
    controls={<>
      <h2>侵攻画面</h2>
      <p>{CITY_MAP.P012!.name}から{CITY_MAP.P004!.name}への侵攻。騎士を選ぶと右に部隊が加わり、兵科と兵数を決めます。</p>
      <label htmlFor="soldier-pool">出発都市の兵数</label>
      <select id="soldier-pool" value={pool} onChange={event => setPool(Number(event.target.value))}>
        {[200, 600, 1200, 3000].map(value => <option key={value} value={value}>{value}人</option>)}
      </select>
      <label className="checkbox"><input type="checkbox" checked={busy} onChange={event => setBusy(event.target.checked)} />選べない騎士を含める</label>
      <label className="checkbox"><input type="checkbox" checked={limit} onChange={event => setLimit(event.target.checked)} />ホストの規則: 2人まで</label>
      <button className="reset-button" onClick={() => setInstance(value => value + 1)}>画面を開き直す</button>
      <Log entries={log} />
    </>}
  />
}
