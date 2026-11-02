import { useState, type ReactNode } from 'react'
import iconGold from '../../assets/ui/icons/icon-gold.webp'
import Button from '../../components/parts/Button'
import Card from '../../components/parts/Card'
import { KnightStats } from '../../components/parts/KnightCard'
import MercenaryCard from '../../components/parts/MercenaryCard'
import SectionFrame from '../../components/parts/SectionFrame'
import ConfirmDialog from '../../components/window/ConfirmDialog'
import WindowFrame from '../../components/window/WindowFrame'
import { biographyParts } from '../cityCommand/KnightProfileWindow'
import { ABILITIES, ABILITY_LABELS, KnightFace, knightAbility, knightAbilityStats } from '../domestic/DomesticOfficers'
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

type Mercenary = MercenaryOfferView | MercenaryContractView
type Ability = (typeof ABILITIES)[number]
/** 価格 is what they cost to hire, or for those hired what they cost each month */
type Sort = Ability | 'price' | 'unitType'

const SORTS: readonly { id: Sort; label: string }[] = [
  { id: 'price', label: '価格' }, ...ABILITIES.map(id => ({ id, label: ABILITY_LABELS[id] })), { id: 'unitType', label: '兵科' },
]

function compare(sort: Sort, a: Mercenary, b: Mercenary) {
  if (sort === 'unitType') return a.unitType.localeCompare(b.unitType, 'ja')
  if (sort === 'price') return ('fee' in a ? a.fee : a.monthly) - ('fee' in b ? b.fee : b.monthly)
  return (knightAbility(a.knight, sort) ?? 0) - (knightAbility(b.knight, sort) ?? 0)
}

/** Those whose company or knight's name has the words, in the order chosen */
function arrange<T extends Mercenary>(items: readonly T[], query: string, sort: Sort, descending: boolean) {
  const words = query.trim().toLowerCase()
  return items.filter(({ company, knight }) => [company, knight.name].some(name => name.toLowerCase().includes(words)))
    .sort((a, b) => (descending ? -1 : 1) * compare(sort, a, b))
}

const gold = (value: number) => value.toLocaleString()
const strength = (soldiers: number, most: number) => `${gold(soldiers)} / ${gold(most)}`

function dismissMessage({ knight, company, soldiers, maxSoldiers }: MercenaryContractView) {
  return soldiers < maxSoldiers
    ? `${company}（${knight.name}）との契約を打ち切りますか？兵が減っているため傭兵たちの評判を落とし、回復するまで市場から姿を消します。契約金は戻りません。`
    : `${company}（${knight.name}）との契約を打ち切りますか？契約金は戻りません。`
}

/** The chosen mercenary: who they are on parchment, the numbers and 略歴 under it, and what can be done kept in sight at the bottom */
function Details({ mercenary: { knight, company, unitType, unitImage, soldiers, maxSoldiers, unavailableReason }, facts, children }: {
  mercenary: Mercenary
  facts: readonly (readonly [label: string, value: string, price?: boolean])[]
  children: ReactNode
}) {
  const figure = knight.imageSrc ? <img src={knight.imageSrc} alt="" /> : knight.image
  return (
    <div className="norden-mercenary-details">
      <div className="norden-window-scroll norden-mercenary-details-body">
        <Card className="norden-mercenary-profile">
          {figure
            ? <div className="norden-mercenary-figure" role="img" aria-label={`${knight.name}の立ち絵`}>{figure}</div>
            : <span className="norden-knight-face"><KnightFace knight={knight} /></span>}
          <div className="norden-mercenary-summary">
            <div>
              <h3 className="norden-mercenary-company">{company}</h3>
              <p className="norden-mercenary-name">{knight.name}{knight.subtitle && <span>{knight.subtitle}</span>}</p>
            </div>
            <KnightStats stats={knightAbilityStats(knight)} />
            <div className="norden-mercenary-unit">
              {unitImage && <img src={unitImage} alt="" />}
              <div className="norden-mercenary-unit-facts">
                <span><span className="norden-mercenary-unit-label">兵科</span>{unitType}</span>
                <span><span className="norden-mercenary-unit-label">兵数</span>{strength(soldiers, maxSoldiers)}</span>
              </div>
            </div>
          </div>
        </Card>
        <dl className="norden-mercenary-facts">
          {facts.map(([label, value, price]) => <div key={label}><dt>{label}</dt><dd className={price ? 'is-price' : undefined}>{value}</dd></div>)}
        </dl>
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
 * and two tabs: the mercenaries the city can reach, to hire, and those the faction hired, to dismiss (after a
 * confirmation saying what it costs). Each tab lists them on the left, searched and sorted as chosen, with the details
 * of the one chosen on the right
 */
export default function MercenaryScreen({ cityName, gold: treasury, offers, contracts, onHire, onDismiss, onClose, children }: MercenaryScreenProps) {
  const [tab, setTab] = useState<Tab>('offers')
  const [picked, setPicked] = useState<string | null>(null)
  const [dismissing, setDismissing] = useState<MercenaryContractView | null>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('price')
  const [descending, setDescending] = useState(false)
  const shownOffers = arrange(offers, query, sort, descending)
  const shownContracts = arrange(contracts, query, sort, descending)
  // With nothing chosen (or the chosen one gone or searched away), the first of the list
  const offer = shownOffers.find(item => item.knight.id === picked) ?? shownOffers[0]
  const contract = shownContracts.find(item => item.knight.id === picked) ?? shownContracts[0]
  const open = (next: Tab) => {
    setTab(next)
    setPicked(null)
  }
  const sortBy = (next: Sort) => {
    setSort(next)
    // The best first: the highest ability, the lowest price
    setDescending(next !== 'price' && next !== 'unitType')
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
                <label className="norden-mercenary-sort">並び順
                  <select value={sort} onChange={event => sortBy(event.target.value as Sort)}>
                    {SORTS.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
                  </select>
                </label>
                <button type="button" className="norden-mercenary-order" onClick={() => setDescending(value => !value)}>{descending ? '▼ 降順' : '▲ 昇順'}</button>
              </div>
              <div className="norden-window-scroll norden-mercenary-scroll">
                {tab === 'offers' && (shownOffers.length === 0
                  ? <p className="norden-window-section-empty">{offers.length === 0 ? `${cityName}から契約できる傭兵はいません。` : '条件に合う傭兵はいません。'}</p>
                  : <ul className="norden-mercenary-list">
                    {shownOffers.map(item => (
                      <li key={item.knight.id}>
                        <MercenaryCard knight={{ ...item.knight, stats: knightAbilityStats(item.knight) }} 
                          company={item.company}
                          prices={[{ label: '契約金', value: item.fee }, { label: '月額', value: item.monthly }]} selected={item === offer} onSelect={() => setPicked(item.knight.id)} />
                      </li>
                    ))}
                  </ul>)}
                {tab === 'contracts' && (shownContracts.length === 0
                  ? <p className="norden-window-section-empty">{contracts.length === 0 ? '契約中の傭兵はいません。' : '条件に合う傭兵はいません。'}</p>
                  : <ul className="norden-mercenary-list">
                    {shownContracts.map(item => (
                      <li key={item.knight.id}>
                        <MercenaryCard knight={{ ...item.knight, stats: knightAbilityStats(item.knight) }} company={item.company}
                          prices={[{ label: '月額', value: item.monthly }]} selected={item === contract} onSelect={() => setPicked(item.knight.id)} />
                      </li>
                    ))}
                  </ul>)}
              </div>
            </section>
            <section className="norden-window-section norden-mercenary-side" aria-label="傭兵の詳細">
              <SectionFrame />
              {tab === 'offers' && offer && (
                <Details mercenary={offer} facts={[
                  ['契約金', gold(offer.fee), true], ['月額', gold(offer.monthly), true], ['所在地', offer.cityName],
                ]}>
                  <Button variant="primary" icon={<img src={iconGold} alt="" />} disabled={Boolean(offer.unavailableReason)} title={offer.unavailableReason} data-sound="coins"
                    aria-label={`${offer.company}と契約`} onClick={() => onHire(offer.knight.id)}>契約（金 {gold(offer.fee)}）</Button>
                </Details>
              )}
              {tab === 'contracts' && contract && (
                <Details mercenary={contract} facts={[
                  ['月額', gold(contract.monthly), true], ['契約から', `${contract.months}ヶ月`], ['所在地', contract.cityName],
                ]}>
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
