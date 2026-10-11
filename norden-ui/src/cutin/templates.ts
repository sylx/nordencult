import { normalizeCutInTemplate } from './template'
import type { CutInTemplate } from './template'

// Every JSON in ./templates/ is part of the library. Adding a file is enough (the dev server picks it up too)
const files = import.meta.glob<unknown>('./templates/*.json', { eager: true, import: 'default' })

const nameOf = (path: string) => path.replace(/^.*\//, '').replace(/\.json$/, '')

/** Templates kept in `src/cutin/templates/`, by file name without `.json` (e.g. `CUTIN_TEMPLATES['battle-start']`) */
export const CUTIN_TEMPLATES: Readonly<Record<string, CutInTemplate>> = Object.fromEntries(
  Object.entries(files).flatMap(([path, json]) => {
    try {
      return [[nameOf(path), normalizeCutInTemplate(json)] as const]
    } catch (error) {
      // One broken file does not break the library
      console.warn(`norden-ui: skipped the cut-in template ${path}`, error)
      return []
    }
  }).sort(([a], [b]) => a.localeCompare(b)),
)
