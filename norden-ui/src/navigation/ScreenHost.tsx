import { useEffect } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { ScreenEntry, ScreenMap, ScreenStack } from './useScreenStack'
import './ScreenHost.css'

/** How to draw each screen from its params */
export type ScreenRenderers<S extends ScreenMap> = { [K in keyof S]: (params: S[K], entry: ScreenEntry<S>) => ReactNode }

export interface ScreenHostProps<S extends ScreenMap> {
  nav: ScreenStack<S>
  screens: ScreenRenderers<S>
  /** Esc goes back one screen. Handlers that use Esc themselves call `event.preventDefault()` to keep the screen */
  escapeToPop?: boolean
  /**
   * Screens drawn over the screen below them instead of replacing it (e.g. a full-screen window opened by a command).
   * The screen below stays mounted and shows only its bottom toolbar row, which the overlay leaves uncovered
   */
  overlays?: readonly (keyof S)[]
  className?: string
  style?: CSSProperties
}

/**
 * Draws the top screen of the stack as a layer covering its container (give the container `position: relative`),
 * over the screens below it while it is an overlay.
 * The layers let pointer events through to the map below; windows and toolbars catch them.
 */
export default function ScreenHost<S extends ScreenMap>({ nav, screens, escapeToPop = true, overlays = [], className = '', style }: ScreenHostProps<S>) {
  const { stack, top, canPop, pop } = nav

  useEffect(() => {
    if (!escapeToPop || !canPop) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      pop()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [escapeToPop, canPop, pop])

  // From the nearest screen that is not an overlay up to the top
  let base = stack.length - 1
  while (base > 0 && overlays.includes(stack[base]!.screen)) base--
  const shown = stack.slice(base)

  return (
    <div className={`norden-screen-host ${className}`} style={style} data-screen={String(top.screen)}>
      {shown.map(entry => {
        const render = screens[entry.screen] as (params: unknown, entry: ScreenEntry<S>) => ReactNode
        const covered = entry !== top
        return (
          <div key={entry.key} className={`norden-screen-layer ${covered ? 'is-covered' : ''}`} data-screen={String(entry.screen)}>
            {render(entry.params, entry)}
          </div>
        )
      })}
    </div>
  )
}
