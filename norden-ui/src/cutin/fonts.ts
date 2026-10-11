import { fontsFor } from './engine/renderer'
import type { CutInTemplate } from './template'

/**
 * Wait until the fonts of the template are ready (the game loads them with CSS).
 * Gives up after `timeoutMs` and draws with what is available
 */
export async function loadCutInFonts(template: CutInTemplate, timeoutMs = 3000) {
  if (typeof document === 'undefined' || !document.fonts) return
  const { mainFont, subFont } = fontsFor(template)
  const tasks = [document.fonts.load(mainFont(32), template.text || 'あ')]
  if (template.subText.trim()) tasks.push(document.fonts.load(subFont(32), template.subText))
  let timer: ReturnType<typeof setTimeout> | undefined
  await Promise.race([
    Promise.allSettled(tasks),
    new Promise<void>(resolve => { timer = setTimeout(resolve, timeoutMs) }),
  ])
  clearTimeout(timer)
}
