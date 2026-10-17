import { useEffect, useRef } from 'react'
import './TitleParticles.css'

interface Particle {
  x: number
  y: number
  z: number // 0.1 (遠景) 〜 1.0 (最前近景)
  radius: number
  baseAlpha: number
  alpha: number
  vy: number
  vxBase: number
  swayFreq1: number
  swayFreq2: number
  swayAmp: number
  swayOffset: number
  sparkleSpeed: number
  sparkleOffset: number
  isFront: boolean
}

export function TitleParticles() {
  const backCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const frontCanvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const backCanvas = backCanvasRef.current
    const frontCanvas = frontCanvasRef.current
    if (!backCanvas || !frontCanvas) return

    const backCtx = backCanvas.getContext('2d')
    const frontCtx = frontCanvas.getContext('2d')
    if (!backCtx || !frontCtx) return

    let animationFrameId: number
    let width = (backCanvas.width = frontCanvas.width = window.innerWidth)
    let height = (backCanvas.height = frontCanvas.height = window.innerHeight)

    const handleResize = () => {
      if (!backCanvas || !frontCanvas) return
      width = backCanvas.width = frontCanvas.width = window.innerWidth
      height = backCanvas.height = frontCanvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)

    // パーティクル総数（奥〜手前まで立体配置）
    const totalCount = 120
    const particles: Particle[] = []

    for (let i = 0; i < totalCount; i++) {
      // z深度: 0.1(奥) 〜 1.0(手前)。奥ほど密度を高くする
      const z = Math.pow(Math.random(), 1.6) * 0.9 + 0.1
      const isFront = z > 0.65 // 深度0.65以上はロゴの手前を通過

      // zに応じた半径・速度・透明度
      // 手前ほど大きく、高速で、ボケる
      const radius = z > 0.75 
        ? (Math.random() * 3.5 + 3.0) * z // 手前の大型ボケオーブ (3〜6px)
        : (Math.random() * 1.8 + 0.6) * (z * 1.2 + 0.3) // 中景〜奥のダスト

      const vy = -(Math.random() * 0.4 + 0.2) * (z * 1.8 + 0.4) // 手前ほど速い視差
      const baseAlpha = z > 0.75
        ? Math.random() * 0.35 + 0.25 // 手前ボケオーブは少し淡く
        : Math.random() * 0.55 + 0.25

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z,
        radius,
        baseAlpha,
        alpha: baseAlpha,
        vy,
        vxBase: (Math.random() - 0.5) * 0.25 * z,
        swayFreq1: Math.random() * 0.015 + 0.008,
        swayFreq2: Math.random() * 0.025 + 0.012,
        swayAmp: (Math.random() * 0.6 + 0.3) * (z * 1.5 + 0.5),
        swayOffset: Math.random() * Math.PI * 2,
        sparkleSpeed: Math.random() * 0.04 + 0.015,
        sparkleOffset: Math.random() * Math.PI * 2,
        isFront,
      })
    }

    let frame = 0

    const render = () => {
      frame++
      backCtx.clearRect(0, 0, width, height)
      frontCtx.clearRect(0, 0, width, height)

      // 加算合成で光が重なった部分を美しく輝かせる
      backCtx.globalCompositeOperation = 'lighter'
      frontCtx.globalCompositeOperation = 'lighter'

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        const ctx = p.isFront ? frontCtx : backCtx

        // 複雑な上昇気流とゆらぎ（サイン＋コサインの複合波）
        p.y += p.vy
        p.x += p.vxBase + 
          Math.sin(frame * p.swayFreq1 + p.swayOffset) * p.swayAmp + 
          Math.cos(frame * p.swayFreq2 + p.swayOffset * 0.5) * (p.swayAmp * 0.4)

        // きらめき（明滅）
        const sparkle = (Math.sin(frame * p.sparkleSpeed + p.sparkleOffset) + 1) * 0.5
        p.alpha = p.baseAlpha * (0.35 + sparkle * 0.65)

        // 画面外ループ（上から抜けたら下から再生成）
        if (p.y < -20) {
          p.y = height + 15
          p.x = Math.random() * width
        }
        if (p.x < -20) p.x = width + 20
        if (p.x > width + 20) p.x = -20

        // グラデーション描画
        const drawRadius = p.radius * (p.isFront ? 3.0 : 2.2)
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, drawRadius)

        if (p.isFront) {
          // 手前の被写界深度（ボケオーブ・ソフトグロー）
          gradient.addColorStop(0, `rgba(255, 245, 200, ${p.alpha * 0.9})`)
          gradient.addColorStop(0.3, `rgba(240, 195, 90, ${p.alpha * 0.5})`)
          gradient.addColorStop(0.7, `rgba(200, 140, 40, ${p.alpha * 0.2})`)
          gradient.addColorStop(1, 'rgba(150, 90, 20, 0)')
        } else {
          // 奥〜中景のシャープなゴールドスパーク
          gradient.addColorStop(0, `rgba(255, 250, 220, ${p.alpha})`)
          gradient.addColorStop(0.35, `rgba(235, 185, 80, ${p.alpha * 0.75})`)
          gradient.addColorStop(0.75, `rgba(180, 120, 35, ${p.alpha * 0.25})`)
          gradient.addColorStop(1, 'rgba(140, 80, 15, 0)')
        }

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(p.x, p.y, drawRadius, 0, Math.PI * 2)
        ctx.fill()
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <>
      <canvas ref={backCanvasRef} className="title-particles-canvas title-particles-canvas--back" aria-hidden="true" />
      <canvas ref={frontCanvasRef} className="title-particles-canvas title-particles-canvas--front" aria-hidden="true" />
    </>
  )
}
