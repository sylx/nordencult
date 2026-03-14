import { useState } from 'react'

import InfoWindow, { type InfoWindowProps } from './InfoWindow'
import './InfoWindowWithTabs.css'

export interface TabInfo {
  name: string
  icon: string
  content: React.ReactNode
}

export interface InfoWindowWithTabsProps extends Omit<InfoWindowProps, 'children' | 'title'> {
  tabs: TabInfo[]
  title?: string
  defaultActiveTab?: number
}

function clampTabIndex(index: number, tabs: TabInfo[]): number {
  if (tabs.length === 0) {
    return -1
  }

  return Math.max(0, Math.min(index, tabs.length - 1))
}

export default function InfoWindowWithTabs({
  tabs,
  title,
  defaultActiveTab = 0,
  className,
  ...windowProps
}: InfoWindowWithTabsProps) {
  const [activeTabIndex, setActiveTabIndex] = useState(() => clampTabIndex(defaultActiveTab, tabs))

  const effectiveActiveTabIndex = clampTabIndex(activeTabIndex, tabs)
  const activeTab = effectiveActiveTabIndex >= 0 ? tabs[effectiveActiveTabIndex] : undefined
  const resolvedTitle = title ?? activeTab?.name ?? ''

  return (
    <InfoWindow
      {...windowProps}
      title={resolvedTitle}
      className={`info-window-with-tabs ${className || ''}`}
    >
      <div className="info-window-with-tabs-layout">
        <div className="info-window-with-tabs-tab-list" role="tablist" aria-orientation="vertical">
          {tabs.map((tab, index) => {
            const isActive = index === effectiveActiveTabIndex

            return (
              <button
                key={`${tab.name}-${index}`}
                type="button"
                className={`info-window-with-tabs-tab ${isActive ? 'is-active' : ''}`}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTabIndex(index)}
              >
                <img src={tab.icon} alt="" aria-hidden="true" className="info-window-with-tabs-tab-icon" />
              </button>
            )
          })}
        </div>

        <div className="info-window-with-tabs-panel" role="tabpanel">
          {activeTab?.content ?? null}
        </div>
      </div>
    </InfoWindow>
  )
}
