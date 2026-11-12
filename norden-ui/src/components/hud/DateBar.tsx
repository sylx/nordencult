import type { CSSProperties } from 'react'
import SettingsIcon from '../parts/SettingsIcon'
import Tooltip from '../parts/Tooltip'
import './DateBar.css'

export interface DateBarProps {
  phaseLabel: string
  /** null: all factions' orders are being resolved. */
  factionName?: string | null
  dateLabel?: string
  /** The gear opens the settings (e.g. a SettingsWindow). Without it, the gear is disabled */
  onSettings?: () => void
  width?: CSSProperties['width']
  settingsLabel?: string
  className?: string
  style?: CSSProperties
}

function DateBarSeparator() {
  return <span className="norden-date-bar-separator" aria-hidden="true">
    <svg viewBox="0 0 18 40" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path className="norden-date-bar-separator-edge" d="M0 39h3c5 0 5-4 5-10V18c0-6 2-10 5-13-1 6-3 10-3 15v10c0 6 1 9 5 9h3" />
      <path className="norden-date-bar-separator-rail" d="M0 39h3c5 0 5-4 5-10V18c0-6 2-10 5-13-1 6-3 10-3 15v10c0 6 1 9 5 9h3" />
    </svg>
  </span>
}

/** A season written as its own word after a space (e.g. 灰歴312年1月 冬) */
const SEASON = /^[春夏秋冬]$/u

function dateBarPartClass(part: string) {
  if (/^[0-9０-９]+$/u.test(part)) return 'norden-date-bar-date-number'
  return SEASON.test(part) ? 'norden-date-bar-date-season' : 'norden-date-bar-date-label'
}

/** Numbers and the season large, the units small */
function DateBarCalendar({ label }: { label: string }) {
  return label.split(/([0-9０-９]+|(?<=\s)[春夏秋冬](?=\s|$))/u).filter(Boolean).map((part, index) => (
    <span key={index} className={dateBarPartClass(part)}>
      {part}
    </span>
  ))
}

export default function DateBar({
  phaseLabel, factionName, dateLabel, onSettings, width, settingsLabel = '設定', className = '', style,
}: DateBarProps) {
  const turnLabel = factionName === null ? '全勢力の行動を解決中' : factionName ? `${factionName}のターン` : 'ターン進行中'

  return (
    <div className={`norden-date-bar ${className}`} style={{ width, ...style }} role="group" aria-label="ターン情報">
      <div className="norden-date-bar-content">
        <Tooltip content={phaseLabel}><span className="norden-date-bar-phase">{phaseLabel}</span></Tooltip>
        <DateBarSeparator />
        <Tooltip content={turnLabel}>
          <span className="norden-date-bar-turn">
            {factionName ? <>
              <span className="norden-date-bar-faction">{factionName}</span>
              <span className="norden-date-bar-turn-suffix">のターン</span>
            </> : <span className="norden-date-bar-turn-status">{turnLabel}</span>}
          </span>
        </Tooltip>
        {dateLabel && <>
          <DateBarSeparator />
          <Tooltip content={dateLabel}><span className="norden-date-bar-date"><DateBarCalendar label={dateLabel} /></span></Tooltip>
        </>}
        <DateBarSeparator />
        <button className="norden-date-bar-settings" type="button" aria-label={settingsLabel} aria-haspopup="dialog"
          disabled={!onSettings} onClick={() => onSettings?.()}>
          <SettingsIcon />
        </button>
      </div>
    </div>
  )
}
