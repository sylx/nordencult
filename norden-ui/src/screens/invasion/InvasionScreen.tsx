import { useState } from 'react'
import type { ReactNode } from 'react'
import InfoWindow from '../../components/window/InfoWindow'
import KnightCard from '../../components/parts/KnightCard'
import ChoiceGroup from '../../components/parts/ChoiceGroup'
import QuantityInput from '../../components/parts/QuantityInput'
import FactionMark from '../../components/parts/FactionMark'
import Button from '../../components/parts/Button'
import type { InfoWindowSkin } from '../../skins'
import type { CityView, KnightView, UnitTypeView } from '../types'
import '../screens.css'
import './InvasionScreen.css'

/** One knight of the army: the unit type they lead and its soldiers */
export interface InvasionAssignment {
  knightId: string
  unitType: string
  soldiers: number
}

/** The army, in the order the knights were picked */
export type InvasionDraft = readonly InvasionAssignment[]

export interface InvasionScreenProps {
  from: CityView
  to: CityView
  /** Knights defending the target */
  defenders?: number
  /** Knights in the starting city. Those with `unavailableReason` are shown but cannot be picked */
  knights: readonly KnightView[]
  unitTypes: readonly UnitTypeView[]
  /** Soldiers available in the starting city, shared by the whole army */
  soldierPool: number
  /** Soldiers step of the sliders */
  soldierStep?: number
  /** The host's rules. Return why the army cannot be ordered, or null */
  validate?: (draft: InvasionDraft) => string | null
  onConfirm: (draft: InvasionDraft) => void
  onCancel: () => void
  confirmLabel?: string
  /** Initial positions of the two windows */
  layout?: { knights?: { x: number; y: number }; army?: { x: number; y: number } }
  skin?: InfoWindowSkin
  children?: ReactNode
}

const total = (draft: InvasionDraft) => draft.reduce((sum, item) => sum + item.soldiers, 0)

/** The problem of the draft that the screen itself knows about */
function draftProblem(draft: InvasionDraft) {
  if (draft.length === 0) return '出撃する騎士を選んでください'
  if (draft.some(item => item.soldiers <= 0)) return '兵数が0の騎士がいます'
  return null
}

/** Invasion screen: pick the knights, then each knight's unit type and soldiers */
export default function InvasionScreen({
  from, to, defenders, knights, unitTypes, soldierPool, soldierStep = 10, validate, onConfirm, onCancel,
  confirmLabel = '予約', layout = {}, skin, children,
}: InvasionScreenProps) {
  const [draft, setDraft] = useState<InvasionDraft>([])
  const used = total(draft)
  const remaining = Math.max(0, soldierPool - used)
  const problem = draftProblem(draft) ?? validate?.(draft) ?? null
  const knightMap = new Map(knights.map(knight => [knight.id, knight]))
  const capOf = (knight: KnightView | undefined) => knight?.maxSoldiers ?? soldierPool

  const toggle = (knight: KnightView) => setDraft(current => {
    if (current.some(item => item.knightId === knight.id)) return current.filter(item => item.knightId !== knight.id)
    const left = Math.max(0, soldierPool - total(current))
    const unitType = knight.defaultUnitType && unitTypes.some(type => type.id === knight.defaultUnitType)
      ? knight.defaultUnitType : unitTypes[0]?.id ?? ''
    return [...current, { knightId: knight.id, unitType, soldiers: Math.min(capOf(knight), left) }]
  })
  const change = (knightId: string, patch: Partial<InvasionAssignment>) =>
    setDraft(current => current.map(item => (item.knightId === knightId ? { ...item, ...patch } : item)))

  const knightsAt = layout.knights ?? { x: 24, y: 72 }
  const armyAt = layout.army ?? { x: 464, y: 72 }

  return (
    <div className="norden-screen norden-invasion">
      <InfoWindow title="出撃する騎士" x={knightsAt.x} y={knightsAt.y} minWidth={380} minHeight={240} skin={skin}>
        <div className="norden-invasion-knights">
          <p className="norden-invasion-route">
            <span><FactionMark faction={from.faction} emblemOnly /> {from.name}</span>
            <span className="norden-invasion-arrow" aria-label="から">→</span>
            <span><FactionMark faction={to.faction} emblemOnly /> {to.name}</span>
          </p>
          {defenders !== undefined && (
            <p className="norden-invasion-defenders">守備の騎士: {defenders > 0 ? `${defenders}人` : 'なし'}</p>
          )}
          <h3 className="norden-invasion-heading">騎士を選ぶ（{draft.length} / {knights.length}）</h3>
          {knights.length === 0
            ? <p className="norden-invasion-empty">出撃できる騎士がいません。</p>
            : (
              <ul className="norden-invasion-list" aria-label="出撃する騎士">
                {knights.map(knight => {
                  const selected = draft.some(item => item.knightId === knight.id)
                  return (
                    <li key={knight.id}>
                      <KnightCard knight={knight} compact
                        selection={{ selected, onToggle: () => toggle(knight), disabled: Boolean(knight.unavailableReason) && !selected }}
                        aside={knight.unavailableReason ?? (knight.maxSoldiers !== undefined ? `率兵 ${knight.maxSoldiers}` : undefined)} />
                    </li>
                  )
                })}
              </ul>
            )}
        </div>
      </InfoWindow>

      <InfoWindow title="兵科と兵数" x={armyAt.x} y={armyAt.y} minWidth={420} minHeight={240} skin={skin}>
        <div className="norden-invasion-army">
          {draft.length === 0
            ? <p className="norden-invasion-empty">左の一覧から出撃する騎士を選んでください。</p>
            : draft.map(item => {
              const knight = knightMap.get(item.knightId)
              if (!knight) return null
              return (
                <section key={item.knightId} className="norden-invasion-unit" aria-label={`${knight.name}の部隊`}>
                  <KnightCard knight={{ ...knight, stats: undefined }} compact />
                  <ChoiceGroup label={`${knight.name}の兵科`} value={item.unitType}
                    options={unitTypes.map(type => ({ value: type.id, label: type.name, icon: type.icon, title: type.description }))}
                    onChange={unitType => change(item.knightId, { unitType })} />
                  <QuantityInput label={`${knight.name}の兵数`} unit="人" step={soldierStep} value={item.soldiers}
                    max={Math.min(capOf(knight), item.soldiers + remaining)}
                    onChange={soldiers => change(item.knightId, { soldiers })} />
                </section>
              )
            })}
        </div>
      </InfoWindow>

      <div className="norden-screen-bottom-center">
        <div className="norden-hud-panel norden-invasion-summary">
          <span className="norden-invasion-total">
            兵数 <b>{used.toLocaleString()}</b> / {soldierPool.toLocaleString()}
            <span className="norden-invasion-remaining">残り {remaining.toLocaleString()}</span>
          </span>
          <span className="norden-invasion-problem" role="status">{problem ?? ''}</span>
          <Button variant="quiet" onClick={onCancel}>やめる</Button>
          <Button variant="primary" disabled={problem !== null} title={problem ?? undefined} onClick={() => onConfirm(draft)}>
            {confirmLabel}
          </Button>
        </div>
      </div>
      {children}
    </div>
  )
}
