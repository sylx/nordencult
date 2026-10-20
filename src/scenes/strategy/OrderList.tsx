import { Button, FactionMark, ThinFrameWithTitle } from 'norden-ui'
import { isPlayerTurn, movementLegs, type GameState, type InvasionOrder } from '../../game'
import { cityName, factionView, knightsLabel } from './views'
import './OrderList.css'

interface Props {
  game: GameState
  onCancel: (orderId: string) => void
  onCancelMove: (orderId: string) => void
  onSelectCity: (id: string) => void
}

/**
 * The player's invasions and moves ordered this turn, and their knights on the way; in the progress phase every order still to
 * resolve and every faction's moves of the month until they are made. Hidden while there are none
 */
export function OrderList({ game, onCancel, onCancelMove, onSelectCity }: Props) {
  const playerTurn = isPlayerTurn(game)
  const march = game.march
  const orders: InvasionOrder[] = march
    ? game.orders.filter((o) => march.queue.includes(o.id) || march.current?.orderId === o.id)
    : game.orders.filter((o) => o.factionId === game.playerFaction)
  const moveOrders = march ? [] : game.moveOrders.filter((o) => o.factionId === game.playerFaction)
  const travelling = march ? [] : game.movements.filter((m) => m.factionId === game.playerFaction)
  const legs = march && !march.moved ? movementLegs(game) : []
  if (orders.length + moveOrders.length + travelling.length + legs.length === 0) return null
  const route = (from: string, to: string) => (
    <button type="button" className="order-list__route" onClick={() => onSelectCity(from)}>
      {cityName(from)} → {cityName(to)}
    </button>
  )
  return (
    <div className="order-list-region">
      {orders.length > 0 && (
        <ThinFrameWithTitle title={march ? '行軍' : '侵攻予約'} className="order-list">
          <ol className="order-list__items">
            {orders.map((o) => (
              <li key={o.id} className={march?.current?.orderId === o.id ? 'order-list__item--current' : undefined}>
                {march && <FactionMark faction={factionView(o.factionId)} emblemOnly />}
                {route(o.from, o.to)}
                {playerTurn && o.factionId === game.playerFaction && (
                  <Button variant="quiet" size="small" onClick={() => onCancel(o.id)}>取消</Button>
                )}
              </li>
            ))}
          </ol>
        </ThinFrameWithTitle>
      )}
      {moveOrders.length > 0 && (
        <ThinFrameWithTitle title="移動予約" className="order-list">
          <ol className="order-list__items">
            {moveOrders.map((o) => (
              <li key={o.id}>
                {route(o.from, o.to)}
                {playerTurn && <Button variant="quiet" size="small" onClick={() => onCancelMove(o.id)}>取消</Button>}
              </li>
            ))}
          </ol>
        </ThinFrameWithTitle>
      )}
      {travelling.length > 0 && (
        <ThinFrameWithTitle title="移動中" className="order-list">
          <ol className="order-list__items">
            {travelling.map((m) => (
              <li key={m.id}>
                {route(m.route[0], m.to)}
                <span className="order-list__count">{knightsLabel(m.knights)}・あと{m.monthsLeft}ヶ月</span>
              </li>
            ))}
          </ol>
        </ThinFrameWithTitle>
      )}
      {legs.length > 0 && (
        <ThinFrameWithTitle title="移動" className="order-list">
          <ol className="order-list__items">
            {legs.map((leg) => (
              <li key={leg.id}>
                <FactionMark faction={factionView(leg.factionId)} emblemOnly />
                {route(leg.route[0], leg.to)}
                <span className="order-list__count">{knightsLabel(leg.knights)}{leg.solo ? '（単騎）' : ''}{leg.arrives ? '・到着' : ''}</span>
              </li>
            ))}
          </ol>
        </ThinFrameWithTitle>
      )}
    </div>
  )
}
