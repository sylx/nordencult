import type { ReactNode } from 'react'
import ThinFrame from '../../components/parts/ThinFrame'
import WindowFrame from '../../components/window/WindowFrame'
import type { CityView } from '../types'
import '../screens.css'
import './DomesticScreen.css'

export interface DomesticScreenProps {
  /** The city (its name names the window) */
  city: CityView
  onClose: () => void
  children?: ReactNode
}

/** Domestic screen: a window over the whole screen on dark parchment. For now only an empty frame at its top left */
export default function DomesticScreen({ city, onClose, children }: DomesticScreenProps) {
  return (
    <div className="norden-screen norden-domestic">
      <WindowFrame className="norden-domestic-window" aria-label={`${city.name}の内政`} onClose={onClose}>
        <div className="norden-domestic-frame" data-testid="domestic-frame"><ThinFrame /></div>
      </WindowFrame>
      {children}
    </div>
  )
}
