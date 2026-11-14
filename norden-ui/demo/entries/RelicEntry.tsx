import { useState } from 'react'
import { RelicScreen } from '../../src'
import type { ConstructionView, RelicProductionView, RelicRarityView, RelicView } from '../../src'
import { MOCK_RELICS, repositoryRelics, type RelicSpec } from '../repositoryRelics'
import MockMap from '../mock/MockMap'
import { Log, useLog, Workbench } from '../Workbench'

const RELICS: readonly RelicSpec[] = repositoryRelics ?? MOCK_RELICS
const RELIC_MAP = Object.fromEntries(RELICS.map(relic => [relic.id, relic]))
const BROKEN = RELICS.filter(relic => relic.brokenName)
const PRODUCTION_PER_TURN = 120

/** The game's rules of relics (src/game/relics/), for the demo */
/**
 * 法王府's rate as the game's: plain for a relic needing no technology or with it researched, plus so much for each
 * research point short of it (the demo takes DEMO_SHORTFALL short without 技術を習得)
 */
const PAPAL_REPAIR_RATE = 2.5
const PAPAL_REPAIR_RATE_RISE = 1
const PAPAL_REPAIR_RISE_POINTS = 700
/** 法王府 turns down a repair dearer than this */
const PAPAL_REPAIR_MAX_GOLD = 5000
const DEMO_SHORTFALL = 700
const BROKEN_RARITY: Readonly<Record<RelicRarityView, RelicRarityView>> = { S: 'A', A: 'B', B: 'C', C: 'D', D: 'D' }
const INITIAL_GOLD = 3000

type Item = { id: string; relicId: string; state: 'broken' | 'papalRepair' | 'repaired' }
type Work = { kind: 'relicRepair' | 'relicProduction'; relicId: string; invested: number }

const brokenItems = (): Item[] => BROKEN.slice(0, 4).map(relic => ({ id: `box-${relic.id}`, relicId: relic.id, state: 'broken' }))

export default function RelicEntry() {
  const [log, add] = useLog()
  const [items, setItems] = useState<Item[]>(brokenItems)
  const [gold, setGold] = useState(INITIAL_GOLD)
  const [points, setPoints] = useState(0)
  const [techs, setTechs] = useState(false)
  const [work, setWork] = useState<Work | null>(null)
  const [serial, setSerial] = useState(0)

  const busy = work ? `ほかの遺物を${work.kind === 'relicRepair' ? '修復' : '生産'}中です` : undefined
  const turns = (supplies: number) => Math.ceil(supplies / PRODUCTION_PER_TURN)
  const moneyReason = (cost: number) => (gold < cost ? '金が足りません' : undefined)
  const techReason = (tech?: string) => (tech && !techs ? `技術「${tech}」の研究が必要です` : undefined)
  const shortfall = techs ? 0 : DEMO_SHORTFALL
  const papalRate = (relic: RelicSpec) => (!relic.repair?.tech ? PAPAL_REPAIR_RATE : PAPAL_REPAIR_RATE + (PAPAL_REPAIR_RATE_RISE * shortfall) / PAPAL_REPAIR_RISE_POINTS)
  const papalGold = (relic: RelicSpec) => Math.ceil(((relic.repair?.gold ?? 0) + (relic.repair?.supplies ?? 0)) * papalRate(relic))

  const view = (item: Item): RelicView => {
    const relic = RELIC_MAP[item.relicId]!
    const broken = item.state !== 'repaired'
    return {
      id: item.id,
      status: item.state,
      name: broken ? relic.brokenName ?? relic.name : relic.name,
      image: broken ? relic.brokenImage : relic.image,
      rarity: broken ? BROKEN_RARITY[relic.rarity] : relic.rarity,
      useLabel: relic.useLabel,
      description: relic.description,
      dismantle: relic.dismantlePoints === undefined ? undefined : { points: relic.dismantlePoints },
      repair: relic.repair && {
        ...relic.repair, turns: turns(relic.repair.supplies), unavailableReason: techReason(relic.repair.tech) ?? busy ?? moneyReason(relic.repair.gold),
      },
      papalRepair: relic.repair && {
        gold: papalGold(relic),
        unavailableReason: papalGold(relic) > PAPAL_REPAIR_MAX_GOLD ? `金${PAPAL_REPAIR_MAX_GOLD.toLocaleString()}を超える修復は法王府に断られます` : moneyReason(papalGold(relic)),
      },
    }
  }
  const repairing: RelicView[] = work?.kind === 'relicRepair'
    ? [{ ...view({ id: 'work', relicId: work.relicId, state: 'broken' }), status: 'repairing', cityName: 'フルーエン', dismantle: undefined, repair: undefined, papalRepair: undefined }]
    : []
  const productions: RelicProductionView[] = !techs ? [] : RELICS.flatMap(relic => (relic.production ? [{
    id: relic.id, name: relic.name, image: relic.image, rarity: relic.rarity, useLabel: relic.useLabel, description: relic.description,
    supplies: relic.production.supplies, gold: relic.production.gold, turns: turns(relic.production.supplies),
    unavailableReason: busy ?? moneyReason(relic.production.gold),
  }] : []))
  const required = work && (work.kind === 'relicRepair' ? RELIC_MAP[work.relicId]!.repair! : RELIC_MAP[work.relicId]!.production!).supplies
  const construction: ConstructionView | null = work && required !== null ? {
    kind: work.kind,
    building: { id: work.relicId, name: work.kind === 'relicRepair' ? RELIC_MAP[work.relicId]!.brokenName ?? '' : RELIC_MAP[work.relicId]!.name },
    invested: work.invested,
    required,
    turnsLeft: turns(required - work.invested),
  } : null

  const repair = (id: string) => {
    const item = items.find(i => i.id === id)!
    const relic = RELIC_MAP[item.relicId]!
    setItems(items.filter(i => i.id !== id))
    setGold(gold - relic.repair!.gold)
    setWork({ kind: 'relicRepair', relicId: item.relicId, invested: 0 })
    add(`${relic.brokenName}の修復を開始`)
  }
  const produce = (relicId: string) => {
    const relic = RELIC_MAP[relicId]!
    setGold(gold - relic.production!.gold)
    setWork({ kind: 'relicProduction', relicId, invested: 0 })
    add(`${relic.name}の生産を開始`)
  }
  const papalRepair = (id: string) => {
    const relic = RELIC_MAP[items.find(i => i.id === id)!.relicId]!
    setItems(items.map(i => (i.id === id ? { ...i, state: 'papalRepair' } : i)))
    setGold(gold - papalGold(relic))
    add(`${relic.brokenName}を法王府に依頼（金 ${papalGold(relic)}）`)
  }
  const dismantle = (id: string) => {
    const relic = RELIC_MAP[items.find(i => i.id === id)!.relicId]!
    setItems(items.filter(i => i.id !== id))
    setPoints(points + (relic.dismantlePoints ?? 0))
    add(`${relic.brokenName}を解体（研究 +${relic.dismantlePoints}）`)
  }
  /** The next turn: 法王府's repairs, and the city's 生産 into the work */
  const nextTurn = () => {
    let next = items.map(i => (i.state === 'papalRepair' ? { ...i, state: 'repaired' as const } : i))
    if (work && required !== null) {
      const invested = work.invested + PRODUCTION_PER_TURN
      if (invested >= required) {
        next = [...next, { id: `done-${serial}`, relicId: work.relicId, state: 'repaired' }]
        setSerial(serial + 1)
        setWork(null)
        add(`${RELIC_MAP[work.relicId]!.name}が完成`)
      } else setWork({ ...work, invested })
    }
    setItems(next)
  }

  return <Workbench variant="screen"
    stage={<>
      <MockMap />
      <RelicScreen cityName="フルーエン" construction={construction} gold={gold} relics={[...items.map(view), ...repairing]} productions={productions}
        onDismantle={dismantle} onRepair={repair} onPapalRepair={papalRepair} onProduce={produce} onClose={() => add('閉じる')} />
    </>}
    controls={<>
      <h2>遺物画面</h2>
      <p>研究＞遺物で開くアイテムボックス。壊れた遺物は解体（確認あり）・開いている都市で修復・法王府に依頼でき、できないときは理由を出します。修復中の遺物は都市の建設の枠にあり、法王府に依頼中の遺物は次のターンに修復済みになります。法王府への献上は押せません。{repositoryRelics ? 'ゲームの遺物データを使っています。' : ''}</p>
      <label className="checkbox"><input type="checkbox" checked={techs} onChange={event => setTechs(event.target.checked)} />技術を研究し終えている</label>
      <p>解体で得た研究ポイント: {points}</p>
      <button type="button" onClick={nextTurn}>次のターン</button>
      <button type="button" onClick={() => {
        setItems(brokenItems())
        setGold(INITIAL_GOLD)
        setPoints(0)
        setWork(null)
      }}>はじめから</button>
      <Log entries={log} />
    </>} />
}
