import { useMemo, type ReactNode } from 'react'
import { CharacterFace, commandKind, type ScriptProblem } from 'norden-dialogue'
import type { PreviewVars } from './App'
import { linesToText, textToLines, withCommand, withOption, withVariant, type Json } from './edit'
import { CHARACTER_LIST, CHARACTER_MAP, VOICE_TONE_GROUPS, VOICE_TONE_LABELS, dialogueCharacter } from './game'

interface Props {
  script: Json
  problems: readonly ScriptProblem[]
  edit: (change: (script: Json) => Json) => void
  /** プレビューの変数の値（"$merc" の顔と名前に使う） */
  vars: PreviewVars
  onPlayBlock: (block: string) => void
}

type Params = Record<string, string>

const toneLabel = (tone: string) => (VOICE_TONE_LABELS as Record<string, string>)[tone]?.replace(/（.*$/, '') ?? tone

/** 文言の欄: 空行でページを分ける */
function LinesField({ value, onChange, nothing = false, placeholder }: { value: unknown; onChange: (lines: unknown) => void; nothing?: boolean; placeholder?: string }) {
  const text = linesToText(value)
  const pages = Array.isArray(value) ? value.length : 1
  return (
    <div className="lines-field">
      <textarea value={text} rows={Math.max(1, text.split('\n').length)} placeholder={placeholder}
        onChange={(event) => onChange(textToLines(event.target.value, value, nothing))} />
      {pages !== 1 && <span className="lines-field__pages">{pages === 0 ? '何も言わない' : `${pages}ページ`}</span>}
    </div>
  )
}

/** 話し手: 騎士の変数か、騎士（名前から選ぶ） */
function SpeakerField({ value, params, vars, onChange }: { value: string; params: Params; vars: PreviewVars; onChange: (value: string) => void }) {
  const id = value.startsWith('$') ? String(vars.vars[value.slice(1)] ?? '') : value
  const info = dialogueCharacter(id)
  const variables = Object.entries(params).filter(([, type]) => type === 'character')
  return (
    <span className="speaker">
      {info ? <CharacterFace info={info} className="speaker__face" /> : <span className="speaker__face is-empty" />}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {variables.length > 0 && (
          <optgroup label="変数">
            {variables.map(([name]) => <option key={name} value={`$${name}`}>${name}（いまは {dialogueCharacter(String(vars.vars[name]))?.name ?? '未設定'}）</option>)}
          </optgroup>
        )}
        <optgroup label="騎士">
          {CHARACTER_LIST.map((c) => <option key={c.id} value={c.id}>{c.name}（{c.id}）</option>)}
          {!value.startsWith('$') && !info && <option value={value}>{value}（存在しない騎士）</option>}
        </optgroup>
      </select>
    </span>
  )
}

/** 口調別の文言: 口調ごとに 1 行。足す・消す */
function TonesField({ command, onChange }: { command: Json; onChange: (command: Json) => void }) {
  const tones = (command.tones ?? {}) as Record<string, unknown>
  const free = VOICE_TONE_GROUPS.map((g) => ({ ...g, ids: g.ids.filter((id) => !(id in tones)) })).filter((g) => g.ids.length > 0)
  return (
    <div className="tones">
      {Object.entries(tones).map(([tone, lines]) => (
        <div key={tone} className="tones__row">
          <span className="tones__tone" title={(VOICE_TONE_LABELS as Record<string, string>)[tone] ?? '知らない口調'}>{toneLabel(tone)}</span>
          <LinesField value={lines} nothing placeholder="（この口調では何も言わない）" onChange={(next) => onChange(withVariant(command, 'tones', tone, next))} />
          <button className="is-small" title="この口調の文言を消す（共通の文言になる）" onClick={() => onChange(withVariant(command, 'tones', tone, undefined))}>×</button>
        </div>
      ))}
      {free.length > 0 && (
        <select className="tones__add" value="" onChange={(event) => onChange(withVariant(command, 'tones', event.target.value, linesToText(command.text) ? command.text : ''))}>
          <option value="">＋ 口調別の文言を足す</option>
          {free.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.ids.map((id) => <option key={id} value={id}>{VOICE_TONE_LABELS[id]}</option>)}
            </optgroup>
          ))}
        </select>
      )}
    </div>
  )
}

/** 騎士別の文言: 騎士ごとに 1 行。足す・消す（口調別より先に使われる） */
function CharactersField({ command, onChange }: { command: Json; onChange: (command: Json) => void }) {
  const characters = (command.characters ?? {}) as Record<string, unknown>
  const free = CHARACTER_LIST.filter((c) => !(c.id in characters))
  return (
    <div className="tones">
      {Object.entries(characters).map(([id, lines]) => (
        <div key={id} className="tones__row">
          <span className="tones__tone" title={`${id} だけの文言（口調別より先）`}>{CHARACTER_MAP[id]?.name ?? `${id}（存在しない騎士）`}</span>
          <LinesField value={lines} nothing placeholder="（この騎士は何も言わない）" onChange={(next) => onChange(withVariant(command, 'characters', id, next))} />
          <button className="is-small" title="この騎士の文言を消す（口調別か共通の文言になる）" onClick={() => onChange(withVariant(command, 'characters', id, undefined))}>×</button>
        </div>
      ))}
      <select className="tones__add" value="" onChange={(event) => onChange(withVariant(command, 'characters', event.target.value, linesToText(command.text) ? command.text : ''))}>
        <option value="">＋ 騎士別の文言を足す</option>
        {free.map((c) => <option key={c.id} value={c.id}>{c.name}（{c.id}）</option>)}
      </select>
    </div>
  )
}

/** 編集できない命令の中身 */
function summary(command: Json): string {
  const kind = commandKind(command)
  const rest = Object.entries(command).filter(([key]) => key !== kind).map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
  return [JSON.stringify(command[kind ?? ''] ?? null), ...rest].join('  ')
}

function CommandRow({ command, params, vars, problems, onChange }: {
  command: Json; params: Params; vars: PreviewVars; problems: readonly ScriptProblem[]; onChange: (command: Json) => void
}) {
  const kind = commandKind(command) ?? '?'
  let body: ReactNode
  if (kind === 'say') {
    body = (
      <div className="command__say">
        <div className="command__speaker">
          <SpeakerField value={String(command.say)} params={params} vars={vars} onChange={(say) => onChange({ ...command, say })} />
          {'name' in command && (
            <label className="command__name-override">名前の差し替え
              <input value={String(command.name ?? '')} onChange={(event) => onChange({ ...command, name: event.target.value })} />
            </label>
          )}
          {'tones' in command && <span className="mark" title="口調別の文言がある">◆ 口調別</span>}
          {'characters' in command && <span className="mark" title="騎士別の文言がある">◆ 騎士別</span>}
        </div>
        <LinesField value={command.text} onChange={(text) => onChange({ ...command, text })} placeholder="（共通の文言）" />
        <TonesField command={command} onChange={onChange} />
        <CharactersField command={command} onChange={onChange} />
      </div>
    )
  } else if (kind === 'name') {
    body = (
      <div className="command__say">
        <div className="command__speaker">
          <span className="speaker__face is-empty" />
          <input className="command__name" value={String(command.name ?? '')} onChange={(event) => onChange({ ...command, name: event.target.value })} />
        </div>
        <LinesField value={command.text} onChange={(text) => onChange({ ...command, text })} />
      </div>
    )
  } else if (kind === 'narrate') {
    body = <LinesField value={command.narrate} onChange={(narrate) => onChange({ ...command, narrate })} placeholder="（地の文）" />
  } else {
    body = <code className="command__summary">{summary(command)}</code>
  }
  return (
    <li className={`command is-${kind} ${problems.some((p) => p.level === 'error') ? 'has-error' : ''}`}>
      <span className="command__kind">{kind}</span>
      <div className="command__body">
        {body}
        <Problems problems={problems} />
      </div>
    </li>
  )
}

function Problems({ problems }: { problems: readonly ScriptProblem[] }) {
  if (problems.length === 0) return null
  return (
    <ul className="problems">
      {problems.map((p, i) => <li key={i} className={`is-${p.level}`}>{p.level === 'error' ? 'エラー' : '警告'}: {p.message}<span className="problems__path">{p.path}</span></li>)}
    </ul>
  )
}

/** 台本: 題・書き分けた口調・ブロック（命令の列）・選択肢 */
export function ScriptEditor({ script, problems, edit, vars, onPlayBlock }: Props) {
  const params = (script.params ?? {}) as Params
  const blocks = (script.blocks ?? {}) as Record<string, unknown>
  const choices = (script.choices ?? {}) as Record<string, { options?: Record<string, unknown> }>
  const loose = problems.filter((p) => p.index === undefined)

  // Which tones the scene writes lines for, and how many lines each
  const written = useMemo(() => {
    const counts = new Map<string, number>()
    for (const commands of Object.values(blocks)) {
      if (!Array.isArray(commands)) continue
      for (const command of commands) {
        for (const tone of Object.keys((command as Json)?.tones ?? {})) counts.set(tone, (counts.get(tone) ?? 0) + 1)
      }
    }
    return [...counts]
  }, [blocks])

  return (
    <div className="script">
      <label className="script__title">題
        <input value={String(script.title ?? '')} onChange={(event) => edit((s) => ({ ...s, title: event.target.value }))} />
      </label>
      <div className="script__meta">
        <span>変数: {Object.entries(params).map(([name, type]) => `${name}（${type}）`).join('・') || 'なし'}</span>
        <span>書き分けた口調: {written.length === 0 ? 'なし' : written.map(([tone, n]) => (
          <span key={tone} className="chip" title={(VOICE_TONE_LABELS as Record<string, string>)[tone]}>{toneLabel(tone)} {n}</span>
        ))}</span>
      </div>
      <Problems problems={loose} />
      {Object.entries(blocks).map(([block, commands]) => (
        <section key={block} className="block">
          <header className="block__header">
            <h2>{block}</h2>
            <button onClick={() => onPlayBlock(block)} title="このブロックだけを、変数の仮の値で再生する">▶ 再生</button>
          </header>
          <ol className="block__commands">
            {Array.isArray(commands) && commands.map((command, index) => (
              <CommandRow key={index} command={command as Json} params={params} vars={vars}
                problems={problems.filter((p) => p.block === block && p.index === index)}
                onChange={(next) => edit((s) => withCommand(s, block, index, () => next))} />
            ))}
          </ol>
        </section>
      ))}
      {Object.keys(choices).length > 0 && (
        <section className="block">
          <header className="block__header"><h2>選択肢</h2></header>
          {Object.entries(choices).map(([choice, { options = {} }]) => (
            <div key={choice} className="choice">
              <span className="choice__name">{choice}</span>
              {Object.entries(options).map(([key, text]) => (
                <label key={key} className="choice__option"><code>{key}</code>
                  <input value={String(text)} onChange={(event) => edit((s) => withOption(s, choice, key, event.target.value))} />
                </label>
              ))}
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
