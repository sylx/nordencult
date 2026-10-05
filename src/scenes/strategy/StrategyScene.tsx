import { useEffect, useState } from 'react'
import { CITY_MAP, MapView, type CityHighlight, type RoadHighlight, type StrategyMap } from 'norden-strategy'
import { CityWindow } from './CityWindow'
import './StrategyScene.css'

const NEIGHBOUR_COLOR = '#7fc4ff'

/** The strategy map with the game UI (norden-ui) on top */
export default function StrategyScene() {
  const [map, setMap] = useState<StrategyMap | null>(null)
  const [selected, setSelected] = useState('')
  const city = selected ? CITY_MAP[selected] : undefined

  // The selected city, its neighbours and the roads to them
  useEffect(() => {
    if (!map) return
    const cities: CityHighlight[] = []
    const roads: RoadHighlight[] = []
    if (selected) {
      cities.push({ id: selected })
      for (const id of map.network.neighbours(selected)) {
        cities.push({ id, color: NEIGHBOUR_COLOR })
        roads.push({ from: selected, to: id })
      }
    }
    map.setCityHighlights(cities)
    map.setRoadHighlights(roads)
  }, [map, selected])

  const focusCity = (id: string) => {
    setSelected(id)
    map?.focusPlace(id)
  }

  return (
    <div className="strategy-scene">
      <MapView selectedPlace={selected} onSelectPlace={setSelected} onMapChange={setMap} showControls={false} />
      <div className="strategy-scene__ui">
        {city && <CityWindow city={city} neighbours={map?.network.neighbours(city.id) ?? []}
          onSelectCity={focusCity} x={48} y={56} />}
      </div>
    </div>
  )
}
