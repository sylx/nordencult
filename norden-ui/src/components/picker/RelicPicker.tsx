import RelicRow, { type RelicRowData } from '../parts/RelicRow'
import './Picker.css'

/** A relic to choose */
export interface RelicPickItem extends RelicRowData {
  /** Under the name, e.g. 修復済み, エルヴィンが装備中 */
  label?: string
  /** Why it cannot be chosen: shown in place of the label, greyed out */
  disabledReason?: string
}

export interface RelicPickerProps {
  items: readonly RelicPickItem[]
  /** The id chosen; null: none */
  selectedId: string | null
  onSelect: (id: string) => void
  /** The list's name */
  label?: string
  /** Shown when there is nothing to choose */
  emptyText?: string
}

/** A list of relics to choose one from (each as on the relic screen), those that cannot be chosen greyed out with why */
export default function RelicPicker({ items, selectedId, onSelect, label = '遺物', emptyText = '選べる遺物はありません。' }: RelicPickerProps) {
  if (items.length === 0) return <p className="norden-picker-empty">{emptyText}</p>
  return (
    <ul className="norden-relic-picker" aria-label={label}>
      {items.map(item => (
        <li key={item.id}>
          <RelicRow relic={item} label={item.disabledReason ?? item.label ?? ''} disabled={Boolean(item.disabledReason)}
            selected={item.id === selectedId} onSelect={() => onSelect(item.id)} />
        </li>
      ))}
    </ul>
  )
}
