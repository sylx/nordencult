import type { ReactNode } from 'react'
import { ChoiceGroup, type ChoiceOption } from 'norden-ui'
import { DIFFICULTIES, DIFFICULTY_NAMES, type Difficulty } from '@norden/battle-runtime/cpu'
import { BATTLE_SPEEDS, setBattleSetting, useBattleSettings } from '../settings/battleSettings'
import './BattleSettings.css'

const DIFFICULTY_OPTIONS: readonly ChoiceOption<Difficulty>[] = DIFFICULTIES.map((value) => ({ value, label: DIFFICULTY_NAMES[value] }))
const SPEED_OPTIONS: readonly ChoiceOption[] = BATTLE_SPEEDS.map((v) => ({ value: String(v), label: `×${v}` }))
const WATCH_OPTIONS: readonly ChoiceOption<'watch' | 'skip'>[] = [
  { value: 'watch', label: '観戦する', title: 'CPU の勢力どうしの戦闘も戦闘画面で最後まで見る（CPU の番はスキップできる）' },
  { value: 'skip', label: '結果だけ', title: 'CPU の勢力どうしの戦闘は戦闘画面を出さずに決着させ、結果だけを見る' },
]

/** A labeled row of choices, laid out as the volume sliders are */
function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="battle-settings__row">
      <span className="battle-settings__label">{label}</span>
      {children}
    </div>
  )
}

/**
 * The battle settings (on dark panels): the difficulty of the CPU armies fighting the player (戦闘難易度),
 * the speed of the animations, and whether battles between CPU factions are watched.
 * `inBattle` leaves out the last, which only takes effect from the next battle
 */
export function BattleSettings({ inBattle = false }: { inBattle?: boolean }) {
  const { difficulty, speed, watchCpuBattles } = useBattleSettings()
  return (
    <div className="battle-settings">
      <SettingRow label="戦闘難易度">
        <ChoiceGroup label="戦闘難易度" options={DIFFICULTY_OPTIONS} value={difficulty} onChange={(v) => setBattleSetting('difficulty', v)} />
      </SettingRow>
      <SettingRow label="戦闘の速度">
        <ChoiceGroup label="戦闘の速度" options={SPEED_OPTIONS} value={String(speed)} onChange={(v) => setBattleSetting('speed', Number(v))} />
      </SettingRow>
      {!inBattle && (
        <SettingRow label="CPU同士の戦闘">
          <ChoiceGroup label="CPU同士の戦闘" options={WATCH_OPTIONS} value={watchCpuBattles ? 'watch' : 'skip'}
            onChange={(v) => setBattleSetting('watchCpuBattles', v === 'watch')} />
        </SettingRow>
      )}
    </div>
  )
}
