import { Fragment, useEffect } from 'react'
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
  className?: string
  style?: CSSProperties
}

/**
 * Draws the top screen of the stack as a layer covering its container (give the container `position: relative`).
 * The layer lets pointer events through to the map below; windows and toolbars catch them.
 */
export default function ScreenHost<S extends ScreenMap>({ nav, screens, escapeToPop = true, className = '', style }: ScreenHostProps<S>) {
  const { top, canPop, pop } = nav

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

  const render = screens[top.screen] as (params: unknown, entry: ScreenEntry<S>) => ReactNode
  return (
    <div className={`norden-screen-host ${className}`} style={style} data-screen={String(top.screen)}>
      <Fragment key={top.key}>{render(top.params, top)}</Fragment>
    </div>
  )
}
