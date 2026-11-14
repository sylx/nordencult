import type { ReactNode } from 'react'
import Banner from '../../components/parts/Banner'
import Button from '../../components/parts/Button'
import '../screens.css'

export interface MapPickScreenProps {
  /** e.g. フルーエンからの侵攻先を選んでください */
  message: ReactNode
  onCancel: () => void
  cancelLabel?: string
  /** Extra HUD of the host, drawn in the screen layer */
  children?: ReactNode
}

/**
 * A step where the player picks something on the map, e.g. the target of an invasion.
 * Only the guide is drawn here; the host highlights the candidates and handles the clicks on its map.
 */
export default function MapPickScreen({ message, onCancel, cancelLabel = 'やめる', children }: MapPickScreenProps) {
  return (
    <div className="norden-screen norden-map-pick">
      <div className="norden-screen-top-center norden-screen-banner">
        <Banner actions={<Button variant="quiet" size="small" onClick={onCancel}>{cancelLabel}</Button>}>{message}</Banner>
      </div>
      {children}
    </div>
  )
}
