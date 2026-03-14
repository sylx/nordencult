import './App.css'
import Map from './map/components/Map'
import InfoWindowWithTabs, { type TabInfo } from './ui/components/InfoWindowWithTabs'

import IconHome from './assets/ui/icons/icon_home.webp'
import IconPeople from './assets/ui/icons/icon_people.webp'
import IconHistory from './assets/ui/icons/icon_history.webp'
import IconStat from './assets/ui/icons/icon_stat.webp'

function App() {
  const tabs: TabInfo[] = [
    {
      name: 'ホーム',
      icon: IconHome,
      content: (
        <>
          <p>Welcome to Norden Cult. This panel is rendered through InfoWindowWithTabs.</p>
          <p>Use the tabs on the left to switch between short content sections.</p>
        </>
      ),
    },
    {
      name: '騎士',
      icon: IconPeople,
      content: (
        <>
          <p>The northern routes are controlled by old guilds that guard forgotten archives.</p>
          <p>Every city has its own emblem and local stories hidden in the map.</p>
        </>
      ),
    },
    {
      name: '統計',
      icon: IconStat,
      content: (
        <>
          <p>Keep track of your discoveries and progress in the stats tab.</p>
          <p>Compare your stats with friends and other explorers.</p>
        </>
      ),
    },
    {
      name: '歴史',
      icon: IconHistory,
      content: (
        <>
          <p>Click places on the map to open details.</p>
          <p>Keep an eye on symbols and landmarks. They often hint at side paths.</p>
        </>
      ),
    },
  ]

  return (
    <>
    <Map />
    <div className="ui">
      <InfoWindowWithTabs
        width={500}
        height={600}
        resizeable
        title="Welcome to Norden Cult!"
        tabs={tabs}
        x={60}
        y={60}
      />
    </div>

    </>
  )
}

export default App
