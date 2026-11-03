import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import Button from '../parts/Button'
import FactionMark from '../parts/FactionMark'
import KnightChip from '../parts/KnightChip'
import type { KnightCardData } from '../parts/KnightCard'
import MinimizableWindow from '../window/MinimizableWindow'
import type { FactionView } from '../../screens/types'
import './ActionOrders.css'

export type ActionOrderKind = 'invasion' | 'move' | 'transport'

/** A line of an order's details, e.g. 兵 300 */
export interface ActionOrderDetail {
  label: string
  value: string
}

/** A knight of an order with their face, shown in its details; `note` e.g. 軍団長 */
export type ActionOrderMember = Pick<KnightCardData, 'name' | 'portrait' | 'portraitSrc'> & { note?: string }

/** An order on the list: an invasion (侵攻), a move (移動) or a transport (輸送), this turn's or one still under way */
export interface ActionOrderView {
  id: string
  kind: ActionOrderKind
  /** Names of the cities. A move or transport under way: the city it set out from, not where it is now */
  from: string
  to: string
  /** Knights' names. invasion: the commander first (shown as 軍団長 〜 以下N名); move, transport: every knight in charge */
  knights: readonly string[]
  /** Shown as an emblem before the route; for lists of several factions' orders */
  faction?: FactionView
  /** A short note on the right, e.g. あと3ヶ月 */
  status?: string
  /** Shows the 取消 button (onCancel) */
  cancellable?: boolean
  /** The order being resolved: highlighted */
  current?: boolean
  /** What the order takes and when it gets there (soldiers, supplies, months…), shown under it while it is active */
  details?: readonly ActionOrderDetail[]
  /** The knights with their faces (KnightChip), shown above the details while it is active */
  members?: readonly ActionOrderMember[]
}

export interface ActionOrdersProps {
  orders: readonly ActionOrderView[]
  /** Also the panel's accessible name */
  title?: string
  emptyLabel?: string
  onCancel?: (id: string) => void
  /** The route was clicked (e.g. to show its city on the map). Omitted: the route is plain text */
  onSelect?: (id: string) => void
  /** The order picked on the list (e.g. its route shown on the map): highlighted */
  activeId?: string | null
  /** A click outside the panel while an order is active */
  onDeactivate?: () => void
  /** Folded down to the title. Omitted: the panel keeps this itself */
  minimized?: boolean
  onMinimizedChange?: (minimized: boolean) => void
  className?: string
  style?: CSSProperties
}

const KIND_LABELS: Readonly<Record<ActionOrderKind, string>> = { invasion: '侵攻', move: '移動', transport: '輸送' }

/** 軍団長 〜 以下N名 for an invasion, 担当 〜・〜 for a move or a transport */
function knightsText({ kind, knights }: ActionOrderView) {
  if (kind !== 'invasion') return { label: '担当', text: knights.join('・') }
  const [commander = ''] = knights
  return { label: '軍団長', text: knights.length > 1 ? `${commander} 以下${knights.length}名` : commander }
}

/**
 * 行動予約: the invasions, moves and transports ordered, one row each: the route, the knights, and 取消 for those that
 * can still be taken back (a move or transport under way shows its months left instead). Also lists the orders of a progress
 * phase, every faction's, with their emblems and the one being resolved highlighted. The active order (picked with
 * its route) opens its details under it. The panel folds down to its title (MinimizableWindow).
 */
export default function ActionOrders({
  orders, title = '行動予約', emptyLabel = '予約はありません', onCancel, onSelect, activeId = null, onDeactivate, minimized, onMinimizedChange, className = '', style,
}: ActionOrdersProps) {
  const ref = useRef<HTMLElement>(null)

  // The order picked comes into view with its details (the list scrolls past its max-height)
  useEffect(() => {
    if (activeId === null) return
    ref.current?.querySelector('.norden-action-orders-item.is-active')?.scrollIntoView?.({ block: 'nearest' })
  }, [activeId])

  useEffect(() => {
    if (activeId === null || !onDeactivate) return
    // Capturing: the map below may stop the click from reaching the document
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !ref.current?.contains(event.target)) onDeactivate()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [activeId, onDeactivate])

  return (
    <MinimizableWindow ref={ref} title={title} minimized={minimized} onMinimizedChange={onMinimizedChange}
      className={`norden-action-orders ${className}`} style={style}>
      {orders.length === 0
        ? <p className="norden-action-orders-empty">{emptyLabel}</p>
        : (
          <ol className="norden-action-orders-list">
            {orders.map(order => {
              const kind = KIND_LABELS[order.kind]
              const knights = knightsText(order)
              const active = order.id === activeId
              const route = <>
                {order.faction && <FactionMark faction={order.faction} emblemOnly />}
                <span className="norden-action-orders-city">{order.from}</span>
                <span className="norden-action-orders-arrow" aria-label="から">→</span>
                <span className="norden-action-orders-city">{order.to}</span>
              </>
              return (
                <li key={order.id} className={`norden-action-orders-item is-${order.kind} ${order.current ? 'is-current' : ''} ${active ? 'is-active' : ''}`}
                  aria-current={order.current ? 'step' : undefined}>
                  <span className="norden-action-orders-kind">{kind}</span>
                  {onSelect
                    ? <button type="button" className="norden-action-orders-route" aria-pressed={active} onClick={() => onSelect(order.id)}>{route}</button>
                    : <span className="norden-action-orders-route">{route}</span>}
                  <span className="norden-action-orders-knights">
                    <span className="norden-action-orders-knights-label">{knights.label}</span>
                    {knights.text}
                  </span>
                  {active && (order.details?.length || order.members?.length) ? (
                    <div className="norden-action-orders-details" role="group" aria-label={`${order.from}から${order.to}への${kind}の詳細`}>
                      {order.members && order.members.length > 0 && (
                        <ul className="norden-action-orders-members" aria-label="騎士">
                          {order.members.map((member, index) => (
                            <li key={`${index}-${member.name}`}><KnightChip knight={member} note={member.note} /></li>
                          ))}
                        </ul>
                      )}
                      {order.details && order.details.length > 0 && (
                        <dl className="norden-action-orders-detail-list">
                          {order.details.map(detail => (
                            <div key={detail.label} className="norden-action-orders-detail">
                              <dt>{detail.label}</dt>
                              <dd>{detail.value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </div>
                  ) : null}
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
    </MinimizableWindow>
  )
}
