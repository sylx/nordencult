import { useEffect, useRef } from 'react'
import { HexMap, type MapData } from '@norden/map-runtime/core/mapData'
import { MapView } from '@norden/map-runtime/render/mapView'
import { SceneContext } from '@norden/map-runtime/render/scene'

/** The battle map drawn with norden-battle's map-runtime; everything is disposed on unmount */
export function BattleField({ data }: { data: MapData }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ctx = new SceneContext(container)
    const view = new MapView(ctx)
    view.setMap(new HexMap(data))
    ctx.renderer.setAnimationLoop(() => view.render())
    return () => {
      view.dispose()
      ctx.dispose()
    }
  }, [data])

  return <div ref={containerRef} className="battle-field" />
}
