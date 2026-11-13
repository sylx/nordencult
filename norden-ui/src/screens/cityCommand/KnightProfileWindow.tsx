import { useEffect, useRef, useState } from 'react'
import NavigationWindow from '../../components/window/NavigationWindow'
import type { NavigationWindowProps } from '../../components/window/NavigationWindow'
import EquipmentSlots from '../../components/parts/EquipmentSlots'
import { KnightStats } from '../../components/parts/KnightCard'
import PickerDialog from '../../components/picker/PickerDialog'
import RelicPicker from '../../components/picker/RelicPicker'
import { ABILITIES, ABILITY_LABELS, knightAbility, summonStats } from '../domestic/DomesticOfficers'
import type { EquipmentActions, KnightView } from '../types'
import Tooltip from '../../components/parts/Tooltip'
import './KnightProfileWindow.css'

export interface KnightProfileWindowProps extends Omit<NavigationWindowProps, 'title' | 'children'> {
  knight: KnightView
  /** Finds a knight the 略歴 names; names it cannot find are shown without a link */
  knightOf?: (id: string) => KnightView | undefined
  /** A name in the 略歴 was clicked */
  onSelectKnight?: (id: string) => void
  /** Changing the knight's equipment (knight.equipment): a slot pressed opens the relics for it. Omitted: the slots are only shown */
  equipment?: EquipmentActions
  onClose: () => void
}

/**
 * A knight's profile: full figure, 所属・所在, abilities with their chart, equipment slots (装備) and 略歴, in a window with back/forward.
 * A summoned unit (knight.summon) shows its HP, attack and defense in place of the abilities and their chart, and the
 * relic it was summoned with in place of the 略歴.
 * A slot pressed opens the relics that can go in it (a PickerDialog), 外す takes one off
 */
export default function KnightProfileWindow({ knight, knightOf, onSelectKnight, equipment, onClose, className = '', ...windowProps }: KnightProfileWindowProps) {
  const body = useRef<HTMLDivElement>(null)
  /** The knight and slot whose relics are being chosen from, and the relic chosen */
  const [choice, setChoice] = useState<{ knightId: string; slot: number; itemId: string | null } | null>(null)
  // Another knight shown: what was being chosen for the one before is gone
  const picking = choice?.knightId === knight.id ? choice : null
  const pickingRef = useRef(false)
  useEffect(() => { pickingRef.current = picking !== null })
  // Another knight starts at the top of their profile
  useEffect(() => {
    const content = body.current?.closest('.norden-window-frame-content')
    if (content) content.scrollTop = 0
  }, [knight.id])
  // Escape closes this window before the screen under it (ScreenHost skips handled keys)
  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      // The dialog choosing a relic takes it
      if (event.key !== 'Escape' || event.defaultPrevented || pickingRef.current) return
      event.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', keyDown, true)
    return () => window.removeEventListener('keydown', keyDown, true)
  }, [onClose])

  const abilities = ABILITIES.map(ability => ({ label: ABILITY_LABELS[ability], value: knightAbility(knight, ability) }))
  const figure = knight.imageSrc ? <img src={knight.imageSrc} alt="" /> : knight.image
  return (
    <NavigationWindow {...windowProps} title={knight.name} onClose={onClose} className={`norden-knight-profile-window ${className}`}>
      <div ref={body} className={`norden-knight-profile ${figure ? 'has-figure' : ''}`}>
        <div className="norden-knight-profile-overview">
          <header className="norden-knight-profile-header">
            {!figure && <span className="norden-knight-face">{knight.portraitSrc
              ? <img src={knight.portraitSrc} alt="" />
              : knight.portrait ?? <span className="norden-knight-initial">{knight.name.slice(0, 1)}</span>}</span>}
            <div>
              <h2 className="norden-knight-profile-name">{knight.name}</h2>
              {knight.subtitle && <span className="norden-knight-profile-sub">{knight.subtitle}</span>}
            </div>
          </header>
          {(knight.faction !== undefined || knight.location || knight.mercenary || knight.summon) && (
            <dl className="norden-knight-profile-facts">
              {knight.faction !== undefined && <div>
                <dt>所属</dt>
                <dd>
                  {knight.faction?.emblem && <img className="norden-knight-profile-emblem" src={knight.faction.emblem} alt="" />}
                  {knight.faction?.name ?? '勢力なし'}
                </dd>
              </div>}
              {knight.location && <div><dt>所在</dt><dd>{knight.location}</dd></div>}
              {knight.mercenary && <div><dt>傭兵</dt><dd>{knight.mercenary.company}</dd></div>}
              {knight.mercenary && <div><dt>直轄兵</dt><dd>{knight.mercenary.soldiers.toLocaleString()} / {knight.mercenary.maxSoldiers.toLocaleString()}</dd></div>}
              {knight.summon && <div><dt>HP</dt><dd>{knight.summon.hp.toLocaleString()} / {knight.summon.maxHp.toLocaleString()}</dd></div>}
              {knight.mercenary?.monthly !== undefined && <div><dt>契約</dt>
              <dd>{knight.mercenary.monthly.toLocaleString()}/月{knight.mercenary.months !== undefined && ` ${knight.mercenary.months + 1}ヶ月目`}</dd></div>}
            </dl>
          )}
          {knight.summon
            ? <KnightStats stats={summonStats(knight.summon)} className="is-summon" />
            : <>
              <KnightStats stats={abilities.map(({ label, value }) => ({ label, value: value ?? '—' }))} />
              <AbilityChart abilities={abilities} />
            </>}
          {figure && <div className="norden-knight-profile-figure" role="img" aria-label={`${knight.name}の立ち絵`}>{figure}</div>}
        </div>
        {knight.equipment && (
          <section className="norden-knight-profile-section norden-knight-profile-equipment">
            <h3>装備</h3>
            <EquipmentSlots slots={knight.equipment.slots} disabledReason={knight.equipment.unavailableReason}
              onPick={equipment && (slot => setChoice({ knightId: knight.id, slot, itemId: null }))}
              onRemove={equipment && (slot => equipment.onUnequip(knight.id, slot))} />
          </section>
        )}
        {knight.summon && (
          <section className="norden-knight-profile-section">
            <h3>召喚の遺物</h3>
            {knight.summon.relicName || knight.summon.relicDescription
              ? <p className="norden-knight-profile-biography">
                {knight.summon.relicName && <b className="norden-knight-profile-relic">{knight.summon.relicName}</b>}
                {knight.summon.relicDescription}
              </p>
              : <p className="norden-knight-profile-empty">記録はありません。</p>}
          </section>
        )}
        {!knight.summon && <section className="norden-knight-profile-section">
          <h3>略歴</h3>
          {knight.biography
            ? <p className="norden-knight-profile-biography">{biographyParts(knight.biography).map((part, index) => {
              if (typeof part === 'string') return part
              const target = knightOf?.(part.id)
              return target && onSelectKnight
                ? <Tooltip key={index} content={`${target.name}の詳細`}>
                  <button type="button" className="norden-knight-profile-link" onClick={() => onSelectKnight(part.id)}>{part.name}</button>
                </Tooltip>
                : part.name
            })}</p>
            : <p className="norden-knight-profile-empty">記録はありません。</p>}
        </section>}
      </div>
      {picking && equipment && (
        <PickerDialog title={`${knight.name}の装備の枠${picking.slot + 1}`} className="is-narrow"
          message={knight.equipment?.slots[picking.slot] ? `いまの${knight.equipment.slots[picking.slot]!.name}は箱に戻ります。` : undefined}
          confirmDisabled={picking.itemId === null}
          onConfirm={() => {
            equipment.onEquip(knight.id, picking.slot, picking.itemId!)
            setChoice(null)
          }}
          onCancel={() => setChoice(null)}>
          <RelicPicker items={equipment.options(knight.id, picking.slot)} selectedId={picking.itemId} label="装備できる遺物"
            emptyText="装備できる遺物はありません。" onSelect={itemId => setChoice({ ...picking, itemId })} />
        </PickerDialog>
      )}
    </NavigationWindow>
  )
}

/** 名前（001）: the name (the katakana just before it) and the id of the knight it names */
const REFERENCE = /([ァ-ヿ]*)（(\d{3})）/g

/** Splits a 略歴 into its text and the knights it names (the ids themselves are dropped) */
export function biographyParts(text: string): (string | { name: string; id: string })[] {
  const parts: (string | { name: string; id: string })[] = []
  let last = 0
  for (const match of text.matchAll(REFERENCE)) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    if (match[1]) parts.push({ name: match[1], id: match[2]! })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

// The labels stay inside the viewBox, so the chart never widens the window
const CHART = { size: 280, height: 204, radius: 70, labelGap: 18 }

/** The five abilities (0-100) as a pentagon, 統率 at the top and clockwise; an unknown ability counts as 0 */
function AbilityChart({ abilities }: { abilities: readonly { label: string; value: number | undefined }[] }) {
  const cx = CHART.size / 2, cy = CHART.height / 2 + 8
  const point = (index: number, ratio: number) => {
    const angle = -Math.PI / 2 + index * 2 * Math.PI / abilities.length
    return { x: cx + Math.cos(angle) * CHART.radius * ratio, y: cy + Math.sin(angle) * CHART.radius * ratio }
  }
  const polygon = (ratio: (index: number) => number) => abilities.map((_, index) => {
    const { x, y } = point(index, ratio(index))
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const ratioOf = (value: number | undefined) => Math.max(0, Math.min(1, (value ?? 0) / 100))
  const summary = abilities.map(({ label, value }) => `${label}${value ?? '不明'}`).join('、')
  return (
    <svg className="norden-knight-profile-chart" viewBox={`0 0 ${CHART.size} ${CHART.height}`} role="img" aria-label={`能力チャート：${summary}`}>
      {[0.25, 0.5, 0.75, 1].map(ring => <polygon key={ring} className="is-ring" points={polygon(() => ring)} />)}
      {abilities.map((_, index) => {
        const end = point(index, 1)
        return <line key={index} className="is-axis" x1={cx} y1={cy} x2={end.x} y2={end.y} />
      })}
      <polygon className="is-value" points={polygon(index => ratioOf(abilities[index]!.value))} />
      {abilities.map(({ label, value }, index) => {
        const { x, y } = point(index, ratioOf(value))
        const at = point(index, 1 + CHART.labelGap / CHART.radius)
        const dx = at.x - cx
        const anchor = Math.abs(dx) < 1 ? 'middle' : dx > 0 ? 'start' : 'end'
        // The top label sits above its corner, the bottom ones below theirs
        const dy = at.y < cy - CHART.radius / 2 ? -10 : at.y > cy + CHART.radius / 2 ? 10 : 0
        return <g key={label}>
          <Tooltip content={`${label} ${value ?? '—'}`}><circle className="is-point" cx={x} cy={y} r={4} /></Tooltip>
          <text x={at.x} y={at.y + dy} textAnchor={anchor} dominantBaseline="middle">
            <tspan className="is-label">{label}</tspan>
            <tspan className="is-number" dx={4}>{value ?? '—'}</tspan>
          </text>
        </g>
      })}
    </svg>
  )
}
