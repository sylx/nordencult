import { useState, type ReactNode } from 'react'
import { BuildingImage, ConstructionProgress } from '../../components/parts/BuildingSlots'
import Button from '../../components/parts/Button'
import SectionFrame from '../../components/parts/SectionFrame'
import KnightCard from '../../components/parts/KnightCard'
import ConfirmDialog from '../../components/window/ConfirmDialog'
import WindowFrame from '../../components/window/WindowFrame'
import type {
  BuildOptionView, BuildingView, CityStatView, CityView, ConstructionView, DomesticBudgetsView, DomesticFundedRole, DomesticOfficerRole,
  DomesticOfficersView, KnightView,
} from '../types'
import DomesticOfficers, { ABILITY_LABELS, KnightFace, OFFICER_ROLES, OFFICERS_PER_ROLE, knightAbility, roleAptitude, weightsLabel } from './DomesticOfficers'
import DomesticStatus from './DomesticStatus'
import '../screens.css'
import './DomesticScreen.css'

export interface DomesticScreenProps {
  /** The city whose domestic affairs are managed */
  city: CityView
  /**
   * Buildings the city could start: those without `upgradeFrom` are offered for an empty slot,
   * the others as upgrades of the building they replace. `locked` ones are not shown
   */
  buildOptions?: readonly BuildOptionView[]
  /** Faction treasury gold (shown alongside the city's population and stockpiled supplies) */
  gold?: number
  /** Bars at the top (e.g. 商業・生産・練度・新兵の練度) with the buildings' boosts stacked on them; city.stats when omitted */
  stats?: readonly CityStatView[]
  /** Start constructing a building in the active empty slot, or an upgrade over the building it replaces */
  onBuild?: (buildingId: string) => void
  /** Demolish a standing building (invoked after the confirmation dialog is accepted) */
  onDemolish?: (buildingId: string) => void
  /** Cancel the current construction (returns half of invested supplies to the city's stored supplies) */
  onCancelConstruction?: () => void
  /** Pause or resume the current construction (when paused, produced supplies go to stored supplies) */
  onPauseConstruction?: (paused: boolean) => void
  /** The city's knights, from whom its lord and officers are chosen; city.knights when omitted */
  knights?: readonly KnightView[]
  /** The knights holding each domestic officer role (up to two each) */
  officers?: DomesticOfficersView
  /** What each role's officers bring, e.g. 商業 +4〜7/ターン or 練度 +15/ターン */
  officerEffects?: Partial<Record<DomesticOfficerRole, string>>
  /** Gold set aside for the 商業・生産・募兵 officers to spend (the slider's most is BUDGET_LIMIT, or what `gold` allows) */
  budgets?: DomesticBudgetsView
  /** Set the gold set aside for a funded role (the host moves the difference from or back to the treasury) */
  onChangeBudget?: (role: DomesticFundedRole, amount: number) => void
  /** Make another of the city's knights its lord (the lord holds no officer role, so the host drops them from `officers`) */
  onChangeLord?: (knightId: string) => void
  /** Set the knights holding an officer role (the whole list, up to two) */
  onAssignOfficers?: (role: DomesticOfficerRole, knightIds: readonly string[]) => void
  onClose: () => void
  children?: ReactNode
}

/**
 * What the right-hand panel lists: buildings for the empty slot, the upgrades of a standing building,
 * the knights who could become lord, or those who could hold an officer role
 */
type SidePanel =
  | { kind: 'add' }
  | { kind: 'upgrade'; building: BuildingView }
  | { kind: 'lord' }
  | { kind: 'officers'; role: DomesticOfficerRole }

const panelKey = (panel: SidePanel) =>
  panel.kind === 'upgrade' ? `upgrade:${panel.building.id}` : panel.kind === 'officers' ? `officers:${panel.role}` : panel.kind

/**
 * Domestic screen: full-screen window with the city's lord (face, and a button to replace them) and its state
 * (stats with their boosts, population, supplies, gold) at the top-left, its building slots (their pictures shown whole)
 * below, its domestic officers below them, and a panel on the right (350px) of the buildings to add or upgrade to,
 * or of the knights to pick as lord or officers.
 */
export default function DomesticScreen({
  city,
  buildOptions = [],
  gold,
  stats = city.stats ?? [],
  onBuild,
  onDemolish,
  onCancelConstruction,
  onPauseConstruction,
  knights = city.knights ?? [],
  officers = {},
  officerEffects,
  budgets,
  onChangeBudget,
  onChangeLord,
  onAssignOfficers,
  onClose,
  children,
}: DomesticScreenProps) {
  const [panel, setPanel] = useState<SidePanel | null>(null)
  const [demolishTarget, setDemolishTarget] = useState<BuildingView | null>(null)

  const slots = city.buildings?.slots ?? 0
  const built = city.buildings?.built ?? []
  const construction = city.buildings?.construction ?? null
  // An upgrade is built over a standing building and takes no slot of its own
  const upgradingId = construction?.building.upgradeFrom && built.some(building => building.id === construction.building.upgradeFrom)
    ? construction.building.upgradeFrom
    : undefined
  const occupiedCount = built.length + (construction && !upgradingId ? 1 : 0)
  const emptyCount = Math.max(0, slots - occupiedCount)
  const canAdd = !construction && emptyCount > 0
  const cancelRefund = construction ? Math.floor(construction.invested / 2) : 0

  // Locked buildings are never listed, so what the city cannot build yet stays unrevealed
  const visibleOptions = buildOptions.filter(option => !option.locked)
  const addOptions = visibleOptions.filter(option => !option.upgradeFrom)
  const upgradesOf = (buildingId: string) => visibleOptions.filter(option => option.upgradeFrom === buildingId)

  const upgradeBase = panel?.kind === 'upgrade' && built.some(building => building.id === panel.building.id) ? panel.building : null
  const showBuildPanel = panel?.kind === 'add' ? canAdd : panel?.kind === 'upgrade' && Boolean(upgradeBase) && !construction
  const panelOptions = upgradeBase ? upgradesOf(upgradeBase.id) : addOptions
  const panelTitle = upgradeBase ? `${upgradeBase.name}のアップグレード` : '追加できる施設'

  const togglePanel = (next: SidePanel) => setPanel(current => (current && panelKey(current) === panelKey(next) ? null : next))

  // The lord is matched to their knight by id, or by name when the city gives none
  const lord = city.lord
  const lordKnight = lord && (knights.find(knight => knight.id === lord.id) ?? knights.find(knight => !lord.id && knight.name === lord.name))
  const lordCandidates = knights.filter(knight => knight.id !== lordKnight?.id)
  const showLordPanel = panel?.kind === 'lord'
  const officerSpec = panel?.kind === 'officers' ? OFFICER_ROLES.find(spec => spec.role === panel.role) : undefined
  const roleOf = (knightId: string) => OFFICER_ROLES.find(spec => officers[spec.role]?.includes(knightId))

  const assignOfficer = (role: DomesticOfficerRole, knightId: string, assign: boolean) => {
    const current = officers[role] ?? []
    const next = assign ? [...current.filter(id => id !== knightId), knightId] : current.filter(id => id !== knightId)
    onAssignOfficers?.(role, next.slice(0, OFFICERS_PER_ROLE))
  }

  const renderPanelHeader = (title: string, closeLabel: string, note?: ReactNode) => (
    <header className="norden-domestic-build-header">
      <h3 className="norden-domestic-build-title">
        {title}
        {note && <span className="norden-domestic-build-note">{note}</span>}
      </h3>
      <button
        type="button"
        className="norden-domestic-build-close"
        aria-label={closeLabel}
        onClick={() => setPanel(null)}
      >
        ×
      </button>
    </header>
  )

  const renderConstruction = (current: ConstructionView, upgradedFrom?: BuildingView) => (
    <div className={`norden-domestic-slot is-building ${current.paused ? 'is-paused' : ''}`}>
      <span className="norden-domestic-slot-badge">
        {current.paused ? '中断中' : upgradedFrom ? 'アップグレード中' : '建設中'}
      </span>
      <BuildingImage building={current.building} className="norden-domestic-slot-image" />
      <div className="norden-domestic-slot-body">
        <span className="norden-domestic-slot-name">{current.building.name}</span>
        {upgradedFrom && <span className="norden-domestic-slot-from">{upgradedFrom.name}から</span>}
        <ConstructionProgress
          invested={current.invested}
          required={current.required}
          turnsLeft={current.paused ? undefined : current.turnsLeft}
        />
        <span className="norden-domestic-slot-note">
          {current.paused
            ? '中断中（生産物資は備蓄へ）'
            : `取消で物資 +${cancelRefund.toLocaleString()} が備蓄へ`}
        </span>
      </div>
      <div className="norden-domestic-slot-actions">
        <Button
          size="small"
          aria-label={`${current.building.name}の建設を${current.paused ? '再開' : '中断'}`}
          onClick={() => onPauseConstruction?.(!current.paused)}
        >
          {current.paused ? '再開' : '中断'}
        </Button>
        <Button
          size="small"
          aria-label={`${current.building.name}の建設を取り消す`}
          title={`取り消すと費やした物資の半分（${cancelRefund.toLocaleString()}）が備蓄物資に戻ります`}
          onClick={() => onCancelConstruction?.()}
        >
          取消
        </Button>
      </div>
    </div>
  )

  return (
    <div className="norden-screen norden-domestic">
      <WindowFrame
        className="norden-domestic-window"
        title={`${city.name}の内政`}
        aria-label={`${city.name}の内政`}
        onClose={onClose}
      >
        <div className="norden-domestic-layout">
          <div className="norden-domestic-left">
            <div className="norden-domestic-status-frame">
              <SectionFrame />
              <div className="norden-domestic-status-row">
                <section className={`norden-domestic-lord ${showLordPanel ? 'is-selected' : ''}`} aria-label="領主">
                  <span className="norden-domestic-lord-face">
                    <KnightFace
                      knight={lordKnight}
                      fallback={lord?.imageSrc ? <img src={lord.imageSrc} alt="" /> : lord?.image ?? (
                        <span className="norden-knight-initial">{lord?.name.slice(0, 1) ?? '－'}</span>
                      )}
                    />
                  </span>
                  <div className="norden-domestic-lord-info">
                    <span className="norden-domestic-lord-label">領主</span>
                    <strong className="norden-domestic-lord-name">{lord?.name ?? '不在'}</strong>
                    {lordKnight && (
                      <span className="norden-domestic-lord-abilities">
                        {(['politics', 'charm'] as const).map(ability => (
                          <span key={ability}>{ABILITY_LABELS[ability]} <b>{knightAbility(lordKnight, ability) ?? '—'}</b></span>
                        ))}
                      </span>
                    )}
                    <Button
                      size="small"
                      variant="primary"
                      aria-label="領主を交代"
                      aria-pressed={showLordPanel}
                      disabled={lordCandidates.length === 0}
                      title={lordCandidates.length === 0 ? '交代できる騎士がいません' : '領地の騎士から新しい領主を選びます'}
                      onClick={() => togglePanel({ kind: 'lord' })}
                    >
                      交代
                    </Button>
                  </div>
                </section>
                <DomesticStatus stats={stats} population={city.population} supplies={city.supplies} gold={gold} />
              </div>
            </div>

            <section className="norden-domestic-frame" data-testid="domestic-frame" aria-label="都市の施設">
              <SectionFrame />
              <header className="norden-domestic-frame-header">
                <h2 className="norden-domestic-frame-title">
                  施設
                  <span className="norden-domestic-slot-count">{built.length} / {slots}</span>
                </h2>
              </header>

              <ul className="norden-domestic-slots" aria-label={`施設スロット ${built.length} / ${slots}`}>
                {built.slice(0, slots).map(building => {
                  if (construction && building.id === upgradingId) {
                    return (
                      <li key={building.id} className="norden-domestic-slot-item">
                        {renderConstruction(construction, building)}
                      </li>
                    )
                  }
                  const upgrades = upgradesOf(building.id)
                  const isUpgradeSelected = showBuildPanel && upgradeBase?.id === building.id
                  return (
                    <li key={building.id} className="norden-domestic-slot-item">
                      <div className={`norden-domestic-slot is-built ${isUpgradeSelected ? 'is-selected' : ''}`}>
                        <BuildingImage building={building} className="norden-domestic-slot-image" />
                        <div className="norden-domestic-slot-body">
                          <span className="norden-domestic-slot-name">{building.name}</span>
                          {building.effects && building.effects.length > 0 && (
                            <span className="norden-domestic-slot-effects">{building.effects.join('・')}</span>
                          )}
                        </div>
                        <div className="norden-domestic-slot-actions">
                          {upgrades.length > 0 && (
                            <Button
                              size="small"
                              variant="primary"
                              aria-label={`${building.name}をアップグレード`}
                              aria-pressed={isUpgradeSelected}
                              disabled={Boolean(construction)}
                              title={construction ? 'ほかの施設を建設中です' : `${upgrades.map(option => option.name).join('・')}にアップグレードできます`}
                              onClick={() => togglePanel({ kind: 'upgrade', building })}
                            >
                              アップグレード
                            </Button>
                          )}
                          <button
                            type="button"
                            className="norden-domestic-slot-delete"
                            aria-label={`${building.name}を削除`}
                            title={`${building.name}を取り壊す`}
                            onClick={() => setDemolishTarget(building)}
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}

                {construction && !upgradingId && built.length < slots && (
                  <li key={`construction-${construction.building.id}`} className="norden-domestic-slot-item">
                    {renderConstruction(construction)}
                  </li>
                )}

                {Array.from({ length: emptyCount }, (_, index) => {
                  const isAddableSlot = index === 0 && !construction
                  return (
                    <li key={`empty-${index}`} className="norden-domestic-slot-item">
                      {isAddableSlot ? (
                        <button
                          type="button"
                          className={`norden-domestic-slot is-empty is-addable ${showBuildPanel && !upgradeBase ? 'is-selected' : ''}`}
                          aria-label="施設を追加"
                          aria-pressed={showBuildPanel && !upgradeBase}
                          onClick={() => togglePanel({ kind: 'add' })}
                        >
                          <span className="norden-domestic-slot-plus" aria-hidden="true">+</span>
                          <span className="norden-domestic-slot-add-label">施設を追加</span>
                        </button>
                      ) : (
                        <div className="norden-domestic-slot is-empty" aria-label="空きスロット">
                          <span className="norden-domestic-slot-empty-label">空き</span>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>

            <DomesticOfficers
              knights={knights}
              officers={officers}
              effects={officerEffects}
              budgets={budgets}
              gold={gold}
              onChangeBudget={onChangeBudget}
              selectedRole={panel?.kind === 'officers' ? panel.role : undefined}
              onSelectRole={role => togglePanel({ kind: 'officers', role })}
              onDismiss={(role, knightId) => assignOfficer(role, knightId, false)}
            />
          </div>

          {showLordPanel && (
            <aside className="norden-domestic-build-panel" aria-label="領主の交代">
              <SectionFrame />
              {renderPanelHeader('領主の交代', '騎士一覧を閉じる')}
              {knights.length === 0 ? (
                <p className="norden-domestic-empty">領地に騎士がいません。</p>
              ) : (
                <ul className="norden-domestic-build-list norden-domestic-knight-list">
                  {knights.map(knight => {
                    const isLord = knight.id === lordKnight?.id
                    return (
                      <li key={knight.id}>
                        <KnightCard
                          compact
                          current={isLord}
                          className={knight.unavailableReason && !isLord ? 'is-disabled' : ''}
                          knight={{
                            ...knight,
                            stats: (['politics', 'charm'] as const).map(ability => ({
                              label: ABILITY_LABELS[ability],
                              value: knightAbility(knight, ability) ?? '—',
                            })),
                          }}
                          aside={isLord ? <span className="norden-domestic-knight-badge">現領主</span> : (
                            <span className="norden-domestic-knight-pick">
                              {knight.unavailableReason
                                ? <span>{knight.unavailableReason}</span>
                                : roleOf(knight.id) && <span>{roleOf(knight.id)!.label}担当官から外れます</span>}
                              <Button
                                size="small"
                                variant="primary"
                                aria-label={`${knight.name}を領主にする`}
                                disabled={Boolean(knight.unavailableReason)}
                                onClick={() => {
                                  setPanel(null)
                                  onChangeLord?.(knight.id)
                                }}
                              >
                                任命
                              </Button>
                            </span>
                          )}
                        />
                      </li>
                    )
                  })}
                </ul>
              )}
            </aside>
          )}

          {officerSpec && (() => {
            const assigned = officers[officerSpec.role] ?? []
            const isFull = assigned.length >= OFFICERS_PER_ROLE
            // The ablest first, by the abilities the role weighs
            const candidates = [...knights].sort((a, b) => (roleAptitude(b, officerSpec) ?? -1) - (roleAptitude(a, officerSpec) ?? -1))
            return (
              <aside className="norden-domestic-build-panel" aria-label={`${officerSpec.label}担当官の任命`}>
                <SectionFrame />
                {renderPanelHeader(
                  `${officerSpec.label}担当官の任命`,
                  '騎士一覧を閉じる',
                  `${Math.min(assigned.length, OFFICERS_PER_ROLE)} / ${OFFICERS_PER_ROLE}`,
                )}
                <p className="norden-domestic-build-desc norden-domestic-panel-desc">
                  {officerSpec.description}（適性は{weightsLabel(officerSpec)}の比。{OFFICERS_PER_ROLE}人までで、2人の適性は合算）
                </p>
                {candidates.length === 0 ? (
                  <p className="norden-domestic-empty">領地に騎士がいません。</p>
                ) : (
                  <ul className="norden-domestic-build-list norden-domestic-knight-list">
                    {candidates.map(knight => {
                      const selected = assigned.includes(knight.id)
                      const otherRole = selected ? undefined : roleOf(knight.id)
                      // The lord governs the city and serves as no officer
                      const reason = selected
                        ? undefined
                        : knight.id === lordKnight?.id ? '領主'
                          : otherRole ? `${otherRole.label}担当官`
                            : knight.unavailableReason ?? (isFull ? `${OFFICERS_PER_ROLE}人まで` : undefined)
                      return (
                        <li key={knight.id}>
                          <KnightCard
                            compact
                            knight={{
                              ...knight,
                              stats: [
                                ...officerSpec.weights.map(([ability]) => ({ label: ABILITY_LABELS[ability], value: knightAbility(knight, ability) ?? '—' })),
                                { label: '適性', value: roleAptitude(knight, officerSpec) ?? '—' },
                              ],
                            }}
                            selection={{
                              selected,
                              disabled: Boolean(reason),
                              onToggle: () => assignOfficer(officerSpec.role, knight.id, !selected),
                            }}
                            aside={reason && <span className="norden-domestic-knight-reason">{reason}</span>}
                          />
                        </li>
                      )
                    })}
                  </ul>
                )}
              </aside>
            )
          })()}

          {showBuildPanel && (
            <aside className="norden-domestic-build-panel" aria-label={panelTitle}>
              <SectionFrame />
              {renderPanelHeader(panelTitle, '施設一覧を閉じる')}
              {panelOptions.length === 0 ? (
                <p className="norden-domestic-empty">{upgradeBase ? 'アップグレード先はありません。' : '追加できる施設はありません。'}</p>
              ) : (
                <ul className="norden-domestic-build-list">
                  {panelOptions.map(option => (
                    <li
                      key={option.id}
                      className={`norden-domestic-build-item ${option.unavailableReason ? 'is-unavailable' : ''}`}
                    >
                      <BuildingImage building={option} className="norden-domestic-build-image" />
                      <div className="norden-domestic-build-info">
                        <div className="norden-domestic-build-heading">
                          <strong className="norden-domestic-build-name">{option.name}</strong>
                          {option.effects && option.effects.length > 0 && (
                            <span className="norden-domestic-build-effects">{option.effects.join('・')}</span>
                          )}
                        </div>
                        {option.description && (
                          <p className="norden-domestic-build-desc">{option.description}</p>
                        )}
                        <div className="norden-domestic-build-costs">
                          <span>物資 <b>{option.supplies.toLocaleString()}</b></span>
                          <span>金 <b>{option.gold.toLocaleString()}</b></span>
                          {option.turns !== undefined && (
                            <span>{option.turns === null ? '完成見込みなし' : `約${option.turns}ターン`}</span>
                          )}
                        </div>
                        {option.unavailableReason && (
                          <span className="norden-domestic-build-reason">{option.unavailableReason}</span>
                        )}
                      </div>
                      <Button
                        size="small"
                        variant="primary"
                        disabled={Boolean(option.unavailableReason)}
                        title={option.unavailableReason}
                        aria-label={upgradeBase ? `${option.name}にアップグレード` : `${option.name}を建設`}
                        onClick={() => {
                          setPanel(null)
                          onBuild?.(option.id)
                        }}
                      >
                        {upgradeBase ? 'アップグレード' : '建設'}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          )}
        </div>
      </WindowFrame>

      {demolishTarget && (
        <ConfirmDialog
          title="施設の取り壊し"
          message={`「${demolishTarget.name}」を取り壊しますか？`}
          confirmLabel="取り壊す"
          cancelLabel="やめる"
          onConfirm={() => {
            const targetId = demolishTarget.id
            setDemolishTarget(null)
            onDemolish?.(targetId)
          }}
          onCancel={() => setDemolishTarget(null)}
        />
      )}

      {children}
    </div>
  )
}
