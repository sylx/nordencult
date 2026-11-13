import type { CSSProperties, ReactNode } from 'react'
import InfoWindowWithTabs from '../../components/window/InfoWindowWithTabs'
import type { InfoWindowWithTabsProps, TabInfo } from '../../components/window/InfoWindowWithTabs'
import KnightCard from '../../components/parts/KnightCard'
import StatBar from '../../components/parts/StatBar'
import BuildingSlots, { RelicWorkSlot, isRelicWork } from '../../components/parts/BuildingSlots'
import Button from '../../components/parts/Button'
import FactionMark from '../../components/parts/FactionMark'
import { knightAbilityStats } from '../domestic/DomesticOfficers'
import KnightProfileWindow from './KnightProfileWindow'
import { useBrowseHistory } from '../../hooks/useBrowseHistory'
import iconAgriculture from '../../assets/ui/icons/icon-agriculture.svg'
import iconCommerce from '../../assets/ui/icons/icon-commerce.webp'
import iconProduction from '../../assets/ui/icons/icon-production.webp'
import iconMorale from '../../assets/ui/icons/icon-military.webp'
import iconTroops from '../../assets/ui/icons/icon-troops.webp'
import iconTraining from '../../assets/ui/icons/icon-training.webp'
import iconSupplies from '../../assets/ui/icons/icon-supplies.webp'
import iconCity from '../../assets/ui/icons/icon_home.webp'
import iconKnights from '../../assets/ui/icons/icon_people.webp'
import iconStat from '../../assets/ui/icons/icon_stat.webp'
import type { CityHistoryView, CityStatView, CityView, EquipmentActions, KnightView } from '../types'
import './CityInfoWindow.css'

export interface CityInfoWindowProps extends Omit<InfoWindowWithTabsProps, 'tabs' | 'title'> {
  city: CityView
  /** Opens domestic affairs; provided only for a city the player can manage. */
  onOpenDomestic?: () => void
  /** Finds any knight by id for the profile window (e.g. one a 略歴 names); only the city's knights are found when omitted */
  knightOf?: (id: string) => KnightView | undefined
  /** Changing the equipment of the knight shown in the profile window. Omitted: their slots are only shown */
  equipment?: EquipmentActions
  /** Where the profile window opens beside. Omitted: the city window's `x` and `y` */
  profileAnchor?: { x: number; y: number }
  /** Offset of the profile window from where it opens, in px */
  profilePosition?: { x: number; y: number }
  onProfilePositionChange?: (position: { x: number; y: number }) => void
}

/**
 * A city's information, knights and growth in a tabbed window; past its maximum size the panels scroll.
 * 詳細 on a knight opens their profile beside it, with back/forward through the knights opened since.
 */
export default function CityInfoWindow({
  city, onOpenDomestic, knightOf, equipment, profileAnchor, profilePosition, onProfilePositionChange, maxWidth = 544, maxHeight = 760, ...windowProps
}: CityInfoWindowProps) {
  const profile = useBrowseHistory<string>()
  const anchor = profileAnchor ?? { x: windowProps.x ?? 0, y: windowProps.y ?? 0 }
  const findKnight = (id: string) => knightOf?.(id) ?? city.knights?.find(knight => knight.id === id)
  const knight = profile.current === undefined ? undefined : findKnight(profile.current)
  return <>
    <InfoWindowWithTabs {...windowProps} maxWidth={maxWidth} maxHeight={maxHeight} title={`${city.faction?.name ?? ''} ${city.name}`.trim()}
      tabs={createCityInfoTabs(city, { onShowKnight: profile.show, onOpenDomestic })} />
    {knight && <KnightProfileWindow knight={knight} knightOf={findKnight} onSelectKnight={profile.show} equipment={equipment}
      onBack={profile.back} onForward={profile.forward} backDisabled={!profile.canBack} forwardDisabled={!profile.canForward}
      onClose={profile.close} position={profilePosition} onPositionChange={onProfilePositionChange}
      style={{
        '--norden-knight-profile-x': `${anchor.x + maxWidth + 16}px`,
        '--norden-knight-profile-y': `${anchor.y}px`,
      } as CSSProperties} />}
  </>
}

export interface CityInfoTabOptions {
  /** Opens domestic affairs when a building or empty slot is clicked; omitted for other factions' cities. */
  onOpenDomestic?: () => void
  /** 詳細 on a knight; the button is disabled when omitted */
  onShowKnight?: (id: string) => void
}

/** Shared city panels for the game window and component catalog. */
export function createCityInfoTabs(city: CityView, { onShowKnight, onOpenDomestic }: CityInfoTabOptions = {}): [TabInfo, TabInfo, TabInfo] {
  return [
    { id: 'city', name: '都市情報', icon: iconCity, content: <CityInfo city={city} onOpenDomestic={onOpenDomestic} /> },
    {
      id: 'knights', name: '騎士', icon: iconKnights,
      content: <CityKnights city={city} onShowKnight={onShowKnight} />,
    },
    // For now the 推移 tab shows the domestic log; it will chart the city's growth
    { id: 'growth', name: '推移', icon: iconStat, content: <CityHistory history={city.history ?? []} /> },
  ]
}

const statKinds = { 農業: 'agriculture', 商業: 'commerce', 生産: 'production', 練度: 'morale' } as const
const statIcons = { agriculture: iconAgriculture, commerce: iconCommerce, production: iconProduction, morale: iconMorale }

function statKind(stat: CityStatView) {
  return stat.kind ?? statKinds[stat.label as keyof typeof statKinds] ?? 'commerce'
}

function CityInfo({ city, onOpenDomestic }: { city: CityView; onOpenDomestic?: () => void }) {
  return (
    <div className="norden-city-info">
      <div className={`norden-city-info-overview ${city.lord?.image || city.lord?.imageSrc ? 'has-lord' : ''}`}>
        <header className="norden-city-info-header">
          {city.faction?.emblem && <img className="norden-city-info-emblem" src={city.faction.emblem} alt="" />}
          <div>
            <h2 className="norden-city-info-name">{city.name}</h2>
            <span className="norden-city-info-sub">{[city.faction?.name ?? '中立', city.typeLabel].filter(Boolean).join(' ・ ')}</span>
          </div>
        </header>
        <div className="norden-city-info-body">
          <dl className="norden-city-info-facts">
            {city.lord && <div><dt>領主</dt><dd className="norden-city-info-lord-name">{city.lord.name}</dd></div>}
            {city.population !== undefined && <div><dt>人口</dt><dd>{city.population.toLocaleString()}</dd></div>}
            {city.scaleLabel && <div><dt>規模</dt><dd>{city.scaleLabel}</dd></div>}
            {city.special && <div><dt>特殊</dt><dd>{city.special}</dd></div>}
            <div><dt>騎士</dt><dd>{city.knights?.filter(knight => !knight.mercenary).length ?? 0}人</dd></div>
            {city.knights?.some(knight => knight.mercenary) && <div><dt>傭兵</dt><dd>{city.knights.filter(knight => knight.mercenary).length}人</dd></div>}
            {city.prisoners && city.prisoners.length > 0 && <div><dt>捕虜</dt><dd>{city.prisoners.length}人</dd></div>}
          </dl>
        </div>
        {city.lord && (city.lord.imageSrc || city.lord.image) && (
          <div className="norden-city-info-lord" role="img" aria-label={`${city.lord.name}の立ち絵`}>
            {city.lord.imageSrc ? <img src={city.lord.imageSrc} alt="" /> : city.lord.image}
          </div>
        )}
      </div>
      <CityResources city={city} />
      {city.stats && city.stats.length > 0 && (
        <dl className="norden-city-info-stats">
          {city.stats.map(stat => (
            <div key={stat.label} className="norden-city-info-stat">
              <dt><img src={statIcons[statKind(stat)]} alt="" /><span>{stat.label}</span></dt>
              <dd>
                <StatBar label={stat.label} value={stat.value} max={stat.max} tone={statKind(stat)} />
              </dd>
            </div>
          ))}
        </dl>
      )}
      {city.buildings && (
        <section className="norden-city-info-buildings" aria-label="施設">
          <h3>施設 <span>{city.buildings.built.length} / {city.buildings.slots}</span></h3>
          <BuildingSlots buildings={city.buildings} onSelect={onOpenDomestic} onSelectEmpty={onOpenDomestic} />
        </section>
      )}
      {city.buildings?.construction && isRelicWork(city.buildings.construction) && (
        <section className="norden-city-info-buildings" aria-label="遺物の修復">
          <h3>遺物の修復</h3>
          <RelicWorkSlot work={city.buildings.construction} />
        </section>
      )}
      {city.tags && city.tags.length > 0 && (
        <ul className="norden-city-info-tags" aria-label="特徴">
          {city.tags.map(tag => <li key={tag}>{tag}</li>)}
        </ul>
      )}
    </div>
  )
}

/** The city's knights with all their abilities, its lord first; after a splitter each the mercenaries serving there and the prisoners held there, with the faction they served */
function CityKnights({ city, onShowKnight }: { city: CityView; onShowKnight?: (id: string) => void }) {
  const knights = (city.knights ?? []).filter(knight => !knight.mercenary)
  const mercenaries = (city.knights ?? []).filter(knight => knight.mercenary)
  const prisoners = city.prisoners ?? []
  // The lord is matched to their knight by id, or by name when the city gives none
  const lord = city.lord
  const isLord = (knight: KnightView) => lord !== undefined && (lord.id ? knight.id === lord.id : knight.name === lord.name)
  const ordered = [...knights.filter(isLord), ...knights.filter(knight => !isLord(knight))]
  const card = (knight: KnightView, badge?: ReactNode, current = false, subtitleExtra?: ReactNode) => (
    <KnightCard
      key={knight.id}
      current={current}
      knight={{ ...knight, stats: knightAbilityStats(knight) }}
      subtitleExtra={subtitleExtra}
      aside={<span className="norden-city-knight-aside">
        {badge}
        <Button size="small" aria-label={`${knight.name}の詳細`} disabled={!onShowKnight}
          onClick={() => onShowKnight?.(knight.id)}>詳細</Button>
      </span>}
    />
  )
  const group = (label: string, members: readonly KnightView[], subtitleExtra?: (knight: KnightView) => ReactNode) => members.length > 0 && <>
    <div className="norden-city-knights-splitter" role="separator">
      <span>{label}</span>
    </div>
    <ul className="norden-city-knight-group" aria-label={label}>
      {members.map(member => <li key={member.id}>{card(member, undefined, false, subtitleExtra?.(member))}</li>)}
    </ul>
  </>
  return (
    <div className="norden-city-knights">
      {knights.length === 0 && mercenaries.length === 0
        ? <p className="norden-city-empty">この都市に所属する騎士はいません。</p>
        : ordered.map(knight => {
          const lordCard = isLord(knight)
          return card(knight, lordCard && <span className="norden-city-knight-badge">領主</span>, lordCard)
        })}
      {group('傭兵', mercenaries)}
      {group('捕虜', prisoners, prisoner => <span className="norden-city-prisoner-faction">
        {prisoner.faction ? <FactionMark faction={prisoner.faction} /> : '勢力なし'}
      </span>)}
    </div>
  )
}

/** 兵数・練度・物資 side by side, as large numbers */
function CityResources({ city }: { city: CityView }) {
  const items = [
    { label: '兵数', icon: iconTroops, value: city.troops },
    { label: '練度', icon: iconTraining, value: city.troopMorale },
    { label: '物資', icon: iconSupplies, value: city.supplies },
  ].filter((item): item is { label: string; icon: string; value: number } => item.value !== undefined)
  if (items.length === 0) return null
  return (
    <dl className="norden-city-info-resources">
      {items.map(item => (
        <div key={item.label}>
          <dt><img src={item.icon} alt="" /><span>{item.label}</span></dt>
          <dd>{item.value.toLocaleString()}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Each turn's 人口・商業・生産, newest first, with the formulas of the economy run that reached them */
function CityHistory({ history }: { history: readonly CityHistoryView[] }) {
  if (history.length === 0) return <p className="norden-city-empty">記録はまだありません。</p>
  return (
    <ol className="norden-city-history" aria-label="内政ログ">
      {[...history].reverse().map(record => (
        <li key={record.turn} className="norden-city-history-turn">
          <header>
            <h3>第{record.turn}ターン</h3>
            <span>人口 <b>{record.population.toLocaleString()}</b></span>
            <span>商業 <b>{record.market.toLocaleString()}</b></span>
            <span>生産 <b>{record.production.toLocaleString()}</b></span>
          </header>
          {record.log && record.log.length > 0 ? (
            <dl>
              {record.log.map(line => {
                const delta = line.after - line.before
                return (
                  <div key={line.label}>
                    <dt>
                      <span>{line.label}</span>
                      <span>{line.before.toLocaleString()} → {line.after.toLocaleString()}</span>
                      <span className={delta > 0 ? 'is-up' : delta < 0 ? 'is-down' : ''}>
                        {delta > 0 ? '+' : ''}{delta.toLocaleString()}
                      </span>
                    </dt>
                    <dd>{line.formula}</dd>
                  </div>
                )
              })}
            </dl>
          ) : <p className="norden-city-history-note">初期値</p>}
        </li>
      ))}
    </ol>
  )
}
