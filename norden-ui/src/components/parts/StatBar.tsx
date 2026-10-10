import { useId } from 'react'
import './StatBar.css'

export interface StatBarProps {
  label: string
  value: number
  max: number
  tone?: 'agriculture' | 'commerce' | 'production'
}

const palettes = {
  agriculture: ['#355143', '#79a56b', '#dde9aa'],
  commerce: ['#82531f', '#d4a94c', '#fff0ae'],
  production: ['#394e67', '#799ab1', '#d3e8f1'],
} as const

/** An engraved metal gauge with a jewel fill, inset track and ten divisions. */
export default function StatBar({ label, value, max, tone = 'commerce' }: StatBarProps) {
  const id = useId()
  const limit = Number.isFinite(max) && max > 0 ? max : 0
  const amount = Number.isFinite(value) ? value : 0
  const current = Math.max(0, Math.min(limit, amount))
  const width = limit ? current / limit * 272 : 0
  const [dark, mid, light] = palettes[tone]
  return <span className={`norden-stat-bar is-${tone}`}>
    <svg className="norden-stat-bar-graphic" viewBox="0 0 300 34" preserveAspectRatio="none"
      role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={limit} aria-valuenow={current}
      aria-valuetext={`${amount} / ${limit}`}>
      <defs>
        <linearGradient id={`${id}-metal`} x2="0" y2="1">
          <stop stopColor="#fff0c6" /><stop offset=".28" stopColor="#b18b4b" />
          <stop offset=".55" stopColor="#665033" /><stop offset="1" stopColor="#d7b674" />
        </linearGradient>
        <linearGradient id={`${id}-fill`} x2="0" y2="1">
          <stop stopColor={light} /><stop offset=".3" stopColor={mid} />
          <stop offset=".65" stopColor={dark} /><stop offset="1" stopColor={mid} />
        </linearGradient>
        <pattern id={`${id}-engraving`} width="12" height="18" patternUnits="userSpaceOnUse">
          <path d="m0 18 12-18M-6 18 6 0" stroke="#fff" strokeOpacity=".1" strokeWidth="1" />
        </pattern>
        <clipPath id={`${id}-clip`}><rect x="14" y="8" width={width} height="18" rx="2" /></clipPath>
      </defs>
      <path d="M2 17 10 5h280l8 12-8 12H10Z" fill={`url(#${id}-metal)`} stroke="#654a2a" />
      <path d="M10 7h280M10 27h280" stroke="#f7df9b" strokeOpacity=".7" />
      <rect x="13" y="7" width="274" height="20" rx="3" fill="#382b22" stroke="#4c3925" />
      <rect x="14" y="8" width="272" height="18" rx="2" fill="#181b1b" />
      <g clipPath={`url(#${id}-clip)`}>
        <rect x="14" y="8" width="272" height="18" fill={`url(#${id}-fill)`} />
        <rect x="14" y="8" width="272" height="18" fill={`url(#${id}-engraving)`} />
        <path d="M14 9h272" stroke={light} strokeOpacity=".8" />
      </g>
      {Array.from({ length: 9 }, (_, index) => <path key={index}
        d={`M${14 + (index + 1) * 27.2} 8v18`} stroke="#f5e7bd" strokeOpacity=".24" />)}
      <path d="m6 17 4-4 4 4-4 4Zm280 0 4-4 4 4-4 4Z" fill="#f0d291" stroke="#7b5b31" />
    </svg>
    <span className="norden-stat-bar-value" aria-hidden="true">{amount.toLocaleString()}</span>
  </span>
}
