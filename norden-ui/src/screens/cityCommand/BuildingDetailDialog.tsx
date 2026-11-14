import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Button from '../../components/parts/Button'
import InfoWindow from '../../components/window/InfoWindow'
import { BuildingImage, ConstructionProgress, workLabel } from '../../components/parts/BuildingSlots'
import type { BuildingView, ConstructionView } from '../types'
import './BuildingDetailDialog.css'

export interface BuildingDetailDialogProps {
  building: BuildingView
  /** The construction when the building is the one being built (its progress is shown) */
  work?: ConstructionView
  /** 内政を開く (the dialog closes first); omitted for a city the player cannot manage */
  onOpenDomestic?: () => void
  /** 閉じる, Escape or a click on the mask */
  onClose: () => void
}

/**
 * A building's details over the whole page in the middle of the mask, in the medium-framed window titled
 * 施設詳細：<name>: its picture large on the left, and on the right what it gives, its description and, if it is
 * being built, the construction's progress. Escape closes it without reaching the screen under it
 */
export default function BuildingDetailDialog({ building, work, onOpenDomestic, onClose }: BuildingDetailDialogProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopImmediatePropagation()
      onClose()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onClose])

  const title = `施設詳細：${building.name}`
  return createPortal(
    <div className="norden-building-detail-backdrop" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="norden-building-detail-wrap" onClick={event => event.stopPropagation()}>
        <InfoWindow title={title} draggable={false} minWidth={480} maxWidth={760} minHeight={0} className="norden-building-detail">
          <div className="norden-building-detail-layout">
            <div className="norden-building-detail-figure">
              <BuildingImage building={building} className="norden-building-detail-image" />
            </div>
            <div className="norden-building-detail-body">
              {work && <p className="norden-building-detail-badge">{work.paused ? `${workLabel(work)}中（一時停止）` : `${workLabel(work)}中`}</p>}
              {building.effects && building.effects.length > 0 && (
                <ul className="norden-building-detail-effects" aria-label="効果">
                  {building.effects.map(effect => <li key={effect}>{effect}</li>)}
                </ul>
              )}
              {building.description && <p className="norden-building-detail-desc">{building.description}</p>}
              {work && <ConstructionProgress invested={work.invested} required={work.required} turnsLeft={work.paused ? undefined : work.turnsLeft} />}
              <div className="norden-building-detail-actions">
                {onOpenDomestic && <Button size="small" onClick={() => {
                  onClose()
                  onOpenDomestic()
                }}>内政を開く</Button>}
                <Button size="small" variant="primary" autoFocus onClick={onClose}>閉じる</Button>
              </div>
            </div>
          </div>
        </InfoWindow>
      </div>
    </div>,
    document.body,
  )
}
