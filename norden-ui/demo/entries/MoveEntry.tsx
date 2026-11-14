import { useState } from 'react'
import { MoveScreen } from '../../src'
import type { MoveDraft } from '../../src'
import { CITY_MAP, KNIGHTS, cityView, knightsIn, prisonersIn } from '../mock/data'
import MockMap from '../mock/MockMap'
import { Log, useLog, Workbench } from '../Workbench'

const knightName = (id: string) => [...KNIGHTS, ...prisonersIn(FROM)].find(knight => knight.id === id)?.name ?? id
const prisonersOf = (ids: readonly string[]) => (ids.length > 0 ? `・捕虜 ${ids.map(knightName).join('・')}` : '')
const describe = (draft: MoveDraft) => `${draft.knights.map(knightName).join('・')}／`
  + (draft.solo ? '単騎移動' : `兵${draft.troops}・物資${draft.supplies}${prisonersOf(draft.prisoners)}`)

/** The demo's routes from ヴェステル: to フルーエン next to it, or to ミルデン by way of フルーエン */
const FROM = 'P010'
const ROUTES = {
  P012: ['P010', 'P012'],
  P015: ['P010', 'P012', 'P015'],
} as const

export default function MoveEntry() {
  const [log, add] = useLog()
  const [to, setTo] = useState<keyof typeof ROUTES>('P015')
  const [busy, setBusy] = useState(true)
  const [instance, setInstance] = useState(0)
  const route = ROUTES[to]
  const hops = route.length - 1
  const knights = knightsIn(FROM).map(knight => (busy && knight.id === 'k6' ? { ...knight, unavailableReason: '侵攻予約中' } : knight))

  return <Workbench variant="screen"
    stage={<>
      <MockMap routes={route.slice(1).map((id, index) => ({ from: route[index]!, to: id, color: '#8fc0e0' }))} />
      <MoveScreen key={`${instance}-${to}`} from={cityView(FROM)} to={cityView(to)} route={route.map(id => CITY_MAP[id]!.name)}
        months={Math.ceil(hops / 2)} soloMonths={Math.min(2, Math.ceil(hops / 2))} knights={knights}
        soldierPool={CITY_MAP[FROM]!.soldiers} supplyPool={CITY_MAP[FROM]!.supplies ?? 0} prisoners={prisonersIn(FROM)}
        onConfirm={draft => add(`予約: ${describe(draft)}`)} onCancel={() => add('やめる')} />
    </>}
    controls={<>
      <h2>移動画面</h2>
      <p>{CITY_MAP[FROM]!.name}から自勢力の都市への移動。騎士を複数選び、兵と物資を持たせます。単騎移動にすると兵と物資は0になり、早く着きます。</p>
      <label htmlFor="move-to">移動先</label>
      <select id="move-to" value={to} onChange={event => setTo(event.target.value as keyof typeof ROUTES)}>
        {Object.keys(ROUTES).map(id => <option key={id} value={id}>{CITY_MAP[id]!.name}</option>)}
      </select>
      <label className="checkbox"><input type="checkbox" checked={busy} onChange={event => setBusy(event.target.checked)} />選べない騎士を含める</label>
      <button className="reset-button" onClick={() => setInstance(value => value + 1)}>画面を開き直す</button>
      <Log entries={log} />
    </>}
  />
}
