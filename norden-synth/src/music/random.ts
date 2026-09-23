// シードから決まる乱数。同じシードとパラメータなら同じ曲になる

export class Random {
  private state: number

  constructor(seed: number | string) {
    this.state = typeof seed === 'number' ? seed >>> 0 : hashString(seed)
  }

  // 別の用途向けに、このシードと名前から独立した系列を作る
  static derive(seed: number, name: string): Random {
    return new Random(hashString(`${seed}:${name}`))
  }

  // 0 以上 1 未満 (mulberry32)
  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  range(lo: number, hi: number): number {
    return lo + (hi - lo) * this.next()
  }

  // lo 以上 hi 以下の整数
  int(lo: number, hi: number): number {
    return lo + Math.floor(this.next() * (hi - lo + 1))
  }

  chance(p: number): boolean {
    return this.next() < p
  }

  pick<T>(list: readonly T[]): T {
    return list[Math.floor(this.next() * list.length)]
  }

  // weights に比例した確率で選ぶ。重みがすべて 0 なら一様に選ぶ
  weighted<T>(list: readonly T[], weight: (item: T, index: number) => number): T {
    const w = list.map((item, i) => Math.max(0, weight(item, i)))
    const total = w.reduce((a, b) => a + b, 0)
    if (!(total > 0)) return this.pick(list)
    let r = this.next() * total
    for (let i = 0; i < list.length; i++) {
      r -= w[i]
      if (r < 0) return list[i]
    }
    return list[list.length - 1]
  }
}

function hashString(s: string): number {
  // FNV-1a
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}
