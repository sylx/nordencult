import { Button } from 'norden-ui'
import { factionName } from '../../data/faction'
import { TECH_MAP } from '../../data/techs'
import {
  debugAddResearchPoints, debugFillResearch, isPlayerFaction, isPlayerTurn, researchOf, researchOutput, turnOrder, useGame, viewFaction,
} from '../../game'

const techName = (id: string | null) => (id ? TECH_MAP[id]?.name ?? id : '研究先なし')

/** Debugging the research: points for the player's faction, its research completed, and what the CPU factions research */
export function ResearchDebug() {
  const { state: game, update } = useGame()
  const faction = viewFaction(game)
  const cpus = turnOrder(game).filter((id) => !isPlayerFaction(game, id))
  return (
    <details className="strategy-scene__debug">
      <summary>デバッグ: 研究</summary>
      <div className="strategy-scene__debug-actions">
        <Button size="small" variant="quiet" disabled={!isPlayerTurn(game)}
          onClick={() => update((s) => debugAddResearchPoints(s, viewFaction(s), 100))}>研究ポイント +100</Button>
        <Button size="small" variant="quiet" disabled={!isPlayerTurn(game) || !researchOf(game, faction).current}
          title="研究中の技術に必要なポイントを全部入れる（次のターンの初めに完成）"
          onClick={() => update((s) => debugFillResearch(s, viewFaction(s)))}>研究中の技術を完了</Button>
      </div>
      <table className="strategy-scene__debug-table">
        <caption>CPU 勢力の研究</caption>
        <tbody>
          {cpus.map((id) => {
            const research = researchOf(game, id)
            const tech = research.current ? TECH_MAP[research.current] : undefined
            const [low, high] = researchOutput(game, id).total
            return (
              <tr key={id}>
                <th scope="row">{factionName(id)}</th>
                <td>{techName(research.current)}{tech && ` ${research.progress[tech.id] ?? 0}/${tech.cost}`}</td>
                <td>+{low === high ? low : `${low}〜${high}`}/ターン</td>
                <td title={research.researched.map(techName).join('・')}>済 {research.researched.length}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </details>
  )
}
