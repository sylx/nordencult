import { BattleSettings } from './BattleSettings'
import { SoundSettings } from './SoundSettings'

/** Everything of the settings window (on dark panels): the volumes and the battle settings */
export function GameSettings({ inBattle = false }: { inBattle?: boolean }) {
  return (
    <>
      <SoundSettings />
      <BattleSettings inBattle={inBattle} />
    </>
  )
}
