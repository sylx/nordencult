import { useState } from 'react'
import { TechScreen } from '../../src'
import type { TechView } from '../../src'
import { MOCK_TECHS, repositoryTechs, type TechSpec } from '../repositoryTechs'
import MockMap from '../mock/MockMap'
import { Log, useLog, Workbench } from '../Workbench'

const TECHS: readonly TechSpec[] = repositoryTechs ?? MOCK_TECHS
const TECH_MAP = Object.fromEntries(TECHS.map(tech => [tech.id, tech]))
const ALIGNED = TECHS.filter(tech => tech.alignWith)

/** The game's rules of research (src/game/research/), for the demo */
const BRANCH_BONUS = 0.5

interface Research {
  current: string | null
  progress: Record<string, number>
  researched: string[]
  carry: number
}

export default function TechEntry() {
  const [log, add] = useLog()
  const [research, setResearch] = useState<Research>({ current: null, progress: {}, researched: [], carry: 0 })
  const [library, setLibrary] = useState(10)
  const [academy, setAcademy] = useState(5)
  const [officers, setOfficers] = useState(12)
  const [instance, setInstance] = useState(0)
  const [extra, setExtra] = useState(300)
  const [aligning, setAligning] = useState(true)

  const pointsFor = (techId: string | null) => {
    const branch = techId ? TECH_MAP[techId]?.branch : undefined
    return library * (branch === 'physical' ? 1 + BRANCH_BONUS : 1) + academy * (branch === 'arcane' ? 1 + BRANCH_BONUS : 1) + officers
  }
  const available = (id: string) => !research.researched.includes(id) && TECH_MAP[id]!.requires.every(r => research.researched.includes(r))
  const mustChoose = research.current === null && research.carry > 0 && TECHS.some(t => available(t.id))
  /** With `researched`, is anything left to research (the trees start from their roots: only when every one is researched, nothing is) */
  const anyLeft = (researched: readonly string[]) => TECHS.some(t => !researched.includes(t.id))

  const view = (tech: TechSpec): TechView => {
    const { researched } = research
    const alignWith = aligning ? tech.alignWith : undefined
    const status = researched.includes(tech.id) ? 'researched'
      : research.current === tech.id ? 'researching'
      : available(tech.id) ? 'available'
      : tech.requires.some(id => researched.includes(id)) ? 'visible' : 'hidden'
    if (status === 'hidden') return { id: tech.id, status, requires: tech.requires, alignWith }
    const missing = tech.requires.filter(id => !researched.includes(id))
    const progress = research.progress[tech.id] ?? 0
    const left = tech.cost - progress - (research.current === tech.id ? 0 : research.carry)
    const perTurn = pointsFor(tech.id)
    return {
      ...tech, alignWith, status, progress,
      turns: status === 'researched' ? 0
        : left <= 0 ? (research.current !== tech.id && research.carry > 0 ? 0 : 1)
        : perTurn > 0 ? Math.ceil(left / perTurn) : null,
      unavailableReason: missing.length > 0 ? `前提の技術（${missing.map(id => TECH_MAP[id]!.name).join('・')}）が要ります` : undefined,
    }
  }

  /** The points 宙に浮いた go into the technology chosen; reaching its cost, it is completed there and then */
  const choose = (techId: string) => {
    const tech = TECH_MAP[techId]!
    const invested = (research.progress[techId] ?? 0) + research.carry
    if (research.carry > 0 && invested >= tech.cost) {
      const researched = [...research.researched, techId]
      const left = anyLeft(researched)
      const carry = left ? invested - tech.cost : 0
      setResearch({ current: null, progress: { ...research.progress, [techId]: tech.cost }, researched, carry })
      add(`研究先: ${tech.name}、宙に浮いた ${research.carry} で完成（${left ? `余り ${carry}` : '研究できる技術が残っていないため余りは消えた'}）`)
      return
    }
    setResearch({ ...research, current: techId, carry: 0, progress: { ...research.progress, [techId]: invested } })
    add(`研究先: ${tech.name}${research.carry > 0 ? `（宙に浮いた ${research.carry} を投入）` : ''}`)
  }

  /** The economy run's research: the points into the technology researched, or 宙に浮いた */
  const advanceTurn = () => {
    const points = Math.round(pointsFor(research.current))
    const tech = research.current ? TECH_MAP[research.current] : undefined
    if (!tech) {
      if (!anyLeft(research.researched)) {
        add(`ターン: 研究 +${points}（研究できる技術が残っていないため消えた）`)
        return
      }
      setResearch(current => ({ ...current, carry: current.carry + points }))
      add(`ターン: 研究 +${points}（研究先が無いため宙に浮いた）`)
      return
    }
    const invested = (research.progress[tech.id] ?? 0) + points
    if (invested >= tech.cost) {
      const researched = [...research.researched, tech.id]
      const left = anyLeft(researched)
      setResearch(current => ({
        current: null, progress: { ...current.progress, [tech.id]: tech.cost }, researched,
        carry: left ? current.carry + invested - tech.cost : 0,
      }))
      add(`ターン: 研究 +${points}、${tech.name}が完成（${left ? `余り ${invested - tech.cost}` : '研究できる技術が残っていないため余りは消えた'}）`)
    } else {
      setResearch(current => ({ ...current, progress: { ...current.progress, [tech.id]: invested } }))
      add(`ターン: 研究 +${points}（${tech.name} ${invested} / ${tech.cost}）`)
    }
  }

  const perTurn = Math.round(pointsFor(research.current))
  return <Workbench variant="screen"
    stage={<>
      <MockMap />
      <TechScreen key={instance} techs={TECHS.map(view)} perTurn={[Math.max(0, perTurn - 2), perTurn + 2]} carry={research.carry} mustChoose={mustChoose}
        pointDetails={[`施設 +${library + academy}（系統の割増 +${BRANCH_BONUS * 100}%）`, `担当官 +${officers}`]}
        onResearch={choose} onClose={() => add('閉じる')} />
    </>}
    controls={<>
      <h2>技術画面</h2>
      <p>研究＞技術で開くツリー。前提の無い技術は系統に関係なく左端に並びます。兵法の系列には系統が無く、研究施設の割増が付きません。研究し終えた技術の子が研究できるようになり、名前で見えます。それより先は「???」の枠だけです。研究ポイントが宙に浮くと（研究先が無いターン・研究を終えたターン）閉じられず、研究先を選ばされます。宙に浮いたポイントで足りる技術は、選んだ時点で完成し、余りでまた次を選ばされます。研究できる技術が残っていなければ、宙に浮いたポイントは消え、閉じられます。{repositoryTechs ? 'ゲームの技術データを使っています。' : ''}</p>
      <label className="checkbox"><input type="checkbox" checked={aligning} onChange={event => setAligning(event.target.checked)} />行を揃える（alignWith）</label>
      {ALIGNED.length > 0 && <p>{ALIGNED.map(tech => `${tech.name} → ${TECH_MAP[tech.alignWith!]?.name ?? tech.alignWith}`).join('、')}。外すと一番深い前提の行に戻ります。「???」のままでも位置は同じです。</p>}
      <label htmlFor="tech-library">図書館系（物理文明）の研究ポイント</label>
      <input id="tech-library" type="number" min={0} value={library} onChange={event => setLibrary(Math.max(0, event.target.valueAsNumber || 0))} />
      <label htmlFor="tech-academy">魔術学院系（魔法文明）の研究ポイント</label>
      <input id="tech-academy" type="number" min={0} value={academy} onChange={event => setAcademy(Math.max(0, event.target.valueAsNumber || 0))} />
      <label htmlFor="tech-officers">研究担当官の研究ポイント</label>
      <input id="tech-officers" type="number" min={0} value={officers} onChange={event => setOfficers(Math.max(0, event.target.valueAsNumber || 0))} />
      <button className="reset-button" onClick={advanceTurn}>1ターン進める</button>
      <label htmlFor="tech-extra">宙に浮かせる研究ポイント（研究先を外して足す）</label>
      <input id="tech-extra" type="number" min={0} value={extra} onChange={event => setExtra(Math.max(0, event.target.valueAsNumber || 0))} />
      <button className="reset-button" onClick={() => {
        if (!anyLeft(research.researched)) {
          add('研究できる技術が残っていません')
          return
        }
        setResearch(current => ({ ...current, current: null, carry: current.carry + extra }))
        add(`宙に浮いた研究ポイント +${extra}`)
      }}>宙に浮いたポイントを足す</button>
      <button className="reset-button" onClick={() => {
        // A technology none requires, left for the last
        const last = [...TECHS].reverse().find(t => !TECHS.some(other => other.requires.includes(t.id)))!
        setResearch({ current: null, progress: research.progress, researched: TECHS.filter(t => t.id !== last.id).map(t => t.id), carry: 0 })
        add(`${last.name}を残して研究済みにした`)
      }}>最後の1つを残して研究済みにする</button>
      <button className="reset-button" onClick={() => {
        setResearch({ current: null, progress: {}, researched: [], carry: 0 })
        setInstance(value => value + 1)
      }}>最初から</button>
      <Log entries={log} />
    </>}
  />
}
