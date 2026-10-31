import { useState } from 'react'
import { Button } from 'norden-ui'
import { factionName } from '../../data/faction'
import { RELIC_LIST, relicName } from '../../data/relics'
import { debugAddRelic, isPlayerTurn, relicsOf, turnOrder, useGame, viewFaction } from '../../game'

/** Debugging the relics: a relic for the player's faction, and what each faction's box holds */
export function RelicDebug() {
  const { state: game, update } = useGame()
  const [relicId, setRelicId] = useState(RELIC_LIST[0]?.id ?? '')
  return (
    <details className="strategy-scene__debug">
      <summary>デバッグ: 遺物</summary>
      <div className="strategy-scene__debug-actions">
        <select aria-label="足す遺物" value={relicId} onChange={(event) => setRelicId(event.target.value)}>
          {RELIC_LIST.map((relic) => <option key={relic.id} value={relic.id}>{relic.brokenName ?? relic.name}</option>)}
        </select>
        <Button size="small" variant="quiet" disabled={!isPlayerTurn(game)}
          onClick={() => update((s) => debugAddRelic(s, viewFaction(s), relicId))}>遺物を足す</Button>
      </div>
      <table className="strategy-scene__debug-table">
        <caption>勢力のアイテムボックス</caption>
        <tbody>
          {turnOrder(game).map((id) => (
            <tr key={id}>
              <th scope="row">{factionName(id)}</th>
              <td>{relicsOf(game, id).map((item) => `${relicName(item.relicId, item.repaired)}${item.papalRepair ? '（依頼中）' : ''}`).join('・') || 'なし'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}
