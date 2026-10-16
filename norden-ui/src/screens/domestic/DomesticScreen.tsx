import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import InfoWindowWithTabs from '../../components/window/InfoWindowWithTabs'
import BuildingSlots, { BuildingImage } from '../../components/parts/BuildingSlots'
import KnightCard from '../../components/parts/KnightCard'
import Button from '../../components/parts/Button'
import iconBuild from '../../assets/ui/icons/icon_home.webp'
import iconAssign from '../../assets/ui/icons/icon_people.webp'
import iconGold from '../../assets/ui/icons/icon-gold.png'
import type { InfoWindowSkin } from '../../skins'
import type { AssignmentRoleView, BuildOptionView, CityAssignmentsView, CityView, KnightView } from '../types'
import '../screens.css'
import './DomesticScreen.css'

export type DomesticTab = 'build' | 'assign'

export interface DomesticScreenProps {
  /** The city: its name and building slots (`buildings`) */
  city: CityView
  /** The tab shown first */
  tab?: DomesticTab
  /** The player's treasury, shown at the bottom */
  gold?: number

  /** Buildings the city could start, those it cannot now with `unavailableReason` */
  buildOptions: readonly BuildOptionView[]
  onBuild: (buildingId: string) => void
  /** Gives up the building under construction. Omitted: it cannot be given up */
  onCancelConstruction?: () => void

  /** The city's knights. Those with `unavailableReason` (e.g. 出撃予約中) are shown but cannot be assigned */
  knights: readonly KnightView[]
  assignments: CityAssignmentsView
  /** What the assignments add now, e.g. 商業 +12% */
  bonuses?: { governor: readonly string[]; military: readonly string[] }
  /** What the role's bonuses would be with the knight in it */
  forecast?: (knightId: string, role: AssignmentRoleView) => readonly string[]
  onAssign: (knightId: string, role: AssignmentRoleView) => void
  onUnassign: (knightId: string) => void

  onClose: () => void
  windowPosition?: { x: number; y: number }
  skin?: InfoWindowSkin
  children?: ReactNode
}

const ROLE_LABELS: Readonly<Record<AssignmentRoleView, string>> = { governor: '代官', military: '軍事担当' }
const TABS: readonly DomesticTab[] = ['build', 'assign']

/** Domestic screen: building in the city (its slots and what it can build) and assigning its knights, as tabs of one window */
export default function DomesticScreen({
  city, tab = 'build', gold, buildOptions, onBuild, onCancelConstruction, knights, assignments, bonuses, forecast, onAssign, onUnassign,
  onClose, windowPosition = { x: 56, y: 80 }, skin, children,
}: DomesticScreenProps) {
  const [active, setActive] = useState(() => TABS.indexOf(tab))
  return (
    <div className="norden-screen norden-domestic">
      <InfoWindowWithTabs title={`${city.name}の内政`} x={windowPosition.x} y={windowPosition.y} skin={skin}
        maxWidth={640} maxHeight={680} iconOnlyTabs={false} activeTab={active} onActiveTabChange={setActive}
        style={{ '--norden-domestic-x': `${windowPosition.x}px`, '--norden-domestic-y': `${windowPosition.y}px` } as CSSProperties}
        tabs={[
          {
            id: 'build', name: '建設', icon: iconBuild,
            content: <BuildPanel city={city} options={buildOptions} onBuild={onBuild} onCancelConstruction={onCancelConstruction} />,
          },
          {
            id: 'assign', name: '割当', icon: iconAssign,
            content: <AssignPanel knights={knights} assignments={assignments} bonuses={bonuses} forecast={forecast}
              onAssign={onAssign} onUnassign={onUnassign} />,
          },
        ]} />
      <div className="norden-screen-bottom-center">
        <div className="norden-hud-panel norden-domestic-summary">
          {gold !== undefined && (
            <span className="norden-domestic-gold" aria-label="金"><img src={iconGold} alt="" />{gold.toLocaleString()}</span>
          )}
          <Button variant="quiet" onClick={onClose}>閉じる</Button>
        </div>
      </div>
      {children}
    </div>
  )
}

function BuildPanel({ city, options, onBuild, onCancelConstruction }: {
  city: CityView
  options: readonly BuildOptionView[]
  onBuild: (buildingId: string) => void
  onCancelConstruction?: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const construction = city.buildings?.construction
  return (
    <div className="norden-domestic-panel">
      {city.buildings && (
        <section className="norden-domestic-section" aria-label="施設スロット">
          <h3>施設 <span>{city.buildings.built.length} / {city.buildings.slots}</span></h3>
          <BuildingSlots buildings={city.buildings} />
          {construction && onCancelConstruction && (
            <p className="norden-domestic-cancel">
              {confirming
                ? <>
                  <span>{construction.building.name}の建設を中止しますか？ 投入した物資と金は戻りません。</span>
                  <Button size="small" onClick={() => { setConfirming(false); onCancelConstruction() }}>中止する</Button>
                  <Button size="small" onClick={() => setConfirming(false)}>やめる</Button>
                </>
                : <Button size="small" onClick={() => setConfirming(true)}>{construction.building.name}の建設を中止</Button>}
            </p>
          )}
        </section>
      )}
      <section className="norden-domestic-section" aria-label="建てられる施設">
        <h3>建てられる施設</h3>
        {options.length === 0
          ? <p className="norden-domestic-empty">建てられる施設はありません。</p>
          : (
            <ul className="norden-domestic-options">
              {options.map(option => (
                <li key={option.id} className={`norden-domestic-option ${option.unavailableReason ? 'is-unavailable' : ''}`}
                  aria-label={option.name}>
                  <BuildingImage building={option} />
                  <span className="norden-domestic-option-info">
                    <b>{option.name}</b>
                    {option.effects && option.effects.length > 0 && <span className="norden-domestic-effects">{option.effects.join('・')}</span>}
                    <span className="norden-domestic-costs">
                      物資 {option.supplies.toLocaleString()}　金 {option.gold.toLocaleString()}
                      {option.turns !== undefined && <>　{option.turns === null ? '完成の見込みなし' : `${option.turns}ターン`}</>}
                    </span>
                    {option.unavailableReason && <span className="norden-domestic-reason">{option.unavailableReason}</span>}
                  </span>
                  <Button size="small" disabled={Boolean(option.unavailableReason)} title={option.unavailableReason}
                    aria-label={`${option.name}を着工`} onClick={() => onBuild(option.id)}>着工</Button>
                </li>
              ))}
            </ul>
          )}
      </section>
    </div>
  )
}

function AssignPanel({ knights, assignments, bonuses, forecast, onAssign, onUnassign }: {
  knights: readonly KnightView[]
  assignments: CityAssignmentsView
  bonuses?: { governor: readonly string[]; military: readonly string[] }
  forecast?: (knightId: string, role: AssignmentRoleView) => readonly string[]
  onAssign: (knightId: string, role: AssignmentRoleView) => void
  onUnassign: (knightId: string) => void
}) {
  const byId = new Map(knights.map(knight => [knight.id, knight]))
  const roleOf = (id: string): AssignmentRoleView | null =>
    assignments.governor === id ? 'governor' : assignments.military.includes(id) ? 'military' : null
  const governor = assignments.governor ? byId.get(assignments.governor) : undefined
  const military = assignments.military.flatMap(id => byId.get(id) ?? [])

  return (
    <div className="norden-domestic-panel">
      <div className="norden-domestic-roles">
        <section className="norden-domestic-role" aria-label="代官">
          <h3>代官</h3>
          <p className="norden-domestic-holders">{governor?.name ?? 'なし'}</p>
          {bonuses && <p className="norden-domestic-effects">{bonuses.governor.join('・') || '補正なし'}</p>}
        </section>
        <section className="norden-domestic-role" aria-label="軍事担当">
          <h3>軍事担当</h3>
          <p className="norden-domestic-holders">{military.map(knight => knight.name).join('、') || 'なし'}</p>
          {bonuses && <p className="norden-domestic-effects">{bonuses.military.join('・') || '補正なし'}</p>}
        </section>
      </div>
      <section className="norden-domestic-section" aria-label="騎士">
        <h3>騎士</h3>
        {knights.length === 0
          ? <p className="norden-domestic-empty">この都市に所属する騎士はいません。</p>
          : (
            <ul className="norden-domestic-knights">
              {knights.map(knight => {
                const role = roleOf(knight.id)
                const button = (target: AssignmentRoleView) => (
                  <Button size="small" disabled={Boolean(knight.unavailableReason) || role === target}
                    title={knight.unavailableReason ?? forecast?.(knight.id, target).join('・')}
                    aria-label={`${knight.name}を${ROLE_LABELS[target]}にする`} onClick={() => onAssign(knight.id, target)}>
                    {ROLE_LABELS[target]}に
                  </Button>
                )
                return (
                  <li key={knight.id}>
                    <KnightCard knight={knight} compact className={`norden-domestic-knight ${role ? 'is-assigned' : ''}`}
                      aside={<span className="norden-domestic-knight-actions">
                        {role && <span className="norden-domestic-role-badge">{ROLE_LABELS[role]}</span>}
                        {knight.unavailableReason && <span className="norden-domestic-reason">{knight.unavailableReason}</span>}
                        {button('governor')}
                        {button('military')}
                        {role && <Button size="small" aria-label={`${knight.name}を担当から外す`} onClick={() => onUnassign(knight.id)}>外す</Button>}
                      </span>} />
                    {forecast && !knight.unavailableReason && (
                      <p className="norden-domestic-forecast">
                        {role !== 'governor' && <span>代官なら {forecast(knight.id, 'governor').join('・') || '補正なし'}</span>}
                        {role !== 'military' && <span>軍事担当なら {forecast(knight.id, 'military').join('・') || '補正なし'}</span>}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
      </section>
    </div>
  )
}
