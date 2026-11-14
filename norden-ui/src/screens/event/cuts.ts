// Every WebP in src/assets/cut/ is a cut of the library. Adding a file is enough (the dev server picks it up too)
const files = import.meta.glob<string>('../../assets/cut/*.webp', { eager: true, query: '?url', import: 'default' })

/** The cuts (events' pictures) for EventScreen, by file name without `.webp` (e.g. `CUT_IMAGES.faction_destruction`) */
export const CUT_IMAGES: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.replace(/^.*\//, '').replace(/\.webp$/, ''), url]),
)
