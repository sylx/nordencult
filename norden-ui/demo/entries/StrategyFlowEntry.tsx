import { useState } from 'react'
import { Button, CityCommandScreen, InvasionScreen, MapPickScreen, ScreenHost, useScreenStack } from '../../src'
import type { CityCommandId, InvasionDraft, KnightView } from '../../src'
import { CITY_MAP, FACTIONS, PLAYER, TURN, UNIT_TYPES, cityView, invasionTargets, knightsIn, playerCities } from '../mock/data'
import MockMap from '../mock/MockMap'
import type { MapRoad } from '../mock/MockMap'
import { Log, useLog, Workbench } from '../Workbench'

/** The screens of the strategy map and their params */
type StrategyScreens = {
  cityCommand: { cityId: string }
  pickTarget: { from: string }
  invasion: { from: string; to: string }
}

interface Order { id: number; from: string; to: string; draft: InvasionDraft }

const COMMAND_LABELS: Record<CityCommandId, string> = {
  build: '建設', assign: '割当', move: '移動', invade: '侵攻', recruit: '募兵', transport: '輸送', quest: '探索', tree: 'ツリー', buy: '購入', sell: '売却',
}

const name = (id: string) => CITY_MAP[id]?.name ?? id

/** A host like the game's StrategyScene: owns the state, converts it into view data and moves through the screen stack */
export default function StrategyFlowEntry() {
  const [log, add] = useLog()
  const nav = useScreenStack<StrategyScreens>({ screen: 'cityCommand', params: { cityId: 'P012' } })
  const [orders, setOrders] = useState<Order[]>([])
  const [turn, setTurn] = useState(TURN.turn)
  const top = nav.top

  const ordered = new Map(orders.flatMap(order => order.draft.map(item => [item.knightId, order.to] as const)))
  const knightsOf = (cityId: string): KnightView[] => knightsIn(cityId).map(knight => {
    const to = ordered.get(knight.id)
    return to ? { ...knight, subtitle: `${knight.subtitle} / ${name(to)}へ侵攻予約中`, unavailableReason: '侵攻予約中' } : knight
  })
  const openTargets = (from: string) => invasionTargets(from).filter(to => !orders.some(order => order.to === to))
  const soldiersLeft = (from: string) =>
    (CITY_MAP[from]?.soldiers ?? 0) - orders.filter(order => order.from === from).flatMap(order => order.draft).reduce((sum, item) => sum + item.soldiers, 0)

  const invadeProblem = (cityId: string) => {
    if (CITY_MAP[cityId]?.owner !== PLAYER) return '自勢力の都市ではありません'
    if (!knightsOf(cityId).some(knight => !knight.unavailableReason)) return '出撃できる騎士がいません'
    if (openTargets(cityId).length === 0) return '侵攻できる隣接都市がありません'
    return null
  }

  const selectCity = (id: string) => {
    if (top.screen === 'pickTarget') {
      if (openTargets(top.params.from).includes(id)) nav.push('invasion', { from: top.params.from, to: id })
    } else if (top.screen === 'cityCommand') {
      nav.replace('cityCommand', { cityId: id })
    }
  }

  const step = (cityId: string, delta: number) => {
    const index = playerCities.indexOf(cityId)
    const next = index < 0 ? 0 : (index + delta + playerCities.length) % playerCities.length
    nav.replace('cityCommand', { cityId: playerCities[next]! })
  }

  const routes: MapRoad[] = orders.map(order => ({ from: order.from, to: order.to, color: FACTIONS[PLAYER]!.color }))
  if (top.screen === 'invasion') routes.push({ from: top.params.from, to: top.params.to, color: '#ff6a3d' })
  const selected = top.screen === 'cityCommand' ? top.params.cityId : top.params.from

  const orderPanel = (
    <div className="demo-orders-region">
      <section className="norden-hud-panel demo-orders" aria-label="侵攻予約">
        <h3>侵攻予約</h3>
        {orders.length === 0
          ? <p>予約はありません。</p>
          : <ol>{orders.map(order => (
            <li key={order.id}>
              <span>{name(order.from)} → {name(order.to)}</span>
              <span className="demo-orders-count">{order.draft.length}人・{order.draft.reduce((sum, item) => sum + item.soldiers, 0)}兵</span>
              <Button variant="quiet" size="small" onClick={() => setOrders(current => current.filter(item => item.id !== order.id))}>取消</Button>
            </li>
          ))}</ol>}
      </section>
    </div>
  )

  return <Workbench variant="screen"
    hint="Esc で1つ前の画面に戻る"
    stage={<>
      <MockMap selected={selected} onSelect={selectCity}
        candidates={top.screen === 'pickTarget' ? openTargets(top.params.from) : undefined} routes={routes} />
      <ScreenHost nav={nav} screens={{
        cityCommand: ({ cityId }) => {
          const index = playerCities.indexOf(cityId)
          const problem = invadeProblem(cityId)
          return (
            <CityCommandScreen city={cityView(cityId, knightsOf(cityId))} turn={{ ...TURN, turn }}
              cityPosition={index < 0 ? undefined : { index, count: playerCities.length }}
              onPrevCity={() => step(cityId, -1)} onNextCity={() => step(cityId, 1)}
              commandState={{ invade: problem ? { disabled: true, reason: problem } : undefined }}
              onCommand={id => (id === 'invade' ? nav.push('pickTarget', { from: cityId }) : add(`${COMMAND_LABELS[id]}（未実装）`))}
              onEndTurn={() => {
                add(`第${turn}ターン終了（予約 ${orders.length}件）`)
                setOrders([])
                setTurn(value => value + 1)
              }}
              onSelectNeighbour={id => nav.replace('cityCommand', { cityId: id })}>
              {orderPanel}
            </CityCommandScreen>
          )
        },
        pickTarget: ({ from }) => (
          <MapPickScreen message={`${name(from)}からの侵攻先を選んでください`} onCancel={nav.pop} />
        ),
        invasion: ({ from, to }) => (
          <InvasionScreen from={cityView(from)} to={cityView(to)} defenders={knightsIn(to).length}
            knights={knightsOf(from)} unitTypes={UNIT_TYPES} soldierPool={soldiersLeft(from)}
            onCancel={nav.pop}
            onConfirm={draft => {
              setOrders(current => [...current, { id: (current.at(-1)?.id ?? 0) + 1, from, to, draft }])
              add(`予約: ${name(from)} → ${name(to)}（${draft.length}人）`)
              nav.popTo('cityCommand')
            }} />
        ),
      }} />
    </>}
    controls={<>
      <h2>戦略画面のフロー</h2>
      <p>「軍事」→「侵攻」で地図の侵攻先が強調されます。選ぶと侵攻画面に進み、予約すると都市コマンドに戻ります。</p>
      <dl className="demo-readout">
        <div><dt>画面スタック</dt><dd>{nav.stack.map(entry => entry.screen).join(' › ')}</dd></div>
        <div><dt>ターン</dt><dd>{turn}</dd></div>
      </dl>
      <Log entries={log} />
    </>}
  />
}
