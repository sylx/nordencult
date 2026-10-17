import type { CSSProperties, ReactNode } from 'react'
import ThinFrame from '../parts/ThinFrame'
import Button from '../parts/Button'
import iconGold from '../../assets/ui/icons/icon-gold.png'
import iconProduction from '../../assets/ui/icons/icon-production.svg'
import iconTroops from '../../assets/ui/icons/icon-military.png'
import type { FactionSummaryView } from '../../screens/types'
import './FactionBar.css'

export interface FactionBarProps {
  /** The player's faction: 金 (and its change next turn), 総生産 and 総兵力. Omitted: only the city switcher */
  summary?: FactionSummaryView
  /** The city shown now */
  cityName: string
  /** ◀ ▶ are disabled when omitted */
  onPrevCity?: () => void
  onNextCity?: () => void
  /** Shown as "index / count" (index is 0-based) */
  cityPosition?: { index: number; count: number }
  className?: string
  style?: CSSProperties
}

const signed = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toLocaleString()}`

function Stat({ label, icon, value, title, children }: { label: string; icon: string; value: number; title?: string; children?: ReactNode }) {
  return (
    <span className="norden-faction-bar-stat" role="group" aria-label={label} title={title}>
      <img className="norden-faction-bar-stat-icon" src={icon} alt="" />
      <span className="norden-faction-bar-stat-label">{label}</span>
      <span className="norden-faction-bar-stat-value">{value.toLocaleString()}{children}</span>
    </span>
  )
}

/** The player's faction at a glance (金・総生産・総兵力) and ◀ city ▶ through its cities. Decorations later */
export default function FactionBar({ summary, cityName, onPrevCity, onNextCity, cityPosition, className = '', style }: FactionBarProps) {
  const forecast = summary?.goldForecast
  return (
    <div className={`norden-faction-bar ${className}`} role="group" aria-label="勢力" style={style}>
      <ThinFrame />
      {summary && <>
        <Stat label="金" icon={iconGold} value={summary.gold}
          title={forecast === undefined ? undefined : `次のターン ${signed(forecast)}`}>
          {forecast !== undefined && (
            <span className={`norden-faction-bar-forecast ${forecast < 0 ? 'is-negative' : ''}`}>（{signed(forecast)}）</span>
          )}
        </Stat>
        <Stat label="総生産" icon={iconProduction} value={summary.production} />
        <Stat label="総兵力" icon={iconTroops} value={summary.troops} />
      </>}
      <span className="norden-faction-bar-city" role="group" aria-label="都市の切り替え">
        <Button variant="quiet" metal="none" size="small" className="norden-faction-bar-step" aria-label="前の都市" disabled={!onPrevCity} onClick={onPrevCity}>◀</Button>
        <span className="norden-faction-bar-city-name" aria-live="polite">
          {cityName}
          {cityPosition && <span className="norden-faction-bar-city-position">{cityPosition.index + 1} / {cityPosition.count}</span>}
        </span>
        <Button variant="quiet" metal="none" size="small" className="norden-faction-bar-step" aria-label="次の都市" disabled={!onNextCity} onClick={onNextCity}>▶</Button>
      </span>
    </div>
  )
}
