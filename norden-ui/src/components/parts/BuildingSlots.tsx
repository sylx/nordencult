import type { ReactNode } from 'react'
import type { BuildingView, CityBuildingsView } from '../../screens/types'
import './BuildingSlots.css'

export interface BuildingSlotsProps {
  buildings: CityBuildingsView
  /** Makes the built buildings and the construction buttons (e.g. to show their details) */
  onSelect?: (buildingId: string) => void
  /** The building highlighted, e.g. the one whose details are shown */
  selectedId?: string
  className?: string
}

/** The picture of a building: its image, or its initial on a plain tile */
export function BuildingImage({ building, className = '' }: { building: BuildingView; className?: string }) {
  return building.image
    ? <img className={`norden-building-image ${className}`} src={building.image} alt="" />
    : <span className={`norden-building-image is-placeholder ${className}`} aria-hidden="true">{building.name.slice(0, 1)}</span>
}

/** Progress of a construction: a bar of the supplies put in, and the turns left */
export function ConstructionProgress({ invested, required, turnsLeft }: { invested: number; required: number; turnsLeft?: number | null }) {
  const ratio = required > 0 ? Math.min(1, invested / required) : 0
  return (
    <span className="norden-construction-progress">
      <span className="norden-construction-progress-bar" role="progressbar" aria-label="建設の進捗"
        aria-valuemin={0} aria-valuemax={required} aria-valuenow={Math.min(invested, required)}>
        <span style={{ width: `${ratio * 100}%` }} />
      </span>
      <span className="norden-construction-progress-text">
        {invested.toLocaleString()} / {required.toLocaleString()}
        {turnsLeft !== undefined && <>　{turnsLeft === null ? '完成の見込みなし' : `あと${turnsLeft}ターン`}</>}
      </span>
    </span>
  )
}

/**
 * A city's building slots in order: the buildings standing, the one under
 * construction (with its progress) and the empty slots
 */
export default function BuildingSlots({ buildings, onSelect, selectedId, className = '' }: BuildingSlotsProps) {
  const { slots, built, construction } = buildings
  const empty = Math.max(0, slots - built.length - (construction ? 1 : 0))
  const tile = (building: BuildingView, body: ReactNode, extra = '') => {
    const classes = `norden-building-slot ${extra} ${selectedId === building.id ? 'is-selected' : ''}`
    return onSelect
      ? <button type="button" className={classes} title={building.description} onClick={() => onSelect(building.id)}>{body}</button>
      : <div className={classes} title={building.description}>{body}</div>
  }
  return (
    <ul className={`norden-building-slots ${className}`} aria-label={`施設 ${built.length} / ${slots}`}>
      {built.map(building => (
        <li key={building.id}>
          {tile(building, <>
            <BuildingImage building={building} />
            <span className="norden-building-slot-name">{building.name}</span>
          </>)}
        </li>
      ))}
      {construction && (
        <li>
          {tile(construction.building, <>
            <BuildingImage building={construction.building} />
            <span className="norden-building-slot-name">{construction.building.name}</span>
            <span className="norden-building-slot-badge">建設中</span>
            <ConstructionProgress invested={construction.invested} required={construction.required} turnsLeft={construction.turnsLeft} />
          </>, 'is-building')}
        </li>
      )}
      {Array.from({ length: empty }, (_, index) => (
        <li key={`empty-${index}`}><div className="norden-building-slot is-empty"><span>空き</span></div></li>
      ))}
    </ul>
  )
}
