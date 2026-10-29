import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from 'react'
import iconGold from '../../assets/ui/icons/icon-gold.webp'
import iconKnowledge from '../../assets/ui/icons/icon-knowledge.webp'
import iconProduction from '../../assets/ui/icons/icon-production.webp'
import iconTroops from '../../assets/ui/icons/icon-military.webp'
import ribbon from '../../assets/ui/hud/faction-ribbon.webp'
import type { FactionSummaryView, FactionView } from '../../screens/types'
import './FactionBar.css'

export interface FactionBarProps {
  /** The faction whose emblem appears inside the orb. */
  faction?: FactionView
  /** The player's faction: 金 (and its change next turn), 総生産, 総兵力 and 研究. Omitted: only the city switcher */
  summary?: FactionSummaryView
  /** Opens the technology screen from the 研究 stat; omitted: the stat is only shown */
  onOpenResearch?: () => void
  /** The city shown now */
  cityName: string
  /** ◀ ▶ are disabled when omitted */
  onPrevCity?: () => void
  onNextCity?: () => void
  /** Shown as "index / count" (index is 0-based) */
  cityPosition?: { index: number; count: number }
  movable?: boolean
  /** Offset from the bar's layout position, in px. */
  position?: { x: number; y: number }
  onPositionChange?: (position: { x: number; y: number }) => void
  className?: string
  style?: CSSProperties
}

const signed = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toLocaleString()}`

const perTurnLabel = ([low, high]: readonly [number, number]) => (low === high ? `+${low}` : `+${low}〜${high}`)

/**
 * 研究: the points a turn and the technology researched with its progress and the turns left, or 研究先なし
 * (dimmed while no points come in either). A button when it opens the technology screen
 */
function ResearchStat({ research, onOpen }: { research: NonNullable<FactionSummaryView['research']>; onOpen?: () => void }) {
  const { perTurn, tech } = research
  const idle = !tech && perTurn[1] <= 0
  const turns = tech?.turns
  const title = tech
    ? `${tech.name} ${tech.progress.toLocaleString()} / ${tech.cost.toLocaleString()}${turns === undefined ? '' : turns === null ? '（完了の見込みなし）' : `（あと${turns}ターン）`}`
    : '研究先なし'
  const content = <>
    <img className="norden-faction-bar-stat-icon" src={iconKnowledge} alt="" />
    <span className="norden-faction-bar-stat-label">研究 {perTurnLabel(perTurn)}/ターン</span>
    <span className="norden-faction-bar-stat-value norden-faction-bar-research">
      {tech ? <>
        {tech.name}
        <span className="norden-faction-bar-research-progress">
          {tech.progress.toLocaleString()}/{tech.cost.toLocaleString()}{typeof turns === 'number' && `・あと${turns}`}
        </span>
      </> : '研究先なし'}
    </span>
  </>
  const className = `norden-faction-bar-stat is-research ${idle ? 'is-idle' : ''} ${!tech && !idle ? 'is-unset' : ''}`
  return onOpen
    ? <button type="button" className={className} aria-label={`研究：${title}`} title={title} onClick={onOpen}>{content}</button>
    : <span className={className} role="group" aria-label="研究" title={title}>{content}</span>
}

/** Viewports into the supplied PNG: fixed-aspect caps and a stretchable plain middle. */
function RibbonDecoration() {
  return <div className="norden-faction-bar-decoration" aria-hidden="true">
    <svg className="norden-faction-bar-cap is-left" viewBox="72 218 102 333" preserveAspectRatio="xMinYMid meet" focusable="false">
      <image href={ribbon} width="1376" height="768" />
    </svg>
    <svg className="norden-faction-bar-middle" viewBox="174 218 850 333" preserveAspectRatio="none" focusable="false">
      <image href={ribbon} width="1376" height="768" />
    </svg>
    <svg className="norden-faction-bar-cap is-right" viewBox="1024 218 313 333" preserveAspectRatio="xMaxYMid meet" focusable="false">
      <image href={ribbon} width="1376" height="768" />
    </svg>
  </div>
}

function Stat({ label, icon, value, title, children }: { label: string; icon: string; value: number; title?: string; children?: ReactNode }) {
  return (
    <span className="norden-faction-bar-stat" role="group" aria-label={label} title={title}>
      <img className="norden-faction-bar-stat-icon" src={icon} alt="" />
      <span className="norden-faction-bar-stat-label">{label}</span>
      <span className="norden-faction-bar-stat-value">{value.toLocaleString()}{children}</span>
    </span>
  )
}

/** A faction's crystal emblem, treasury and cities. Drag the orb to move the whole bar. */
export default function FactionBar({ faction, summary, onOpenResearch, cityName, onPrevCity, onNextCity, cityPosition,
  movable = true, position, onPositionChange, className = '', style }: FactionBarProps) {
  const x = position?.x ?? 0
  const y = position?.y ?? 0
  const [offset, setOffset] = useState({ x, y })
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ pointerId: number; startX: number; startY: number; x: number; y: number } | null>(null)
  useEffect(() => { setOffset({ x, y }) }, [x, y])
  const moveTo = (next: { x: number; y: number }) => {
    setOffset(next)
    onPositionChange?.(next)
  }
  const start = (event: PointerEvent<HTMLButtonElement>) => {
    if (!movable || event.button !== 0 || !event.isPrimary || drag.current) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, ...offset }
    setDragging(true)
  }
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return
    event.stopPropagation()
    moveTo({ x: current.x + event.clientX - current.startX, y: current.y + event.clientY - current.startY })
  }
  const end = (event: PointerEvent<HTMLButtonElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return
    event.stopPropagation()
    drag.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  const keyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!movable || drag.current) return
    const step = event.shiftKey ? 1 : 10
    const directions: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step },
    }
    const delta = directions[event.key]
    if (!delta && event.key !== 'Home') return
    event.preventDefault()
    event.stopPropagation()
    moveTo(delta ? { x: offset.x + delta.x, y: offset.y + delta.y } : { x: 0, y: 0 })
  }
  const forecast = summary?.goldForecast
  return (
    <div className={`norden-faction-bar ${dragging ? 'is-dragging' : ''} ${className}`} role="group" aria-label="勢力"
      style={{ ...style, translate: `${offset.x}px ${offset.y}px` }}>
      <button type="button" className="norden-faction-bar-orb" disabled={!movable} data-sound="none"
        aria-label={`${faction?.name ?? '勢力'}のバーを移動`}
        title={`${faction?.name ?? '勢力'}：球をドラッグ、または矢印キーで移動（Shiftで微調整・Homeで元の位置）`}
        onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
        onKeyDown={keyDown} onClick={event => event.stopPropagation()}>
        {faction?.emblem && <img className="norden-faction-bar-emblem" src={faction.emblem} alt={faction.name} draggable={false} />}
        <span className="norden-faction-bar-glass" aria-hidden="true" />
      </button>
      <div className="norden-faction-bar-ribbon">
        <RibbonDecoration />
        <div className="norden-faction-bar-content">
          {summary && <>
            <Stat label="金" icon={iconGold} value={summary.gold}
              title={forecast === undefined ? undefined : `次のターン ${signed(forecast)}`}>
              {forecast !== undefined && (
                <span className={`norden-faction-bar-forecast ${forecast < 0 ? 'is-negative' : ''}`}>（{signed(forecast)}）</span>
              )}
            </Stat>
            <Stat label="総生産" icon={iconProduction} value={summary.production} />
            <Stat label="総兵力" icon={iconTroops} value={summary.troops} />
            {summary.research && <ResearchStat research={summary.research} onOpen={onOpenResearch} />}
          </>}
          <span className="norden-faction-bar-city" role="group" aria-label="都市の切り替え">
            <button type="button" className="norden-faction-bar-step" aria-label="前の都市" disabled={!onPrevCity} onClick={onPrevCity}>◀</button>
            <span className="norden-faction-bar-city-name" aria-live="polite">
              {cityName}
              {cityPosition && <span className="norden-faction-bar-city-position">{cityPosition.index + 1} / {cityPosition.count}</span>}
            </span>
            <button type="button" className="norden-faction-bar-step" aria-label="次の都市" disabled={!onNextCity} onClick={onNextCity}>▶</button>
          </span>
        </div>
      </div>
    </div>
  )
}
