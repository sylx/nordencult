import { useEffect, useRef } from 'react'
import { cutInViewport, CutInRenderer } from './engine/renderer'
import { loadCutInFonts } from './fonts'
import type { ActiveCutIn, CutInController, CutInQueue } from './useCutIn'
import './CutInLayer.css'

export interface CutInLayerProps {
  cutIn: CutInController
  /** Clicking anywhere skips (default true). The click still reaches the screen below */
  skipOnClick?: boolean
  className?: string
}

/**
 * Plays the cut-ins of `useCutIn()` over its positioned parent.
 * It never takes clicks: the screen below stays usable while a cut-in plays
 */
export default function CutInLayer({ cutIn, skipOnClick = true, className = '' }: CutInLayerProps) {
  const current = cutIn.current
  return (
    <div className={`norden-cutin-layer ${className}`.trim()} aria-live="polite">
      {current && <CutInPlayer key={current.id} active={current} queue={cutIn.queue} skipOnClick={skipOnClick} />}
    </div>
  )
}

function CutInPlayer({ active, queue, skipOnClick }: { active: ActiveCutIn; queue: CutInQueue; skipOnClick: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { template, id } = active
    let disposed = false
    let raf = 0
    // Playback clock: seconds = (now - origin) / 1000. null until the fonts are ready
    let origin: number | null = null
    let renderer: CutInRenderer | null = null
    let ctx: CanvasRenderingContext2D | null = null
    let unit = 1
    let size = { w: 0, h: 0 }

    const finish = () => {
      if (disposed) return
      disposed = true
      queue.finish(id)
    }
    const elapsed = () => (origin === null ? 0 : (performance.now() - origin) / 1000)

    const layout = (force = false) => {
      if (!renderer) return
      const rect = canvas.getBoundingClientRect()
      const w = Math.max(1, rect.width), h = Math.max(1, rect.height)
      if (!force && w === size.w && h === size.h && renderer.prepared) return
      size = { w, h }
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.max(1, Math.round(w * dpr))
      canvas.height = Math.max(1, Math.round(h * dpr))
      const view = cutInViewport(w, h)
      unit = view.unit * dpr
      renderer.prepare(template, view.W, view.H)
    }

    const frame = () => {
      raf = 0
      if (disposed || !renderer?.prepared || !ctx) return
      const t = elapsed()
      const { duration } = renderer.prepared.timeline
      if (t >= duration) { finish(); return }
      renderer.render(ctx, t, unit)
      raf = requestAnimationFrame(frame)
    }

    queue.setSkipHandler(() => {
      const timeline = renderer?.prepared?.timeline
      if (!timeline || origin === null) { finish(); return }
      const t = elapsed()
      // Before the exit: start it now. During the exit: end
      if (t < timeline.holdEnd) origin = performance.now() - timeline.holdEnd * 1000
      else finish()
    })

    try {
      renderer = new CutInRenderer()
      ctx = canvas.getContext('2d')
    } catch {
      renderer = null
    }
    if (!renderer || !ctx) {
      // No canvas (tests, very old browsers): end without drawing
      queueMicrotask(finish)
      return () => { disposed = true; queue.setSkipHandler(null) }
    }

    // Lay out again when the host is resized (only after the fonts are ready, or the glyphs keep a fallback font)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { if (origin !== null) layout() })
    observer?.observe(canvas)
    void loadCutInFonts(template).then(() => {
      if (disposed) return
      layout(true)
      origin = performance.now()
      raf = requestAnimationFrame(frame)
    })

    const onPointerDown = () => queue.skip()
    if (skipOnClick) window.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      observer?.disconnect()
      window.removeEventListener('pointerdown', onPointerDown, true)
      queue.setSkipHandler(null)
    }
  }, [active, queue, skipOnClick])

  const { text, subText } = active.template
  return <>
    <canvas ref={canvasRef} className="norden-cutin-canvas" aria-hidden="true" />
    <span className="norden-cutin-text">{subText.trim() ? `${text} ${subText}` : text}</span>
  </>
}
