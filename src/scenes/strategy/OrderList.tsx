import { ActionOrders, type ActionOrderView } from 'norden-ui'
import { isPlayerTurn, movementLegs, type GameState, type InvasionOrder } from '../../game'
import { cityName, factionView, knightName } from './views'
import './OrderList.css'

interface Props {
  game: GameState
  onCancel: (orderId: string) => void
  onCancelMove: (orderId: string) => void
  onSelectCity: (id: string) => void
  /** The order picked on the list: its route is shown on the map */
  activeId: string | null
  onActiveChange: (id: string | null) => void
}

/** An order on the list, with the city it is shown by */
type Item = ActionOrderView & { city: string }

/** 侵攻元 → 侵攻先 and the commander first */
function invasionItem(order: InvasionOrder): Item {
  const knights = [order.commander, ...order.knights.filter((id) => id !== order.commander)]
  return { id: order.id, kind: 'invasion', city: order.from, from: cityName(order.from), to: cityName(order.to), knights: knights.map(knightName) }
}

/**
 * 行動予約: the player's invasions and moves ordered this turn (cancellable on their turn), and their moves under way
 * (from the city they set out from, with the months left). In the progress phase every order still to resolve and
 * every faction's moves of the month until they are made. Hidden while there are none
 */
export function OrderList({ game, onCancel, onCancelMove, onSelectCity, activeId, onActiveChange }: Props) {
  const playerTurn = isPlayerTurn(game)
  const march = game.march
  const items: Item[] = march
    ? [
        ...(march.moved ? [] : movementLegs(game)).map((leg): Item => ({
          id: leg.id, kind: 'move', faction: factionView(leg.factionId), city: leg.from, from: cityName(leg.from), to: cityName(leg.to),
          knights: leg.knights.map(knightName), status: `${leg.solo ? '単騎・' : ''}${leg.arrives ? '到着' : '移動中'}`,
        })),
        ...game.orders
          .filter((o) => march.queue.includes(o.id) || march.current?.orderId === o.id)
          .map((o) => ({ ...invasionItem(o), faction: factionView(o.factionId), current: march.current?.orderId === o.id })),
      ]
    : [
        ...game.orders.filter((o) => o.factionId === game.playerFaction).map((o) => ({ ...invasionItem(o), cancellable: playerTurn })),
        ...game.moveOrders.filter((o) => o.factionId === game.playerFaction).map((o): Item => ({
          id: o.id, kind: 'move', city: o.from, from: cityName(o.from), to: cityName(o.to), knights: o.knights.map(knightName),
          status: o.solo ? '単騎' : undefined, cancellable: playerTurn,
        })),
        // Set out in an earlier month: no taking back
        ...game.movements.filter((m) => m.factionId === game.playerFaction).map((m): Item => ({
          id: m.id, kind: 'move', city: m.from, from: cityName(m.from), to: cityName(m.to), knights: m.knights.map(knightName),
          status: `あと${m.monthsLeft}ヶ月`,
        })),
      ]
  if (items.length === 0) return null
  const cancel = (id: string) => (game.orders.some((o) => o.id === id) ? onCancel(id) : onCancelMove(id))
  return (
    <div className="order-list-region">
      <ActionOrders title={march ? '進行' : '行動予約'} orders={items} onCancel={cancel}
        activeId={activeId} onDeactivate={() => onActiveChange(null)}
        onSelect={(id) => {
          const item = items.find((i) => i.id === id)
          if (item) onSelectCity(item.city)
          onActiveChange(id === activeId ? null : id)
        }} />
    </div>
  )
}
