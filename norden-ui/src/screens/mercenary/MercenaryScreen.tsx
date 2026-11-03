import { useState, type ReactNode } from 'react'
import iconGold from '../../assets/ui/icons/icon-gold.webp'
import Button from '../../components/parts/Button'
import MercenaryCard from '../../components/parts/MercenaryCard'
import SectionFrame from '../../components/parts/SectionFrame'
import ConfirmDialog from '../../components/window/ConfirmDialog'
import WindowFrame from '../../components/window/WindowFrame'
import { biographyParts } from '../cityCommand/KnightProfileWindow'
import type { MercenaryContractView, MercenaryOfferView, MercenaryRank } from '../types'
import MercenaryProfile from './MercenaryProfile'
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
  /** Talks to a mercenary about a contract (the price is told there, and the proud turn the faction away there) */
  onHire: (id: string) => void
  /** Dismisses a mercenary (invoked after the confirmation dialog is accepted) */
  onDismiss: (id: string) => void
  onClose: () => void
  children?: ReactNode
}

type Tab = 'offers' | 'contracts'

const TABS: readonly { id: Tab; label: string }[] = [{ id: 'offers', label: '契約できる傭兵' }, { id: 'contracts', label: '契約中' }]

type Mercenary = MercenaryOfferView | MercenaryContractView

/** The ranks from the cheapest */
const RANKS: readonly MercenaryRank[] = ['D', 'C', 'B', 'A', 'S']

/** Those whose company or knight's name has the words, from the cheapest rank (in the order given within one) */
function arrange<T extends Mercenary>(items: readonly T[], query: string) {
  const words = query.trim().toLowerCase()
  return items.filter(({ company, knight }) => [company, knight.name].some(name => name.toLowerCase().includes(words)))
    .sort((a, b) => RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank))
}

/** A mercenary's knight on a card of the list, without their stats: the hiring talk shows them */
const cardKnight = ({ knight }: Mercenary) => ({ ...knight, stats: undefined })

const gold = (value: number) => value.toLocaleString()

function dismissMessage({ knight, company, soldiers, maxSoldiers }: MercenaryContractView) {
  return soldiers < maxSoldiers
    ? `${company}（${knight.name}）との契約を打ち切りますか？兵が減っているため傭兵たちの評判を落とし、回復するまで市場から姿を消します。契約金は戻りません。`
    : `${company}（${knight.name}）との契約を打ち切りますか？契約金は戻りません。`
}

/**
 * The chosen mercenary: who they are on parchment (without their abilities: the hiring talk shows them), the numbers
 * and 略歴 under it, and what can be done kept in sight at the bottom
 */
function Details({ mercenary, facts = [], children }: {
  mercenary: Mercenary
  facts?: readonly (readonly [label: string, value: string, price?: boolean])[]
  children: ReactNode
}) {
  const { knight, unavailableReason } = mercenary
  return (
    <div className="norden-mercenary-details">
      <div className="norden-window-scroll norden-mercenary-details-body">
        <MercenaryProfile mercenary={mercenary} />
        {facts.length > 0 && <dl className="norden-mercenary-facts">
          {facts.map(([label, value, price]) => <div key={label}><dt>{label}</dt><dd className={price ? 'is-price' : undefined}>{value}</dd></div>)}
        </dl>}
        <section className="norden-mercenary-biography">
          <h3>略歴</h3>
          {/* The names are not links here: their profile windows belong to the city screen */}
          <p>{knight.biography ? biographyParts(knight.biography).map(part => (typeof part === 'string' ? part : part.name)).join('') : '記録はありません。'}</p>
        </section>
      </div>
      <div className="norden-mercenary-action">
        {unavailableReason && <p className="norden-mercenary-reason" role="note">{unavailableReason}</p>}
        {children}
      </div>
    </div>
  )
}

/**
 * The mercenary screen (軍事＞傭兵): a full-screen window with the city it is opened on and the treasury along the top,
 * and two tabs: the mercenaries the city can reach, to talk to about a contract (by their rank: what they ask is told
 * in the talk), and those the faction hired, to dismiss (after a confirmation saying what it costs). Each tab lists
 * them on the left from the cheapest rank, searched by name, with the details of the one chosen on the right
 */
export default function MercenaryScreen({ cityName, gold: treasury, offers, contracts, onHire, onDismiss, onClose, children }: MercenaryScreenProps) {
  const [tab, setTab] = useState<Tab>('offers')
  const [picked, setPicked] = useState<string | null>(null)
  const [dismissing, setDismissing] = useState<MercenaryContractView | null>(null)
  const [query, setQuery] = useState('')
  const shownOffers = arrange(offers, query)
  const shownContracts = arrange(contracts, query)
  // With nothing chosen (or the chosen one gone or searched away), the first of the list
  const offer = shownOffers.find(item => item.knight.id === picked) ?? shownOffers[0]
  const contract = shownContracts.find(item => item.knight.id === picked) ?? shownContracts[0]
  const open = (next: Tab) => {
    setTab(next)
    setPicked(null)
  }

  return (
    <div className="norden-screen norden-mercenary">
      <WindowFrame className="norden-window-screen" title="傭兵" aria-label="傭兵" onClose={onClose}>
        <div className="norden-mercenary-layout">
          <header className="norden-mercenary-status">
            <span className="norden-mercenary-city"><b>{cityName}</b>で雇用</span>
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
              <div className="norden-mercenary-tools">
                <input type="search" className="norden-mercenary-search" aria-label="傭兵団・騎士名で検索" placeholder="傭兵団・騎士名で検索" value={query}
                  onChange={event => setQuery(event.target.value)}
                  onKeyDown={event => {
                    // Escape clears the words before it closes the screen (ScreenHost skips handled keys)
                    if (event.key !== 'Escape' || !query) return
                    event.preventDefault()
                    setQuery('')
                  }} />
              </div>
              <div className="norden-window-scroll norden-mercenary-scroll">
                {tab === 'offers' && (shownOffers.length === 0
                  ? <p className="norden-window-section-empty">{offers.length === 0 ? `${cityName}から契約できる傭兵はいません。` : '条件に合う傭兵はいません。'}</p>
                  : <ul className="norden-mercenary-list">
                    {shownOffers.map(item => (
                      <li key={item.knight.id}>
                        <MercenaryCard knight={cardKnight(item)} company={item.company} rank={item.rank} selected={item === offer} onSelect={() => setPicked(item.knight.id)} />
                      </li>
                    ))}
                  </ul>)}
                {tab === 'contracts' && (shownContracts.length === 0
                  ? <p className="norden-window-section-empty">{contracts.length === 0 ? '契約中の傭兵はいません。' : '条件に合う傭兵はいません。'}</p>
                  : <ul className="norden-mercenary-list">
                    {shownContracts.map(item => (
                      <li key={item.knight.id}>
                        <MercenaryCard knight={cardKnight(item)} company={item.company} rank={item.rank} prices={[{ label: '月額', value: item.monthly }]}
                          selected={item === contract} onSelect={() => setPicked(item.knight.id)} />
                      </li>
                    ))}
                  </ul>)}
              </div>
            </section>
            <section className="norden-window-section norden-mercenary-side" aria-label="傭兵の詳細">
              <SectionFrame />
              {tab === 'offers' && offer && (
                <Details mercenary={offer}>
                  <Button variant="primary" icon={<img src={iconGold} alt="" />} disabled={Boolean(offer.unavailableReason)} title={offer.unavailableReason}
                    aria-label={`${offer.company}と交渉`} onClick={() => onHire(offer.knight.id)}>交渉</Button>
                </Details>
              )}
              {tab === 'contracts' && contract && (
                <Details mercenary={contract} facts={[['月額', gold(contract.monthly), true], ['契約から', `${contract.months}ヶ月`]]}>
                  <Button disabled={Boolean(contract.unavailableReason)} title={contract.unavailableReason}
                    aria-label={`${contract.company}との契約を打ち切る`} onClick={() => setDismissing(contract)}>契約を打ち切る</Button>
                </Details>
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
