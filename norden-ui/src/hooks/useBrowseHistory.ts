import { useState } from 'react'

export interface BrowseHistory<T> {
  /** The entry shown now; undefined while nothing is open */
  current: T | undefined
  canBack: boolean
  canForward: boolean
  /** Opens an entry: a closed history starts afresh, an open one drops the entries ahead and adds it (unless it is the current one) */
  show: (entry: T) => void
  back: () => void
  forward: () => void
  /** Forgets the whole history */
  close: () => void
}

/** Back/forward history of the entries a window shows, like a browser's, kept only while it is open */
export function useBrowseHistory<T>(): BrowseHistory<T> {
  const [history, setHistory] = useState<{ entries: readonly T[]; index: number } | null>(null)
  return {
    current: history?.entries[history.index],
    canBack: history !== null && history.index > 0,
    canForward: history !== null && history.index < history.entries.length - 1,
    show: entry => setHistory(state => {
      if (!state) return { entries: [entry], index: 0 }
      if (Object.is(state.entries[state.index], entry)) return state
      return { entries: [...state.entries.slice(0, state.index + 1), entry], index: state.index + 1 }
    }),
    back: () => setHistory(state => state && state.index > 0 ? { ...state, index: state.index - 1 } : state),
    forward: () => setHistory(state => state && state.index < state.entries.length - 1 ? { ...state, index: state.index + 1 } : state),
    close: () => setHistory(null),
  }
}
