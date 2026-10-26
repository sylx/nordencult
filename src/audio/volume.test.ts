import { describe, expect, it, vi } from 'vitest'
import { getVolumes, setVolume, subscribeVolumes, volumeGain } from './volume'

describe('volumes', () => {
  it('clamps to 0..1 and tells the listeners', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeVolumes(listener)
    setVolume('bgm', 1.4)
    setVolume('se', -0.2)
    expect(getVolumes()).toEqual({ bgm: 1, se: 0 })
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
    setVolume('bgm', 0.5)
    expect(listener).toHaveBeenCalledTimes(2)
    expect(getVolumes().bgm).toBe(0.5)
  })

  it('makes the middle of the slider a quarter of the gain', () => {
    expect(volumeGain(0.5)).toBe(0.25)
    expect(volumeGain(1)).toBe(1)
  })
})
