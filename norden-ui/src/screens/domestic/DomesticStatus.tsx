import { useEffect, useId, useRef, useState } from 'react'
import StatBar from '../../components/parts/StatBar'
import iconAgriculture from '../../assets/ui/icons/icon-agriculture.svg'
import iconCommerce from '../../assets/ui/icons/icon-commerce.png'
import iconProduction from '../../assets/ui/icons/icon-production.png'
import iconMorale from '../../assets/ui/icons/icon-military.png'
import iconRecruit from '../../assets/ui/icons/icon_people.webp'
import type { CityStatView, PopulationGrowthView } from '../types'

export interface DomesticStatusProps {
  /** 商業・生産・練度・新兵の練度 and the like, with the boosts stacked on their bars */
  stats: readonly CityStatView[]
  population?: number
  /** The population's growth next turn and the turns until the next tier, shown under it */
  populationGrowth?: PopulationGrowthView
  /** The city's tier, used to name its scale when it is the top one (no next tier in populationGrowth) */
  tier?: number
  supplies?: number
  gold?: number
}

const statKinds = { 農業: 'agriculture', 商業: 'commerce', 生産: 'production', 練度: 'morale', 新兵の練度: 'morale' } as const
const statIcons = { agriculture: iconAgriculture, commerce: iconCommerce, production: iconProduction, morale: iconMorale }

/** Pictures for labels sharing a kind with another (新兵の練度 beside 練度) */
const labelIcons: Readonly<Record<string, string>> = { 新兵の練度: iconRecruit }

const statKind = (stat: CityStatView) => stat.kind ?? statKinds[stat.label as keyof typeof statKinds] ?? 'commerce'
const signed = (value: number) => `${value >= 0 ? '+' : ''}${value.toLocaleString()}`

const scaleLabels: Readonly<Record<number, string>> = { 1: '小さな町', 2: '大きな街', 3: '大都市' }

/** e.g. +280/ターン and 大都市 まで 約12ターン (or 大都市（最大）) */
function growthNotes(growth: PopulationGrowthView, tier?: number): string[] {
  const next = growth.nextTier
  const scale = next ? scaleLabels[next.tier] : tier !== undefined ? scaleLabels[tier] : undefined
  const toNext = scale && (next
    ? `${scale} まで ${next.turns === null ? '伸びなし' : `約${next.turns.toLocaleString()}ターン`}`
    : `${scale}（最大）`)
  return [`${signed(growth.perTurn)}/ターン`, ...(toNext ? [toNext] : [])]
}

/**
 * The city as it stands, at the top of the domestic screen: its stats as bars with the
 * buildings' (and other) boosts stacked on the base, each broken down in a tooltip on hover
 * or click, and its population (with its growth and the turns until the next tier), supplies and gold in large figures
 */
export default function DomesticStatus({ stats, population, populationGrowth, tier, supplies, gold }: DomesticStatusProps) {
  const id = useId()
  const ref = useRef<HTMLElement>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string | null>(null)
  const open = pinned ?? hovered

  // A pinned tooltip closes on a click elsewhere or Escape
  useEffect(() => {
    if (!pinned) return
    const onPointerDown = (event: PointerEvent) => {
      const item = event.target instanceof Element ? event.target.closest('[data-stat]') : null
      if (!item || !ref.current?.contains(item) || item.getAttribute('data-stat') !== pinned) setPinned(null)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPinned(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [pinned])

  const figures: { label: string; value?: number; notes?: string[]; title?: string }[] = [
    {
      label: '人口',
      value: population,
      notes: populationGrowth && growthNotes(populationGrowth, tier),
      title: populationGrowth?.details && ['次のターンの人口の伸び（見込み）', ...populationGrowth.details].join('\n'),
    },
    { label: '備蓄物資', value: supplies },
    { label: '金', value: gold },
  ]
  const shown = figures.filter((figure): figure is typeof figure & { value: number } => figure.value !== undefined)

  return (
    <section ref={ref} className="norden-domestic-status" aria-label="都市の現状">
      {stats.length > 0 && (
        <ul className="norden-domestic-stats">
          {stats.map((stat, index) => {
            const boosts = (stat.boosts ?? []).filter(boost => boost.value !== 0)
            const base = stat.base ?? stat.value - boosts.reduce((sum, boost) => sum + boost.value, 0)
            const buildingBoost = boosts.filter(boost => boost.source === 'building').reduce((sum, boost) => sum + boost.value, 0)
            const isOpen = open === stat.label
            const tipId = `${id}-tip-${index}`
            return (
              <li
                key={stat.label}
                data-stat={stat.label}
                className={`norden-domestic-stat ${isOpen ? 'is-open' : ''}`}
                onMouseEnter={() => setHovered(stat.label)}
                onMouseLeave={() => setHovered(current => (current === stat.label ? null : current))}
              >
                <span className="norden-domestic-stat-label">
                  <img src={labelIcons[stat.label] ?? statIcons[statKind(stat)]} alt="" />
                  {stat.label}
                </span>
                <button
                  type="button"
                  className="norden-domestic-stat-bar"
                  aria-label={`${stat.label}の内訳`}
                  aria-expanded={isOpen}
                  aria-describedby={isOpen ? tipId : undefined}
                  onClick={() => setPinned(current => (current === stat.label ? null : stat.label))}
                >
                  <StatBar
                    label={stat.label}
                    value={stat.value}
                    max={stat.max}
                    tone={statKind(stat)}
                    segments={boosts.map(boost => ({ value: boost.value, kind: boost.source === 'building' ? 'building' : 'other' }))}
                  />
                </button>
                {/* Stats without boosts (e.g. 練度, which grows by training) leave the column empty */}
                <span className={`norden-domestic-stat-boost ${buildingBoost ? '' : 'is-none'}`}>
                  {stat.boosts && `施設 ${signed(buildingBoost)}`}
                </span>
                {isOpen && (
                  <div id={tipId} role="tooltip" className="norden-domestic-stat-tip">
                    <strong className="norden-domestic-stat-tip-title">
                      {stat.label} <b>{stat.value.toLocaleString()}</b>
                      <span> / {stat.max.toLocaleString()}</span>
                    </strong>
                    {stat.boosts && <ul className="norden-domestic-stat-tip-rows">
                      <li>
                        <span>基礎</span>
                        <b>{base.toLocaleString()}</b>
                      </li>
                      {boosts.map(boost => (
                        <li key={boost.label} className={boost.source === 'building' ? 'is-building' : ''}>
                          <span>{boost.label}</span>
                          <b>{signed(boost.value)}</b>
                          {boost.details && boost.details.length > 0 && (
                            <ul className="norden-domestic-stat-tip-details">
                              {boost.details.map(detail => <li key={detail}>{detail}</li>)}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>}
                    {stat.boosts && boosts.length === 0 && <p className="norden-domestic-stat-tip-none">ブーストはありません</p>}
                    {stat.notes && stat.notes.length > 0 && (
                      <ul className="norden-domestic-stat-tip-notes">
                        {stat.notes.map(note => <li key={note}>{note}</li>)}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {shown.length > 0 && (
        <dl className="norden-domestic-figures">
          {shown.map(figure => (
            <div key={figure.label} title={figure.title}>
              <dt>{figure.label}</dt>
              <dd>{figure.value.toLocaleString()}</dd>
              {figure.notes?.map(note => <dd key={note} className="norden-domestic-figure-note">{note}</dd>)}
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
