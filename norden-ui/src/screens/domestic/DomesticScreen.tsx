import type { ReactNode } from 'react'
import ThinFrame from '../../components/parts/ThinFrame'
import Button from '../../components/parts/Button'
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
      <section className="norden-domestic-window" aria-label={`${city.name}の内政`}>
        <ThinFrame />
        <div className="norden-domestic-frame" data-testid="domestic-frame"><ThinFrame /></div>
        <Button variant="quiet" size="small" className="norden-domestic-close" onClick={onClose}>閉じる</Button>
      </section>
      {children}
    </div>
  )
}
