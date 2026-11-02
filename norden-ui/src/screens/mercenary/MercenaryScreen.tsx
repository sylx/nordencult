import { useState, type ReactNode } from 'react'
import Button from '../../components/parts/Button'
import KnightCard, { KnightStats } from '../../components/parts/KnightCard'
import SectionFrame from '../../components/parts/SectionFrame'
import ConfirmDialog from '../../components/window/ConfirmDialog'
import WindowFrame from '../../components/window/WindowFrame'
import type { MercenaryContractView, MercenaryOfferView } from '../types'
import '../screens.css'
import './MercenaryScreen.css'

export interface MercenaryScreenProps {
  /** The name of the city it is opened on: the mercenaries hired serve there */
  cityName: string
  /** Faction treasury gold */
  gold: number
  /** The mercenaries the city can reach */
  offers: readonly MercenaryOfferView[]
  /** The mercenaries the faction hired */
  contracts: readonly MercenaryContractView[]
  onHire: (id: string) => void
  /** Dismisses a mercenary (invoked after the confirmation dialog is accepted) */
  onDismiss: (id: string) => void
  onClose: () => void
  children?: ReactNode
}

type Tab = 'offers' | 'contracts'

const TABS: readonly { id: Tab; label: string }[] = [{ id: 'offers', label: '契約できる傭兵' }, { id: 'contracts', label: '契約中' }]

const gold = (value: number) => value.toLocaleString()
const strength = (soldiers: number, most: number) => `${gold(soldiers)} / ${gold(most)}`

function dismissMessage({ knight, company, soldiers, maxSoldiers }: MercenaryContractView) {
  return soldiers < maxSoldiers
    ? `${company}（${knight.name}）との契約を打ち切りますか？兵が減っているため傭兵たちの評判を落とし、回復するまで市場から姿を消します。契約金は戻りません。`
    : `${company}（${knight.name}）との契約を打ち切りますか？契約金は戻りません。`
}

/** A row of a list: the mercenary's face and name, under their company */
function Row({ knight, company, note, selected, onSelect }: {
  knight: MercenaryOfferView['knight']
  company: string
  note: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button type="button" className={`norden-mercenary-row ${selected ? 'is-selected' : ''}`} aria-label={`${company}（${knight.name}）`} aria-pressed={selected} onClick={onSelect}>
      <span className="norden-knight-face">{knight.portraitSrc
        ? <img src={knight.portraitSrc} alt="" />
        : knight.portrait ?? <span className="norden-knight-initial">{knight.name.slice(0, 1)}</span>}</span>
      <span className="norden-mercenary-row-body">
        <span className="norden-mercenary-row-company">{company}</span>
        <span className="norden-mercenary-row-note">{knight.name}・{note}</span>
      </span>
    </button>
  )
}

function Facts({ facts }: { facts: readonly (readonly [string, string])[] }) {
  return (
    <dl className="norden-mercenary-facts">
      {facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
  )
}

/**
 * The mercenary screen (軍事＞傭兵): a full-screen window with the city it is opened on and the treasury along the top,
 * and two tabs: the mercenaries the city can reach, to hire, and those the faction hired, to dismiss (after a
 * confirmation saying what it costs). Each tab lists them on the left, with the details of the one chosen on the right
 */
export default function MercenaryScreen({ cityName, gold: treasury, offers, contracts, onHire, onDismiss, onClose, children }: MercenaryScreenProps) {
  const [tab, setTab] = useState<Tab>('offers')
  const [picked, setPicked] = useState<string | null>(null)
  const [dismissing, setDismissing] = useState<MercenaryContractView | null>(null)
  // With nothing chosen (or the chosen one gone), the first of the list
  const offer = offers.find(item => item.knight.id === picked) ?? offers[0]
  const contract = contracts.find(item => item.knight.id === picked) ?? contracts[0]
  const open = (next: Tab) => {
    setTab(next)
    setPicked(null)
  }

  return (
    <div className="norden-screen norden-mercenary">
      <WindowFrame className="norden-window-screen" title="傭兵" aria-label="傭兵" onClose={onClose}>
        <div className="norden-mercenary-layout">
          <header className="norden-mercenary-status">
            <span>{cityName}で契約</span>
            <span className="norden-mercenary-gold">金 <b>{gold(treasury)}</b></span>
          </header>
          <div className="norden-mercenary-tabs" role="tablist" aria-label="傭兵の一覧">
            {TABS.map(({ id, label }) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={`norden-mercenary-tab ${tab === id ? 'is-active' : ''}`} onClick={() => open(id)}>
                {label}<span className="norden-window-section-count">{id === 'offers' ? offers.length : contracts.length}</span>
              </button>
            ))}
          </div>
          <div className="norden-window-screen-layout">
            <section className="norden-window-section norden-mercenary-list-section" aria-label={tab === 'offers' ? '契約できる傭兵' : '契約中の傭兵'}>
              <SectionFrame />
              <div className="norden-window-scroll norden-mercenary-scroll">
                {tab === 'offers' && (offers.length === 0
                  ? <p className="norden-window-section-empty">{cityName}から契約できる傭兵はいません。</p>
                  : <ul className="norden-mercenary-list">
                    {offers.map(item => (
                      <li key={item.knight.id}>
                        <Row knight={item.knight} company={item.company} note={item.cityName} selected={item === offer} onSelect={() => setPicked(item.knight.id)} />
                      </li>
                    ))}
                  </ul>)}
                {tab === 'contracts' && (contracts.length === 0
                  ? <p className="norden-window-section-empty">契約中の傭兵はいません。</p>
                  : <ul className="norden-mercenary-list">
                    {contracts.map(item => (
                      <li key={item.knight.id}>
                        <Row knight={item.knight} company={item.company} note={`${item.cityName}・兵 ${strength(item.soldiers, item.maxSoldiers)}`}
                          selected={item === contract} onSelect={() => setPicked(item.knight.id)} />
                      </li>
                    ))}
                  </ul>)}
              </div>
            </section>
            <section className="norden-window-section norden-mercenary-side" aria-label="傭兵の詳細">
              <SectionFrame />
              {tab === 'offers' && offer && (
                <div className="norden-mercenary-details">
                  <KnightCard knight={{ ...offer.knight, stats: undefined, mercenary: undefined }} compact />
                  {offer.knight.stats && <KnightStats stats={offer.knight.stats} />}
                  <Facts facts={[
                    ['傭兵団', offer.company], ['兵科', offer.unitType], ['兵数', strength(offer.soldiers, offer.maxSoldiers)],
                    ['契約金', gold(offer.fee)], ['月額', gold(offer.monthly)], ['いる都市', offer.cityName],
                  ]} />
                  {offer.unavailableReason && <p className="norden-mercenary-reason" role="note">{offer.unavailableReason}</p>}
                  <Button variant="primary" disabled={Boolean(offer.unavailableReason)} title={offer.unavailableReason} data-sound="develop"
                    aria-label={`${offer.company}と契約`} onClick={() => onHire(offer.knight.id)}>契約（金 {gold(offer.fee)}）</Button>
                </div>
              )}
              {tab === 'contracts' && contract && (
                <div className="norden-mercenary-details">
                  <KnightCard knight={{ ...contract.knight, stats: undefined, mercenary: undefined }} compact />
                  {contract.knight.stats && <KnightStats stats={contract.knight.stats} />}
                  <Facts facts={[
                    ['傭兵団', contract.company], ['いる都市', contract.cityName], ['兵数', strength(contract.soldiers, contract.maxSoldiers)],
                    ['月額', gold(contract.monthly)], ['契約から', `${contract.months}ヶ月`],
                  ]} />
                  {contract.unavailableReason && <p className="norden-mercenary-reason" role="note">{contract.unavailableReason}</p>}
                  <Button disabled={Boolean(contract.unavailableReason)} title={contract.unavailableReason}
                    aria-label={`${contract.company}との契約を打ち切る`} onClick={() => setDismissing(contract)}>契約を打ち切る</Button>
                </div>
              )}
              {!(tab === 'offers' ? offer : contract) && <p className="norden-window-section-empty">傭兵を選ぶと詳細が出ます。</p>}
            </section>
          </div>
          <footer className="norden-mercenary-footer">
            <Button onClick={onClose}>戻る</Button>
          </footer>
        </div>
      </WindowFrame>
      {dismissing && (
        <ConfirmDialog title="契約の打ち切り" message={dismissMessage(dismissing)} confirmLabel="打ち切る" cancelLabel="やめる"
          onConfirm={() => {
            onDismiss(dismissing.knight.id)
            setDismissing(null)
          }}
          onCancel={() => setDismissing(null)} />
      )}
      {children}
    </div>
  )
}
