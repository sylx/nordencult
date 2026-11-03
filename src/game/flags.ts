import { GameRuleError } from './errors'
import type { GameState } from './types'

/** A flag's value: a count or a yes/no */
export type FlagValue = number | boolean

/** '<scene id>:<name>', e.g. 'travelingMerchant:met' */
const FLAG_KEY = /^[A-Za-z]\w*:[A-Za-z]\w*$/

export const isFlagKey = (key: string) => FLAG_KEY.test(key)

/** A flag of the dialogue scenes; undefined: never set */
export const flagOf = (state: GameState, key: string): FlagValue | undefined => state.flags[key]

/** Sets a flag ('<scene id>:<name>') */
export function setFlag(state: GameState, key: string, value: FlagValue): GameState {
  if (!isFlagKey(key)) throw new GameRuleError(`フラグの名前は <シーン id>:<名前> にしてください: ${key}`)
  if (typeof value === 'number' && !Number.isFinite(value)) throw new GameRuleError(`フラグ ${key} の値が数ではありません`)
  return { ...state, flags: { ...state.flags, [key]: value } }
}

/** Takes a flag away, as if never set */
export function clearFlag(state: GameState, key: string): GameState {
  if (!(key in state.flags)) return state
  return { ...state, flags: Object.fromEntries(Object.entries(state.flags).filter(([k]) => k !== key)) }
}
