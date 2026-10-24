import { useState } from 'react'
import { TransportScreen } from '../../src'
import type { TransportDraft } from '../../src'
import { CITY_MAP, KNIGHTS, cityView, knightsIn } from '../mock/data'
import MockMap from '../mock/MockMap'
import { Log, useLog, Workbench } from '../Workbench'

const knightName = (id: string) => KNIGHTS.find(knight => knight.id === id)?.name ?? id
const describe = (draft: TransportDraft) => `${knightName(draft.knight)}／兵${draft.troops}・物資${draft.supplies}`

/** The demo's routes from ヴェステル: to フルーエン next to it, or to ミルデン by way of フルーエン */
const FROM = 'P010'
const ROUTES = {
  P012: ['P010', 'P012'],
  P015: ['P010', 'P012', 'P015'],
} as const

export default function TransportEntry() {
  const [log, add] = useLog()
  const [to, setTo] = useState<keyof typeof ROUTES>('P015')
  const [busy, setBusy] = useState(true)
  const [instance, setInstance] = useState(0)
  const route = ROUTES[to]
  const hops = route.length - 1
  const knights = knightsIn(FROM).map(knight => (busy && knight.id === 'k6' ? { ...knight, unavailableReason: '移動予約中' } : knight))

  return <Workbench variant="screen"
    stage={<>
      <MockMap routes={route.slice(1).map((id, index) => ({ from: route[index]!, to: id, color: '#e0c070' }))} />
      <TransportScreen key={`${instance}-${to}`} from={cityView(FROM)} to={cityView(to)} route={route.map(id => CITY_MAP[id]!.name)}
        months={Math.ceil(hops / 2)} returnMonths={Math.min(2, Math.ceil(hops / 2))} knights={knights}
        soldierPool={CITY_MAP[FROM]!.soldiers} supplyPool={CITY_MAP[FROM]!.supplies ?? 0}
        onConfirm={draft => add(`予約: ${describe(draft)}`)} onCancel={() => add('やめる')} />
    </>}
    controls={<>
      <h2>輸送画面</h2>
      <p>{CITY_MAP[FROM]!.name}から自勢力の都市への輸送。担当の騎士を1人選び、兵と物資の量を決めます。騎士は輸送先で兵と物資を下ろし、単騎で戻ります。繰り返し輸送は準備中で選べません。</p>
      <label htmlFor="transport-to">輸送先</label>
      <select id="transport-to" value={to} onChange={event => setTo(event.target.value as keyof typeof ROUTES)}>
        {Object.keys(ROUTES).map(id => <option key={id} value={id}>{CITY_MAP[id]!.name}</option>)}
      </select>
      <label className="checkbox"><input type="checkbox" checked={busy} onChange={event => setBusy(event.target.checked)} />選べない騎士を含める</label>
      <button className="reset-button" onClick={() => setInstance(value => value + 1)}>画面を開き直す</button>
      <Log entries={log} />
    </>}
  />
}
