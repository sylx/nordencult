import { installClickSound, setSoundPlayer } from 'norden-ui'
import { getVolumes, subscribeVolumes, volumeGain } from './volume'

/** src/assets/se/<name>.ogg (or .mp3, .wav) as the sound effect <name> */
const FILES = import.meta.glob<string>('../assets/se/*.{ogg,mp3,wav}', { eager: true, query: '?url', import: 'default' })

/** The name of a sound effect file: its file name without the extension */
export const seName = (path: string) => path.replace(/^.*\//, '').replace(/\.[^.]*$/, '')

const URLS = new Map(Object.entries(FILES).map(([path, url]) => [seName(path), url]))

/** The sound effects there are files of */
export const SE_NAMES: readonly string[] = [...URLS.keys()]

let audio: { ctx: AudioContext; output: GainNode } | undefined
const buffers = new Map<string, Promise<AudioBuffer | null>>()
const warned = new Set<string>()

/** The AudioContext of the sound effects, made on first use; made in a click or key press, it starts at once */
function getAudio() {
  if (!audio) {
    const ctx = new AudioContext()
    const output = ctx.createGain()
    output.gain.value = volumeGain(getVolumes().se)
    output.connect(ctx.destination)
    subscribeVolumes(() => output.gain.setTargetAtTime(volumeGain(getVolumes().se), ctx.currentTime, 0.02))
    audio = { ctx, output }
    for (const name of URLS.keys()) void load(name)
  }
  return audio
}

function load(name: string): Promise<AudioBuffer | null> {
  let buffer = buffers.get(name)
  if (!buffer) {
    const url = URLS.get(name)!
    buffer = fetch(url)
      .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(`${res.status} ${res.statusText}`))))
      .then((data) => getAudio().ctx.decodeAudioData(data))
      .catch((err: unknown) => {
        console.error(`se: cannot load ${url}`, err)
        return null
      })
    buffers.set(name, buffer)
  }
  return buffer
}

/** Plays the sound effect (a file name of src/assets/se/ without the extension) at the volume of the settings */
export function playSe(name: string): void {
  if (!URLS.has(name)) {
    if (!warned.has(name)) console.warn(`se: no sound "${name}" in src/assets/se/`)
    warned.add(name)
    return
  }
  const { ctx, output } = getAudio()
  // Made before a click (or suspended by the browser): starts with this click
  if (ctx.state === 'suspended') void ctx.resume()
  void load(name).then((buffer) => {
    if (!buffer) return
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(output)
    source.start()
  })
}

/**
 * Plays norden-ui's (and norden-battle's) sounds here, and a click for clicks on buttons.
 * The sounds load on the first press, a little before its click
 */
export function installSe(): void {
  setSoundPlayer(playSe)
  installClickSound()
  const unlock = () => {
    getAudio()
    for (const type of UNLOCK_EVENTS) window.removeEventListener(type, unlock, { capture: true })
  }
  for (const type of UNLOCK_EVENTS) window.addEventListener(type, unlock, { capture: true })
}

const UNLOCK_EVENTS = ['pointerdown', 'keydown'] as const
