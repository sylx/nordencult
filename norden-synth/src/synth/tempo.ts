// テンポマップ。拍 (四分音符単位) と AudioContext の時刻を相互に変換する。
//
// テンポの変化点を拍の位置で持つ。各区間は開始拍から length 拍かけて bpm → to へ
// 線形に変化し (length = 0 なら即座に to)、その後は次の変化点まで to のまま。
// 線形ランプ区間の経過時間は 60 ∫ dx / bpm(x) を解析的に積分して求める。

interface Segment {
  beat: number
  bpm: number
  to: number
  length: number
  // 開始拍の時刻。変化点を足すたびに計算し直す
  time: number
}

export class TempoMap {
  private readonly segments: Segment[]

  constructor(bpm: number, startTime: number) {
    checkBpm(bpm)
    this.segments = [{ beat: 0, bpm, to: bpm, length: 0, time: startTime }]
  }

  // beat からテンポを bpm に変える
  set(beat: number, bpm: number): void {
    checkBpm(bpm)
    this.insert({ beat, bpm, to: bpm, length: 0, time: 0 })
  }

  // beat から length 拍かけて、その時点のテンポから bpm まで線形に変える
  ramp(beat: number, bpm: number, length: number): void {
    checkBpm(bpm)
    if (!(length >= 0)) throw new RangeError(`invalid ramp length: ${length}`)
    this.insert({ beat, bpm: this.tempoAt(beat), to: bpm, length, time: 0 })
  }

  tempoAt(beat: number): number {
    const s = this.segments[this.indexAtBeat(beat)]
    const db = beat - s.beat
    return s.length > 0 && db < s.length ? s.bpm + ((s.to - s.bpm) * db) / s.length : s.to
  }

  timeAt(beat: number): number {
    const s = this.segments[this.indexAtBeat(beat)]
    return s.time + elapsedTime(s, beat - s.beat)
  }

  beatAt(time: number): number {
    const s = this.segments[this.indexAtTime(time)]
    return s.beat + elapsedBeats(s, time - s.time)
  }

  // beat より前に終わった変化点を捨てる
  prune(beat: number): void {
    const i = this.indexAtBeat(beat)
    if (i > 0) this.segments.splice(0, i)
  }

  private insert(seg: Segment): void {
    if (!Number.isFinite(seg.beat)) throw new RangeError(`invalid beat: ${seg.beat}`)
    const list = this.segments
    let i = list.length
    while (i > 0 && list[i - 1].beat > seg.beat) i--
    // 同じ位置の変化点は置き換える。先頭より前には置かない
    let k = i
    if (i > 0 && list[i - 1].beat === seg.beat) {
      k = i - 1
      seg.time = list[k].time
      list[k] = seg
    } else if (i === 0) {
      throw new RangeError(`tempo change before the start of the map: ${seg.beat}`)
    } else {
      list.splice(i, 0, seg)
    }
    for (let j = Math.max(1, k); j < list.length; j++) {
      const prev = list[j - 1]
      list[j].time = prev.time + elapsedTime(prev, list[j].beat - prev.beat)
    }
  }

  // beat を含む区間。先頭より前は先頭の区間で外挿する
  private indexAtBeat(beat: number): number {
    let i = this.segments.length - 1
    while (i > 0 && this.segments[i].beat > beat) i--
    return i
  }

  private indexAtTime(time: number): number {
    let i = this.segments.length - 1
    while (i > 0 && this.segments[i].time > time) i--
    return i
  }
}

export function checkBpm(bpm: number): number {
  if (!(bpm > 0 && Number.isFinite(bpm))) throw new RangeError(`invalid tempo: ${bpm}`)
  return bpm
}

// 区間の先頭から db 拍進むのにかかる秒数
function elapsedTime(s: Segment, db: number): number {
  if (s.length <= 0 || db <= 0) return (60 * db) / (s.length > 0 ? s.bpm : s.to)
  const x = Math.min(db, s.length)
  const slope = (s.to - s.bpm) / s.length
  const ramp = slope === 0 ? (60 * x) / s.bpm : (60 / slope) * Math.log((s.bpm + slope * x) / s.bpm)
  return ramp + (60 * Math.max(0, db - s.length)) / s.to
}

// 区間の先頭から dt 秒で進む拍数 (elapsedTime の逆関数)
function elapsedBeats(s: Segment, dt: number): number {
  if (s.length <= 0 || dt <= 0) return (dt * (s.length > 0 ? s.bpm : s.to)) / 60
  const rampTime = elapsedTime(s, s.length)
  if (dt >= rampTime) return s.length + ((dt - rampTime) * s.to) / 60
  const slope = (s.to - s.bpm) / s.length
  return slope === 0 ? (dt * s.bpm) / 60 : (s.bpm * (Math.exp((dt * slope) / 60) - 1)) / slope
}
