import type { EquippedRelicView } from '../../screens/types'
import { BuildingImage } from './BuildingSlots'
import Button from './Button'
import { RelicRarity } from './RelicRow'
import './EquipmentSlots.css'

export interface EquipmentSlotsProps {
  /** Each slot in order: the relic in it, or null when empty */
  slots: readonly (EquippedRelicView | null)[]
  /** Why they cannot be changed now: shown under them, and the slots cannot be pressed */
  disabledReason?: string
  /** A slot was pressed (to choose what goes in it). Omitted: the slots cannot be pressed */
  onPick?: (slot: number) => void
  /** 外す on a slot holding a relic. Omitted: no such button */
  onRemove?: (slot: number) => void
}

/**
 * A knight's equipment slots, one row each on the parchment: the slot's number, the relic's picture, name, rarity
 * and what it gives (or 空き), pressed to choose; 外す at the row's end
 */
export default function EquipmentSlots({ slots, disabledReason, onPick, onRemove }: EquipmentSlotsProps) {
  const locked = Boolean(disabledReason) || !onPick
  return (
    <div className="norden-equipment">
      <ul className="norden-equipment-slots" aria-label="装備">
        {slots.map((relic, slot) => (
          <li key={slot} className={`norden-equipment-slot ${relic ? 'is-filled' : 'is-empty'} ${locked ? 'is-locked' : ''}`}>
            <button type="button" className="norden-equipment-slot-button" disabled={locked} aria-label={`装備の枠${slot + 1}：${relic?.name ?? '空き'}`}
              onClick={() => onPick?.(slot)}>
              <span className="norden-equipment-slot-number" aria-hidden="true">{slot + 1}</span>
              {relic
                ? <>
                  <BuildingImage building={relic} className="norden-equipment-slot-image" />
                  <span className="norden-equipment-slot-body">
                    <span className="norden-equipment-slot-name">{relic.name}<RelicRarity rarity={relic.rarity} /></span>
                    {relic.effects && relic.effects.length > 0 && <span className="norden-equipment-slot-effects">
                      {relic.effects.map(effect => <span key={effect} className="norden-equipment-slot-effect">{effect}</span>)}
                    </span>}
                  </span>
                </>
                : <span className="norden-equipment-slot-empty">{locked ? '空き' : '空き ― 押して遺物を装備'}</span>}
            </button>
            {relic && onRemove && !disabledReason && (
              <Button size="small" className="norden-equipment-slot-remove" aria-label={`${relic.name}を外す`} onClick={() => onRemove(slot)}>外す</Button>
            )}
          </li>
        ))}
      </ul>
      {disabledReason && <p className="norden-equipment-reason" role="note">{disabledReason}</p>}
    </div>
  )
}
