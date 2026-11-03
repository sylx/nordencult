import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const WINDOWED = 'nordencult:strategy-layout:windowed'
const FULLSCREEN = 'nordencult:strategy-layout:fullscreen'

describe('uiLayout', () => {
  let saved: Map<string, string>

  beforeEach(() => {
    saved = new Map()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
      removeItem: (key: string) => saved.delete(key),
    })
    vi.resetModules()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('keeps the windowed and fullscreen layouts apart', async () => {
    const { getLayout, updateLayout } = await import('./uiLayout')
    updateLayout('windowed', { window: { x: 10, y: 20 } })
    updateLayout('fullscreen', { toolbar: { x: -5, y: 0 } })
    expect(getLayout('windowed')).toEqual({ window: { x: 10, y: 20 } })
    expect(getLayout('fullscreen')).toEqual({ toolbar: { x: -5, y: 0 } })
  })

  it('loads what was kept in an earlier play, part by part', async () => {
    const { updateLayout } = await import('./uiLayout')
    updateLayout('windowed', { factionBar: { x: 1, y: 2 } })
    updateLayout('windowed', { ordersMinimized: true })
    vi.resetModules()
    const { getLayout } = await import('./uiLayout')
    expect(getLayout('windowed')).toEqual({ factionBar: { x: 1, y: 2 }, ordersMinimized: true })
    expect(getLayout('fullscreen')).toEqual({})
  })

  it('resets only the mode asked for', async () => {
    const { getLayout, resetLayout, updateLayout } = await import('./uiLayout')
    updateLayout('windowed', { window: { x: 10, y: 20 } })
    updateLayout('fullscreen', { window: { x: 30, y: 40 } })
    resetLayout('windowed')
    expect(getLayout('windowed')).toEqual({})
    expect(saved.has(WINDOWED)).toBe(false)
    expect(getLayout('fullscreen')).toEqual({ window: { x: 30, y: 40 } })
    expect(saved.has(FULLSCREEN)).toBe(true)
  })

  it('leaves out what it cannot read', async () => {
    saved.set(WINDOWED, JSON.stringify({ window: { x: 'left', y: 20 }, toolbar: { x: 3, y: 4 }, ordersMinimized: 'yes' }))
    saved.set(FULLSCREEN, '{broken')
    const { getLayout } = await import('./uiLayout')
    expect(getLayout('windowed')).toEqual({ toolbar: { x: 3, y: 4 } })
    expect(getLayout('fullscreen')).toEqual({})
  })
})
