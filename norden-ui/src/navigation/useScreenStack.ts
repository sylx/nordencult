import { useCallback, useMemo, useRef, useState } from 'react'

/** Screen names and the params each one takes, e.g. `{ cityCommand: { cityId: string }; invasion: { from: string; to: string } }` */
export type ScreenMap = Record<string, unknown>

/** A screen and its params (discriminated by `screen`) */
export type ScreenRoute<S extends ScreenMap> = { [K in keyof S]: { screen: K; params: S[K] } }[keyof S]

/** A screen on the stack. `key` is unique per push, so pushing the same screen again mounts it fresh */
export type ScreenEntry<S extends ScreenMap> = ScreenRoute<S> & { key: number }

export interface ScreenStack<S extends ScreenMap> {
  /** Bottom first */
  stack: readonly ScreenEntry<S>[]
  /** The screen shown */
  top: ScreenEntry<S>
  /** There is a screen to go back to */
  canPop: boolean
  push<K extends keyof S>(screen: K, params: S[K]): void
  /** Swap the top screen (e.g. switching to another city) */
  replace<K extends keyof S>(screen: K, params: S[K]): void
  /** Back one screen. The bottom screen stays */
  pop(): void
  /** Back to the nearest screen with this name (nothing happens when there is none) */
  popTo(screen: keyof S): void
  /** Start over from a single screen */
  reset<K extends keyof S>(screen: K, params: S[K]): void
}

/** A stack of screens: push to go deeper, pop (Esc in ScreenHost) to go back */
export function useScreenStack<S extends ScreenMap>(initial: ScreenRoute<S>): ScreenStack<S> {
  const serial = useRef(0)
  const [stack, setStack] = useState<readonly ScreenEntry<S>[]>(() => [{ ...initial, key: 0 }])
  const entry = useCallback(<K extends keyof S>(screen: K, params: S[K]) =>
    ({ screen, params, key: ++serial.current }) as unknown as ScreenEntry<S>, [])

  const push = useCallback(<K extends keyof S>(screen: K, params: S[K]) =>
    setStack(current => [...current, entry(screen, params)]), [entry])
  const replace = useCallback(<K extends keyof S>(screen: K, params: S[K]) =>
    setStack(current => [...current.slice(0, -1), entry(screen, params)]), [entry])
  const pop = useCallback(() => setStack(current => (current.length > 1 ? current.slice(0, -1) : current)), [])
  const popTo = useCallback((screen: keyof S) => setStack(current => {
    const index = current.map(item => item.screen).lastIndexOf(screen)
    return index < 0 ? current : current.slice(0, index + 1)
  }), [])
  const reset = useCallback(<K extends keyof S>(screen: K, params: S[K]) => setStack([entry(screen, params)]), [entry])

  return useMemo(() => ({
    stack, top: stack[stack.length - 1]!, canPop: stack.length > 1, push, replace, pop, popTo, reset,
  }), [stack, push, replace, pop, popTo, reset])
}
