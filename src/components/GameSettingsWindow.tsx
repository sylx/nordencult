import { Button, ChoiceGroup, FactionMark, SettingsItem, SettingsSection, SettingsWindow, VolumeSlider, type ChoiceOption, type FactionView } from 'norden-ui'
import { DIFFICULTIES, DIFFICULTY_NAMES, type Difficulty } from '@norden/battle-runtime/cpu'
import { setVolume, useVolumes } from '../audio/volume'
import { BATTLE_SPEEDS, setBattleSetting, useBattleSettings } from '../settings/battleSettings'

const DIFFICULTY_OPTIONS: readonly ChoiceOption<Difficulty>[] = DIFFICULTIES.map((value) => ({ value, label: DIFFICULTY_NAMES[value] }))
const SPEED_OPTIONS: readonly ChoiceOption[] = BATTLE_SPEEDS.map((v) => ({ value: String(v), label: `×${v}` }))
const WATCH_OPTIONS: readonly ChoiceOption<'watch' | 'skip'>[] = [
  { value: 'watch', label: '観戦する' },
  { value: 'skip', label: '結果だけ' },
]

export interface GameSettingsWindowProps {
  onClose: () => void
  /** The strategy map: the player's faction, shown under ゲーム */
  player?: FactionView
  /** The strategy map: puts the windows the player moved back where they start (画面) */
  onResetLayout?: () => void
  /** In a battle, watching battles between CPU factions takes effect from the next one */
  inBattle?: boolean
}

/**
 * The settings window of the title, the strategy map and the battles (over their scene, which is position: relative):
 * the volumes, the battle settings, and on the strategy map the player's faction and resetting the layout
 */
export function GameSettingsWindow({ onClose, player, onResetLayout, inBattle = false }: GameSettingsWindowProps) {
  const { bgm, se } = useVolumes()
  const { difficulty, speed, watchCpuBattles } = useBattleSettings()
  return (
    <SettingsWindow onClose={onClose}>
      {player && (
        <SettingsSection title="ゲーム">
          <SettingsItem label="プレイヤーの勢力"><FactionMark faction={player} /></SettingsItem>
        </SettingsSection>
      )}
      <SettingsSection title="サウンド">
        <SettingsItem label="BGM">
          <VolumeSlider label="BGM" hideLabel value={bgm} onChange={(v) => setVolume('bgm', v)} />
        </SettingsItem>
        <SettingsItem label="効果音">
          <VolumeSlider label="効果音" hideLabel value={se} onChange={(v) => setVolume('se', v)} />
        </SettingsItem>
      </SettingsSection>
      <SettingsSection title="戦闘">
        <SettingsItem label="難易度" description="プレイヤーと戦う CPU の思考の巧さ">
          <ChoiceGroup label="難易度" options={DIFFICULTY_OPTIONS} value={difficulty} onChange={(v) => setBattleSetting('difficulty', v)} />
        </SettingsItem>
        <SettingsItem label="戦闘の速度" description="戦闘の途中でも変えられます">
          <ChoiceGroup label="戦闘の速度" options={SPEED_OPTIONS} value={String(speed)} onChange={(v) => setBattleSetting('speed', Number(v))} />
        </SettingsItem>
        <SettingsItem label="CPU同士の戦闘" description={inBattle ? '次の戦闘から変わります' : '結果だけなら戦闘画面を出さずに決着させます'}>
          <ChoiceGroup label="CPU同士の戦闘" options={WATCH_OPTIONS} value={watchCpuBattles ? 'watch' : 'skip'}
            onChange={(v) => setBattleSetting('watchCpuBattles', v === 'watch')} />
        </SettingsItem>
      </SettingsSection>
      {onResetLayout && (
        <SettingsSection title="画面">
          <SettingsItem label="UIの配置" description="動かしたウィンドウやバーを初めの位置に戻します">
            <Button size="small" onClick={onResetLayout}>UI位置の初期化</Button>
          </SettingsItem>
        </SettingsSection>
      )}
    </SettingsWindow>
  )
}
