import { useSyncExternalStore } from 'react'
import { DIFFICULTIES, type Difficulty } from '@norden/battle-runtime/cpu'

/** Settings of the battles, kept in the browser between plays */
export interface BattleSettings {
  /** How well the CPU armies fighting the player think (戦闘難易度. Their numbers stay the same) */
  difficulty: Difficulty
  /** Speed of the battle's animations (the player's actions too). Changes take effect during a battle */
  speed: number
  /** Battles between CPU factions are fought out on the battle screen; otherwise decided without drawing them */
  watchCpuBattles: boolean
}

/** The speeds to choose from (as the battle-editor's) */
export const BATTLE_SPEEDS = [0.5, 1, 1.5, 2, 3] as const

/** How well the CPUs think in battles between CPU factions (not the player's difficulty, so it does not change the world) */
export const CPU_BATTLE_DIFFICULTY: Difficulty = 'normal'

const STORAGE_KEY = 'nordencult:battle'
export const DEFAULT_BATTLE_SETTINGS: BattleSettings = { difficulty: 'normal', speed: 1, watchCpuBattles: false }
const listeners = new Set<() => void>()

/** Saved settings, each value falling back to its default when missing or not one of the choices */
export function parseBattleSettings(saved: unknown): BattleSettings {
  const v = (saved && typeof saved === 'object' ? saved : {}) as Partial<Record<keyof BattleSettings, unknown>>
  const d = DEFAULT_BATTLE_SETTINGS
  return {
    difficulty: DIFFICULTIES.includes(v.difficulty as Difficulty) ? v.difficulty as Difficulty : d.difficulty,
    speed: BATTLE_SPEEDS.includes(v.speed as (typeof BATTLE_SPEEDS)[number]) ? v.speed as number : d.speed,
    watchCpuBattles: typeof v.watchCpuBattles === 'boolean' ? v.watchCpuBattles : d.watchCpuBattles,
  }
}

function load(): BattleSettings {
  try {
    return parseBattleSettings(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'))
  } catch {
    return DEFAULT_BATTLE_SETTINGS
  }
}

let settings = load()

export function getBattleSettings(): BattleSettings {
  return settings
}

export function setBattleSetting<K extends keyof BattleSettings>(key: K, value: BattleSettings[K]): void {
  settings = parseBattleSettings({ ...settings, [key]: value })
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Not kept for the next play; this one still uses it
  }
  for (const listener of listeners) listener()
}

export function subscribeBattleSettings(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useBattleSettings(): BattleSettings {
  return useSyncExternalStore(subscribeBattleSettings, getBattleSettings)
}
