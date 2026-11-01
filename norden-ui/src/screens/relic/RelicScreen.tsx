import { useState, type ReactNode } from 'react'
import { BuildingImage, ConstructionProgress, workLabel } from '../../components/parts/BuildingSlots'
import Button from '../../components/parts/Button'
import SectionFrame from '../../components/parts/SectionFrame'
import ConfirmDialog from '../../components/window/ConfirmDialog'
import WindowFrame from '../../components/window/WindowFrame'
import type { ConstructionView, RelicProductionView, RelicRarityView, RelicStatusView, RelicView } from '../types'
import '../screens.css'
import './RelicScreen.css'

export interface RelicScreenProps {
  /** The name of the city the screen is opened on, where a relic is repaired or produced */
  cityName: string
  /** What that city builds, repairs or produces now; null: nothing */
  construction?: ConstructionView | null
  /** Faction treasury gold */
  gold?: number
  /** The relics of the box, and those being repaired or produced */
  relics: readonly RelicView[]
  /** The relics the faction has the technology to produce */
  productions?: readonly RelicProductionView[]
  /** Dismantles a broken relic (invoked after the confirmation dialog is accepted) */
  onDismantle?: (id: string) => void
  /** Repairs a broken relic in the city */
  onRepair?: (id: string) => void
  /** Asks 法王府 to repair a broken relic */
  onPapalRepair?: (id: string) => void
  /** Produces a relic in the city */
  onProduce?: (relicId: string) => void
  onClose: () => void
  children?: ReactNode
}

const STATUS_LABELS: Readonly<Record<RelicStatusView, string>> = {
  broken: '壊れた', repairing: '修復中', producing: '生産中', papalRepair: '法王府に依頼中', repaired: '修復済み',
}

/** Which of the list is chosen: a relic of the box, or one to produce */
type Selection = { list: 'box' | 'production'; id: string }

const statusLabel = (relic: RelicView) => (relic.cityName ? `${STATUS_LABELS[relic.status]}（${relic.cityName}）` : STATUS_LABELS[relic.status])

function Rarity({ rarity }: { rarity: RelicRarityView }) {
  return <span className={`norden-relic-rarity is-${rarity}`} aria-label={`レアリティ ${rarity}`}>{rarity}</span>
}

function RelicRow({ relic, label, status, selected, onSelect }: {
  relic: Pick<RelicView, 'id' | 'name' | 'image' | 'rarity'>
  label: string
  status: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button type="button" className={`norden-relic-row ${status} ${selected ? 'is-selected' : ''}`} aria-label={`${relic.name}（${label}）`} aria-pressed={selected} onClick={onSelect}>
      <BuildingImage building={relic} className="norden-relic-row-image" />
      <span className="norden-relic-row-body">
        <span className="norden-relic-row-name">{relic.name}</span>
        <span className="norden-relic-row-status">{label}</span>
      </span>
      <Rarity rarity={relic.rarity} />
    </button>
  )
}

const cost = (supplies: number, gold: number) => `物資 ${supplies.toLocaleString()}・金 ${gold.toLocaleString()}`

const workCost = (supplies: number, gold: number, turns: number | null | undefined) =>
  `${cost(supplies, gold)}${turns === undefined ? '' : turns === null ? '・完成見込みなし' : `・約${turns}ターン`}`

/** A button of the details, what it takes beside it, and why it cannot be pressed under it */
function Action({ label, name, needs, reason, onClick, sound }: { label: string; name: string; needs?: string; reason?: string; onClick?: () => void; sound?: string }) {
  return (
    <div className="norden-relic-action">
      <div className="norden-relic-action-row">
        <Button variant="primary" disabled={Boolean(reason)} title={reason} aria-label={name} data-sound={sound} onClick={onClick}>{label}</Button>
        {needs && <span className="norden-relic-action-needs">{needs}</span>}
      </div>
      {reason && <p className="norden-relic-action-reason" role="note">{reason}</p>}
    </div>
  )
}

function Details({ item, children }: { item: Pick<RelicView, 'id' | 'name' | 'image' | 'rarity' | 'useLabel' | 'description'>; children: ReactNode }) {
  return (
    <div className="norden-relic-details">
      <BuildingImage building={item} className="norden-relic-details-image" />
      <h3 className="norden-relic-details-name">{item.name}<Rarity rarity={item.rarity} /></h3>
      <p className="norden-relic-details-use">使い道: {item.useLabel}</p>
      {item.description && <p className="norden-relic-details-description">{item.description}</p>}
      {children}
    </div>
  )
}

/**
 * The relic screen (研究＞遺物): a full-screen window with, along the top, what the city it is opened on is working
 * on and the treasury; on the left the faction's box (each relic's picture and name, by how it stands) and the
 * relics it can produce; on the right the details of the one chosen, with what can be done with it. A broken relic
 * can be dismantled (after a confirmation: it cannot be undone), repaired in the city, or sent to 法王府, each saying
 * why it cannot be when it cannot; 法王府に献上 is shown but does not work yet
 */
export default function RelicScreen({
  cityName, construction = null, gold, relics, productions = [], onDismantle, onRepair, onPapalRepair, onProduce, onClose, children,
}: RelicScreenProps) {
  const [selection, setSelection] = useState<Selection | null>(null)
  const [dismantling, setDismantling] = useState<RelicView | null>(null)
  const chosenRelic = selection?.list === 'box' ? relics.find(relic => relic.id === selection.id) : undefined
  const chosenProduction = selection?.list === 'production' ? productions.find(relic => relic.id === selection.id) : undefined
  // With nothing chosen (or the chosen one gone), the first of the lists
  const relic = chosenRelic ?? (chosenProduction ? undefined : relics[0])
  const production = chosenProduction ?? (relic ? undefined : productions[0])

  return (
    <div className="norden-screen norden-relic">
      <WindowFrame className="norden-window-screen" title="遺物" aria-label="遺物" onClose={onClose}>
        <div className="norden-relic-layout">
          <header className="norden-relic-status">
            <span className="norden-relic-city">
              {cityName}の建設の枠: {construction
                ? <b>{construction.building.name}の{workLabel(construction)}{construction.paused ? '（中断中）' : ''}</b>
                : <b>空き</b>}
            </span>
            {construction && (
              <ConstructionProgress invested={construction.invested} required={construction.required}
                turnsLeft={construction.paused ? undefined : construction.turnsLeft} />
            )}
            {gold !== undefined && <span className="norden-relic-gold">金 <b>{gold.toLocaleString()}</b></span>}
          </header>
          <div className="norden-window-screen-layout">
            <section className="norden-window-section norden-relic-lists" aria-label="遺物の一覧">
              <SectionFrame />
              <div className="norden-window-scroll norden-relic-lists-scroll">
                <header className="norden-window-section-header">
                  <h2 className="norden-window-section-title">アイテムボックス<span className="norden-window-section-count">{relics.length}</span></h2>
                </header>
                {relics.length === 0
                  ? <p className="norden-window-section-empty">遺物はありません。</p>
                  : (
                    <ul className="norden-relic-list" aria-label="アイテムボックス">
                      {relics.map(item => (
                        <li key={item.id}>
                          <RelicRow relic={item} label={statusLabel(item)} status={`is-${item.status}`} selected={item === relic}
                            onSelect={() => setSelection({ list: 'box', id: item.id })} />
                        </li>
                      ))}
                    </ul>
                  )}
                {productions.length > 0 && (
                  <>
                    <header className="norden-window-section-header">
                      <h2 className="norden-window-section-title">生産できる遺物</h2>
                    </header>
                    <ul className="norden-relic-list" aria-label="生産できる遺物">
                      {productions.map(item => (
                        <li key={item.id}>
                          <RelicRow relic={item} label={cost(item.supplies, item.gold)} status="is-production" selected={item === production}
                            onSelect={() => setSelection({ list: 'production', id: item.id })} />
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </section>
            <section className="norden-window-section norden-relic-side" aria-label="遺物の詳細">
              <SectionFrame />
              {relic && (
                <Details item={relic}>
                  <span className={`norden-relic-details-status is-${relic.status}`}>{statusLabel(relic)}</span>
                  {relic.status === 'repaired' && <p className="norden-relic-details-note">使い道はまだありません</p>}
                  {relic.status === 'repairing' && <p className="norden-relic-details-note">{relic.cityName}で修復しています。内政画面で中断・中止できます</p>}
                  {relic.status === 'producing' && <p className="norden-relic-details-note">{relic.cityName}で生産しています。内政画面で中断・中止できます</p>}
                  {relic.status === 'papalRepair' && <p className="norden-relic-details-note">次のターンの初めに修復済みになります。取り消せません</p>}
                  {relic.status === 'broken' && relic.dismantle && (
                    <Action label={`解体（研究 +${relic.dismantle.points.toLocaleString()}）`} name={`${relic.name}を解体`}
                      reason={relic.dismantle.unavailableReason} onClick={() => setDismantling(relic)} />
                  )}
                  {relic.status === 'broken' && relic.repair && (
                    <Action label={`${cityName}で修復`} name={`${relic.name}を${cityName}で修復`}
                      needs={workCost(relic.repair.supplies, relic.repair.gold, relic.repair.turns)}
                      reason={relic.repair.unavailableReason} sound="develop" onClick={() => onRepair?.(relic.id)} />
                  )}
                  {relic.status === 'broken' && relic.papalRepair && (
                    <Action label="法王府に依頼" name={`${relic.name}を法王府に依頼`} needs={`金 ${relic.papalRepair.gold.toLocaleString()}`}
                      reason={relic.papalRepair.unavailableReason} onClick={() => onPapalRepair?.(relic.id)} />
                  )}
                  {(relic.status === 'broken' || relic.status === 'repaired') && (
                    <Action label="法王府に献上" name={`${relic.name}を法王府に献上`} reason="法王府への献上はまだできません" />
                  )}
                </Details>
              )}
              {production && (
                <Details item={production}>
                  <Action label={`${cityName}で生産`} name={`${production.name}を${cityName}で生産`}
                    needs={workCost(production.supplies, production.gold, production.turns)}
                    reason={production.unavailableReason} sound="develop" onClick={() => onProduce?.(production.id)} />
                </Details>
              )}
              {!relic && !production && <p className="norden-window-section-empty">遺物はありません。</p>}
            </section>
          </div>
          <footer className="norden-relic-footer">
            <Button onClick={onClose}>戻る</Button>
          </footer>
        </div>
      </WindowFrame>
      {dismantling && (
        <ConfirmDialog
          title="遺物の解体"
          message={`「${dismantling.name}」を解体しますか？研究ポイント +${dismantling.dismantle?.points.toLocaleString()} を得ますが、遺物は失われ、取り消せません。`}
          confirmLabel="解体する"
          cancelLabel="やめる"
          onConfirm={() => {
            const { id } = dismantling
            setDismantling(null)
            onDismantle?.(id)
          }}
          onCancel={() => setDismantling(null)}
        />
      )}
      {children}
    </div>
  )
}
