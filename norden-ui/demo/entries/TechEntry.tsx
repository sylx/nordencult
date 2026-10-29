import { useState } from 'react'
import { TechScreen } from '../../src'
import type { TechTreeView, TechView } from '../../src'
import { MOCK_TECHS, repositoryTechs, type TechSpec } from '../repositoryTechs'
import MockMap from '../mock/MockMap'
import { Log, useLog, Workbench } from '../Workbench'

const TECHS: readonly TechSpec[] = repositoryTechs ?? MOCK_TECHS
const TECH_MAP = Object.fromEntries(TECHS.map(tech => [tech.id, tech]))
const BRANCHES = [{ id: 'physical', label: '物理文明' }, { id: 'arcane', label: '魔法文明' }] as const

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

  const pointsFor = (techId: string | null) => {
    const branch = techId ? TECH_MAP[techId]?.branch : undefined
    return library * (branch === 'physical' ? 1 + BRANCH_BONUS : 1) + academy * (branch === 'arcane' ? 1 + BRANCH_BONUS : 1) + officers
  }
  const available = (id: string) => !research.researched.includes(id) && TECH_MAP[id]!.requires.every(r => research.researched.includes(r))
  const mustChoose = research.current === null && research.carry > 0 && TECHS.some(t => available(t.id))

  const view = (tech: TechSpec): TechView => {
    const { researched } = research
    const status = researched.includes(tech.id) ? 'researched'
      : research.current === tech.id ? 'researching'
      : available(tech.id) ? 'available'
      : tech.requires.some(id => researched.includes(id)) ? 'visible' : 'hidden'
    if (status === 'hidden') return { id: tech.id, status, requires: tech.requires }
    const missing = tech.requires.filter(id => !researched.includes(id))
    const progress = research.progress[tech.id] ?? 0
    const left = tech.cost - progress - (research.current === tech.id ? 0 : research.carry)
    const perTurn = pointsFor(tech.id)
    return {
      ...tech, status, progress,
      turns: status === 'researched' ? 0 : left <= 0 ? 1 : perTurn > 0 ? Math.ceil(left / perTurn) : null,
      unavailableReason: missing.length > 0 ? `前提の技術（${missing.map(id => TECH_MAP[id]!.name).join('・')}）が要ります` : undefined,
    }
  }
  const trees: TechTreeView[] = BRANCHES.map(branch => ({ ...branch, techs: TECHS.filter(t => t.branch === branch.id).map(view) }))

  const choose = (techId: string) => {
    setResearch(current => ({
      ...current, current: techId, carry: 0,
      progress: { ...current.progress, [techId]: (current.progress[techId] ?? 0) + current.carry },
    }))
    add(`研究先: ${TECH_MAP[techId]!.name}${research.carry > 0 ? `（宙に浮いた ${research.carry} を投入）` : ''}`)
  }

  /** The economy run's research: the points into the technology researched, or 宙に浮いた */
  const advanceTurn = () => {
    const points = Math.round(pointsFor(research.current))
    const tech = research.current ? TECH_MAP[research.current] : undefined
    if (!tech) {
      setResearch(current => ({ ...current, carry: current.carry + points }))
      add(`ターン: 研究 +${points}（研究先が無いため宙に浮いた）`)
      return
    }
    const invested = (research.progress[tech.id] ?? 0) + points
    if (invested >= tech.cost) {
      setResearch(current => ({
        current: null, progress: { ...current.progress, [tech.id]: tech.cost }, researched: [...current.researched, tech.id],
        carry: current.carry + invested - tech.cost,
      }))
      add(`ターン: 研究 +${points}、${tech.name}が完成（余り ${invested - tech.cost}）`)
    } else {
      setResearch(current => ({ ...current, progress: { ...current.progress, [tech.id]: invested } }))
      add(`ターン: 研究 +${points}（${tech.name} ${invested} / ${tech.cost}）`)
    }
  }

  const perTurn = Math.round(pointsFor(research.current))
  return <Workbench variant="screen"
    stage={<>
      <MockMap />
      <TechScreen key={instance} trees={trees} perTurn={[Math.max(0, perTurn - 2), perTurn + 2]} carry={research.carry} mustChoose={mustChoose}
        pointDetails={[`施設 +${library + academy}（系統の割増 +${BRANCH_BONUS * 100}%）`, `担当官 +${officers}`]}
        onResearch={choose} onClose={() => add('閉じる')} />
    </>}
    controls={<>
      <h2>技術画面</h2>
      <p>研究＞技術で開くツリー。研究し終えた技術の子が研究できるようになり、名前で見えます。それより先は「???」の枠だけです。研究ポイントが宙に浮くと（研究先が無いターン・研究を終えたターン）閉じられず、研究先を選ばされます。{repositoryTechs ? 'ゲームの技術データを使っています。' : ''}</p>
      <label htmlFor="tech-library">図書館系（物理文明）の研究ポイント</label>
      <input id="tech-library" type="number" min={0} value={library} onChange={event => setLibrary(Math.max(0, event.target.valueAsNumber || 0))} />
      <label htmlFor="tech-academy">魔術学院系（魔法文明）の研究ポイント</label>
      <input id="tech-academy" type="number" min={0} value={academy} onChange={event => setAcademy(Math.max(0, event.target.valueAsNumber || 0))} />
      <label htmlFor="tech-officers">研究担当官の研究ポイント</label>
      <input id="tech-officers" type="number" min={0} value={officers} onChange={event => setOfficers(Math.max(0, event.target.valueAsNumber || 0))} />
      <button className="reset-button" onClick={advanceTurn}>1ターン進める</button>
      <button className="reset-button" onClick={() => {
        setResearch({ current: null, progress: {}, researched: [], carry: 0 })
        setInstance(value => value + 1)
      }}>最初から</button>
      <Log entries={log} />
    </>}
  />
}
