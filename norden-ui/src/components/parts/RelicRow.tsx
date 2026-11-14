import type { RelicRarityView, SpriteImage } from '../../screens/types'
import { BuildingImage } from './BuildingSlots'
import './RelicRow.css'

/** What a row draws of a relic */
export interface RelicRowData {
  id: string
  name: string
  /** Its picture on the game's relic sheet */
  image?: SpriteImage
  rarity: RelicRarityView
}

/** A relic's rarity as a small colored tag */
export function RelicRarity({ rarity }: { rarity: RelicRarityView }) {
  return <span className={`norden-relic-rarity is-${rarity}`} aria-label={`レアリティ ${rarity}`}>{rarity}</span>
}

export interface RelicRowProps {
  relic: RelicRowData
  /** Under the name, e.g. how it stands (修復済み) or its cost; also in the button's name: 名前（label） */
  label: string
  /** A modifier class for its colors, e.g. is-repaired */
  status?: string
  selected: boolean
  /** Cannot be chosen (greyed out; the label should say why) */
  disabled?: boolean
  onSelect: () => void
}

/** A relic as a row to choose: its picture, name, a line under it and its rarity (the relic screen's lists, RelicPicker) */
export default function RelicRow({ relic, label, status = '', selected, disabled = false, onSelect }: RelicRowProps) {
  return (
    <button type="button" className={`norden-relic-row ${status} ${selected ? 'is-selected' : ''} ${disabled ? 'is-disabled' : ''}`}
      aria-label={`${relic.name}（${label}）`} aria-pressed={selected} disabled={disabled} onClick={onSelect}>
      <BuildingImage building={relic} className="norden-relic-row-image" />
      <span className="norden-relic-row-body">
        <span className="norden-relic-row-name">{relic.name}</span>
        <span className="norden-relic-row-status">{label}</span>
      </span>
      <RelicRarity rarity={relic.rarity} />
    </button>
  )
}
