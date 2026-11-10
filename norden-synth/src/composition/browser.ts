// 作曲工房の画面で使う小道具。保存できないブラウザでも試聴・依頼文の作成は続けられる。
export const escape = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)

export function readStorage(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

export function writeStorage(key: string, value: string): boolean {
  try { localStorage.setItem(key, value); return true } catch { return false }
}

export async function copyText(area: HTMLTextAreaElement, status: HTMLElement): Promise<void> {
  try {
    await navigator.clipboard.writeText(area.value)
    status.textContent = 'コピーしました。このチャットのAIに貼り付けてください。'
  } catch {
    area.focus(); area.select()
    status.textContent = '依頼文を選択しました。手動でコピーしてください。'
  }
}
