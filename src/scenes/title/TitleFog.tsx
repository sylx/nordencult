import { useState } from 'react'
import './TitleFog.css'

const TILE_W = 1024
const TILE_H = 256

/** シード付きの乱数（層ごとに違う、でも毎回同じ形の霧にする） */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 霧のタイルを作る。横は格子を折り返す周期的なノイズなので左右の端が必ずつながり、
 * 縦は上下の端へ向けて透明にするので、どこにも硬い縁ができない
 */
function makeFogTile(seed: number): string {
  const random = mulberry32(seed)
  const canvas = document.createElement('canvas')
  canvas.width = TILE_W
  canvas.height = TILE_H
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  // 粗い順に 4 オクターブ。横の格子数は整数なのでタイル幅でちょうど一周する
  const octaves = [3, 6, 12, 24].map((cellsX, i) => {
    const cellsY = Math.ceil(cellsX * (TILE_H / TILE_W) * 2) + 1
    const grid = Array.from({ length: cellsY + 1 }, () => Array.from({ length: cellsX }, random))
    return { cellsX, cellsY, grid, amp: 0.5 ** i }
  })
  const ampSum = octaves.reduce((s, o) => s + o.amp, 0)
  const smooth = (t: number) => t * t * (3 - 2 * t)

  const image = ctx.createImageData(TILE_W, TILE_H)
  for (let y = 0; y < TILE_H; y++) {
    // 上下の端で 0 になる縦の包絡線
    const envelope = Math.sin((Math.PI * y) / (TILE_H - 1)) ** 1.5
    for (let x = 0; x < TILE_W; x++) {
      let n = 0
      for (const { cellsX, cellsY, grid, amp } of octaves) {
        const gx = (x / TILE_W) * cellsX
        const gy = (y / TILE_H) * cellsY
        const x0 = Math.floor(gx)
        const y0 = Math.floor(gy)
        const tx = smooth(gx - x0)
        const ty = smooth(gy - y0)
        const xa = x0 % cellsX
        const xb = (x0 + 1) % cellsX
        const top = grid[y0][xa] + (grid[y0][xb] - grid[y0][xa]) * tx
        const bottom = grid[y0 + 1][xa] + (grid[y0 + 1][xb] - grid[y0 + 1][xa]) * tx
        n += (top + (bottom - top) * ty) * amp
      }
      n /= ampSum
      const density = Math.min(1, Math.max(0, (n - 0.3) * 2.2))
      const i = (y * TILE_W + x) * 4
      image.data[i] = 214
      image.data[i + 1] = 204
      image.data[i + 2] = 186
      image.data[i + 3] = density * envelope * 255
    }
  }
  ctx.putImageData(image, 0, 0)
  return canvas.toDataURL()
}

/** 足元を流れる霧。速さと大きさの違う 2 層を重ねる */
export function TitleFog() {
  const [tiles] = useState(() => [makeFogTile(11), makeFogTile(29)])
  return (
    <div className="title-fog" aria-hidden="true">
      <div className="title-fog__layer title-fog__layer--far"
        style={{ backgroundImage: `url(${tiles[0]})` }} />
      <div className="title-fog__layer title-fog__layer--near"
        style={{ backgroundImage: `url(${tiles[1]})` }} />
    </div>
  )
}
