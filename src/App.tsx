import './App.css'
import Map from './map/components/Map'
import InfoWindow from './ui/components/InfoWindow'

function App() {
  return (
    <>
    <Map />
    <div className="ui">
        <InfoWindow title="Welcome to Norden Cult!" width={600} height={"auto"} resizeable>
          <p>Explore the map and click on the places to learn more about them. there are many secrets to discover!</p>
          <p>Explore the map and click on the places to learn more about them.</p>
          <p>Explore the map and click on the places to learn more about them.</p>
          <p>Explore the map and click on the places to learn more about them.</p>
          <p>Explore the map and click on the places to learn more about them.</p>
          <p>Explore the map and click on the places to learn more about them.</p>
        </InfoWindow>
    </div>

    </>
  )
}

export default App
