import { ActionOrders, type ActionOrderDetail, type ActionOrderMember, type ActionOrderView } from 'norden-ui'
import {
  isPlayerTurn, moveMonths, moveRoute, movementLegs, type GameState, type InvasionOrder, type MoveOrder, type Movement, type MovementKind,
  type TransportOrder,
} from '../../game'
import { cityName, factionView, knightName, knightView } from './views'
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

/** The knights of an order with their faces, for its details */
function members(game: GameState, ids: readonly string[], note?: (id: string) => string | undefined): ActionOrderMember[] {
  return ids.map((id) => {
    const { name, portrait } = knightView(game, id)
    return { name, portrait, note: note?.(id) }
  })
}

/** 侵攻元 → 侵攻先 and the commander first; their faces and the soldiers of its units in the details */
function invasionItem(game: GameState, order: InvasionOrder): Item {
  const knights = [order.commander, ...order.knights.filter((id) => id !== order.commander)]
  const units = order.units ?? []
  const soldiers = units.reduce((sum, u) => sum + u.soldiers, 0)
  return {
    id: order.id, kind: 'invasion', city: order.from, from: cityName(order.from), to: cityName(order.to), knights: knights.map(knightName),
    members: members(game, knights, (id) => (id === order.commander ? '軍団長' : undefined)),
    details: units.length > 0 ? [{ label: '兵', value: `${soldiers.toLocaleString()}（${units.length}部隊）` }] : undefined,
  }
}

/** The soldiers and supplies a move or a transport takes */
function cargo(troops: number, supplies: number, solo: boolean): ActionOrderDetail[] {
  if (solo) return [{ label: '兵・物資', value: 'なし（単騎）' }]
  return [{ label: '兵', value: troops.toLocaleString() }, { label: '物資', value: supplies.toLocaleString() }]
}

/** Months a transport's knight takes riding back alone from where they unload */
function backMonths(game: GameState, factionId: string, from: string, to: string) {
  const route = moveRoute(game, factionId, to, from)
  return route ? moveMonths(route.length - 1, true) : 0
}

/** What a move or a transport ordered this turn takes and when it gets there (and back) */
function orderDetails(game: GameState, order: MoveOrder | TransportOrder): ActionOrderDetail[] {
  const solo = 'solo' in order && order.solo
  const route = moveRoute(game, order.factionId, order.from, order.to) ?? [order.from, order.to]
  const months = moveMonths(route.length - 1, solo)
  return [
    ...cargo(order.troops, order.supplies, solo),
    { label: '到着', value: `${months}ヶ月後` },
    ...('knight' in order ? [{ label: '帰還', value: `${months + backMonths(game, order.factionId, order.from, order.to)}ヶ月後` }] : []),
  ]
}

/** What a movement under way carries, where it is and the months left */
function movementDetails(game: GameState, m: Movement): ActionOrderDetail[] {
  const where = [{ label: '現在地', value: cityName(m.route[0]) }]
  if (m.kind === 'return') return [{ label: '積荷', value: '下ろし済み' }, ...where, { label: '帰還', value: `あと${m.monthsLeft}ヶ月` }]
  return [
    ...cargo(m.troops, m.supplies, m.solo),
    ...where,
    { label: '到着', value: `あと${m.monthsLeft}ヶ月` },
    ...(m.kind === 'transport' ? [{ label: '帰還', value: `あと${m.monthsLeft + backMonths(game, m.factionId, m.from, m.to)}ヶ月` }] : []),
  ]
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
 * moves and transports of the month until they are made. The order picked opens its details (the knights' faces,
 * what it takes and the months). Hidden while there are none
 */
export function OrderList({ game, onCancel, onCancelMove, onCancelTransport, onSelectCity, activeId, onActiveChange }: Props) {
  const playerTurn = isPlayerTurn(game)
  const march = game.march
  const items: Item[] = march
    ? [
        ...(march.moved ? [] : movementLegs(game)).map((leg): Item => {
          // What it carries: the order setting out this month, or the movement under way
          const source = game.movements.find((m) => m.id === leg.id) ?? game.moveOrders.find((o) => o.id === leg.id)
            ?? game.transportOrders.find((o) => o.id === leg.id)
          return {
            id: leg.id, kind: kindOf(leg.kind), faction: factionView(leg.factionId), city: leg.from, from: cityName(leg.from), to: cityName(leg.to),
            knights: leg.knights.map(knightName), status: legStatus(leg.kind, leg.solo, leg.arrives),
            members: members(game, leg.knights),
            details: leg.kind === 'return' ? [{ label: '積荷', value: '下ろし済み' }] : source ? cargo(source.troops, source.supplies, leg.solo) : [],
          }
        }),
        ...game.orders
          .filter((o) => march.queue.includes(o.id) || march.current?.orderId === o.id)
          .map((o) => ({ ...invasionItem(game, o), faction: factionView(o.factionId), current: march.current?.orderId === o.id })),
      ]
    : [
        ...game.orders.filter((o) => o.factionId === game.playerFaction).map((o) => ({ ...invasionItem(game, o), cancellable: playerTurn })),
        ...game.moveOrders.filter((o) => o.factionId === game.playerFaction).map((o): Item => ({
          id: o.id, kind: 'move', city: o.from, from: cityName(o.from), to: cityName(o.to), knights: o.knights.map(knightName),
          status: o.solo ? '単騎' : undefined, cancellable: playerTurn, members: members(game, o.knights), details: orderDetails(game, o),
        })),
        ...game.transportOrders.filter((o) => o.factionId === game.playerFaction).map((o): Item => ({
          id: o.id, kind: 'transport', city: o.from, from: cityName(o.from), to: cityName(o.to), knights: [knightName(o.knight)], cancellable: playerTurn,
          members: members(game, [o.knight]), details: orderDetails(game, o),
        })),
        // Set out in an earlier month: no taking back
        ...game.movements.filter((m) => m.factionId === game.playerFaction).map((m): Item => ({
          id: m.id, kind: kindOf(m.kind), city: m.from, from: cityName(m.from), to: cityName(m.to), knights: m.knights.map(knightName),
          status: `${m.kind === 'return' ? '帰還・' : ''}あと${m.monthsLeft}ヶ月`, members: members(game, m.knights), details: movementDetails(game, m),
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
