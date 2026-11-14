// 非可逆圧縮でループ区間の波形が少し変わると、loopEnd → loopStart の継ぎ目に段差ができる。
// loopEnd 直前の数ミリ秒を loopStart 直前の波形へクロスフェードし、
// 継ぎ目を「loopStart - 1 → loopStart」という元々連続な箇所と同じにする。

const MAX_FADE = 256

export function smoothLoop(data: Float32Array, loopStart: number, loopEnd: number): void {
  const n = Math.min(MAX_FADE, loopStart, Math.floor((loopEnd - loopStart) / 4))
  if (n < 2) return
  for (let i = 0; i < n; i++) {
    const w = (i + 1) / n
    const dst = loopEnd - n + i
    data[dst] = data[dst] * (1 - w) + data[loopStart - n + i] * w
  }
}
