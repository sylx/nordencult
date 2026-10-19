import type { ReactNode } from 'react'
import QuantityInput from '../../components/parts/QuantityInput'
import SectionFrame from '../../components/parts/SectionFrame'
import type { KnightCardData } from '../../components/parts/KnightCard'
import type { DomesticBudgetsView, DomesticFundedRole, DomesticOfficerRole, DomesticOfficersView, KnightAbilitiesView, KnightView } from '../types'

/** Most knights holding one officer role */
export const OFFICERS_PER_ROLE = 2
/** Most gold a city can set aside for a funded role */
export const BUDGET_LIMIT = 1000

type Ability = keyof KnightAbilitiesView

export const ABILITY_LABELS: Readonly<Record<Ability, string>> = {
  leadership: '統率', strength: '武力', intelligence: '知力', politics: '政治', charm: '魅力',
}

export interface OfficerRoleSpec {
  role: DomesticOfficerRole
  label: string
  /** The abilities its officers are weighed by, and how much (e.g. 政治 2 : 知力 1) */
  weights: readonly (readonly [Ability, number])[]
  description: string
  /** Its officers spend gold set aside for the role */
  funded: boolean
}

export const OFFICER_ROLES: readonly OfficerRoleSpec[] = [
  { role: 'commerce', label: '商業', weights: [['politics', 2], ['intelligence', 1]], funded: true, description: '予算を使い、商業の基礎値を上げる' },
  { role: 'production', label: '生産', weights: [['politics', 2], ['intelligence', 1]], funded: true, description: '予算を使い、生産の基礎値を上げる' },
  { role: 'training', label: '訓練', weights: [['strength', 2], ['leadership', 1]], funded: false, description: '毎ターン兵の練度を上げる（金は使わない）' },
  { role: 'recruitment', label: '募兵', weights: [['charm', 3], ['strength', 1]], funded: true, description: '予算を使い、兵を集める（練度は下がる）' },
]

/** e.g. 政治2・知力1 */
export const weightsLabel = (spec: OfficerRoleSpec) => spec.weights.map(([ability, weight]) => `${ABILITY_LABELS[ability]}${weight}`).join('・')

/** A knight's ability: from `abilities`, or the card's stat of the same label */
export function knightAbility(knight: KnightView, ability: Ability): number | undefined {
  const value = knight.abilities?.[ability] ?? knight.stats?.find(stat => stat.label === ABILITY_LABELS[ability])?.value
  return typeof value === 'number' ? value : undefined
}

/** A knight's aptitude for a role: their abilities weighed as the role weighs them (undefined when one is unknown) */
export function roleAptitude(knight: KnightView, spec: OfficerRoleSpec): number | undefined {
  let sum = 0
  let total = 0
  for (const [ability, weight] of spec.weights) {
    const value = knightAbility(knight, ability)
    if (value === undefined) return undefined
    sum += value * weight
    total += weight
  }
  return Math.round(sum / total)
}

/** The knight's face as the knight card draws it: its picture, or the initial */
export function KnightFace({ knight, fallback }: { knight?: KnightCardData; fallback?: ReactNode }) {
  if (knight?.portraitSrc) return <img src={knight.portraitSrc} alt="" />
  if (knight?.portrait) return <>{knight.portrait}</>
  return <>{fallback ?? <span className="norden-knight-initial">{knight?.name.slice(0, 1) ?? '?'}</span>}</>
}

export interface DomesticOfficersProps {
  knights: readonly KnightView[]
  officers: DomesticOfficersView
  /** What each role's officers bring, e.g. 商業 +4〜7/ターン */
  effects?: Partial<Record<DomesticOfficerRole, string>>
  /** Gold set aside for each funded role */
  budgets?: DomesticBudgetsView
  /** The treasury, which a budget can take from (unlimited when omitted) */
  gold?: number
  /** Sets the gold set aside for a funded role; omitted: the budgets are only shown */
  onChangeBudget?: (role: DomesticFundedRole, amount: number) => void
  /** The role whose knight list is open */
  selectedRole?: DomesticOfficerRole
  /** Opens (or closes) the knight list of a role */
  onSelectRole: (role: DomesticOfficerRole) => void
  /** Dismisses an officer; omitted: they cannot be changed */
  onDismiss?: (role: DomesticOfficerRole, knightId: string) => void
}

/**
 * The third row of the domestic screen: the four officer roles, each with two posts
 * holding a knight (face, name and their aptitude for the role) or empty, the gold set aside
 * for it (a slider, for the funded roles) and what its officers bring
 */
export default function DomesticOfficers({
  knights, officers, effects, budgets = {}, gold, onChangeBudget, selectedRole, onSelectRole, onDismiss,
}: DomesticOfficersProps) {
  return (
    <section className="norden-window-section norden-domestic-officers" aria-label="内政担当官">
      <SectionFrame />
      <header className="norden-window-section-header">
        <h2 className="norden-window-section-title">内政担当官</h2>
      </header>
      <ul className="norden-domestic-officer-roles">
        {OFFICER_ROLES.map(spec => {
          const assigned = (officers[spec.role] ?? [])
            .flatMap(id => knights.filter(knight => knight.id === id))
            .slice(0, OFFICERS_PER_ROLE)
          const isSelected = selectedRole === spec.role
          const funded = spec.funded ? spec.role as DomesticFundedRole : undefined
          const budget = funded ? budgets[funded] ?? 0 : 0
          return (
            <li key={spec.role} className={`norden-domestic-officer-role ${isSelected ? 'is-selected' : ''}`} aria-label={`${spec.label}担当官`}>
              <div className="norden-domestic-officer-heading">
                <strong className="norden-domestic-officer-title">{spec.label}</strong>
                <span className="norden-domestic-officer-ability">{weightsLabel(spec)}</span>
              </div>
              <p className="norden-domestic-officer-desc">{spec.description}</p>
              <ul className="norden-domestic-officer-posts">
                {Array.from({ length: OFFICERS_PER_ROLE }, (_, index) => {
                  const knight = assigned[index]
                  if (!knight) {
                    return (
                      <li key={`empty-${index}`}>
                        <button
                          type="button"
                          className="norden-domestic-officer-post is-empty"
                          aria-label={`${spec.label}担当官を任命`}
                          aria-pressed={isSelected}
                          onClick={() => onSelectRole(spec.role)}
                        >
                          <span className="norden-domestic-officer-plus" aria-hidden="true">+</span>
                          <span>任命</span>
                        </button>
                      </li>
                    )
                  }
                  const value = roleAptitude(knight, spec)
                  return (
                    <li key={knight.id} className="norden-domestic-officer-post-item">
                      <button
                        type="button"
                        className="norden-domestic-officer-post is-filled"
                        aria-label={`${spec.label}担当官 ${knight.name}`}
                        aria-pressed={isSelected}
                        onClick={() => onSelectRole(spec.role)}
                      >
                        <span className="norden-domestic-officer-face"><KnightFace knight={knight} /></span>
                        <span className="norden-domestic-officer-name">{knight.name}</span>
                        <span className="norden-domestic-officer-value">
                          適性 <b>{value ?? '—'}</b>
                        </span>
                      </button>
                      {onDismiss && (
                        <button
                          type="button"
                          className="norden-domestic-officer-dismiss"
                          aria-label={`${knight.name}を${spec.label}担当官から外す`}
                          title="担当官から外す"
                          onClick={() => onDismiss(spec.role, knight.id)}
                        >
                          ×
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
              {funded && (
                <QuantityInput
                  className="norden-domestic-officer-budget"
                  label={`${spec.label}の予算`}
                  value={budget}
                  // The scale stays at BUDGET_LIMIT so that the other sliders keep still as the treasury changes
                  max={BUDGET_LIMIT}
                  cap={budget + Math.max(0, gold ?? Infinity)}
                  step={10}
                  unit="金"
                  disabled={!onChangeBudget}
                  onChange={amount => onChangeBudget?.(funded, amount)}
                />
              )}
              <span className={`norden-domestic-officer-effect ${effects?.[spec.role] ? '' : 'is-none'}`}>
                {effects?.[spec.role] ?? (assigned.length > 0 ? '' : '担当官なし')}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
