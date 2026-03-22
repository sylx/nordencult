import { useState } from 'react'
import './App.css'
import Map from './map/components/Map'
import MapWindow from './ui/components/MapWindow'

function App() {
  const [activePlace, setActivePlace] = useState<string>('P002')

  return (
    <>
      <Map
        activePlace={activePlace}
        onActivePlaceChange={setActivePlace}
      />
      <div className="ui">
        <MapWindow
          width={500}
          height={600}
          resizeable
          activePlace={activePlace}
          x={60}
          y={60}
        />
      </div>
    </>
  )
}

export default App
