import { useState } from 'react'
import { ActionOrders } from '../../src'
import type { ActionOrderView } from '../../src'
import { CITY_MAP, FACTIONS, KNIGHTS } from '../mock/data'
import MockMap from '../mock/MockMap'
import { Log, useLog, Workbench } from '../Workbench'

const city = (id: string) => CITY_MAP[id]!.name
/** The demo knights with their faces, by name */
const members = (...names: string[]) => names.map(name => KNIGHTS.find(knight => knight.name === name) ?? { name })

/** The player's orders of the strategy phase: this turn's (cancellable on the player's turn) and a move under way */
const INVASION: ActionOrderView = {
  id: 'o1', kind: 'invasion', from: city('P012'), to: city('P004'), knights: ['エルネスト・ヴァイス', 'リディア・ハーン', 'セラフィナ・ルクス'],
  members: [{ ...members('エルネスト・ヴァイス')[0]!, note: '軍団長' }, ...members('リディア・ハーン', 'セラフィナ・ルクス')],
  details: [{ label: '兵', value: '2,400（4部隊）' }],
}
const MOVE: ActionOrderView = {
  id: 'o2', kind: 'move', from: city('P010'), to: city('P015'), knights: ['オスカー・ブラント', 'ミラ・ゼーフェルト'],
  members: members('オスカー・ブラント', 'ミラ・ゼーフェルト'),
  details: [{ label: '兵', value: '300' }, { label: '物資', value: '100' }, { label: '到着', value: '1ヶ月後' }],
}
/** Set out from フルーエン last month: shown from where it set out, with no 取消 */
const UNDER_WAY: ActionOrderView = {
  id: 'o3', kind: 'move', from: city('P012'), to: city('P015'), knights: ['マルクス・カルタ'], status: 'あと3ヶ月',
  members: members('マルクス・カルタ'),
  details: [{ label: '兵', value: '500' }, { label: '物資', value: '0' }, { label: '現在地', value: city('P012') }, { label: '到着', value: 'あと3ヶ月' }],
}
const TRANSPORT: ActionOrderView = {
  id: 'o5', kind: 'transport', from: city('P012'), to: city('P015'), knights: ['リディア・ハーン'],
  members: members('リディア・ハーン'),
  details: [{ label: '兵', value: '200' }, { label: '物資', value: '400' }, { label: '到着', value: '1ヶ月後' }, { label: '帰還', value: '2ヶ月後' }],
}
/** A transport's knight riding back alone: from where they unloaded to where they set out from */
const RETURNING: ActionOrderView = {
  id: 'o6', kind: 'transport', from: city('P015'), to: city('P010'), knights: ['ミラ・ゼーフェルト'], status: '帰還・あと1ヶ月',
  members: members('ミラ・ゼーフェルト'),
  details: [{ label: '積荷', value: '下ろし済み' }, { label: '現在地', value: city('P015') }, { label: '帰還', value: 'あと1ヶ月' }],
}
const LONG: ActionOrderView = {
  id: 'o4', kind: 'invasion', from: city('P020'), to: city('P006'),
  knights: ['グレゴール・アイゼン', 'ハインツ・ヴォルフ', 'ルチア・ベルネ', 'エルネスト・ヴァイス', 'リディア・ハーン', 'セラフィナ・ルクス'],
}

/** Every faction's orders of a progress phase: the moves of the month, then the invasions to resolve */
const PROGRESS: ActionOrderView[] = [
  { id: 'p1', kind: 'move', faction: FACTIONS.carta, from: city('P012'), to: city('P015'), knights: ['マルクス・カルタ'], status: '移動中' },
  { id: 'p2', kind: 'move', faction: FACTIONS.leonis, from: city('P006'), to: city('P004'), knights: ['ハインツ・ヴォルフ'], status: '到着' },
  { id: 'p5', kind: 'transport', faction: FACTIONS.carta, from: city('P012'), to: city('P010'), knights: ['リディア・ハーン'], status: '到着' },
  { id: 'p3', kind: 'invasion', faction: FACTIONS.carta, from: city('P012'), to: city('P004'), knights: ['エルネスト・ヴァイス', 'リディア・ハーン'], current: true },
  { id: 'p4', kind: 'invasion', faction: FACTIONS.esuhara, from: city('P021'), to: city('P020'), knights: ['ルチア・ベルネ'] },
]

export default function ActionOrdersEntry() {
  const [log, add] = useLog()
  const [phase, setPhase] = useState<'strategy' | 'progress'>('strategy')
  const [shown, setShown] = useState({ invasion: true, move: true, underWay: true, transport: true, returning: true, long: false })
  const [playerTurn, setPlayerTurn] = useState(true)
  const [cancelled, setCancelled] = useState<readonly string[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const toggle = (key: keyof typeof shown) => setShown(current => ({ ...current, [key]: !current[key] }))

  const strategy = [
    ...(shown.invasion ? [INVASION] : []),
    ...(shown.long ? [LONG] : []),
    ...(shown.move ? [MOVE] : []),
    ...(shown.underWay ? [UNDER_WAY] : []),
    ...(shown.transport ? [TRANSPORT] : []),
    ...(shown.returning ? [RETURNING] : []),
  ].filter(order => !cancelled.includes(order.id))
    .map(order => ({ ...order, cancellable: playerTurn && !order.status }))
  const orders = phase === 'strategy' ? strategy : PROGRESS
  const describe = (id: string) => {
    const order = orders.find(item => item.id === id)
    return order ? `${order.from} → ${order.to}` : id
  }

  return <Workbench variant="screen"
    stage={<>
      <MockMap />
      <div className="demo-action-orders">
        <ActionOrders title={phase === 'strategy' ? '行動予約' : '進行'} orders={orders}
          onCancel={id => { setCancelled(current => [...current, id]); add(`取消: ${describe(id)}`) }}
          activeId={activeId} onDeactivate={() => setActiveId(null)}
          onSelect={id => { add(`選択: ${describe(id)}`); setActiveId(current => (current === id ? null : id)) }} />
      </div>
    </>}
    controls={<>
      <h2>行動予約</h2>
      <p>侵攻は侵攻元 → 侵攻先と軍団長以下の人数、移動と輸送は出発した拠点 → 行き先と担当の騎士を出します。取消はプレイヤーの手番の今月の予約だけで、月をまたいで移動・輸送中のものは残りの月数を出します。経路を押すとその予約を選び、騎士の顔と名前、兵・物資・到着までの月数などの詳細を開きます。タイトルの右のボタンでタイトルだけに最小化できます（MinimizableWindow）。</p>
      <label htmlFor="orders-phase">フェーズ</label>
      <select id="orders-phase" value={phase} onChange={event => setPhase(event.target.value as typeof phase)}>
        <option value="strategy">戦略フェーズ（プレイヤーの予約）</option>
        <option value="progress">進行フェーズ（全勢力・解決中を強調）</option>
      </select>
      {phase === 'strategy' && <>
        <label className="checkbox"><input type="checkbox" checked={shown.invasion} onChange={() => toggle('invasion')} />侵攻予約</label>
        <label className="checkbox"><input type="checkbox" checked={shown.long} onChange={() => toggle('long')} />騎士の多い侵攻予約</label>
        <label className="checkbox"><input type="checkbox" checked={shown.move} onChange={() => toggle('move')} />今月の移動予約</label>
        <label className="checkbox"><input type="checkbox" checked={shown.underWay} onChange={() => toggle('underWay')} />移動中（月をまたいだ移動）</label>
        <label className="checkbox"><input type="checkbox" checked={shown.transport} onChange={() => toggle('transport')} />今月の輸送予約</label>
        <label className="checkbox"><input type="checkbox" checked={shown.returning} onChange={() => toggle('returning')} />輸送の帰還中</label>
        <label className="checkbox"><input type="checkbox" checked={playerTurn} onChange={event => setPlayerTurn(event.target.checked)} />プレイヤーの手番（取消できる）</label>
        <button className="reset-button" onClick={() => setCancelled([])}>取り消した予約を戻す</button>
      </>}
      <Log entries={log} />
    </>}
  />
}
