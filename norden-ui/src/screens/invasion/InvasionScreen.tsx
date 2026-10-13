import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import InfoWindow from '../../components/window/InfoWindow'
import KnightCard from '../../components/parts/KnightCard'
import ChoiceGroup from '../../components/parts/ChoiceGroup'
import QuantityInput from '../../components/parts/QuantityInput'
import FactionMark from '../../components/parts/FactionMark'
import Button from '../../components/parts/Button'
import type { InfoWindowSkin } from '../../skins'
import type { CityView, KnightView, UnitTypeView } from '../types'
import '../screens.css'
import './InvasionScreen.css'

/** One unit of the army: the knight leading it (null: led indirectly by the commander), its unit type and soldiers */
export interface InvasionAssignment {
  knightId: string | null
  unitType: string
  soldiers: number
}

/** The army: the knight who leads it and its units, the commander's first */
export interface InvasionDraft {
  commander: string | null
  units: readonly InvasionAssignment[]
}

export interface InvasionScreenProps {
  from: CityView
  to: CityView
  /** Knights defending the target */
  defenders?: number
  /** Knights in the starting city. Those with `unavailableReason` are shown but cannot be picked */
  knights: readonly KnightView[]
  unitTypes: readonly UnitTypeView[]
  /** Unit types of the units the commander leads indirectly when knights run short. Omitted: none can be formed */
  indirectUnitTypes?: readonly string[]
  /** Most units of an army, the indirect ones included */
  maxUnits?: number
  /** Soldiers available in the starting city, shared by the whole army */
  soldierPool: number
  /** Soldiers step of the sliders */
  soldierStep?: number
  /** The host's rules. Return why the army cannot be ordered, or null */
  validate?: (draft: InvasionDraft) => string | null
  onConfirm: (draft: InvasionDraft) => void
  onCancel: () => void
  confirmLabel?: string
  /** Initial positions of the two windows */
  layout?: { knights?: { x: number; y: number }; army?: { x: number; y: number } }
  skin?: InfoWindowSkin
  children?: ReactNode
}

/** A unit and its React key (the knight's id, or a serial for the indirect ones) */
type Slot = InvasionAssignment & { key: string }

const total = (units: readonly InvasionAssignment[]) => units.reduce((sum, item) => sum + item.soldiers, 0)

/** The problem of the army that the screen itself knows about */
function draftProblem(units: readonly InvasionAssignment[]) {
  if (units.length === 0) return '軍団長を選んでください'
  if (units.some(item => item.soldiers <= 0)) return '兵数が0の部隊があります'
  return null
}

/**
 * Invasion screen: pick the commander first, then the other knights, and each unit's type and soldiers.
 * The commander can be changed to another knight of the army, except when a knight who must lead (commandRank) is in it.
 * While there is room, the commander can also lead units without a knight (indirectUnitTypes).
 */
export default function InvasionScreen({
  from, to, defenders, knights, unitTypes, indirectUnitTypes, maxUnits = 6, soldierPool, soldierStep = 10, validate,
  onConfirm, onCancel, confirmLabel = '予約', layout = {}, skin, children,
}: InvasionScreenProps) {
  const [units, setUnits] = useState<readonly Slot[]>([])
  const serial = useRef(0)
  const knightMap = new Map(knights.map(knight => [knight.id, knight]))
  const capOf = (knight: KnightView | undefined) => knight?.maxSoldiers ?? soldierPool
  const indirectCapOf = (knight: KnightView | undefined) => knight?.indirectSoldiers ?? capOf(knight)
  const rankOf = (id: string | null) => (id === null ? 0 : knightMap.get(id)?.commandRank ?? 0)
  const unitTypesOf = (knight: KnightView) =>
    knight.unitTypes ? unitTypes.filter(type => knight.unitTypes!.includes(type.id)) : unitTypes
  const indirectChoices = indirectUnitTypes ? unitTypes.filter(type => indirectUnitTypes.includes(type.id)) : []

  // The commander's unit comes first; there is none without knights
  const commander = units[0] ? knightMap.get(units[0].knightId ?? '') : undefined
  const used = total(units)
  const remaining = Math.max(0, soldierPool - used)
  const full = units.length >= maxUnits
  const draft: InvasionDraft = { commander: commander?.id ?? null, units: units.map(({ key: _, ...unit }) => unit) }
  const problem = draftProblem(units) ?? validate?.(draft) ?? null

  /** Puts the commander first (a knight of a higher rank takes over) and fits the indirect units to them */
  const arrange = (next: readonly Slot[]): readonly Slot[] => {
    const led = next.filter(item => item.knightId !== null)
    if (led.length === 0) return []
    const top = led.reduce((best, item) => (rankOf(item.knightId) > rankOf(best.knightId) ? item : best))
    const current = next[0]!.knightId !== null && rankOf(next[0]!.knightId) >= rankOf(top.knightId) ? next[0]! : top
    const cap = indirectCapOf(knightMap.get(current.knightId!))
    return [current, ...next.filter(item => item !== current)]
      .map(item => (item.knightId === null && item.soldiers > cap ? { ...item, soldiers: cap } : item))
  }
  const update = (change: (current: readonly Slot[]) => readonly Slot[]) => setUnits(current => arrange(change(current)))

  const add = (knight: KnightView) => update(current => {
    const choices = unitTypesOf(knight)
    const unitType = knight.defaultUnitType && choices.some(type => type.id === knight.defaultUnitType)
      ? knight.defaultUnitType : choices[0]?.id ?? ''
    const soldiers = Math.min(capOf(knight), Math.max(0, soldierPool - total(current)))
    return [...current, { key: knight.id, knightId: knight.id, unitType, soldiers }]
  })
  const addIndirect = () => update(current => {
    const soldiers = Math.min(indirectCapOf(commander), Math.max(0, soldierPool - total(current)))
    return [...current, { key: `indirect-${serial.current++}`, knightId: null, unitType: indirectChoices[0]?.id ?? '', soldiers }]
  })
  const remove = (key: string) => update(current => current.filter(item => item.key !== key))
  const lead = (key: string) => update(current => [...current.filter(item => item.key === key), ...current.filter(item => item.key !== key)])
  const change = (key: string, patch: Partial<InvasionAssignment>) =>
    update(current => current.map(item => (item.key === key ? { ...item, ...patch } : item)))

  const knightsAt = layout.knights ?? { x: 24, y: 72 }
  const armyAt = layout.army ?? { x: 464, y: 72 }
  const fullReason = `${maxUnits}部隊までです`
  // Only a knight of the commander's rank can take over from them
  const leadReason = commander?.commandRank ? `${commander.name}が出撃するため軍団長は変えられません` : undefined
  let indirectNumber = 0

  const pickAction = (knight: KnightView) => {
    const unit = units.find(item => item.knightId === knight.id)
    if (unit) {
      return <>
        <span className="norden-invasion-role">{unit === units[0] ? '軍団長' : '編成中'}</span>
        <Button size="small" aria-label={`${knight.name}を外す`} onClick={() => remove(unit.key)}>外す</Button>
      </>
    }
    if (knight.unavailableReason) return null
    if (!commander) {
      return <Button size="small" aria-label={`${knight.name}を軍団長にする`} onClick={() => add(knight)}>軍団長にする</Button>
    }
    return <Button size="small" aria-label={`${knight.name}を加える`} disabled={full} title={full ? fullReason : undefined}
      onClick={() => add(knight)}>加える</Button>
  }

  return (
    <div className="norden-screen norden-invasion">
      <InfoWindow title="出撃する騎士" x={knightsAt.x} y={knightsAt.y} minWidth={380} minHeight={240} skin={skin}>
        <div className="norden-invasion-knights">
          <p className="norden-invasion-route">
            <span><FactionMark faction={from.faction} emblemOnly /> {from.name}</span>
            <span className="norden-invasion-arrow" aria-label="から">→</span>
            <span><FactionMark faction={to.faction} emblemOnly /> {to.name}</span>
          </p>
          {defenders !== undefined && (
            <p className="norden-invasion-defenders">守備の騎士: {defenders > 0 ? `${defenders}人` : 'なし'}</p>
          )}
          <h3 className="norden-invasion-heading">{commander ? '騎士を加える' : 'まず軍団長を選ぶ'}</h3>
          {knights.length === 0
            ? <p className="norden-invasion-empty">出撃できる騎士がいません。</p>
            : (
              <ul className="norden-invasion-list" aria-label="出撃する騎士">
                {knights.map(knight => (
                  <li key={knight.id}>
                    <KnightCard knight={knight} compact current={units.some(item => item.knightId === knight.id)}
                      className={knight.unavailableReason ? 'is-disabled' : ''}
                      aside={<span className="norden-invasion-pick">
                        <span>{knight.unavailableReason ?? (knight.maxSoldiers !== undefined ? `率兵 ${knight.maxSoldiers}` : '')}</span>
                        {pickAction(knight)}
                      </span>} />
                  </li>
                ))}
              </ul>
            )}
        </div>
      </InfoWindow>

      <InfoWindow title="軍団編成" x={armyAt.x} y={armyAt.y} minWidth={420} minHeight={240} skin={skin}>
        <div className="norden-invasion-army">
          {!commander
            ? <p className="norden-invasion-empty">左の一覧から軍団長を選んでください。<br />軍団長がこの侵攻を率います。</p>
            : <>
              <p className="norden-invasion-count">部隊 <b>{units.length}</b> / {maxUnits}</p>
              {units.map(item => {
                if (item.knightId === null) {
                  const name = `間接指揮部隊${++indirectNumber}`
                  return (
                    <section key={item.key} className="norden-invasion-unit is-indirect" aria-label={name}>
                      <header className="norden-invasion-indirect">
                        <b>{name}</b>
                        <span>軍団長 {commander.name} が率いる</span>
                        <Button size="small" aria-label={`${name}を外す`} onClick={() => remove(item.key)}>外す</Button>
                      </header>
                      <ChoiceGroup label={`${name}の兵科`} value={item.unitType}
                        options={indirectChoices.map(type => ({ value: type.id, label: type.name, icon: type.icon, title: type.description }))}
                        onChange={unitType => change(item.key, { unitType })} />
                      <QuantityInput label={`${name}の兵数`} unit="人" step={soldierStep} value={item.soldiers}
                        max={Math.min(indirectCapOf(commander), item.soldiers + remaining)}
                        onChange={soldiers => change(item.key, { soldiers })} />
                    </section>
                  )
                }
                const knight = knightMap.get(item.knightId)
                if (!knight) return null
                const isCommander = knight === commander
                return (
                  <section key={item.key} className={`norden-invasion-unit ${isCommander ? 'is-commander' : ''}`} aria-label={`${knight.name}の部隊`}>
                    <KnightCard knight={{ ...knight, stats: undefined }} compact
                      aside={isCommander
                        ? <span className="norden-invasion-role is-commander">軍団長</span>
                        : <span className="norden-invasion-pick">
                          <Button size="small" aria-label={`${knight.name}を軍団長にする`} disabled={Boolean(leadReason)} title={leadReason}
                            onClick={() => lead(item.key)}>軍団長にする</Button>
                          <Button size="small" aria-label={`${knight.name}の部隊を外す`} onClick={() => remove(item.key)}>外す</Button>
                        </span>} />
                    <ChoiceGroup label={`${knight.name}の兵科`} value={item.unitType}
                      options={unitTypesOf(knight).map(type => ({ value: type.id, label: type.name, icon: type.icon, title: type.description }))}
                      onChange={unitType => change(item.key, { unitType })} />
                    <QuantityInput label={`${knight.name}の兵数`} unit="人" step={soldierStep} value={item.soldiers}
                      max={Math.min(capOf(knight), item.soldiers + remaining)}
                      onChange={soldiers => change(item.key, { soldiers })} />
                  </section>
                )
              })}
              {indirectChoices.length > 0 && (
                <Button className="norden-invasion-add-indirect" disabled={full} title={full ? fullReason : undefined} onClick={addIndirect}>
                  ＋ 間接指揮部隊（{indirectChoices.map(type => type.name).join('・')}）
                </Button>
              )}
            </>}
        </div>
      </InfoWindow>

      <div className="norden-screen-bottom-center">
        <div className="norden-hud-panel norden-invasion-summary">
          <span className="norden-invasion-total">
            兵数 <b>{used.toLocaleString()}</b> / {soldierPool.toLocaleString()}
            <span className="norden-invasion-remaining">残り {remaining.toLocaleString()}</span>
          </span>
          <span className="norden-invasion-problem" role="status">{problem ?? ''}</span>
          <Button variant="quiet" onClick={onCancel}>やめる</Button>
          <Button variant="primary" disabled={problem !== null} title={problem ?? undefined} onClick={() => onConfirm(draft)}>
            {confirmLabel}
          </Button>
        </div>
      </div>
      {children}
    </div>
  )
}
