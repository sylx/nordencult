import { useEffect, useRef } from 'react'
import NavigationWindow from '../../components/window/NavigationWindow'
import type { NavigationWindowProps } from '../../components/window/NavigationWindow'
import { KnightStats } from '../../components/parts/KnightCard'
import { ABILITY_LABELS, knightAbility } from '../domestic/DomesticOfficers'
import type { KnightView } from '../types'
import './KnightProfileWindow.css'

export interface KnightProfileWindowProps extends Omit<NavigationWindowProps, 'title' | 'children'> {
  knight: KnightView
  /** Finds a knight the 略歴 names; names it cannot find are shown without a link */
  knightOf?: (id: string) => KnightView | undefined
  /** A name in the 略歴 was clicked */
  onSelectKnight?: (id: string) => void
  onClose: () => void
}

const ABILITIES = ['leadership', 'strength', 'intelligence', 'politics', 'charm'] as const

/** A knight's profile: full figure, 所属・所在, abilities with their chart and 略歴, in a window with back/forward */
export default function KnightProfileWindow({ knight, knightOf, onSelectKnight, onClose, className = '', ...windowProps }: KnightProfileWindowProps) {
  const body = useRef<HTMLDivElement>(null)
  // Another knight starts at the top of their profile
  useEffect(() => {
    const content = body.current?.closest('.norden-window-frame-content')
    if (content) content.scrollTop = 0
  }, [knight.id])
  // Escape closes this window before the screen under it (ScreenHost skips handled keys)
  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', keyDown, true)
    return () => window.removeEventListener('keydown', keyDown, true)
  }, [onClose])

  const abilities = ABILITIES.map(ability => ({ label: ABILITY_LABELS[ability], value: knightAbility(knight, ability) }))
  const figure = knight.imageSrc ? <img src={knight.imageSrc} alt="" /> : knight.image
  return (
    <NavigationWindow {...windowProps} title={knight.name} onClose={onClose} className={`norden-knight-profile-window ${className}`}>
      <div ref={body} className={`norden-knight-profile ${figure ? 'has-figure' : ''}`}>
        <div className="norden-knight-profile-overview">
          <header className="norden-knight-profile-header">
            {!figure && <span className="norden-knight-face">{knight.portraitSrc
              ? <img src={knight.portraitSrc} alt="" />
              : knight.portrait ?? <span className="norden-knight-initial">{knight.name.slice(0, 1)}</span>}</span>}
            <div>
              <h2 className="norden-knight-profile-name">{knight.name}</h2>
              {knight.subtitle && <span className="norden-knight-profile-sub">{knight.subtitle}</span>}
            </div>
          </header>
          {(knight.faction !== undefined || knight.location || knight.mercenary) && (
            <dl className="norden-knight-profile-facts">
              {knight.faction !== undefined && <div>
                <dt>所属</dt>
                <dd>
                  {knight.faction?.emblem && <img className="norden-knight-profile-emblem" src={knight.faction.emblem} alt="" />}
                  {knight.faction?.name ?? '勢力なし'}
                </dd>
              </div>}
              {knight.location && <div><dt>所在</dt><dd>{knight.location}</dd></div>}
              {knight.mercenary && <div><dt>傭兵</dt><dd>{knight.mercenary.company}</dd></div>}
              {knight.mercenary && <div><dt>傭兵の兵</dt><dd>{knight.mercenary.soldiers.toLocaleString()} / {knight.mercenary.maxSoldiers.toLocaleString()}</dd></div>}
            </dl>
          )}
          <KnightStats stats={abilities.map(({ label, value }) => ({ label, value: value ?? '—' }))} />
          <AbilityChart abilities={abilities} />
          {figure && <div className="norden-knight-profile-figure" role="img" aria-label={`${knight.name}の立ち絵`}>{figure}</div>}
        </div>
        <section className="norden-knight-profile-section">
          <h3>略歴</h3>
          {knight.biography
            ? <p className="norden-knight-profile-biography">{biographyParts(knight.biography).map((part, index) => {
              if (typeof part === 'string') return part
              const target = knightOf?.(part.id)
              return target && onSelectKnight
                ? <button key={index} type="button" className="norden-knight-profile-link"
                  title={`${target.name}の詳細`} onClick={() => onSelectKnight(part.id)}>{part.name}</button>
                : part.name
            })}</p>
            : <p className="norden-knight-profile-empty">記録はありません。</p>}
        </section>
      </div>
    </NavigationWindow>
  )
}

/** 名前（001）: the name (the katakana just before it) and the id of the knight it names */
const REFERENCE = /([ァ-ヿ]*)（(\d{3})）/g

/** Splits a 略歴 into its text and the knights it names (the ids themselves are dropped) */
export function biographyParts(text: string): (string | { name: string; id: string })[] {
  const parts: (string | { name: string; id: string })[] = []
  let last = 0
  for (const match of text.matchAll(REFERENCE)) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    if (match[1]) parts.push({ name: match[1], id: match[2]! })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

// The labels stay inside the viewBox, so the chart never widens the window
const CHART = { size: 280, height: 204, radius: 70, labelGap: 18 }

/** The five abilities (0-100) as a pentagon, 統率 at the top and clockwise; an unknown ability counts as 0 */
function AbilityChart({ abilities }: { abilities: readonly { label: string; value: number | undefined }[] }) {
  const cx = CHART.size / 2, cy = CHART.height / 2 + 8
  const point = (index: number, ratio: number) => {
    const angle = -Math.PI / 2 + index * 2 * Math.PI / abilities.length
    return { x: cx + Math.cos(angle) * CHART.radius * ratio, y: cy + Math.sin(angle) * CHART.radius * ratio }
  }
  const polygon = (ratio: (index: number) => number) => abilities.map((_, index) => {
    const { x, y } = point(index, ratio(index))
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const ratioOf = (value: number | undefined) => Math.max(0, Math.min(1, (value ?? 0) / 100))
  const summary = abilities.map(({ label, value }) => `${label}${value ?? '不明'}`).join('、')
  return (
    <svg className="norden-knight-profile-chart" viewBox={`0 0 ${CHART.size} ${CHART.height}`} role="img" aria-label={`能力チャート：${summary}`}>
      {[0.25, 0.5, 0.75, 1].map(ring => <polygon key={ring} className="is-ring" points={polygon(() => ring)} />)}
      {abilities.map((_, index) => {
        const end = point(index, 1)
        return <line key={index} className="is-axis" x1={cx} y1={cy} x2={end.x} y2={end.y} />
      })}
      <polygon className="is-value" points={polygon(index => ratioOf(abilities[index]!.value))} />
      {abilities.map(({ label, value }, index) => {
        const { x, y } = point(index, ratioOf(value))
        const at = point(index, 1 + CHART.labelGap / CHART.radius)
        const dx = at.x - cx
        const anchor = Math.abs(dx) < 1 ? 'middle' : dx > 0 ? 'start' : 'end'
        // The top label sits above its corner, the bottom ones below theirs
        const dy = at.y < cy - CHART.radius / 2 ? -10 : at.y > cy + CHART.radius / 2 ? 10 : 0
        return <g key={label}>
          <circle className="is-point" cx={x} cy={y} r={4}><title>{`${label} ${value ?? '—'}`}</title></circle>
          <text x={at.x} y={at.y + dy} textAnchor={anchor} dominantBaseline="middle">
            <tspan className="is-label">{label}</tspan>
            <tspan className="is-number" dx={4}>{value ?? '—'}</tspan>
          </text>
        </g>
      })}
    </svg>
  )
}
