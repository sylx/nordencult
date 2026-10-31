import { useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { BuildingImage, ConstructionProgress } from '../../components/parts/BuildingSlots'
import Button from '../../components/parts/Button'
import SectionFrame from '../../components/parts/SectionFrame'
import WindowFrame from '../../components/window/WindowFrame'
import type { TechStatusView, TechView } from '../types'
import { layoutTechs } from './techLayout'
import '../screens.css'
import './TechScreen.css'

export interface TechScreenProps {
  /** Every technology, in data order; those requiring none are the roots, side by side in the first column */
  techs: readonly TechView[]
  /** Research points the faction gets a turn, least and most */
  perTurn?: readonly [number, number]
  /** How they are made up, for their tooltip, e.g. 施設 +7.5 */
  pointDetails?: readonly string[]
  /** Research points 宙に浮いた, put into the technology chosen next */
  carry?: number
  /** The points are 宙に浮いた and the faction must choose what to research: the window cannot be closed */
  mustChoose?: boolean
  /** Researches a technology (in place of the one being researched, whose progress is kept) */
  onResearch?: (techId: string) => void
  /** Omitted (or while mustChoose): no close control */
  onClose?: () => void
  children?: ReactNode
}

const STATUS_LABELS: Readonly<Record<TechStatusView, string>> = {
  researched: '研究済み', researching: '研究中', available: '研究可能', visible: '前提が足りない', hidden: '未知の技術',
}

/** Sizes of the tree (px): a column and a row, and a node in them */
const COLUMN_WIDTH = 196
const ROW_HEIGHT = 80
const NODE_WIDTH = 164
const NODE_HEIGHT = 64

const range = ([low, high]: readonly [number, number]) => (low === high ? `+${low}` : `+${low}〜${high}`)

const shownName = (tech: TechView) => (tech.status === 'hidden' ? '???' : tech.name ?? tech.id)

function TechNode({ tech, selected, onSelect }: { tech: TechView; selected: boolean; onSelect: () => void }) {
  const hidden = tech.status === 'hidden'
  const ratio = tech.cost && tech.progress ? Math.min(1, tech.progress / tech.cost) : 0
  return (
    <button type="button" className={`norden-tech-node is-${tech.status} ${selected ? 'is-selected' : ''}`}
      aria-label={`${shownName(tech)}（${STATUS_LABELS[tech.status]}）`} aria-pressed={selected} onClick={onSelect}>
      {hidden
        ? <span className="norden-tech-node-image is-hidden" aria-hidden="true">?</span>
        : <BuildingImage building={{ id: tech.id, name: tech.name ?? tech.id, image: tech.image }} className="norden-tech-node-image" />}
      <span className="norden-tech-node-body">
        <span className="norden-tech-node-name">{shownName(tech)}</span>
        {!hidden && tech.status !== 'researched' && tech.cost !== undefined && (
          <span className="norden-tech-node-cost">{(tech.progress ?? 0).toLocaleString()} / {tech.cost.toLocaleString()}</span>
        )}
        {tech.status === 'researched' && <span className="norden-tech-node-cost">研究済み</span>}
        {ratio > 0 && tech.status !== 'researched' && (
          <span className="norden-tech-node-bar" aria-hidden="true"><span style={{ width: `${ratio * 100}%` }} /></span>
        )}
      </span>
    </button>
  )
}

function TechTree({ techs, selectedId, onSelect }: { techs: readonly TechView[]; selectedId?: string; onSelect: (id: string) => void }) {
  const layout = useMemo(() => layoutTechs(techs), [techs])
  const width = layout.columns * COLUMN_WIDTH
  const height = layout.rows * ROW_HEIGHT
  const at = (id: string) => {
    const place = layout.places[id]!
    return { left: place.column * COLUMN_WIDTH, top: place.row * ROW_HEIGHT }
  }
  return (
    <div className="norden-tech-tree-canvas" style={{ width, height }}>
      <svg className="norden-tech-tree-lines" width={width} height={height} aria-hidden="true">
        {techs.flatMap(tech => tech.requires.filter(id => layout.places[id]).map(id => {
          const from = at(id)
          const to = at(tech.id)
          const x1 = from.left + NODE_WIDTH
          const y1 = from.top + NODE_HEIGHT / 2
          const x2 = to.left
          const y2 = to.top + NODE_HEIGHT / 2
          const mid = (x1 + x2) / 2
          const done = techs.find(t => t.id === id)?.status === 'researched'
          return <path key={`${id}-${tech.id}`} className={done ? 'is-open' : ''} d={`M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`} />
        }))}
      </svg>
      {techs.map(tech => (
        <div key={tech.id} className="norden-tech-tree-cell" style={{ ...at(tech.id), width: NODE_WIDTH, height: NODE_HEIGHT }}>
          <TechNode tech={tech} selected={tech.id === selectedId} onSelect={() => onSelect(tech.id)} />
        </div>
      ))}
    </div>
  )
}

/**
 * Pans a scrolling element by dragging it with the mouse (touch scrolls it already), from anywhere but a technology
 */
function useDragPan() {
  const dragRef = useRef<{ pointerId: number; x: number; y: number; left: number; top: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch' || event.button !== 0 || !event.isPrimary) return
    if ((event.target as Element).closest('.norden-tech-node')) return
    const element = event.currentTarget
    // Leaves the scrollbars to themselves
    const rect = element.getBoundingClientRect()
    if (event.clientX - rect.left >= element.clientLeft + element.clientWidth
      || event.clientY - rect.top >= element.clientTop + element.clientHeight) return
    event.preventDefault()
    element.setPointerCapture(event.pointerId)
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: element.scrollLeft, top: element.scrollTop }
    setDragging(true)
  }
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.currentTarget.scrollLeft = drag.left - (event.clientX - drag.x)
    event.currentTarget.scrollTop = drag.top - (event.clientY - drag.y)
  }
  const onPointerEnd = (event: PointerEvent<HTMLElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    setDragging(false)
  }
  return { dragging, onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd }
}

function TechDetails({ tech, onResearch }: { tech: TechView; onResearch?: (techId: string) => void }) {
  if (tech.status === 'hidden') {
    return (
      <div className="norden-tech-details">
        <span className="norden-tech-details-image is-hidden" aria-hidden="true">?</span>
        <h3 className="norden-tech-details-name">???</h3>
        <p className="norden-window-section-empty">不明（前提の技術が必要）</p>
      </div>
    )
  }
  const researchable = tech.status === 'available' && !tech.unavailableReason
  return (
    <div className="norden-tech-details">
      <BuildingImage building={{ id: tech.id, name: tech.name ?? tech.id, image: tech.image }} className="norden-tech-details-image" />
      <h3 className="norden-tech-details-name">{tech.name ?? tech.id}</h3>
      <span className={`norden-tech-details-status is-${tech.status}`}>{STATUS_LABELS[tech.status]}</span>
      {tech.description && <p className="norden-tech-details-description">{tech.description}</p>}
      {tech.effects && tech.effects.length > 0 && (
        <ul className="norden-tech-details-effects" aria-label="効果">
          {tech.effects.map(effect => <li key={effect}>{effect}</li>)}
        </ul>
      )}
      {tech.cost !== undefined && tech.status !== 'researched' && (
        <ConstructionProgress invested={tech.progress ?? 0} required={tech.cost} turnsLeft={tech.turns === 0 ? undefined : tech.turns} />
      )}
      {tech.turns === 0 && tech.status !== 'researched' && (
        <p className="norden-tech-details-instant">宙に浮いた研究ポイントで、研究するとすぐに完了します</p>
      )}
      {tech.status === 'researched' && tech.cost !== undefined && <p className="norden-tech-details-cost">研究ポイント {tech.cost.toLocaleString()}</p>}
      {tech.unavailableReason && <p className="norden-tech-details-reason" role="note">{tech.unavailableReason}</p>}
      {onResearch && tech.status !== 'researched' && (
        <Button variant="primary" disabled={!researchable} title={tech.unavailableReason}
          aria-label={`${tech.name ?? tech.id}を研究する`} onClick={() => onResearch(tech.id)}>
          {tech.status === 'researching' ? '研究中' : '研究する'}
        </Button>
      )}
    </div>
  )
}

/**
 * The technology screen (研究＞技術): a full-screen window with the tree drawn left to right (a column per depth, the
 * technologies requiring none side by side in the first, lines from the technologies required), each technology's picture and name (researched, researching with its progress,
 * researchable, seen by name, or ??? with its picture hidden), and on the right the details of the one chosen and
 * 研究する (the tree and the details 7:3, the tree scrolling on its own and panned by dragging it). Along the
 * bottom, the research points a turn and those 宙に浮いた (or that every technology is researched) at the left and
 * 戻る at the right; while they must go somewhere (mustChoose) the window cannot be closed
 */
export default function TechScreen({ techs, perTurn, pointDetails, carry = 0, mustChoose = false, onResearch, onClose, children }: TechScreenProps) {
  const [selectedId, setSelectedId] = useState<string | undefined>(
    () => (techs.find(t => t.status === 'researching') ?? techs.find(t => t.status === 'available') ?? techs[0])?.id,
  )
  const selected = techs.find(tech => tech.id === selectedId)
  const complete = techs.length > 0 && techs.every(tech => tech.status === 'researched')
  const { dragging, ...pan } = useDragPan()
  return (
    <div className="norden-screen norden-tech">
      <WindowFrame className="norden-window-screen" title="技術" aria-label="技術" onClose={mustChoose ? undefined : onClose}>
        <div className="norden-tech-layout">
          <div className="norden-window-screen-layout">
            <section className="norden-window-section norden-tech-trees" aria-label="技術ツリー">
              <SectionFrame />
              <div className={`norden-tech-trees-scroll ${dragging ? 'is-dragging' : ''}`} {...pan}>
                <TechTree techs={techs} selectedId={selectedId} onSelect={setSelectedId} />
              </div>
            </section>
            <section className="norden-window-section norden-tech-side" aria-label="技術の詳細">
              <SectionFrame />
              {selected
                ? <TechDetails tech={selected} onResearch={onResearch} />
                : <p className="norden-window-section-empty">技術を選んでください</p>}
            </section>
          </div>
          <footer className="norden-tech-footer">
            <span className="norden-tech-points" title={pointDetails?.join('\n')}>
              研究ポイント <b>{perTurn ? range(perTurn) : '+0'}</b>/ターン
            </span>
            {carry > 0 && <span className="norden-tech-carry">宙に浮いた研究ポイント <b>{carry.toLocaleString()}</b></span>}
            {complete && <span className="norden-tech-complete">すべての技術を研究し終えました</span>}
            {mustChoose && (
              <strong className="norden-tech-must-choose" role="status">研究先を選んでください（宙に浮いた研究ポイント {carry.toLocaleString()}）</strong>
            )}
            {onClose && (
              <Button className="norden-tech-back" disabled={mustChoose} title={mustChoose ? '研究先を選んでください' : undefined}
                onClick={onClose}>戻る</Button>
            )}
          </footer>
        </div>
      </WindowFrame>
      {children}
    </div>
  )
}
