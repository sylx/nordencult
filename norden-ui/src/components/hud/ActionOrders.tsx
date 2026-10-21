import type { CSSProperties } from 'react'
import Button from '../parts/Button'
import FactionMark from '../parts/FactionMark'
import ThinFrameWithTitle from '../parts/ThinFrameWithTitle'
import type { FactionView } from '../../screens/types'
import './ActionOrders.css'

export type ActionOrderKind = 'invasion' | 'move'

/** An order on the list: an invasion (侵攻) or a move (移動), this turn's or one still under way */
export interface ActionOrderView {
  id: string
  kind: ActionOrderKind
  /** Names of the cities. A move under way: the city it set out from, not where it is now */
  from: string
  to: string
  /** Knights' names. invasion: the commander first (shown as 軍団長 〜 以下N名); move: every knight in charge */
  knights: readonly string[]
  /** Shown as an emblem before the route; for lists of several factions' orders */
  faction?: FactionView
  /** A short note on the right, e.g. あと3ヶ月 */
  status?: string
  /** Shows the 取消 button (onCancel) */
  cancellable?: boolean
  /** The order being resolved: highlighted */
  current?: boolean
}

export interface ActionOrdersProps {
  orders: readonly ActionOrderView[]
  /** Also the panel's accessible name */
  title?: string
  emptyLabel?: string
  onCancel?: (id: string) => void
  /** The route was clicked (e.g. to show its city on the map). Omitted: the route is plain text */
  onSelect?: (id: string) => void
  className?: string
  style?: CSSProperties
}

const KIND_LABELS: Readonly<Record<ActionOrderKind, string>> = { invasion: '侵攻', move: '移動' }

/** 軍団長 〜 以下N名 for an invasion, 担当 〜・〜 for a move */
function knightsText({ kind, knights }: ActionOrderView) {
  if (kind === 'move') return { label: '担当', text: knights.join('・') }
  const [commander = ''] = knights
  return { label: '軍団長', text: knights.length > 1 ? `${commander} 以下${knights.length}名` : commander }
}

/**
 * 行動予約: the invasions and moves ordered, one row each: the route, the knights, and 取消 for those that can
 * still be taken back (a move under way shows its months left instead). Also lists the orders of a progress
 * phase, every faction's, with their emblems and the one being resolved highlighted.
 */
export default function ActionOrders({
  orders, title = '行動予約', emptyLabel = '予約はありません', onCancel, onSelect, className = '', style,
}: ActionOrdersProps) {
  return (
    <ThinFrameWithTitle title={title} className={`norden-action-orders ${className}`} style={style}>
      {orders.length === 0
        ? <p className="norden-action-orders-empty">{emptyLabel}</p>
        : (
          <ol className="norden-action-orders-list">
            {orders.map(order => {
              const kind = KIND_LABELS[order.kind]
              const knights = knightsText(order)
              const route = <>
                {order.faction && <FactionMark faction={order.faction} emblemOnly />}
                <span className="norden-action-orders-city">{order.from}</span>
                <span className="norden-action-orders-arrow" aria-label="から">→</span>
                <span className="norden-action-orders-city">{order.to}</span>
              </>
              return (
                <li key={order.id} className={`norden-action-orders-item is-${order.kind} ${order.current ? 'is-current' : ''}`}
                  aria-current={order.current ? 'step' : undefined}>
                  <span className="norden-action-orders-kind">{kind}</span>
                  {onSelect
                    ? <button type="button" className="norden-action-orders-route" onClick={() => onSelect(order.id)}>{route}</button>
                    : <span className="norden-action-orders-route">{route}</span>}
                  <span className="norden-action-orders-knights">
                    <span className="norden-action-orders-knights-label">{knights.label}</span>
                    {knights.text}
                  </span>
                  {(order.status || (order.cancellable && onCancel)) && (
                    <span className="norden-action-orders-aside">
                      {order.status && <span className="norden-action-orders-status">{order.status}</span>}
                      {order.cancellable && onCancel && (
                        <Button variant="quiet" size="small" className="norden-action-orders-cancel"
                          aria-label={`${order.from}から${order.to}への${kind}を取り消す`} onClick={() => onCancel(order.id)}>
                          取消
                        </Button>
                      )}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        )}
    </ThinFrameWithTitle>
  )
}
