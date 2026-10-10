import { useId, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import InfoWindow from './InfoWindow'
import type { InfoWindowProps } from './InfoWindow'
import './InfoWindowWithTabs.css'
import { resolveWindowSkin } from '../../skins'

export interface TabInfo {
  /** Stable ID is recommended when tabs may be reordered. */
  id?: string
  name: string
  icon: string
  content: ReactNode
}

export interface InfoWindowWithTabsProps extends Omit<InfoWindowProps, 'children' | 'title' | 'chrome'> {
  tabs: TabInfo[]
  title?: string
  defaultActiveTab?: number
  activeTab?: number
  onActiveTabChange?: (index: number) => void
  tabListLabel?: string
  emptyContent?: ReactNode
  /** Keep accessible names and tooltips when only icons are visible. */
  iconOnlyTabs?: boolean
}

function clamp(index: number, count: number) {
  return count === 0 ? -1 : Math.max(0, Math.min(Number.isFinite(index) ? Math.trunc(index) : 0, count - 1))
}

export default function InfoWindowWithTabs({
  tabs, title, showTitleBar = true, defaultActiveTab = 0, activeTab, onActiveTabChange,
  tabListLabel = '情報の種類', emptyContent = null, iconOnlyTabs = true, className = '', minHeight = 240, ...windowProps
}: InfoWindowWithTabsProps) {
  const id = useId()
  const [selection, setSelection] = useState(() => ({ index: clamp(defaultActiveTab, tabs.length), id: tabs[clamp(defaultActiveTab, tabs.length)]?.id }))
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  const previousIndex = selection.id ? tabs.findIndex(tab => tab.id === selection.id) : selection.index
  const index = clamp(activeTab ?? (previousIndex < 0 ? selection.index : previousIndex), tabs.length)
  const selected = tabs[index]
  const tabTop = resolveWindowSkin(windowProps.skin).layout.tabTop
  const panelId = `${id}-panel`
  const tabId = (tabIndex: number) => `${id}-tab-${tabIndex}`

  const select = (next: number) => {
    if (activeTab === undefined) setSelection({ index: next, id: tabs[next]?.id })
    onActiveTabChange?.(next)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, current: number) => {
    let next: number
    switch (event.key) {
      case 'ArrowDown': next = (current + 1) % tabs.length; break
      case 'ArrowUp': next = (current - 1 + tabs.length) % tabs.length; break
      case 'Home': next = 0; break
      case 'End': next = tabs.length - 1; break
      default: return
    }
    event.preventDefault()
    select(next)
    buttons.current[next]?.focus()
  }

  return (
    <InfoWindow {...windowProps} title={title ?? selected?.name ?? ''} showTitleBar={showTitleBar}
      className={`norden-info-window-with-tabs ${className}`}
      minHeight={Math.max(minHeight, tabs.length ? tabTop + tabs.length * 80 + (tabs.length - 1) * 5 : minHeight)}
      chrome={tabs.length > 0 && (
        <div className="norden-tab-list" role="tablist" aria-label={tabListLabel} aria-orientation="vertical">
          {tabs.map((tab, tabIndex) => (
            <button key={tab.id ?? tabIndex} ref={element => { buttons.current[tabIndex] = element }}
              type="button" className={`norden-tab ${tabIndex === index ? 'is-active' : ''} ${iconOnlyTabs ? 'is-icon-only' : ''}`}
              id={tabId(tabIndex)} role="tab" aria-label={tab.name} title={tab.name}
              aria-selected={tabIndex === index} aria-controls={panelId} tabIndex={tabIndex === index ? 0 : -1}
              onClick={() => select(tabIndex)} onKeyDown={event => handleKeyDown(event, tabIndex)}
            >
              <img src={tab.icon} alt="" aria-hidden="true" className="norden-tab-icon" />
              {!iconOnlyTabs && <span className="norden-tab-name">{tab.name}</span>}
            </button>
          ))}
        </div>
      )}
    >
      {selected ? (
        <div key={selected.id ?? index} id={panelId} className="norden-tab-panel" role="tabpanel"
          aria-labelledby={tabId(index)} tabIndex={0}>
          {selected.content}
        </div>
      ) : <div className="norden-tab-empty">{emptyContent}</div>}
    </InfoWindow>
  )
}
