import KnightCard from '../../components/parts/KnightCard'
import FactionMark from '../../components/parts/FactionMark'
import type { KnightView } from '../types'

export interface PrisonerPickerProps {
  /** Prisoners held in the starting city. Those with `unavailableReason` are shown but cannot be picked */
  prisoners: readonly KnightView[]
  /** Ids picked, in any order */
  picked: readonly string[]
  onToggle: (id: string) => void
  /** None can be picked (e.g. riding alone), with why */
  disabledReason?: string
}

/** The prisoners to take along on a move or a transport (several), on a parchment card like the soldiers and supplies */
export default function PrisonerPicker({ prisoners, picked, onToggle, disabledReason }: PrisonerPickerProps) {
  const count = prisoners.filter(prisoner => picked.includes(prisoner.id)).length
  return (
    <div className={`norden-move-prisoners ${disabledReason ? 'is-disabled' : ''}`}>
      <header>
        <b>連れて行く捕虜</b>
        <span>{disabledReason ?? `${count}人を選択`}</span>
      </header>
      <ul className="norden-move-list" aria-label="連れて行く捕虜">
        {prisoners.map(prisoner => (
          <li key={prisoner.id}>
            <KnightCard knight={prisoner} compact
              selection={{
                selected: !disabledReason && picked.includes(prisoner.id),
                disabled: Boolean(disabledReason || prisoner.unavailableReason), onToggle: () => onToggle(prisoner.id),
              }}
              aside={<span className="norden-move-reason">
                {prisoner.unavailableReason ?? (prisoner.faction ? <FactionMark faction={prisoner.faction} /> : '在野')}
              </span>} />
          </li>
        ))}
      </ul>
    </div>
  )
}
