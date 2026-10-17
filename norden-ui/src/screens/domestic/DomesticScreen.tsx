import { useState, type ReactNode } from 'react'
import { BuildingImage, ConstructionProgress } from '../../components/parts/BuildingSlots'
import Button from '../../components/parts/Button'
import ThinFrame from '../../components/parts/ThinFrame'
import ConfirmDialog from '../../components/window/ConfirmDialog'
import WindowFrame from '../../components/window/WindowFrame'
import type { BuildOptionView, BuildingView, CityStatView, CityView, ConstructionView } from '../types'
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
  /** Bars at the top (e.g. 商業・生産・新兵の練度) with the buildings' boosts stacked on them; city.stats when omitted */
  stats?: readonly CityStatView[]
  /** Start constructing a building in the active empty slot, or an upgrade over the building it replaces */
  onBuild?: (buildingId: string) => void
  /** Demolish a standing building (invoked after the confirmation dialog is accepted) */
  onDemolish?: (buildingId: string) => void
  /** Cancel the current construction (returns half of invested supplies to the city's stored supplies) */
  onCancelConstruction?: () => void
  /** Pause or resume the current construction (when paused, produced supplies go to stored supplies) */
  onPauseConstruction?: (paused: boolean) => void
  onClose: () => void
  children?: ReactNode
}

/** What the right-hand panel lists: buildings for the empty slot, or the upgrades of a standing building */
type BuildPanel = { kind: 'add' } | { kind: 'upgrade'; building: BuildingView }

/**
 * Domestic screen: full-screen window with the city's state (stats with their boosts, population, supplies, gold)
 * at the top-left, its building slots (their pictures shown whole) below,
 * open space below for knight assignments, and a panel on the right (30-40%) of the buildings to add or upgrade to.
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
  onClose,
  children,
}: DomesticScreenProps) {
  const [panel, setPanel] = useState<BuildPanel | null>(null)
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
  const showBuildPanel = panel?.kind === 'add' ? canAdd : Boolean(upgradeBase) && !construction
  const panelOptions = upgradeBase ? upgradesOf(upgradeBase.id) : addOptions
  const panelTitle = upgradeBase ? `${upgradeBase.name}のアップグレード` : '追加できる施設'

  const togglePanel = (next: BuildPanel) => setPanel(current => {
    if (!current || current.kind !== next.kind) return next
    if (current.kind === 'upgrade' && next.kind === 'upgrade' && current.building.id !== next.building.id) return next
    return null
  })

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
              <ThinFrame />
              <DomesticStatus stats={stats} population={city.population} supplies={city.supplies} gold={gold} />
            </div>

            <section className="norden-domestic-frame" data-testid="domestic-frame" aria-label="都市の施設">
              <ThinFrame />
              <header className="norden-domestic-frame-header">
                <h2 className="norden-domestic-frame-title">
                  {city.name}の施設
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

            {/* Lower area intentionally kept open for future knight domestic assignment slots */}
            <div className="norden-domestic-assignment-space" aria-hidden="true" />
          </div>

          {showBuildPanel && (
            <aside className="norden-domestic-build-panel" aria-label={panelTitle}>
              <ThinFrame />
              <header className="norden-domestic-build-header">
                <h3 className="norden-domestic-build-title">{panelTitle}</h3>
                <button
                  type="button"
                  className="norden-domestic-build-close"
                  aria-label="施設一覧を閉じる"
                  onClick={() => setPanel(null)}
                >
                  ×
                </button>
              </header>
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
