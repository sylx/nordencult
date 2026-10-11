import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { normalizeCutInTemplate } from './template'
import type { CutInTemplate, CutInTemplateJson } from './template'

export interface CutInPlayOptions {
  /** Replaces the template's text */
  text?: string
  /** Replaces the template's sub text ('' hides it) */
  subText?: string
}

/** A cut-in being played */
export interface ActiveCutIn {
  id: number
  template: CutInTemplate
}

interface Pending extends ActiveCutIn {
  resolve: () => void
}

/** Cut-ins are played one at a time in the order play() was called */
export class CutInQueue {
  private current: Pending | null = null
  private waiting: Pending[] = []
  private nextId = 1
  private listeners = new Set<() => void>()
  private skipHandler: (() => void) | null = null

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  getCurrent = (): ActiveCutIn | null => this.current

  play(template: CutInTemplateJson, options: CutInPlayOptions = {}) {
    let base: CutInTemplate
    try {
      base = normalizeCutInTemplate(template)
    } catch (error) {
      return Promise.reject(error)
    }
    const resolved = { ...base, text: options.text ?? base.text, subText: options.subText ?? base.subText }
    return new Promise<void>(resolve => {
      this.waiting.push({ id: this.nextId++, template: resolved, resolve })
      if (!this.current) this.advance()
    })
  }

  /** Jump to the exit of the cut-in being played, or end it if it is already leaving */
  skip() {
    this.skipHandler?.()
  }

  /** End the cut-in being played and drop the waiting ones. Their promises resolve */
  clear() {
    const all = [this.current, ...this.waiting]
    this.current = null
    this.waiting = []
    all.forEach(item => item?.resolve())
    this.emit()
  }

  /** The player reports the end of a cut-in */
  finish(id: number) {
    if (this.current?.id !== id) return
    const done = this.current
    this.current = null
    done.resolve()
    this.advance()
  }

  /** The player handles skip() while it plays */
  setSkipHandler(handler: (() => void) | null) {
    this.skipHandler = handler
  }

  private advance() {
    this.current = this.waiting.shift() ?? null
    this.emit()
  }

  private emit() {
    this.listeners.forEach(listener => listener())
  }
}

export interface CutInController {
  /** Play a template (JSON object or parsed template). Resolves when the cut-in has ended */
  play: (template: CutInTemplateJson, options?: CutInPlayOptions) => Promise<void>
  /** Jump to the exit, or end it if it is already leaving */
  skip: () => void
  /** End the cut-in and drop the waiting ones */
  clear: () => void
  /** A cut-in is being played */
  playing: boolean
  current: ActiveCutIn | null
  queue: CutInQueue
}

/** Cut-in playback. Pass the result to `<CutInLayer cutIn={...} />` */
export function useCutIn(): CutInController {
  const [queue] = useState(() => new CutInQueue())
  const current = useSyncExternalStore(queue.subscribe, queue.getCurrent, queue.getCurrent)
  // Pending promises do not hang when the owner goes away
  useEffect(() => () => queue.clear(), [queue])
  return useMemo(() => ({
    play: (template, options) => queue.play(template, options),
    skip: () => queue.skip(),
    clear: () => queue.clear(),
    playing: current !== null,
    current,
    queue,
  }), [queue, current])
}
