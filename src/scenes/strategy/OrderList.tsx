import { ActionOrders, type ActionOrderView } from 'norden-ui'
import { isPlayerTurn, movementLegs, type GameState, type InvasionOrder, type MovementKind } from '../../game'
import { cityName, factionView, knightName } from './views'
import './OrderList.css'

interface Props {
  game: GameState
  onCancel: (orderId: string) => void
  onCancelMove: (orderId: string) => void
  onCancelTransport: (orderId: string) => void
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

/** A transport there and its knight riding back are both 輸送 on the list */
const kindOf = (kind: MovementKind = 'move'): Item['kind'] => (kind === 'move' ? 'move' : 'transport')

/** What a movement does this month, in the progress phase */
function legStatus(kind: MovementKind = 'move', solo: boolean, arrives: boolean) {
  if (kind === 'transport') return arrives ? '荷下ろし' : '輸送中'
  if (kind === 'return') return arrives ? '帰還' : '帰還中'
  return `${solo ? '単騎・' : ''}${arrives ? '到着' : '移動中'}`
}

/**
 * 行動予約: the player's invasions, moves and transports ordered this turn (cancellable on their turn), and their
 * moves and transports under way (from the city they set out from, with the months left; a transport's knight
 * riding back from where they unloaded). In the progress phase every order still to resolve and every faction's
 * moves and transports of the month until they are made. Hidden while there are none
 */
export function OrderList({ game, onCancel, onCancelMove, onCancelTransport, onSelectCity, activeId, onActiveChange }: Props) {
  const playerTurn = isPlayerTurn(game)
  const march = game.march
  const items: Item[] = march
    ? [
        ...(march.moved ? [] : movementLegs(game)).map((leg): Item => ({
          id: leg.id, kind: kindOf(leg.kind), faction: factionView(leg.factionId), city: leg.from, from: cityName(leg.from), to: cityName(leg.to),
          knights: leg.knights.map(knightName), status: legStatus(leg.kind, leg.solo, leg.arrives),
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
        ...game.transportOrders.filter((o) => o.factionId === game.playerFaction).map((o): Item => ({
          id: o.id, kind: 'transport', city: o.from, from: cityName(o.from), to: cityName(o.to), knights: [knightName(o.knight)], cancellable: playerTurn,
        })),
        // Set out in an earlier month: no taking back
        ...game.movements.filter((m) => m.factionId === game.playerFaction).map((m): Item => ({
          id: m.id, kind: kindOf(m.kind), city: m.from, from: cityName(m.from), to: cityName(m.to), knights: m.knights.map(knightName),
          status: `${m.kind === 'return' ? '帰還・' : ''}あと${m.monthsLeft}ヶ月`,
        })),
      ]
  if (items.length === 0) return null
  const cancel = (id: string) => {
    if (game.orders.some((o) => o.id === id)) onCancel(id)
    else if (game.transportOrders.some((o) => o.id === id)) onCancelTransport(id)
    else onCancelMove(id)
  }
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
