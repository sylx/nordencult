import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import Button from '../../components/parts/Button'
import { KnightStats } from '../../components/parts/KnightCard'
import ThinFrameWithTitle from '../../components/parts/ThinFrameWithTitle'
import { summonStats } from '../domestic/DomesticOfficers'
import type { KnightView } from '../types'
import './SummonDialog.css'

export interface SummonDialogProps {
  /** The summoned unit: its figure (image / imageSrc, else its face), subtitle and HP, attack and defense (knight.summon) */
  knight: KnightView
  /** The name it has now (given automatically) */
  name: string
  /** Most characters of a name */
  maxLength?: number
  /** Another name for it, from the host's list (自動; pressed as often as liked) */
  onAutoName: () => string
  /** The host's check of a name: why it cannot be given, or null. Omitted: an empty one or a too long one only */
  validate?: (name: string) => string | null
  /** 決定: the name given (spaces around it dropped) */
  onConfirm: (name: string) => void
}

/**
 * Naming a unit just summoned, over the whole page: its figure, HP, attack and defense, the name (typed, or 自動 from the
 * host's list as often as liked) and 決定. There is no cancelling: it is summoned already, and Escape does nothing
 * (nor reaches the screen under it)
 */
export default function SummonDialog({ knight, name: initial, maxLength = 12, onAutoName, validate, onConfirm }: SummonDialogProps) {
  const [name, setName] = useState(initial)
  const inputId = useId()
  const reasonId = useId()
  const trimmed = name.trim()
  const problem = trimmed.length === 0 ? '名前を入れてください'
    : [...trimmed].length > maxLength ? `名前は${maxLength}文字までです`
    : validate?.(trimmed) ?? null

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])

  const figure = knight.imageSrc ? <img src={knight.imageSrc} alt="" />
    : knight.image ?? (knight.portraitSrc ? <img src={knight.portraitSrc} alt="" /> : knight.portrait)
  const confirm = () => {
    if (!problem) onConfirm(trimmed)
  }

  return createPortal(
    <div className="norden-summon-backdrop">
      <div role="dialog" aria-modal="true" aria-label="召喚ユニットの名付け" className="norden-summon-dialog-wrap">
        <ThinFrameWithTitle as="div" title="召喚" className="norden-summon-dialog">
          <div className="norden-summon-layout">
            <div className="norden-summon-figure" role="img" aria-label={`${knight.name}の立ち絵`}>{figure}</div>
            <form className="norden-summon-body" onSubmit={event => {
              event.preventDefault()
              confirm()
            }}>
              {knight.subtitle && <p className="norden-summon-subtitle">{knight.subtitle}</p>}
              {knight.summon && <KnightStats stats={summonStats(knight.summon)} className="norden-summon-stats" />}
              <label className="norden-summon-label" htmlFor={inputId}>名前</label>
              <div className="norden-summon-name">
                <input id={inputId} className="norden-summon-input" type="text" value={name} maxLength={maxLength * 2} autoFocus
                  aria-describedby={problem ? reasonId : undefined} onChange={event => setName(event.target.value)} />
                <Button type="button" size="small" onClick={() => setName(onAutoName())}>自動</Button>
              </div>
              <p className="norden-summon-count">{[...trimmed].length} / {maxLength}</p>
              {problem && <p id={reasonId} className="norden-summon-reason" role="note">{problem}</p>}
              <div className="norden-summon-actions">
                <Button type="submit" variant="primary" disabled={Boolean(problem)}>決定</Button>
              </div>
            </form>
          </div>
        </ThinFrameWithTitle>
      </div>
    </div>,
    document.body,
  )
}
