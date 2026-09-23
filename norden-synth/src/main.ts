const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <h1>norden-synth</h1>
  <button id="play" type="button">Play test tone</button>
`

// AudioContext はユーザー操作の後でないと開始できないため、クリック時に生成する
let ctx: AudioContext | undefined

document.querySelector<HTMLButtonElement>('#play')!.addEventListener('click', () => {
  ctx ??= new AudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const t = ctx.currentTime
  gain.gain.setValueAtTime(0.2, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 1)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 1)
})
