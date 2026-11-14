import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { CutInLayer, CutInRenderer, cutInViewport, loadCutInFonts, useCutIn } from '../../src'
import type { CutInTemplate, CutInTimeline } from '../../src'
import MockMap from '../mock/MockMap'

export const ASPECTS = [['16 / 9', '16:9'], ['21 / 9', '21:9（横長）'], ['4 / 3', '4:3']] as const
export type Aspect = (typeof ASPECTS)[number][0]
export const BACKDROPS = [['map', '地図'], ['dark', '暗い背景'], ['light', '白い背景'], ['checker', '市松模様']] as const
export type Backdrop = (typeof BACKDROPS)[number][0]

interface Props {
  template: CutInTemplate
  aspect: Aspect
  backdrop: Backdrop
  onLog: (text: string) => void
}

/**
 * Editor preview: the same renderer as the game, drawn at a time you can scrub.
 * 「ゲームと同じ再生」 plays the template through useCutIn / CutInLayer instead
 */
export default function CutInPreview({ template, aspect, backdrop, onLog }: Props) {
  const screenRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<CutInRenderer | null>(null)
  const unitRef = useRef(1)
  // The playback clock lives outside React so the frame loop does not depend on renders
  const clock = useRef({ time: 0, start: 0, playing: true, loop: true, duration: 1 })
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [timeline, setTimeline] = useState<CutInTimeline | null>(null)
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [loop, setLoop] = useState(true)
  const [fontEpoch, setFontEpoch] = useState(0)
  const cutIn = useCutIn()

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const renderer = rendererRef.current
    const ctx = canvas?.getContext('2d')
    if (renderer && ctx) renderer.render(ctx, clock.current.time, unitRef.current)
  }, [])

  useLayoutEffect(() => {
    const screen = screenRef.current
    if (!screen) return
    const measure = () => {
      const rect = screen.getBoundingClientRect()
      setSize(current => (current.w === rect.width && current.h === rect.height ? current : { w: rect.width, h: rect.height }))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(screen)
    return () => observer.disconnect()
  }, [])

  // Redraw the glyphs when a font arrives
  useEffect(() => {
    const onLoaded = () => {
      rendererRef.current?.invalidateSprites()
      setFontEpoch(epoch => epoch + 1)
    }
    document.fonts.addEventListener('loadingdone', onLoaded)
    return () => document.fonts.removeEventListener('loadingdone', onLoaded)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size.w < 1 || size.h < 1) return
    const renderer = rendererRef.current ?? (rendererRef.current = new CutInRenderer())
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(size.w * dpr)
    canvas.height = Math.round(size.h * dpr)
    const view = cutInViewport(size.w, size.h)
    unitRef.current = view.unit * dpr
    // Fonts the page has not used yet start loading here; loadingdone redraws them
    void loadCutInFonts(template)
    const prepared = renderer.prepare(template, view.W, view.H)
    clock.current.duration = prepared.timeline.duration
    if (clock.current.time > prepared.timeline.duration) clock.current.time = prepared.timeline.duration
    setTimeline(prepared.timeline)
    draw()
  }, [template, size, fontEpoch, draw])

  useEffect(() => {
    let raf = 0
    const tick = (now: number) => {
      const c = clock.current
      if (c.playing) {
        let t = (now - c.start) / 1000
        if (t > c.duration) {
          if (c.loop) { c.start = now; t = 0 }
          else { t = c.duration; c.playing = false; setPlaying(false) }
        }
        c.time = t
        setTime(t)
        draw()
      }
      raf = requestAnimationFrame(tick)
    }
    clock.current.start = performance.now()
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [draw])

  const play = () => {
    const c = clock.current
    if (c.time >= c.duration - 0.01) c.time = 0
    c.start = performance.now() - c.time * 1000
    c.playing = true
    setPlaying(true)
  }
  const pause = () => {
    clock.current.playing = false
    setPlaying(false)
  }
  const seek = (t: number) => {
    const c = clock.current
    c.time = t
    c.start = performance.now() - t * 1000
    setTime(t)
    draw()
  }
  const restart = () => { seek(0); play() }
  const toggleLoop = (on: boolean) => { clock.current.loop = on; setLoop(on) }
  const playInGame = async () => {
    pause()
    onLog(`ゲームと同じ再生: ${template.name || template.text}`)
    await cutIn.play(template)
    onLog('再生が終わりました（Promiseが解決）')
  }

  const duration = timeline?.duration ?? 1
  const pct = (t: number) => `${(Math.min(t, duration) / duration) * 100}%`
  const phases = timeline ? [
    ['in', timeline.start, timeline.inEnd],
    ['hold', timeline.inEnd, timeline.holdEnd],
    ['out', timeline.holdEnd, timeline.end],
  ] as const : []

  return (
    <div className="cutin-preview">
      <div ref={screenRef} className={`cutin-screen backdrop-${backdrop}`} style={{ aspectRatio: aspect }}>
        {backdrop === 'map' && <MockMap />}
        <canvas ref={canvasRef} className="cutin-preview-canvas" style={{ visibility: cutIn.playing ? 'hidden' : 'visible' }} aria-label="カットインのプレビュー" />
        <CutInLayer cutIn={cutIn} />
      </div>
      <div className="cutin-transport">
        <button type="button" className="cutin-button" onClick={playing ? pause : play} aria-pressed={playing}>{playing ? '❚❚ 一時停止' : '▶ 再生'}</button>
        <button type="button" className="cutin-button" onClick={restart}>⟲ 最初から</button>
        <label className="checkbox"><input type="checkbox" checked={loop} onChange={event => toggleLoop(event.target.checked)} />ループ</label>
        <span className="cutin-time">{time.toFixed(2)} / {duration.toFixed(2)} 秒</span>
        <button type="button" className="cutin-button is-primary" onClick={playInGame} disabled={cutIn.playing}>ゲームと同じ再生（クリックでスキップ）</button>
      </div>
      <div className="cutin-timeline" style={{ '--playhead': pct(time) } as CSSProperties}>
        {phases.map(([kind, a, b]) => b > a && (
          <span key={kind} className={`cutin-seg is-${kind}`} style={{ left: pct(a), width: `calc(${pct(b)} - ${pct(a)})` }} />
        ))}
        <input type="range" aria-label="再生位置" min={0} max={duration} step={0.01} value={Math.min(time, duration)}
          onChange={event => { pause(); seek(Number(event.target.value)) }} />
      </div>
      <p className="cutin-legend"><span className="is-in">登場</span><span className="is-hold">表示中</span><span className="is-out">退場</span></p>
    </div>
  )
}
