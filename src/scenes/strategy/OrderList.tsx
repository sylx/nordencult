import { Button, FactionMark } from 'norden-ui'
import { isPlayerTurn, type GameState, type InvasionOrder } from '../../game'
import { cityName, factionView } from './views'
import './OrderList.css'

interface Props {
  game: GameState
  onCancel: (orderId: string) => void
  onSelectCity: (id: string) => void
}

const soldiersOf = (order: InvasionOrder) => order.units?.reduce((sum, u) => sum + u.soldiers, 0) ?? 0

/** The player's invasions ordered this turn; in the march phase every order still to resolve */
export function OrderList({ game, onCancel, onSelectCity }: Props) {
  const playerTurn = isPlayerTurn(game)
  const march = game.march
  const orders: InvasionOrder[] = march
    ? game.orders.filter((o) => march.queue.includes(o.id) || march.current?.orderId === o.id)
    : game.orders.filter((o) => o.factionId === game.playerFaction)
  if (orders.length === 0 && game.phase === 'march') return null
  return (
    <div className="order-list-region">
      <section className="norden-hud-panel order-list" aria-label={march ? '行軍' : '侵攻予約'}>
        <h2 className="order-list__title">{march ? '行軍' : '侵攻予約'}</h2>
        {orders.length === 0
          ? <p className="order-list__empty">予約はありません。自勢力の都市の「軍事」→「侵攻」で予約します。</p>
          : (
            <ol className="order-list__items">
              {orders.map((o) => (
                <li key={o.id} className={march?.current?.orderId === o.id ? 'order-list__item--current' : undefined}>
                  {march && <FactionMark faction={factionView(o.factionId)} emblemOnly />}
                  <button type="button" className="order-list__route" onClick={() => onSelectCity(o.from)}>
                    {cityName(o.from)} → {cityName(o.to)}
                  </button>
                  <span className="order-list__count">
                    {o.knights.length}人{o.units && `・${soldiersOf(o).toLocaleString()}兵`}
                  </span>
                  {playerTurn && o.factionId === game.playerFaction && (
                    <Button variant="quiet" size="small" onClick={() => onCancel(o.id)}>取消</Button>
                  )}
                </li>
              ))}
            </ol>
          )}
      </section>
    </div>
  )
}
