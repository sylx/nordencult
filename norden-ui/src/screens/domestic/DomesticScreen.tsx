import { useState, type ReactNode } from 'react'
import { BuildingImage, ConstructionProgress } from '../../components/parts/BuildingSlots'
import Button from '../../components/parts/Button'
import ThinFrame from '../../components/parts/ThinFrame'
import ConfirmDialog from '../../components/window/ConfirmDialog'
import WindowFrame from '../../components/window/WindowFrame'
import type { BuildOptionView, BuildingView, CityView } from '../types'
import '../screens.css'
import './DomesticScreen.css'

export interface DomesticScreenProps {
  /** The city whose domestic affairs are managed */
  city: CityView
  /** Buildings that can be constructed when adding to an empty slot */
  buildOptions?: readonly BuildOptionView[]
  /** Faction treasury gold (shown alongside the city's stockpiled supplies) */
  gold?: number
  /** Start constructing a building in the active empty slot */
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

/**
 * Domestic screen: full-screen window with the city's building slots at the top-left,
 * open space below for knight assignments, and a buildable-facilities panel on the right (30-40%) when adding.
 */
export default function DomesticScreen({
  city,
  buildOptions = [],
  gold,
  onBuild,
  onDemolish,
  onCancelConstruction,
  onPauseConstruction,
  onClose,
  children,
}: DomesticScreenProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [demolishTarget, setDemolishTarget] = useState<BuildingView | null>(null)

  const slots = city.buildings?.slots ?? 0
  const built = city.buildings?.built ?? []
  const construction = city.buildings?.construction ?? null
  const occupiedCount = built.length + (construction ? 1 : 0)
  const emptyCount = Math.max(0, slots - occupiedCount)
  const canAdd = !construction && emptyCount > 0
  const showBuildPanel = isAdding && canAdd
  const cancelRefund = construction ? Math.floor(construction.invested / 2) : 0

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
            <section className="norden-domestic-frame" data-testid="domestic-frame" aria-label="都市の施設">
              <ThinFrame />
              <header className="norden-domestic-frame-header">
                <h2 className="norden-domestic-frame-title">
                  {city.name}の施設
                  <span className="norden-domestic-slot-count">{built.length} / {slots}</span>
                </h2>
                <dl className="norden-domestic-resources">
                  {city.supplies !== undefined && (
                    <div>
                      <dt>備蓄物資</dt>
                      <dd>{city.supplies.toLocaleString()}</dd>
                    </div>
                  )}
                  {gold !== undefined && (
                    <div>
                      <dt>金</dt>
                      <dd>{gold.toLocaleString()}</dd>
                    </div>
                  )}
                </dl>
              </header>

              <ul className="norden-domestic-slots" aria-label={`施設スロット ${built.length} / ${slots}`}>
                {built.slice(0, slots).map(building => (
                  <li key={building.id} className="norden-domestic-slot-item">
                    <div className="norden-domestic-slot is-built">
                      <BuildingImage building={building} className="norden-domestic-slot-image" />
                      <span className="norden-domestic-slot-name">{building.name}</span>
                      {building.effects && building.effects.length > 0 && (
                        <span className="norden-domestic-slot-effects">{building.effects.join('・')}</span>
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
                  </li>
                ))}

                {construction && built.length < slots && (
                  <li key={`construction-${construction.building.id}`} className="norden-domestic-slot-item">
                    <div className={`norden-domestic-slot is-building ${construction.paused ? 'is-paused' : ''}`}>
                      <span className="norden-domestic-slot-badge">
                        {construction.paused ? '中断中' : '建設中'}
                      </span>
                      <BuildingImage building={construction.building} className="norden-domestic-slot-image" />
                      <span className="norden-domestic-slot-name">{construction.building.name}</span>
                      <ConstructionProgress
                        invested={construction.invested}
                        required={construction.required}
                        turnsLeft={construction.paused ? undefined : construction.turnsLeft}
                      />
                      <span className="norden-domestic-slot-note">
                        {construction.paused
                          ? '中断中（生産物資は備蓄へ）'
                          : `取消で物資 +${cancelRefund.toLocaleString()} が備蓄へ`}
                      </span>
                      <div className="norden-domestic-slot-actions">
                        <Button
                          size="small"
                          aria-label={`${construction.building.name}の建設を${construction.paused ? '再開' : '中断'}`}
                          onClick={() => onPauseConstruction?.(!construction.paused)}
                        >
                          {construction.paused ? '再開' : '中断'}
                        </Button>
                        <Button
                          size="small"
                          aria-label={`${construction.building.name}の建設を取り消す`}
                          title={`取り消すと費やした物資の半分（${cancelRefund.toLocaleString()}）が備蓄物資に戻ります`}
                          onClick={() => onCancelConstruction?.()}
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  </li>
                )}

                {Array.from({ length: emptyCount }, (_, index) => {
                  const isAddableSlot = index === 0 && !construction
                  return (
                    <li key={`empty-${index}`} className="norden-domestic-slot-item">
                      {isAddableSlot ? (
                        <button
                          type="button"
                          className={`norden-domestic-slot is-empty is-addable ${showBuildPanel ? 'is-selected' : ''}`}
                          aria-label="施設を追加"
                          aria-pressed={showBuildPanel}
                          onClick={() => setIsAdding(current => !current)}
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
            <aside className="norden-domestic-build-panel" aria-label="追加できる施設">
              <ThinFrame />
              <header className="norden-domestic-build-header">
                <h3 className="norden-domestic-build-title">追加できる施設</h3>
                <button
                  type="button"
                  className="norden-domestic-build-close"
                  aria-label="施設一覧を閉じる"
                  onClick={() => setIsAdding(false)}
                >
                  ×
                </button>
              </header>
              {buildOptions.length === 0 ? (
                <p className="norden-domestic-empty">追加できる施設はありません。</p>
              ) : (
                <ul className="norden-domestic-build-list">
                  {buildOptions.map(option => (
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
                        aria-label={`${option.name}を建設`}
                        onClick={() => {
                          setIsAdding(false)
                          onBuild?.(option.id)
                        }}
                      >
                        建設
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
