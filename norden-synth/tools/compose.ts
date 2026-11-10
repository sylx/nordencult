import { SONGS } from '../src/songs/index.ts'
import { BATCHES, STUDIES } from '../src/composition/studies.ts'
import { makeRequest, validateBatches, STAGES, type Stage } from '../src/composition/workflow.ts'
import { inspectMelody, pitchName, reviewStudy } from '../src/composition/study.ts'

const usage = `作曲ハーネス (数値は診断用。美しさ・転調の成立の採点ではありません)
  npm run compose -- list
  npm run compose -- inspect <song-id> <part-id> [from-bar to-bar]
  npm run compose -- review <study-id|all>
  npm run compose -- brief
  npm run compose -- request <themes|harmony|orchestration> [parent-id]
小節は intro + loop 1 周を通した 1 始まり。試案は src/composition/studies.ts に登録。
--json を末尾に付けると inspect/review/request は JSON を出力します。`

function melodyText(report: ReturnType<typeof inspectMelody>): string {
  return [
    `小節 ${report.from}–${report.to}: ${report.events.length} 発音 / ${report.beats} 拍`,
    `音域: ${report.range.map(pitchName).join('–') || 'なし'} / 最大跳躍: ${report.maxLeap} 半音`,
    `音価 (拍): ${report.durationKinds.join(', ')}`,
    `音程列 (半音): ${report.intervals.join(', ')}`,
    `4 音の音程・発音間隔・音価が再登場する箇所: ${report.repeatedMotifs.length}`,
    ...report.repeatedMotifs.slice(0, 12).map((m) => `  ${m.firstBar} → ${m.returnBar} 小節 (移調 ${m.transposition} 半音)`),
    ...report.warnings.map((w) => `要試聴: ${w}`),
    '※ 反復の多さは品質点ではありません。変形した動機・調性・終止は自動判定していません。',
  ].join('\n')
}

function main() {
  validateBatches(BATCHES)
  const args = process.argv.slice(2)
  const json = args.at(-1) === '--json'
  if (json) args.pop()
  const [command, id, part, from, to] = args
  if (command === 'list' && args.length === 1) {
    for (const song of SONGS) console.log(`${song.id}: ${song.parts.map((p) => p.id).join(', ')}`)
    for (const batch of BATCHES) console.log(`\n${batch.id} (${batch.stage}${batch.parentId ? ` / 派生元 ${batch.parentId}` : ''}): ${batch.candidates.map((s) => `${s.song.id}「${s.song.title}」`).join(', ')}`)
  } else if (command === 'inspect' && (args.length === 3 || args.length === 5)) {
    const song = SONGS.find((s) => s.id === id) ?? STUDIES.find((s) => s.song.id === id)?.song
    if (!song) throw new Error(`unknown song: ${id}`)
    const report = inspectMelody(song, part, from === undefined ? 1 : Number(from), to === undefined ? undefined : Number(to))
    console.log(json ? JSON.stringify(report, null, 2) : `${song.title} / ${part}\n${melodyText(report)}`)
  } else if (command === 'review' && args.length === 2) {
    const selected = id === 'all' ? STUDIES : STUDIES.filter((s) => s.song.id === id)
    if (!selected.length) throw new Error(`unknown study: ${id}`)
    const reports = selected.map((study) => ({ id: study.song.id, hypothesis: study.hypothesis, ...reviewStudy(study) }))
    if (reports.some((r) => r.moments.some((m) => m.missing.length))) process.exitCode = 1
    if (json) console.log(JSON.stringify(reports, null, 2))
    else for (const report of reports) {
      console.log(`\n${report.id}\n仮説: ${report.hypothesis}\n${melodyText(report.melody)}`)
      for (const p of report.phrases) console.log(`句 ${p.from}–${p.to} ${p.label}: ${p.intention}`)
      for (const m of report.moments) console.log(`${m.missing.length ? 'FAIL' : 'OK'} ${m.bar} 小節 +${m.beat} 拍: ${m.intention} / 実音 ${m.sounding.join(', ')}${m.missing.length ? ` / 不足 ${m.missing.join(', ')}` : ''}`)
    }
  } else if (command === 'request' && (args.length === 2 || args.length === 3)) {
    if (!STAGES.some((s) => s.id === id)) throw new Error(`unknown stage: ${id}`)
    const result = makeRequest(BATCHES, id as Stage, part)
    console.log(json ? JSON.stringify(result, null, 2) : result.text)
  } else if (command === 'brief' && args.length === 1) {
    console.log(`COMPOSING.md と composition/preferences.json を読んで作曲する。
1. 名前付きの主題を5案以上、一気に作る。すべて和声・低音・伴奏付きで試聴できるようにする。見込みなしなら新しい主題を5案以上。
2. ユーザーが選んだ主題から、名前付きの和声の別案を5つ作る。主題＋和声を一緒に聴く。気に入らなければ別の5案。主題からやり直してもよい。
3. ユーザーが選んだ主題＋和声をオーケストレーションする。見直すなら2へ戻る。
各組は src/composition/studies.ts の BATCHES に追記し、派生元を parentId で残す。
画面の選択・メモから作られた依頼文をこのチャットに送り、AIが作曲して登録する。
旋律単独の選抜やAIによる勝手な採用はしない。compose review all・テスト・ビルドで確認。ブラウザ確認はユーザーが行う。`)
  } else {
    console.log(usage)
    if (command && command !== '--help') process.exitCode = 1
  }
}

try { main() } catch (error) {
  console.error((error as Error).message)
  process.exitCode = 1
}
