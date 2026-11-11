import { SONGS } from '../src/songs/index.ts'
import { PROJECTS, STUDIES } from '../src/composition/projects.ts'
import { makeRequest, validateProjects, STAGES, type CompositionProject, type Stage } from '../src/composition/workflow.ts'
import { inspectMelody, pitchName, reviewStudy } from '../src/composition/study.ts'

const usage = `作曲ハーネス (数値は診断用。美しさ・転調の成立の採点ではありません)
  npm run compose -- projects
  npm run compose -- list [project-id]
  npm run compose -- inspect <song-id> <part-id> [from-bar to-bar]
  npm run compose -- review <study-id|all>
  npm run compose -- brief
  npm run compose -- request <project-id> <hooks|themes|structure|orchestration> [parent-id]
小節は intro + loop 1 周を通した 1 始まり。試案は src/composition/projects/<id>/project.ts に登録。
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

function projectOf(id: string): CompositionProject {
  const project = PROJECTS.find((p) => p.id === id)
  if (!project) throw new Error(`unknown project: ${id} (${PROJECTS.map((p) => p.id).join(', ')})`)
  return project
}

function main() {
  validateProjects(PROJECTS, SONGS.map((s) => s.id))
  const args = process.argv.slice(2)
  const json = args.at(-1) === '--json'
  if (json) args.pop()
  const [command, id, part, from, to] = args
  if (command === 'projects' && args.length === 1) {
    for (const p of PROJECTS) console.log(`${p.id}「${p.title}」: ${p.batches.length}組 / 感想 ${p.feedback.length}件${p.adoptedSongId ? ` / 採用曲 ${p.adoptedSongId}` : ''}`)
  } else if (command === 'list' && (args.length === 1 || args.length === 2)) {
    if (!id) for (const song of SONGS) console.log(`${song.id}: ${song.parts.map((p) => p.id).join(', ')}`)
    for (const project of id ? [projectOf(id)] : PROJECTS) {
      console.log(`\n[${project.id}]「${project.title}」`)
      for (const batch of project.batches) console.log(`\n${batch.id} (${batch.stage}${batch.parentId ? ` / 派生元 ${batch.parentId}` : ''}): ${batch.candidates.map((s) => `${s.song.id}「${s.song.title}」`).join(', ')}`)
    }
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
  } else if (command === 'request' && (args.length === 3 || args.length === 4)) {
    if (!STAGES.some((s) => s.id === part)) throw new Error(`unknown stage: ${part}`)
    const result = makeRequest(projectOf(id), part as Stage, from)
    console.log(json ? JSON.stringify(result, null, 2) : result.text)
  } else if (command === 'brief' && args.length === 1) {
    console.log(`COMPOSING.md と composition/preferences.json を読んで作曲する。曲ごとに src/composition/projects/<id>/ のプロジェクトで進める。
0. 新しい曲は、作曲工房の「新しいプロジェクト」で作られた依頼文から project.ts（ブリーフ）を登録し、最初のフック集を作る。
1. 名前付きのフック（主題の冒頭になる4小節以内の句）を10案以上、一気に作る。すべて和声・低音・伴奏付き。見込みなしなら新しいフックを10案以上。
2. ユーザーが選んだフックを冒頭にそのまま置き、続きを書いた主題の展開案を4案以上作る。続きはフックの動機から作り、平行移動は sketch.ts の transposePassage で旋律と和声ごと移し、移動先に留まる。気に入らなければ別の4案以上。フックからやり直してもよい。
3. ユーザーが選んだ主題から、名前付きのフル尺の構成案を3案以上作る。1ループ全体を簡潔な編成で書き、主題と対比する旋律・展開・戻りを含める。主題を2周するだけにしない。気に入らなければ別の3案以上。
4. ユーザーが選んだ構成案をオーケストレーションする。構成は保つ。見直すなら3へ戻る。
各組はプロジェクトの batches に追記し、派生元を parentId で残す。依頼文の感想は feedback.ts にユーザーの発言として記録する。
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
