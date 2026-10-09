import { useEffect, useState } from 'react'
import { CATALOG, ENTRIES } from './catalog'

const DEFAULT_ENTRY = 'strategy-flow'
const entryFromHash = () => {
  const id = window.location.hash.replace(/^#\/?/, '')
  return ENTRIES.some(entry => entry.id === id) ? id : DEFAULT_ENTRY
}

/** The catalog of components and screens. The entry is chosen with `#<id>` */
export default function App() {
  const [id, setId] = useState(entryFromHash)
  useEffect(() => {
    const onHashChange = () => setId(entryFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  const entry = ENTRIES.find(item => item.id === id)!

  return (
    <div className="catalog">
      <nav className="catalog-nav" aria-label="カタログ">
        <a className="catalog-logo" href={`#${DEFAULT_ENTRY}`}>
          <span className="eyebrow">NORDENCULT</span>
          <span className="catalog-logo-name">norden<span>ui</span></span>
        </a>
        {CATALOG.map(group => (
          <section key={group.label} className="catalog-group">
            <h2>{group.label}</h2>
            <ul>
              {group.entries.map(item => (
                <li key={item.id}>
                  <a href={`#${item.id}`} aria-current={item.id === id ? 'page' : undefined}>{item.label}</a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>
      <main className="catalog-main">
        <header className="catalog-header">
          <span className="eyebrow">{CATALOG.find(group => group.entries.includes(entry))?.label}</span>
          <h1>{entry.label} <code>{entry.name}</code></h1>
          <p>{entry.description}</p>
        </header>
        <entry.Component key={entry.id} />
      </main>
    </div>
  )
}
