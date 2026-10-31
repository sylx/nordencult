import type { ReactNode } from 'react'
import type { BuildingView, CityBuildingsView, ConstructionView } from '../../screens/types'
import './BuildingSlots.css'

export interface BuildingSlotsProps {
  buildings: CityBuildingsView
  /** Makes the built buildings and the construction buttons (e.g. to show their details) */
  onSelect?: (buildingId: string) => void
  /** The building highlighted, e.g. the one whose details are shown */
  selectedId?: string
  className?: string
}

/** Where a cell sits on its sheet as a background-position percentage (0% when the cell spans the sheet) */
const spriteOffset = (position: number, cell: number, sheet: number) => (sheet > cell ? `${(position / (sheet - cell)) * 100}%` : '0%')

/**
 * The picture of a building: its cell of the sprite sheet fitted to the tile's width
 * (the tall picture cut top and bottom), or its initial on a plain tile
 */
export function BuildingImage({ building, className = '' }: { building: BuildingView; className?: string }) {
  const image = building.image
  if (!image) return <span className={`norden-building-image is-placeholder ${className}`} aria-hidden="true">{building.name.slice(0, 1)}</span>
  return (
    <span className={`norden-building-image is-sprite ${className}`} aria-hidden="true">
      <span className="norden-building-image-cell" style={{
        aspectRatio: `${image.width} / ${image.height}`,
        backgroundImage: `url(${JSON.stringify(image.src)})`,
        backgroundSize: `${(image.sheetWidth / image.width) * 100}% ${(image.sheetHeight / image.height) * 100}%`,
        backgroundPosition: `${spriteOffset(image.x, image.width, image.sheetWidth)} ${spriteOffset(image.y, image.height, image.sheetHeight)}`,
      }} />
    </span>
  )
}

/** A relic repaired or produced: in the place of a building, but in no slot */
export const isRelicWork = (construction: ConstructionView) => construction.kind === 'relicRepair' || construction.kind === 'relicProduction'

/** What the work is called: 建設, 修復 or 生産 */
export const workLabel = ({ kind }: ConstructionView) => (kind === 'relicRepair' ? '修復' : kind === 'relicProduction' ? '生産' : '建設')

/** Why nothing else can be started in the city */
export const workBusyReason = (construction: ConstructionView) =>
  (isRelicWork(construction) ? `ほかの遺物を${workLabel(construction)}中です` : 'ほかの施設を建設中です')

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
 * construction (with its progress) and the empty slots. An upgrade under construction
 * is built over the building it upgrades, in its slot (taking no slot of its own);
 * a relic repaired or produced takes none either, drawn after the buildings
 */
export default function BuildingSlots({ buildings, onSelect, selectedId, className = '' }: BuildingSlotsProps) {
  const { slots, built, construction } = buildings
  const upgradingId = construction?.building.upgradeFrom && built.some(building => building.id === construction.building.upgradeFrom)
    ? construction.building.upgradeFrom
    : undefined
  const inSlot = construction && !upgradingId && !isRelicWork(construction)
  const empty = Math.max(0, slots - built.length - (inSlot ? 1 : 0))
  const tile = (building: BuildingView, body: ReactNode, extra = '') => {
    const classes = `norden-building-slot ${extra} ${selectedId === building.id ? 'is-selected' : ''}`
    return onSelect
      ? <button type="button" className={classes} title={building.description} onClick={() => onSelect(building.id)}>{body}</button>
      : <div className={classes} title={building.description}>{body}</div>
  }
  const constructionTile = (current: ConstructionView, upgradedFrom?: BuildingView) =>
    tile(current.building, <>
      <BuildingImage building={current.building} />
      <span className="norden-building-slot-name">{current.building.name}</span>
      <span className="norden-building-slot-badge">{upgradedFrom ? 'アップグレード中' : `${workLabel(current)}中`}</span>
      <ConstructionProgress invested={current.invested} required={current.required} turnsLeft={current.turnsLeft} />
    </>, 'is-building')
  return (
    <ul className={`norden-building-slots ${className}`} aria-label={`施設 ${built.length} / ${slots}`}>
      {built.map(building => (
        <li key={building.id}>
          {construction && building.id === upgradingId ? constructionTile(construction, building) : tile(building, <>
            <BuildingImage building={building} />
            <span className="norden-building-slot-name">{building.name}</span>
          </>)}
        </li>
      ))}
      {construction && !upgradingId && <li>{constructionTile(construction)}</li>}
      {Array.from({ length: empty }, (_, index) => (
        <li key={`empty-${index}`}><div className="norden-building-slot is-empty"><span>空き</span></div></li>
      ))}
    </ul>
  )
}
