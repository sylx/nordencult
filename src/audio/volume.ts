import { useSyncExternalStore } from 'react'

/** Volumes 0..1, kept in the browser between plays */
export interface Volumes {
  bgm: number
  /** Sound effects (src/audio/se.ts) */
  se: number
}

const STORAGE_KEY = 'nordencult:volume'
const DEFAULTS: Volumes = { bgm: 1, se: 1 }
const listeners = new Set<() => void>()

const clamp = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback)

function load(): Volumes {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Volumes>
    return { bgm: clamp(saved.bgm, DEFAULTS.bgm), se: clamp(saved.se, DEFAULTS.se) }
  } catch {
    return DEFAULTS
  }
}

let volumes = load()

/** The gain for a volume of the settings. Squared, so the slider's middle sounds about half as loud */
export const volumeGain = (volume: number) => volume * volume

export function getVolumes(): Volumes {
  return volumes
}

export function setVolume(kind: keyof Volumes, value: number): void {
  volumes = { ...volumes, [kind]: clamp(value, volumes[kind]) }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(volumes))
  } catch {
    // Not kept for the next play; this one still uses it
  }
  for (const listener of listeners) listener()
}

export function subscribeVolumes(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useVolumes(): Volumes {
  return useSyncExternalStore(subscribeVolumes, getVolumes)
}
