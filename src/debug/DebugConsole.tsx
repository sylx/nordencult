import { useContext, useEffect, useRef, useState } from 'react'
import { GameContext } from '../game'
import { useScene } from '../scenes/sceneContext'
import type { DebugTerminal } from './terminal'
import './DebugConsole.css'

const takeKey = (event: KeyboardEvent) => {
  event.preventDefault()
  event.stopImmediatePropagation()
}

/**
 * The debug console over every scene, opened and closed with Ctrl+Alt+D. The terminal (xterm.js) is loaded when it
 * is first opened, and stays with what it showed
 */
export function DebugConsole() {
  const store = useContext(GameContext)
  const navigator = useScene()
  const element = useRef<HTMLDivElement>(null)
  const [opened, setOpened] = useState(false)
  const [open, setOpen] = useState(false)
  const [terminal, setTerminal] = useState<DebugTerminal | null>(null)
  // For what lives on through the scenes: the keys' listener and the commands' context
  const current = useRef({ navigator, open, terminal })
  useEffect(() => {
    current.current = { navigator, open, terminal }
  })

  // Registered once, before any dialog opens: a dialog takes Enter and Escape on the window before they reach the
  // terminal, so the console takes them first, while it has the focus
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'KeyD' && event.ctrlKey && event.altKey) {
        takeKey(event)
        setOpened(true)
        setOpen((value) => !value)
        return
      }
      const { open, terminal } = current.current
      if (!open || !terminal || event.isComposing || !element.current?.contains(event.target as Node)) return
      if (event.key === 'Escape') {
        takeKey(event)
        setOpen(false)
      } else if (event.key === 'Enter') {
        takeKey(event)
        terminal.input('\r')
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])

  // What is typed here stays here
  useEffect(() => {
    const root = element.current
    const stop = (event: KeyboardEvent) => event.stopPropagation()
    root?.addEventListener('keydown', stop)
    return () => root?.removeEventListener('keydown', stop)
  }, [])

  useEffect(() => {
    if (!opened || !store) return
    let cancelled = false
    let created: DebugTerminal | undefined
    import('./terminal').then(({ DebugTerminal }) => {
      if (cancelled || !element.current) return
      const terminal: DebugTerminal = new DebugTerminal(element.current, {
        store,
        navigator: () => current.current.navigator,
        clear: () => terminal.clear(),
        close: () => setOpen(false),
      })
      created = terminal
      setTerminal(terminal)
    }, (error: unknown) => console.error('デバッグコンソールを読み込めません', error))
    return () => {
      cancelled = true
      created?.dispose()
    }
  }, [opened, store])

  useEffect(() => {
    if (open) terminal?.show()
    else terminal?.hide()
  }, [open, terminal])

  return <div ref={element} className={`debug-console${open ? ' debug-console--open' : ''}`} aria-label="デバッグコンソール" />
}
