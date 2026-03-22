import { useMemo } from 'react'

import InfoWindowWithTabs, { type TabInfo } from '../../ui/components/InfoWindowWithTabs'
import type { InfoWindowProps } from '../../ui/components/InfoWindow'
import { CITY_MAP } from '../../data/city'
import { CHARACTER_LIST } from '../../data/character'
import CityInfoPanel from './window/CityInfoPanel'
import KnightsPanel from './window/KnightsPanel'
import StatsPanel from './window/StatsPanel'
import HistoryPanel from './window/HistoryPanel'
import './MapWindow.css'

import IconHome from '../../assets/ui/icons/icon_home.webp'
import IconPeople from '../../assets/ui/icons/icon_people.webp'
import IconHistory from '../../assets/ui/icons/icon_history.webp'
import IconStat from '../../assets/ui/icons/icon_stat.webp'

export interface MapWindowProps extends Omit<InfoWindowProps, 'children' | 'title'> {
  activePlace?: string | null
}

export default function MapWindow({
  activePlace,
  ...windowProps
}: MapWindowProps) {
  const city = activePlace ? CITY_MAP[activePlace] : undefined
  const lord = useMemo(() => {
    if (!activePlace) return undefined
    return CHARACTER_LIST.find((c) => c.belongTo === activePlace && c.isLord)
  }, [activePlace])

  const tabs: TabInfo[] = useMemo(() => {
    const cityTab: TabInfo = {
      name: '都市情報',
      icon: IconHome,
      content: city ? (
        <CityInfoPanel city={city} lord={lord} />
      ) : (
        <p className="map-window-no-city">地図上の都市をクリックしてください。</p>
      ),
    }

    return [
      cityTab,
      {
        name: '騎士',
        icon: IconPeople,
        content: activePlace ? (
          <KnightsPanel cityId={activePlace} />
        ) : (
          <p className="map-window-no-city">地図上の都市をクリックしてください。</p>
        ),
      },
      {
        name: '統計',
        icon: IconStat,
        content: city ? (
          <StatsPanel city={city} />
        ) : (
          <p className="map-window-no-city">地図上の都市をクリックしてください。</p>
        ),
      },
      {
        name: '歴史',
        icon: IconHistory,
        content: city ? (
          <HistoryPanel city={city} />
        ) : (
          <p className="map-window-no-city">地図上の都市をクリックしてください。</p>
        ),
      },
    ]
  }, [city, lord, activePlace])

  const title = city ? city.name : '都市情報'

  return (
    <InfoWindowWithTabs
      {...windowProps}
      title={title}
      tabs={tabs}
      defaultActiveTab={0}
    />
  )
}
