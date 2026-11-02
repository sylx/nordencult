import { useState } from 'react'
import type { ReactNode } from 'react'
import WindowFrame from '../../components/window/WindowFrame'
import KnightCard from '../../components/parts/KnightCard'
import QuantityInput from '../../components/parts/QuantityInput'
import FactionMark from '../../components/parts/FactionMark'
import Button from '../../components/parts/Button'
import SectionFrame from '../../components/parts/SectionFrame'
import PrisonerPicker from '../move/PrisonerPicker'
import iconSupplies from '../../assets/ui/icons/icon-supplies.webp'
import iconTroops from '../../assets/ui/icons/icon-troops.webp'
import type { CityView, KnightView } from '../types'
import '../screens.css'
import '../move/MoveScreen.css'
import './TransportScreen.css'

/** The transport: the knight in charge, and the soldiers, supplies and prisoners they take */
export interface TransportDraft {
  knight: string
  troops: number
  supplies: number
  /** Ids of the prisoners taken along and left there, in the order of the list */
  prisoners: readonly string[]
}

export interface TransportScreenProps {
  from: CityView
  to: CityView
  /** Names of the cities along the roads, both ends included. Omitted: not shown */
  route?: readonly string[]
  /** Months until the soldiers and supplies arrive, and the knight's ride back alone after that */
  months: number
  returnMonths: number
  /** Knights in the starting city. Those with `unavailableReason` are shown but cannot be picked */
  knights: readonly KnightView[]
  /** Soldiers and supplies of the starting city that can be taken */
  soldierPool: number
  supplyPool: number
  soldierStep?: number
  supplyStep?: number
  /**
   * Prisoners held in the starting city (捕虜), to take along and leave there as the soldiers and supplies. Those
   * with `unavailableReason` are shown but cannot be picked. None (or omitted): their list is not shown
   */
  prisoners?: readonly KnightView[]
  /** The host's rules. Return why the transport cannot be ordered, or null */
  validate?: (draft: TransportDraft) => string | null
  onConfirm: (draft: TransportDraft) => void
  /** やめる, or the window's close control */
  onCancel: () => void
  confirmLabel?: string
  children?: ReactNode
}

/**
 * Transport screen, one window of two sections like the move screen: the knight in charge (one), and the
 * soldiers and supplies they take. The knight unloads them in `to` and rides back alone to `from`.
 * 繰り返し輸送 (waiting for the amounts and transporting again) is not made yet: its checkbox is disabled.
 */
export default function TransportScreen({
  from, to, route, months, returnMonths, knights, soldierPool, supplyPool, soldierStep = 10, supplyStep = 10, prisoners = [], validate,
  onConfirm, onCancel, confirmLabel = '予約', children,
}: TransportScreenProps) {
  const [picked, setPicked] = useState<string | null>(null)
  const [troops, setTroops] = useState(0)
  const [supplies, setSupplies] = useState(0)
  const [pickedPrisoners, setPickedPrisoners] = useState<readonly string[]>([])

  const knight = knights.find(item => item.id === picked && !item.unavailableReason)
  const taken = prisoners.filter(prisoner => pickedPrisoners.includes(prisoner.id) && !prisoner.unavailableReason).map(prisoner => prisoner.id)
  const draft: TransportDraft = { knight: knight?.id ?? '', troops, supplies, prisoners: taken }
  const problem = (!knight ? '担当の騎士を選んでください' : null)
    ?? (troops === 0 && supplies === 0 && taken.length === 0
      ? prisoners.length > 0 ? '輸送する兵・物資・捕虜を決めてください' : '輸送する兵か物資を決めてください'
      : null)
    ?? validate?.(draft) ?? null
  const togglePrisoner = (id: string) =>
    setPickedPrisoners(current => (current.includes(id) ? current.filter(item => item !== id) : [...current, id]))

  return (
    <div className="norden-screen norden-move norden-transport">
      <WindowFrame className="norden-window-screen norden-move-window" title={`${to.name}への輸送`} onClose={onCancel}>
        <div className="norden-move-layout">
          <div className="norden-window-screen-layout">
            <section className="norden-window-section norden-move-knights" aria-label="担当の騎士">
              <SectionFrame />
              <header className="norden-window-section-header">
                <h2 className="norden-window-section-title">担当の騎士</h2>
                <span className="norden-window-section-count">{knight ? knight.name : '未選択'}</span>
              </header>
              {knights.length === 0
                ? <p className="norden-window-section-empty">輸送を担当できる騎士がいません。</p>
                : (
                  <ul className="norden-move-list norden-window-scroll" aria-label="担当の騎士">
                    {knights.map(item => (
                      <li key={item.id}>
                        <KnightCard knight={item} compact
                          selection={{
                            type: 'radio', name: 'norden-transport-knight', selected: item.id === knight?.id,
                            disabled: Boolean(item.unavailableReason), onToggle: () => setPicked(item.id),
                          }}
                          aside={item.unavailableReason && <span className="norden-move-reason">{item.unavailableReason}</span>} />
                      </li>
                    ))}
                  </ul>
                )}
            </section>

            <section className="norden-window-section norden-move-cargo" aria-label="輸送の内容">
              <SectionFrame />
              <header className="norden-window-section-header">
                <h2 className="norden-window-section-title">輸送の内容</h2>
              </header>
              <div className="norden-move-cargo-body norden-window-scroll">
                <p className="norden-move-route">
                  <span><FactionMark faction={from.faction} emblemOnly /> {from.name}</span>
                  <span className="norden-move-arrow norden-transport-arrow" aria-label="から">→</span>
                  <span><FactionMark faction={to.faction} emblemOnly /> {to.name}</span>
                </p>
                {route && route.length > 2 && (
                  <p className="norden-move-via">経由: {route.slice(1, -1).join('・')}（街道 {route.length - 1} 区間）</p>
                )}
                <div className="norden-move-months" role="status" aria-label="到着までの月数">
                  <span>到着まで</span>
                  <b>{months}</b>
                  <span>ヶ月</span>
                  <small>
                    {months}ヶ月後に輸送を完了。帰還に{returnMonths}ヶ月（帰還まで計{months + returnMonths}ヶ月）
                  </small>
                </div>
                <div className="norden-move-amounts">
                  <QuantityInput label="兵数" icon={<img src={iconTroops} alt="" />} unit="人" step={soldierStep} value={troops} max={soldierPool} onChange={setTroops} />
                  <QuantityInput label="物資" icon={<img src={iconSupplies} alt="" />} step={supplyStep} value={supplies} max={supplyPool} onChange={setSupplies} />
                </div>
                {prisoners.length > 0 && <PrisonerPicker prisoners={prisoners} picked={taken} onToggle={togglePrisoner} />}
                <label className="norden-move-solo is-disabled">
                  <input type="checkbox" checked={false} disabled readOnly />
                  <span>
                    <b>繰り返し輸送</b>
                    <small>兵と物資が指定の量になるのを待って、自動で輸送を続けます（準備中）</small>
                  </span>
                </label>
              </div>
            </section>
          </div>

          <footer className="norden-move-summary">
            <span className="norden-move-total">
              兵 <b>{troops.toLocaleString()}</b>・物資 <b>{supplies.toLocaleString()}</b>
              {prisoners.length > 0 && <>・捕虜 <b>{taken.length}</b>人</>}
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
