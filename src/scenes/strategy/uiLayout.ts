import { useSyncExternalStore } from 'react'
import type { CityCommandLayout } from 'norden-ui'

/** Where the player put the windows of the strategy screen, kept in the browser between plays */
export interface StrategyLayout extends CityCommandLayout {
  /** The 行動予約 list folded down to its title */
  ordersMinimized?: boolean
}

/** The room on the screen differs with these, so each keeps a layout of its own */
export type DisplayMode = 'windowed' | 'fullscreen'

const STORAGE_KEYS: Record<DisplayMode, string> = {
  windowed: 'nordencult:strategy-layout:windowed',
  fullscreen: 'nordencult:strategy-layout:fullscreen',
}
const PARTS = ['window', 'factionBar', 'toolbar', 'knightProfile'] as const
const listeners = new Set<() => void>()

const isPosition = (v: unknown): v is { x: number; y: number } => {
  const { x, y } = (v ?? {}) as { x?: unknown; y?: unknown }
  return Number.isFinite(x) && Number.isFinite(y)
}

function load(mode: DisplayMode): StrategyLayout {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS[mode]) ?? '{}') as Record<string, unknown>
    return {
      ...Object.fromEntries(PARTS.filter((part) => isPosition(saved[part])).map((part) => [part, saved[part]])),
      ...(typeof saved.ordersMinimized === 'boolean' && { ordersMinimized: saved.ordersMinimized }),
    }
  } catch {
    return {}
  }
}

const layouts: Record<DisplayMode, StrategyLayout> = { windowed: load('windowed'), fullscreen: load('fullscreen') }

function notify() {
  for (const listener of listeners) listener()
}

export function getLayout(mode: DisplayMode): StrategyLayout {
  return layouts[mode]
}

export function updateLayout(mode: DisplayMode, change: StrategyLayout): void {
  layouts[mode] = { ...layouts[mode], ...change }
  try {
    localStorage.setItem(STORAGE_KEYS[mode], JSON.stringify(layouts[mode]))
  } catch {
    // Not kept for the next play; this one still uses it
  }
  notify()
}

/** Everything back where it starts, for this mode only */
export function resetLayout(mode: DisplayMode): void {
  layouts[mode] = {}
  try {
    localStorage.removeItem(STORAGE_KEYS[mode])
  } catch {
    // The old layout comes back next play; this one still starts over
  }
  notify()
}

function subscribeLayouts(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The game has no fullscreen of its own: the browser's (F11) shows only as the page filling the screen */
function displayMode(): DisplayMode {
  const full = document.fullscreenElement !== null || matchMedia('(display-mode: fullscreen)').matches
    || (innerWidth === screen.width && innerHeight === screen.height)
  return full ? 'fullscreen' : 'windowed'
}

function subscribeDisplayMode(listener: () => void) {
  window.addEventListener('resize', listener)
  document.addEventListener('fullscreenchange', listener)
  return () => {
    window.removeEventListener('resize', listener)
    document.removeEventListener('fullscreenchange', listener)
  }
}

/** The layout of the mode the game is shown in now */
export function useStrategyLayout() {
  const mode = useSyncExternalStore(subscribeDisplayMode, displayMode)
  const layout = useSyncExternalStore(subscribeLayouts, () => getLayout(mode))
  return {
    layout,
    updateLayout: (change: StrategyLayout) => updateLayout(mode, change),
    resetLayout: () => resetLayout(mode),
  }
}
