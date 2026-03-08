import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react'

import Emblem01 from '../../assets/map/emblem_01.png'
import Emblem02 from '../../assets/map/emblem_02.png'
import Emblem03 from '../../assets/map/emblem_03.png'
import Emblem04 from '../../assets/map/emblem_04.png'
import Emblem05 from '../../assets/map/emblem_05.png'
import Emblem06 from '../../assets/map/emblem_06.png'
import Emblem07 from '../../assets/map/emblem_07.png'
import Emblem08 from '../../assets/map/emblem_08.png'
import Emblem09 from '../../assets/map/emblem_09.png'
import Emblem10 from '../../assets/map/emblem_10.png'
import PlaceCity from '../../assets/map/place_city.webp'
import PlaceFortress1 from '../../assets/map/place_fortress1.webp'
import PlaceFortress2 from '../../assets/map/place_fortress2.webp'
import PlaceMetropolice from '../../assets/map/place_metropolice.webp'
import PlaceTemple from '../../assets/map/place_temple.webp'
import PlaceTown from '../../assets/map/place_town.webp'
import { PLACES, ROUTES } from './MapOvarlayPlaceRoute'
import './MapOverlay.css'

export type PlaceType =
  | 'town'
  | 'city'
  | 'metropolice'
  | 'fortress1'
  | 'fortress2'
  | 'temple'

export type PlaceBelongTo = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export interface PlaceConfig {
  type: PlaceType
  belongTo?: PlaceBelongTo
  name: string
}

export interface MapOverlayProps {
  activeRoutes?: ReadonlySet<string> | readonly string[]
  activePlace?: string
  places?: Readonly<Record<string, PlaceConfig>>
  scale?: number
  className?: string
  style?: CSSProperties
  onPlaceClick?: (placeId: string, event: ReactMouseEvent<SVGGElement>) => void
  onRouteClick?: (routeId: string, event: ReactMouseEvent<SVGPathElement>) => void
}

interface PlaceGraphicMeta {
  src: string
  width: number
  height: number
  scaleMultiplier: number
  labelOffsetY: number
}

const EMBLEM_SIZE = 200
const PLACE_GRAPHIC_MIN_SCALE = 0.14
const PLACE_NAME_MIN_SCALE = 0.24

const PLACE_GRAPHICS: Record<PlaceType, PlaceGraphicMeta> = {
  town: {
    src: PlaceTown,
    width: 1010,
    height: 893,
    scaleMultiplier: 1.5,
    labelOffsetY: 0,
  },
  city: {
    src: PlaceCity,
    width: 1130,
    height: 839,
    scaleMultiplier: 2,
    labelOffsetY: -20,
  },
  metropolice: {
    src: PlaceMetropolice,
    width: 1251,
    height: 764,
    scaleMultiplier: 4,
    labelOffsetY: -100,
  },
  fortress1: {
    src: PlaceFortress1,
    width: 994,
    height: 549,
    scaleMultiplier: 2,
    labelOffsetY: -20,
  },
  fortress2: {
    src: PlaceFortress2,
    width: 1130,
    height: 839,
    scaleMultiplier: 1.5,
    labelOffsetY: -20,
  },
  temple: {
    src: PlaceTemple,
    width: 1024,
    height: 696,
    scaleMultiplier: 3,
    labelOffsetY: -60,
  },
}

const EMBLEMS: Record<PlaceBelongTo, string> = {
  1: Emblem01,
  2: Emblem02,
  3: Emblem03,
  4: Emblem04,
  5: Emblem05,
  6: Emblem06,
  7: Emblem07,
  8: Emblem08,
  9: Emblem09,
  10: Emblem10,
}

function getDefaultPlaceConfig(placeId: string): PlaceConfig {
  return {
    type: 'town',
    name: placeId,
  }
}

export default function MapOverlay({
  activeRoutes,
  activePlace,
  places: placeConfigs,
  scale = 1,
  className,
  style,
  onPlaceClick,
  onRouteClick,
}: MapOverlayProps) {
  const activeRouteSet =
    activeRoutes instanceof Set ? activeRoutes : new Set(activeRoutes ?? [])
  const showPlaceGraphic = scale >= PLACE_GRAPHIC_MIN_SCALE
  const showPlaceName = scale >= PLACE_NAME_MIN_SCALE

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 8192 8192"
      className={`map-overlay${className ? ` ${className}` : ''}`}
      style={style}
    >
      <defs>
        <filter id="map-overlay-route-glow">
          <feOffset dx="0" dy="0" />
          <feGaussianBlur result="blur" stdDeviation="10" />
          <feFlood floodColor="#000" floodOpacity="1" />
          <feComposite in2="blur" operator="in" />
          <feComposite in="SourceGraphic" />
        </filter>
        <filter id="map-overlay-place-glow">
          <feOffset dx="0" dy="0" />
          <feGaussianBlur result="blur" stdDeviation="24" />
          <feFlood floodColor="#fff" floodOpacity="0.95" />
          <feComposite in2="blur" operator="in" />
          <feComposite in="SourceGraphic" />
        </filter>
      </defs>

      <g id="roads">
        {ROUTES.map(({ id, d }) => {
          const isInteractive = Boolean(onRouteClick)

          return (
            <path
              key={id}
              id={id}
              className={`route${activeRouteSet.has(id) ? ' active' : ''}${isInteractive ? ' interactive' : ''}`}
              d={d}
              onClick={
                onRouteClick
                  ? (event) => {
                      event.stopPropagation()
                      onRouteClick(id, event)
                    }
                  : undefined
              }
            />
          )
        })}
      </g>

      <g id="places">
        {PLACES.map((place) => {
          const config = placeConfigs?.[place.id] ?? getDefaultPlaceConfig(place.id)
          const graphic = PLACE_GRAPHICS[config.type]
          const emblemSrc = config.belongTo ? EMBLEMS[config.belongTo] : undefined
          const shouldRenderGraphic = showPlaceGraphic || !emblemSrc
          const imageScale = place.s * graphic.scaleMultiplier
          const halfW = (graphic.width * imageScale) / 2
          const halfH = (graphic.height * imageScale) / 2
          const emblemCenterX = -Math.min(halfW * 0.85, 150)
          const emblemCenterY = -Math.min(halfH * 0.85, 150)
          const hitAreaRadius = Math.max(halfW, halfH, EMBLEM_SIZE / 2) + 48
          const isActive = activePlace === place.id
          const isInteractive = Boolean(onPlaceClick)

          return (
            <g
              key={place.id}
              id={place.id}
              className={`place${isActive ? ' is-active' : ''}`}
              transform={`translate(${place.cx}, ${place.cy})`}
            >
              <g
                className="place-visual"
                filter={isActive ? 'url(#map-overlay-place-glow)' : undefined}
              >
                {shouldRenderGraphic && (
                  <image
                    className="place-graphic"
                    width={graphic.width}
                    height={graphic.height}
                    href={graphic.src}
                    transform={`translate(${-halfW}, ${-halfH}) scale(${imageScale})`}
                  />
                )}
                {emblemSrc && (
                  <image
                    className="place-emblem"
                    href={emblemSrc}
                    width={EMBLEM_SIZE}
                    height={EMBLEM_SIZE}
                    x={emblemCenterX - EMBLEM_SIZE / 2}
                    y={emblemCenterY - EMBLEM_SIZE / 2}
                  />
                )}
                {showPlaceName && (
                  <text
                    className="place-label"
                    x={0}
                    y={halfH + graphic.labelOffsetY}
                  >
                    {config.name}
                  </text>
                )}
              </g>
              {isInteractive && (
                <g
                  className="place-hit-target"
                  onClick={(event) => {
                    event.stopPropagation()
                    onPlaceClick?.(place.id, event)
                  }}
                >
                  <circle className="place-hit-area" r={hitAreaRadius} />
                </g>
              )}
            </g>
          )
        })}
      </g>
    </svg>
  )
}
