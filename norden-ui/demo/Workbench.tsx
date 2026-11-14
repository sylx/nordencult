import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'

interface Props {
  /** The preview */
  stage: ReactNode
  /** Controls on the right */
  controls?: ReactNode
  /** `screen` gives the stage the size of a game screen with the mock map */
  variant?: 'component' | 'screen'
  stageClassName?: string
  hint?: ReactNode
}

/** Preview on the left, controls on the right */
export function Workbench({ stage, controls, variant = 'component', stageClassName = '', hint }: Props) {
  return (
    <div className="demo-workspace">
      <section className={`demo-stage ${variant === 'screen' ? 'is-screen' : ''} ${stageClassName}`} aria-label="プレビュー">
        {stage}
        {hint && <div className="stage-hint">{hint}</div>}
      </section>
      {controls && (
        <aside className="demo-controls" aria-label="表示設定">
          <span className="eyebrow">PLAYGROUND</span>
          {controls}
        </aside>
      )}
    </div>
  )
}

/** Messages from the callbacks, newest first */
export function useLog() {
  const [entries, setEntries] = useState<{ id: number; text: string }[]>([])
  const add = useCallback((text: string) => setEntries(current => [{ id: (current[0]?.id ?? 0) + 1, text }, ...current].slice(0, 30)), [])
  return [entries, add] as const
}

export function Log({ entries }: { entries: readonly { id: number; text: string }[] }) {
  return (
    <section className="demo-log" aria-label="操作ログ">
      <h3>操作ログ</h3>
      {entries.length === 0
        ? <p>まだ操作はありません。</p>
        : <ol>{entries.map(entry => <li key={entry.id}>{entry.text}</li>)}</ol>}
    </section>
  )
}
