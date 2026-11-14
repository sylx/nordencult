import { useState, type ReactNode } from 'react'
import { BuildingImage, ConstructionProgress, workLabel } from '../../components/parts/BuildingSlots'
import Button from '../../components/parts/Button'
import ImageFrame from '../../components/parts/ImageFrame'
import RelicRow, { RelicRarity } from '../../components/parts/RelicRow'
import SectionFrame from '../../components/parts/SectionFrame'
import KnightPicker from '../../components/picker/KnightPicker'
import PickerDialog from '../../components/picker/PickerDialog'
import RelicPicker from '../../components/picker/RelicPicker'
import ConfirmDialog from '../../components/window/ConfirmDialog'
import WindowFrame from '../../components/window/WindowFrame'
import type { ConstructionView, EquipCandidateView, RelicProductionView, RelicStatusView, RelicView } from '../types'
import '../screens.css'
import '../details.css'
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
  /** The knights an equipment relic of the box (RelicView.equip) can be put on, those who cannot wear it with why */
  equipCandidates?: (id: string) => readonly EquipCandidateView[]
  /** Puts the relic on the knight's slot (the one there goes back into the box; one another knight wears comes off them) */
  onEquip?: (id: string, knightId: string, slot: number) => void
  /** Takes the relic off the knight wearing it */
  onUnequip?: (id: string) => void
  /** Uses up a summon relic (RelicView.summon) to summon its monster in the city; the host then names it (SummonDialog) */
  onSummon?: (id: string) => void
  onClose: () => void
  children?: ReactNode
}

const STATUS_LABELS: Readonly<Record<RelicStatusView, string>> = {
  broken: '壊れた', repairing: '修復中', producing: '生産中', papalRepair: '法王府に依頼中', repaired: '修復済み', equipped: '装備中', building: '建設中',
}

/** Which of the list is chosen: a relic of the box, or one to produce */
type Selection = { list: 'box' | 'production'; id: string }

const statusLabel = (relic: RelicView) => {
  const where = relic.status === 'equipped' ? relic.wearerName : relic.cityName
  return where ? `${STATUS_LABELS[relic.status]}（${where}）` : STATUS_LABELS[relic.status]
}

/** A knight's slots in a line, e.g. 装備: ライフル / 空き */
const slotsNote = (candidate: EquipCandidateView) => `装備: ${candidate.slots.map(slot => slot.relic?.name ?? '空き').join(' / ')}`

/** Putting a relic on a knight: choosing the knight, then (their slots all full) the slot to swap */
type Equipping = { id: string; knightId: string | null; swapping: boolean; slot: number | null }

const cost = (supplies: number, gold: number) => `物資 ${supplies.toLocaleString()}・金 ${gold.toLocaleString()}`

const workCost = (supplies: number, gold: number, turns: number | null | undefined) =>
  `${cost(supplies, gold)}${turns === undefined ? '' : turns === null ? '・完成見込みなし' : `・約${turns}ターン`}`

/** A compact action card keeps its cost and availability beside its own control. */
function Action({ label, name, needs, reason, onClick, sound, primary = false }: { label: string; name: string; needs?: string; reason?: string; onClick?: () => void; sound?: string; primary?: boolean }) {
  return (
    <div className="norden-relic-action">
      <div className="norden-relic-action-row">
        <Button variant={primary ? 'primary' : 'normal'} size="small" disabled={Boolean(reason)} title={reason} aria-label={name} data-sound={sound} onClick={onClick}>{label}</Button>
        {needs && <span className="norden-relic-action-needs">{needs}</span>}
      </div>
      {reason && <p className="norden-relic-action-reason" role="note">{reason}</p>}
    </div>
  )
}

function Details({ item, status, children }: { item: Pick<RelicView, 'id' | 'name' | 'image' | 'rarity' | 'useLabel' | 'description' | 'effects'>; status?: ReactNode; children: ReactNode }) {
  return (
    <div className="norden-relic-details norden-details">
      <header className="norden-details-hero">
        <ImageFrame className="norden-details-portrait">
          <BuildingImage building={item} className="norden-relic-details-image" />
        </ImageFrame>
        <div className="norden-details-heading">
          <p className="norden-details-label">遺物</p>
          <h3 className="norden-relic-details-name">{item.name}</h3>
          <div className="norden-details-badges"><RelicRarity rarity={item.rarity} />{status}</div>
          <p className="norden-relic-details-use">使い道: {item.useLabel}</p>
        </div>
      </header>
      {item.description && <p className="norden-relic-details-description">{item.description}</p>}
      {item.effects && item.effects.length > 0 && (
        <ul className="norden-relic-details-effects" aria-label="効果">
          {item.effects.map(effect => <li key={effect}>{effect}</li>)}
        </ul>
      )}
      {children}
    </div>
  )
}

/**
 * The relic screen (研究＞遺物): a full-screen window with, along the top, what the city it is opened on is working
 * on and the treasury; on the left the faction's box (each relic's picture and name, by how it stands) and the
 * relics it can produce; on the right the details of the one chosen, with what can be done with it. A broken relic
 * can be dismantled (after a confirmation: it cannot be undone), repaired in the city, or sent to 法王府, each saying
 * why it cannot be when it cannot; 法王府に献上 is shown but does not work yet. An equipment relic repaired is put on a knight
 * (装備させる: the knights in a KnightPicker, then the slot to swap when theirs are full) or taken off the one wearing it (外す)
 */
export default function RelicScreen({
  cityName, construction = null, gold, relics, productions = [], onDismantle, onRepair, onPapalRepair, onProduce, equipCandidates, onEquip, onUnequip, onSummon, onClose, children,
}: RelicScreenProps) {
  const [selection, setSelection] = useState<Selection | null>(null)
  const [dismantling, setDismantling] = useState<RelicView | null>(null)
  const [equipping, setEquipping] = useState<Equipping | null>(null)
  const equippingRelic = equipping && relics.find(item => item.id === equipping.id)
  const candidates = equippingRelic ? equipCandidates?.(equippingRelic.id) ?? [] : []
  const candidate = equipping?.knightId ? candidates.find(c => c.knight.id === equipping.knightId) : undefined
  /** The knight chosen: into their first slot it can go in that is empty, or else choose the slot to swap */
  const equipKnight = () => {
    if (!equipping || !candidate) return
    const free = candidate.slots.findIndex(slot => !slot.relic && !slot.unavailableReason)
    if (free < 0) return setEquipping({ ...equipping, swapping: true, slot: null })
    setEquipping(null)
    onEquip?.(equipping.id, candidate.knight.id, free)
  }
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
                <Details item={relic} status={<span className={`norden-relic-details-status is-${relic.status}`}>{statusLabel(relic)}</span>}>
                  {relic.status === 'repaired' && !relic.equip && !relic.summon && (
                    <p className="norden-relic-details-note">
                      {relic.buildingName ? `内政画面で${relic.buildingName}を建てるのに使えます。建て終わると遺物は無くなります` : '使い道はまだありません'}
                    </p>
                  )}
                  {relic.status === 'building' && (
                    <p className="norden-relic-details-note">
                      {relic.cityName}で{relic.buildingName ?? '施設'}の建設に使っています。建て終わると無くなります。内政画面で中止すると箱に戻ります
                    </p>
                  )}
                  {relic.status === 'repairing' && <p className="norden-relic-details-note">{relic.cityName}で修復しています。内政画面で中断・中止できます</p>}
                  {relic.status === 'producing' && <p className="norden-relic-details-note">{relic.cityName}で生産しています。内政画面で中断・中止できます</p>}
                  {relic.status === 'papalRepair' && <p className="norden-relic-details-note">次のターンの初めに修復済みになります。取り消せません</p>}
                  {(relic.status === 'broken' || relic.status === 'repaired' || relic.status === 'equipped') && (
                    <div className="norden-details-section">
                      <h4 className="norden-details-section-title">遺物の操作</h4>
                      <div className="norden-relic-actions">
                        {relic.status === 'broken' && relic.repair && (
                          <Action primary label={`${cityName}で修復`} name={`${relic.name}を${cityName}で修復`}
                            needs={workCost(relic.repair.supplies, relic.repair.gold, relic.repair.turns)}
                            reason={relic.repair.unavailableReason} sound="develop" onClick={() => onRepair?.(relic.id)} />
                        )}
                        {relic.status === 'broken' && relic.papalRepair && (
                          <Action label="法王府に依頼" name={`${relic.name}を法王府に依頼`} needs={relic.papalRepair.gold === undefined ? undefined : `金 ${relic.papalRepair.gold.toLocaleString()}`}
                            reason={relic.papalRepair.unavailableReason} onClick={() => onPapalRepair?.(relic.id)} />
                        )}
                        {relic.status === 'broken' && relic.dismantle && (
                          <Action label="解体する" name={`${relic.name}を解体`} needs={`研究ポイント +${relic.dismantle.points.toLocaleString()}`}
                            reason={relic.dismantle.unavailableReason} onClick={() => setDismantling(relic)} />
                        )}
                        {relic.summon && (
                          <Action primary label={`${cityName}で召喚`} name={`${relic.name}を${cityName}で召喚`} needs="遺物は無くなります"
                            reason={relic.summon.unavailableReason} sound="develop" onClick={() => onSummon?.(relic.id)} />
                        )}
                        {relic.equip && (
                          <Action primary label={relic.status === 'equipped' ? '別の騎士に装備させる' : '装備させる'} name={`${relic.name}を装備させる`}
                            reason={relic.equip.unavailableReason} onClick={() => setEquipping({ id: relic.id, knightId: null, swapping: false, slot: null })} />
                        )}
                        {relic.status === 'equipped' && relic.unequip && (
                          <Action label="外す" name={`${relic.name}を外す`} needs={relic.wearerName && `${relic.wearerName}から外して箱に戻す`}
                            reason={relic.unequip.unavailableReason} onClick={() => onUnequip?.(relic.id)} />
                        )}
                        <Action label="法王府に献上" name={`${relic.name}を法王府に献上`} reason="法王府への献上はまだできません" />
                      </div>
                    </div>
                  )}
                </Details>
              )}
              {production && (
                <Details item={production} status={<span className="norden-relic-details-status">生産</span>}>
                  <div className="norden-details-section">
                    <h4 className="norden-details-section-title">遺物の生産</h4>
                    <div className="norden-relic-actions">
                      <Action primary label={`${cityName}で生産`} name={`${production.name}を${cityName}で生産`}
                        needs={workCost(production.supplies, production.gold, production.turns)}
                        reason={production.unavailableReason} sound="develop" onClick={() => onProduce?.(production.id)} />
                    </div>
                  </div>
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
      {equipping && equippingRelic && !equipping.swapping && (
        <PickerDialog title={`${equippingRelic.name}を装備させる`} message="装備させる騎士を選んでください。"
          confirmDisabled={!candidate || Boolean(candidate.unavailableReason)} onConfirm={equipKnight} onCancel={() => setEquipping(null)}>
          <KnightPicker label="装備させる騎士" emptyText="装備させられる騎士はいません。"
            items={candidates.map(c => ({ knight: c.knight, note: slotsNote(c), disabledReason: c.unavailableReason }))}
            selected={equipping.knightId ? [equipping.knightId] : []}
            onChange={ids => setEquipping({ ...equipping, knightId: ids[0] ?? null })} />
        </PickerDialog>
      )}
      {equipping && equippingRelic && equipping.swapping && candidate && (
        <PickerDialog title={`${candidate.knight.name}の装備を入れ替える`} className="is-narrow"
          message={`装備の枠が埋まっています。${equippingRelic.name}と入れ替える遺物を選んでください（箱に戻ります）。`}
          confirmLabel="入れ替える" confirmDisabled={equipping.slot === null}
          onConfirm={() => {
            setEquipping(null)
            onEquip?.(equipping.id, candidate.knight.id, equipping.slot!)
          }}
          onCancel={() => setEquipping({ ...equipping, swapping: false })}>
          <RelicPicker label="入れ替える遺物" selectedId={equipping.slot === null ? null : `${equipping.slot}`}
            items={candidate.slots.flatMap((slot, index) => (slot.relic
              ? [{ ...slot.relic, id: `${index}`, label: `枠${index + 1}`, disabledReason: slot.unavailableReason }] : []))}
            onSelect={id => setEquipping({ ...equipping, slot: Number(id) })} />
        </PickerDialog>
      )}
      {children}
    </div>
  )
}
