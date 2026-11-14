import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { DialogueView, type ParamType, type ScriptShape } from 'norden-dialogue'
import type { PreviewVars } from './App'
import { CHARACTER_LIST, CHARACTER_MAP, CITY_LIST, SCENES, VOICE_TONE_GROUPS, VOICE_TONE_LABELS, createInitialState, isDialogueId } from './game'
import type { Preview } from './preview'

/** プレビューの画面の大きさ（これを枠の幅に合わせて縮める） */
const STAGE = { width: 1120, height: 630 }

/** 口調の選び直し: '' は口調なし（共通の文言）。選ばなければ騎士の口調 */
const NO_TONE = ''

function ValueField({ type, value, onChange }: { type: ParamType | string; value: string | number | undefined; onChange: (value: string | number) => void }) {
  if (type === 'character') {
    return (
      <select value={String(value ?? '')} onChange={(event) => onChange(event.target.value)}>
        <optgroup label="傭兵">
          {CHARACTER_LIST.filter((c) => c.mercenaryInfo).map((c) => <option key={c.id} value={c.id}>{c.mercenaryInfo!.name} {c.name}</option>)}
        </optgroup>
        <optgroup label="騎士">
          {CHARACTER_LIST.filter((c) => !c.mercenaryInfo).map((c) => <option key={c.id} value={c.id}>{c.name}（{c.id}）</option>)}
        </optgroup>
      </select>
    )
  }
  if (type === 'city') {
    return (
      <select value={String(value ?? '')} onChange={(event) => onChange(event.target.value)}>
        {CITY_LIST.map((c) => <option key={c.id} value={c.id}>{c.name}（{c.id}）</option>)}
      </select>
    )
  }
  if (type === 'number') return <input type="number" value={Number(value ?? 0)} onChange={(event) => onChange(Number(event.target.value))} />
  return <input value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} />
}

function ToneField({ value, character, onChange }: { value: string | undefined; character: string; onChange: (tone: string | undefined) => void }) {
  const own = CHARACTER_MAP[character]?.voiceTone
  return (
    <select value={value === undefined ? '*' : value} onChange={(event) => onChange(event.target.value === '*' ? undefined : event.target.value)} title="プレビューの口調">
      <option value="*">騎士の口調（{own ? VOICE_TONE_LABELS[own].replace(/（.*$/, '') : 'なし'}）</option>
      <option value={NO_TONE}>口調なし（共通の文言）</option>
      {VOICE_TONE_GROUPS.map((g) => (
        <optgroup key={g.label} label={g.label}>{g.ids.map((id) => <option key={id} value={id}>{VOICE_TONE_LABELS[id]}</option>)}</optgroup>
      ))}
    </select>
  )
}

/** プレビューの画面を枠の幅に合わせて縮める */
function useScale() {
  const frame = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)
  useEffect(() => {
    const element = frame.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / STAGE.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return { frame, scale }
}

/** 右: プレビューの画面、変数の仮の値と口調、ブロックの再生、通し再生（選択の履歴・状態の変化） */
export function PreviewPanel({ sceneId, script, preview, vars, hasErrors, onVars }: {
  sceneId: string; script: ScriptShape; preview: Preview; vars: PreviewVars; hasErrors: boolean; onVars: (vars: PreviewVars) => void
}) {
  const state = useSyncExternalStore(preview.subscribe, preview.getSnapshot)
  const { frame, scale } = useScale()
  const scene = isDialogueId(sceneId) ? SCENES[sceneId] : undefined
  const sample = useMemo(() => scene?.sample?.(createInitialState()) ?? {}, [scene])
  const [input, setInput] = useState<Record<string, string | number>>(sample)
  const [seed, setSeed] = useState(1)
  useEffect(() => setInput(sample), [sample])

  const params = Object.entries(script.params ?? {})
  const setVar = (name: string, value: string | number) => onVars({ ...vars, vars: { ...vars.vars, [name]: value } })
  const setTone = (name: string, tone: string | undefined) => {
    const tones = { ...vars.tones }
    if (tone === undefined) delete tones[name]
    else tones[name] = tone
    onVars({ ...vars, tones })
  }
  const playScene = () => {
    if (scene && isDialogueId(sceneId)) void preview.playScene({ id: sceneId, input, seed, tones: vars.tones })
  }

  return (
    <div className="preview">
      <div className="preview__frame" ref={frame} style={{ height: STAGE.height * scale }}>
        <div className="preview__stage" style={{ width: STAGE.width, height: STAGE.height, transform: `scale(${scale})` }}>
          <DialogueView player={preview.player} showBackgroundNames modal={false} />
          {!state.playing && <div className="preview__idle">ブロックの ▶ か「通し再生」で再生します</div>}
        </div>
      </div>
      <div className="preview__controls">
        <span className="preview__status">{state.playing ? `再生中: ${state.playing}` : '停止中'}</span>
        <button disabled={!state.playing} onClick={() => void preview.stop()}>停止</button>
        <span className="preview__keys">クリック・Enter・Space で文字送り、数字キーで選択</span>
      </div>
      {state.error && <p className="preview__error">{state.error}</p>}
      {hasErrors && <p className="preview__error">台本にエラーがあるので再生できません</p>}

      <section className="panel">
        <h3>変数の仮の値（ブロックの再生）</h3>
        {params.length === 0 && <p className="muted">変数はありません</p>}
        {params.map(([name, type]) => (
          <div key={name} className="field">
            <span className="field__label">{name}<small>{type}</small></span>
            <ValueField type={type} value={vars.vars[name]} onChange={(value) => setVar(name, value)} />
            {type === 'character' && <ToneField value={vars.tones[name]} character={String(vars.vars[name])} onChange={(tone) => setTone(name, tone)} />}
          </div>
        ))}
        <div className="preview__blocks">
          {Object.keys(script.blocks).map((block) => (
            <button key={block} onClick={() => void preview.playBlock(script, block, vars.vars, vars.tones)}>▶ {block}</button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>通し再生（流れごと・ゲームの初期状態から）</h3>
        {!scene && <p className="muted">流れ（src/dialogue/{sceneId}.ts）が SCENES にありません</p>}
        {scene && (
          <>
            {Object.entries(scene.input).map(([name, type]) => (
              <div key={name} className="field">
                <span className="field__label">{name}<small>{type}</small></span>
                <ValueField type={type} value={input[name]} onChange={(value) => setInput({ ...input, [name]: value })} />
              </div>
            ))}
            <div className="field">
              <span className="field__label">乱数の種</span>
              <input type="number" value={seed} onChange={(event) => setSeed(Number(event.target.value))} />
            </div>
            <p className="muted">口調の選び直しは、上の変数と同じ名前の台本の変数に効きます。</p>
            <button className="is-primary" onClick={playScene}>▶ 通し再生</button>
            {state.run?.id === sceneId && state.history.length > 0 && (
              <ol className="history">
                {state.history.map((h, i) => (
                  <li key={i}>
                    <code>{h.choice}</code> → <code>{h.key}</code>
                    <button className="is-small" onClick={() => void preview.replayUntil(i)}
                      title="ここまでを流し直し、この選択から選び直す">ここから選び直す</button>
                  </li>
                ))}
              </ol>
            )}
            {state.run?.id === sceneId && state.log.length > 0 && (
              <div className="log">
                <h4>状態の変化</h4>
                <ul>{state.log.map((line, i) => <li key={i}>{line}</li>)}</ul>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
