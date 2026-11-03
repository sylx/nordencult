import { useState } from 'react'
import type { ReactNode } from 'react'
import WindowFrame from '../../components/window/WindowFrame'
import KnightCard from '../../components/parts/KnightCard'
import QuantityInput from '../../components/parts/QuantityInput'
import FactionMark from '../../components/parts/FactionMark'
import Button from '../../components/parts/Button'
import SectionFrame from '../../components/parts/SectionFrame'
import PrisonerPicker from './PrisonerPicker'
import { knightAbilityStats } from '../domestic/DomesticOfficers'
import iconSupplies from '../../assets/ui/icons/icon-supplies.webp'
import iconTroops from '../../assets/ui/icons/icon-troops.webp'
import type { CityView, KnightView } from '../types'
import Tooltip from '../../components/parts/Tooltip'
import '../screens.css'
import './MoveScreen.css'

/** The move: the knights going, the soldiers, supplies and prisoners they take, or the knights alone (単騎移動) */
export interface MoveDraft {
  knights: readonly string[]
  troops: number
  supplies: number
  solo: boolean
  /** Ids of the prisoners taken along, in the order of the list; none riding alone */
  prisoners: readonly string[]
}

export interface MoveScreenProps {
  from: CityView
  to: CityView
  /** Names of the cities along the roads, both ends included. Omitted: not shown */
  route?: readonly string[]
  /** Months the move takes with soldiers, and riding alone */
  months: number
  soloMonths: number
  /** Knights in the starting city. Those with `unavailableReason` are shown but cannot be picked */
  knights: readonly KnightView[]
  /** Soldiers and supplies of the starting city that can be taken */
  soldierPool: number
  supplyPool: number
  soldierStep?: number
  supplyStep?: number
  /**
   * Prisoners held in the starting city (捕虜), to take along as soldiers and supplies are (not riding alone). Those
   * with `unavailableReason` are shown but cannot be picked. None (or omitted): their list is not shown
   */
  prisoners?: readonly KnightView[]
  /** The host's rules. Return why the move cannot be ordered, or null */
  validate?: (draft: MoveDraft) => string | null
  onConfirm: (draft: MoveDraft) => void
  /** やめる, or the window's close control */
  onCancel: () => void
  confirmLabel?: string
  children?: ReactNode
}

const MERCENARY_SOLO_REASON = '傭兵は単騎移動できません'

/**
 * Move screen, one window of two sections: the knights to pick (several), and what they take with them.
 * 単騎移動 sends the knights alone: no soldiers, supplies or prisoners, but they arrive sooner (soloMonths). With a
 * mercenary among them it cannot be chosen, and picking one takes it back.
 * The months the move takes are shown as the choice changes.
 */
export default function MoveScreen({
  from, to, route, months, soloMonths, knights, soldierPool, supplyPool, soldierStep = 10, supplyStep = 10, prisoners = [], validate,
  onConfirm, onCancel, confirmLabel = '予約', children,
}: MoveScreenProps) {
  const [picked, setPicked] = useState<readonly string[]>([])
  const [pickedPrisoners, setPickedPrisoners] = useState<readonly string[]>([])
  const [troops, setTroops] = useState(0)
  const [supplies, setSupplies] = useState(0)
  const [solo, setSolo] = useState(false)

  // In the order of the list
  const selected = knights.filter(knight => picked.includes(knight.id)).map(knight => knight.id)
  const withMercenary = knights.some(knight => knight.mercenary && selected.includes(knight.id))
  const taken = solo ? [] : prisoners.filter(prisoner => pickedPrisoners.includes(prisoner.id) && !prisoner.unavailableReason).map(prisoner => prisoner.id)
  const draft: MoveDraft = { knights: selected, troops: solo ? 0 : troops, supplies: solo ? 0 : supplies, solo, prisoners: taken }
  const problem = (selected.length === 0 ? '移動する騎士を選んでください' : null) ?? validate?.(draft) ?? null
  const arrival = solo ? soloMonths : months

  const toggleIn = (id: string) => (current: readonly string[]) => (current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  const toggle = (id: string) => {
    if (!picked.includes(id) && knights.find(knight => knight.id === id)?.mercenary) setSolo(false)
    setPicked(toggleIn(id))
  }
  const setAlone = (alone: boolean) => {
    setSolo(alone)
    if (alone) {
      setTroops(0)
      setSupplies(0)
      setPickedPrisoners([])
    }
  }

  return (
    <div className="norden-screen norden-move">
      <WindowFrame className="norden-window-screen norden-move-window" title={`${to.name}への移動`} onClose={onCancel}>
        <div className="norden-move-layout">
          <div className="norden-window-screen-layout">
            <section className="norden-window-section norden-move-knights" aria-label="移動する騎士">
              <SectionFrame />
              <header className="norden-window-section-header">
                <h2 className="norden-window-section-title">移動する騎士</h2>
                <span className="norden-window-section-count">{selected.length}人を選択</span>
              </header>
              {knights.length === 0
                ? <p className="norden-window-section-empty">移動できる騎士がいません。</p>
                : (
                  <ul className="norden-move-list norden-window-scroll" aria-label="移動する騎士">
                    {knights.map(knight => (
                      <li key={knight.id}>
                        <KnightCard knight={{ ...knight, stats: knightAbilityStats(knight) }} compact
                          selection={{ selected: selected.includes(knight.id), disabled: Boolean(knight.unavailableReason), onToggle: () => toggle(knight.id) }}
                          aside={knight.unavailableReason && <span className="norden-move-reason">{knight.unavailableReason}</span>} />
                      </li>
                    ))}
                  </ul>
                )}
            </section>

            <section className="norden-window-section norden-move-cargo" aria-label="移動の内容">
              <SectionFrame />
              <header className="norden-window-section-header">
                <h2 className="norden-window-section-title">移動の内容</h2>
              </header>
              <div className="norden-move-cargo-body norden-window-scroll">
                <p className="norden-move-route">
                  <span><FactionMark faction={from.faction} emblemOnly /> {from.name}</span>
                  <span className="norden-move-arrow" aria-label="から">→</span>
                  <span><FactionMark faction={to.faction} emblemOnly /> {to.name}</span>
                </p>
                {route && route.length > 2 && (
                  <p className="norden-move-via">経由: {route.slice(1, -1).join('・')}（{route.length - 1} 区間）</p>
                )}
                <div className="norden-move-months" role="status" aria-label="到着までの月数">
                  <span>到着まで</span>
                  <b>{arrival}</b>
                  <span>ヶ月</span>
                </div>
                <Tooltip content={withMercenary ? MERCENARY_SOLO_REASON : undefined}>
                  <label className={`norden-move-solo ${solo ? 'is-checked' : ''} ${withMercenary ? 'is-disabled' : ''}`}>
                    <input type="checkbox" checked={solo} disabled={withMercenary} onChange={event => setAlone(event.target.checked)} />
                    <span>
                      <b>単騎移動</b>
                      <small>兵{prisoners.length > 0 ? '・物資・捕虜' : 'と物資'}を運ばず、騎士だけで目的地に急行します</small>
                    </span>
                  </label>
                </Tooltip>
                <div className="norden-move-amounts">
                  <QuantityInput label="兵数" icon={<img src={iconTroops} alt="" />} unit="人" step={soldierStep} value={draft.troops} max={soldierPool} disabled={solo}
                    onChange={setTroops} />
                  <QuantityInput label="物資" icon={<img src={iconSupplies} alt="" />} step={supplyStep} value={draft.supplies} max={supplyPool} disabled={solo}
                    onChange={setSupplies} />
                </div>
                {prisoners.length > 0 && (
                  <PrisonerPicker prisoners={prisoners} picked={draft.prisoners} onToggle={id => setPickedPrisoners(toggleIn(id))}
                    disabledReason={solo ? '単騎移動では連れて行けません' : undefined} />
                )}
              </div>
            </section>
          </div>

          <footer className="norden-move-summary">
            <span className="norden-move-total">
              騎士 <b>{selected.length}</b>人・兵 <b>{draft.troops.toLocaleString()}</b>・物資 <b>{draft.supplies.toLocaleString()}</b>
              {prisoners.length > 0 && <>・捕虜 <b>{draft.prisoners.length}</b>人</>}
            </span>
            <span className="norden-move-problem" role="status">{problem ?? ''}</span>
            <Button variant="quiet" onClick={onCancel}>やめる</Button>
            <Button variant="primary" disabled={problem !== null} title={problem ?? undefined} onClick={() => onConfirm(draft)}>
              {confirmLabel}
            </Button>
          </footer>
        </div>
      </WindowFrame>
      {children}
    </div>
  )
}
