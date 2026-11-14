/** テキストの中の変数: `{price}`・`{merc.name}` */

const PLACEHOLDER = /\{([^{}]*)\}/g

/** 変数の参照。`property` は今は name だけ */
export interface Placeholder {
  param: string
  property?: string
  /** `{…}` の中身 */
  source: string
}

const REFERENCE = /^([A-Za-z_]\w*)(?:\.([A-Za-z_]\w*))?$/

/** テキストの中の `{…}`。形の崩れたものは param が空 */
export function placeholders(text: string): Placeholder[] {
  return [...text.matchAll(PLACEHOLDER)].map(([, source]) => {
    const match = REFERENCE.exec(source.trim())
    return match ? { param: match[1], property: match[2], source } : { param: '', source }
  })
}

/** `{…}` を値に置き換える */
export function expandText(text: string, value: (placeholder: Placeholder) => string): string {
  return text.replace(PLACEHOLDER, (_, source: string) => {
    const [placeholder] = placeholders(`{${source}}`)
    return value(placeholder)
  })
}
