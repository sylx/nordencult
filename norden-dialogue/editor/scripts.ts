import { useSyncExternalStore } from 'react'

/** 親の src/dialogue/<id>.json。VSCode やエディタの保存で変わると HMR で読み直す */
const FILES = import.meta.glob<object>('../../src/dialogue/*.json', { eager: true, import: 'default' })

const scripts: Record<string, object> = Object.fromEntries(
  Object.entries(FILES).map(([path, script]) => [path.replace(/^.*\/|\.json$/g, ''), script]),
)

interface Store {
  value: Record<string, object>
  listeners: Set<() => void>
}

// 読み直したモジュールでも同じ入れ物を使い、表示中の画面に知らせる
const hot = import.meta.hot
const store: Store = hot?.data.store ?? { value: scripts, listeners: new Set() }
if (hot) {
  hot.data.store = store
  if (store.value !== scripts) {
    store.value = scripts
    for (const listener of store.listeners) listener()
  }
  hot.accept()
}

const subscribe = (listener: () => void) => {
  store.listeners.add(listener)
  return () => { store.listeners.delete(listener) }
}

/** シーンの id → ファイルの台本 */
export const useScriptFiles = () => useSyncExternalStore(subscribe, () => store.value)

/** 保存する（決まった書式で書かれ、HMR で戻ってくる） */
export async function saveScript(id: string, script: object): Promise<void> {
  const res = await fetch(`/api/dialogue/${encodeURIComponent(id)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(script),
  })
  if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? `${res.status} ${res.statusText}`)
}
