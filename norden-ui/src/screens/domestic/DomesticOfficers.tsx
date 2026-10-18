import type { ReactNode } from 'react'
import SectionFrame from '../../components/parts/SectionFrame'
import type { KnightCardData } from '../../components/parts/KnightCard'
import type { DomesticOfficerRole, DomesticOfficersView, KnightAbilitiesView, KnightView } from '../types'

/** Most knights holding one officer role */
export const OFFICERS_PER_ROLE = 2

type Ability = keyof KnightAbilitiesView

export const ABILITY_LABELS: Readonly<Record<Ability, string>> = {
  leadership: '統率', strength: '武力', intelligence: '知力', politics: '政治', charm: '魅力',
}

export interface OfficerRoleSpec {
  role: DomesticOfficerRole
  label: string
  /** The ability its officers are weighed by */
  ability: Ability
  description: string
}

export const OFFICER_ROLES: readonly OfficerRoleSpec[] = [
  { role: 'commerce', label: '商業', ability: 'politics', description: '政治に応じて商業を高める' },
  { role: 'production', label: '生産', ability: 'politics', description: '政治に応じて生産を高める' },
  { role: 'training', label: '訓練', ability: 'strength', description: '内政フェーズで武力に応じて兵の練度を上げる' },
  { role: 'recruitment', label: '募兵', ability: 'charm', description: '内政フェーズで魅力に応じて人口から兵を集める' },
]

/** A knight's ability: from `abilities`, or the card's stat of the same label */
export function knightAbility(knight: KnightView, ability: Ability): number | undefined {
  const value = knight.abilities?.[ability] ?? knight.stats?.find(stat => stat.label === ABILITY_LABELS[ability])?.value
  return typeof value === 'number' ? value : undefined
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
  /** What each role's officers bring, e.g. 商業 +12% */
  effects?: Partial<Record<DomesticOfficerRole, string>>
  /** The role whose knight list is open */
  selectedRole?: DomesticOfficerRole
  /** Opens (or closes) the knight list of a role */
  onSelectRole: (role: DomesticOfficerRole) => void
  /** Dismisses an officer; omitted: they cannot be changed */
  onDismiss?: (role: DomesticOfficerRole, knightId: string) => void
}

/**
 * The third row of the domestic screen: the four officer roles, each with two posts
 * holding a knight (face, name and the ability that counts) or empty, and what its officers bring
 */
export default function DomesticOfficers({ knights, officers, effects, selectedRole, onSelectRole, onDismiss }: DomesticOfficersProps) {
  return (
    <section className="norden-domestic-frame norden-domestic-officers" aria-label="内政担当官">
      <SectionFrame />
      <header className="norden-domestic-frame-header">
        <h2 className="norden-domestic-frame-title">内政担当官</h2>
      </header>
      <ul className="norden-domestic-officer-roles">
        {OFFICER_ROLES.map(spec => {
          const assigned = (officers[spec.role] ?? [])
            .flatMap(id => knights.filter(knight => knight.id === id))
            .slice(0, OFFICERS_PER_ROLE)
          const isSelected = selectedRole === spec.role
          const abilityLabel = ABILITY_LABELS[spec.ability]
          return (
            <li key={spec.role} className={`norden-domestic-officer-role ${isSelected ? 'is-selected' : ''}`} aria-label={`${spec.label}担当官`}>
              <div className="norden-domestic-officer-heading">
                <strong className="norden-domestic-officer-title">{spec.label}</strong>
                <span className="norden-domestic-officer-ability">{abilityLabel}</span>
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
                  const value = knightAbility(knight, spec.ability)
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
                          {abilityLabel} <b>{value ?? '—'}</b>
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
