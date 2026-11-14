import { useCallback, useEffect, useMemo, useState } from 'react'
import { scriptErrors, validateScript, type ScriptShape } from 'norden-dialogue'
import type { Json } from './edit'
import { CHARACTER_LIST, CITY_LIST, DIALOGUE_CATALOG } from './game'
import { Preview } from './preview'
import { PreviewPanel } from './PreviewPanel'
import { ScriptEditor } from './ScriptEditor'
import { saveScript, useScriptFiles } from './scripts'

/** 直している台本: もとにしたファイルの台本と、直したもの */
interface Draft {
  base: object
  script: Json
}

/** 変数の仮の値（シーンごと）と、口調の選び直し（変数名 → 口調。'' は口調なし） */
export interface PreviewVars {
  vars: Record<string, string | number>
  tones: Record<string, string>
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

const sceneFromHash = () => decodeURIComponent(location.hash.slice(1))

/** 宣言の型に合わせた仮の値: 騎士は最初の傭兵、都市は最初の都市、数は 1000 */
function defaultVars(script: ScriptShape): Record<string, string | number> {
  const firstMercenary = CHARACTER_LIST.find((c) => c.mercenaryInfo)?.id ?? CHARACTER_LIST[0].id
  return Object.fromEntries(Object.entries(script.params ?? {}).map(([name, type]) => [
    name, type === 'character' ? firstMercenary : type === 'city' ? CITY_LIST[0].id : type === 'number' ? 1000 : name,
  ]))
}

/**
 * 会話シーンのエディタ: 左にシーンの一覧、中央に台本（ブロックと命令の列。文言・話し手・選択肢・題を直せる）、右にプレビュー。
 * 保存すると親の src/dialogue/<id>.json を決まった書式で書く
 */
export function App() {
  const files = useScriptFiles()
  const ids = useMemo(() => Object.keys(files).sort(), [files])
  const [selected, setSelected] = useState(() => (Object.hasOwn(files, sceneFromHash()) ? sceneFromHash() : ids[0]))
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [previewVars, setPreviewVars] = useState<Record<string, PreviewVars>>({})
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null)
  const [preview] = useState(() => new Preview())

  useEffect(() => {
    const onHashChange = () => {
      if (Object.hasOwn(files, sceneFromHash())) setSelected(sceneFromHash())
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [files])

  // Drafts the files have caught up with (saved, or the same change made elsewhere) are done
  useEffect(() => {
    setDrafts((current) => {
      const left = Object.fromEntries(Object.entries(current).filter(([id, draft]) => files[id] && !same(draft.script, files[id])))
      return Object.keys(left).length === Object.keys(current).length ? current : left
    })
  }, [files])

  const file = files[selected] as Json | undefined
  const draft = drafts[selected]
  const script = draft?.script ?? file
  const problems = useMemo(() => (script ? validateScript(script, DIALOGUE_CATALOG) : []), [script])
  const vars = previewVars[selected] ?? (script ? { vars: defaultVars(script as unknown as ScriptShape), tones: {} } : { vars: {}, tones: {} })
  // Changed in the file (VSCode) while being edited here: saving would write over that
  const conflict = Boolean(draft && file && draft.base !== file)

  const edit = useCallback((change: (script: Json) => Json) => {
    if (!file) return
    setDrafts((current) => {
      const draft = current[selected] ?? { base: file, script: file }
      return { ...current, [selected]: { ...draft, script: change(draft.script) } }
    })
  }, [file, selected])

  const save = useCallback(async () => {
    if (!draft || saving) return
    setSaving(true)
    try {
      await saveScript(selected, draft.script)
      setNotice({ text: `${selected}.json に保存しました` })
    } catch (error) {
      setNotice({ text: `保存できません: ${error instanceof Error ? error.message : String(error)}`, error: true })
    } finally {
      setSaving(false)
    }
  }, [draft, saving, selected])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault()
        void save()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [save])

  const choose = (id: string) => {
    void preview.stop()
    setSelected(id)
    history.replaceState(null, '', `#${encodeURIComponent(id)}`)
  }

  return (
    <div className="app">
      <aside className="app__scenes">
        <h1 className="app__title">norden-dialogue</h1>
        <ul className="scene-list">
          {ids.map((id) => {
            const errors = scriptErrors(validateScript(drafts[id]?.script ?? files[id], DIALOGUE_CATALOG)).length
            return (
              <li key={id}>
                <button className={`scene-list__item ${id === selected ? 'is-active' : ''}`} onClick={() => choose(id)}>
                  <span className="scene-list__title">{((drafts[id]?.script ?? files[id]) as Json).title as string}</span>
                  <span className="scene-list__id">{id}{drafts[id] && ' ●'}</span>
                  {errors > 0 && <span className="badge is-error">{errors}</span>}
                </button>
              </li>
            )
          })}
        </ul>
        <p className="app__hint">命令やブロックの足し引き・並べ替えは JSON を直接直してください（ここにすぐ反映されます）。</p>
      </aside>
      <main className="app__script">
        {script ? (
          <>
            <div className="toolbar">
              <span className="toolbar__file">src/dialogue/{selected}.json</span>
              {conflict && <span className="toolbar__warn">ファイルが外で変わりました（保存すると上書きします）</span>}
              {draft && (
                <button onClick={() => setDrafts(({ [selected]: _, ...rest }) => rest)} title="直したものを捨てて、ファイルの内容に戻す">元に戻す</button>
              )}
              <button className="is-primary" disabled={!draft || saving} onClick={() => void save()}>{saving ? '保存中…' : '保存（Ctrl+S）'}</button>
              {notice && <span className={`toolbar__notice ${notice.error ? 'is-error' : ''}`}>{notice.text}</span>}
            </div>
            <ScriptEditor key={selected} script={script} problems={problems} edit={edit} vars={vars}
              onPlayBlock={(block) => void preview.playBlock(script as unknown as ScriptShape, block, vars.vars, vars.tones)} />
          </>
        ) : <p className="empty">親の src/dialogue/ に台本がありません。</p>}
      </main>
      <section className="app__preview">
        {script && (
          <PreviewPanel sceneId={selected} script={script as unknown as ScriptShape} preview={preview} vars={vars} hasErrors={scriptErrors(problems).length > 0}
            onVars={(next) => setPreviewVars((current) => ({ ...current, [selected]: next }))} />
        )}
      </section>
    </div>
  )
}
