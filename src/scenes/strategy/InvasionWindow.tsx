import { useState } from 'react'
import { InfoWindow } from 'norden-ui'
import { CITY_MAP } from 'norden-strategy'
import { FactionLabel } from '../../components/FactionLabel'
import { KnightList, KnightStats } from '../../components/KnightList'
import { availableKnights, charactersIn, orderProblem, ownerOf, type GameState } from '../../game'
import './InvasionWindow.css'

interface Props {
  game: GameState
  from: string
  to: string
  onOrder: (knights: string[]) => void
  onBack: () => void
  x: number
  y: number
}

/** Choosing the knights of an invasion */
export function InvasionWindow({ game, from, to, onOrder, onBack, x, y }: Props) {
  const knights = availableKnights(game, from)
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set())
  const chosen = knights.filter((id) => selected.has(id))
  const problem = orderProblem(game, { factionId: game.playerFaction, from, to, knights: chosen })
  const defenders = charactersIn(game, to).length
  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev)
    if (!next.delete(id)) next.add(id)
    return next
  })

  return (
    <InfoWindow title="侵攻の予約" x={x} y={y} minWidth={380} minHeight={200}>
      <div className="invasion">
        <p className="invasion__route">
          <span><FactionLabel factionId={ownerOf(game, from)} /> {CITY_MAP[from]?.name}</span>
          <span className="invasion__arrow">→</span>
          <span><FactionLabel factionId={ownerOf(game, to)} /> {CITY_MAP[to]?.name}</span>
        </p>
        <p className="invasion__defenders">守備の騎士: {defenders > 0 ? `${defenders}人` : 'なし'}</p>
        <h3 className="invasion__heading">出撃する騎士（{chosen.length} / {knights.length}）</h3>
        <div className="invasion__knights">
          <KnightList ids={knights} compact selection={{ selected, onToggle: toggle }}
            aside={(id) => <KnightStats id={id} />} empty="出撃できる騎士がいません。" />
        </div>
        <div className="invasion__actions">
          <button type="button" className="invasion__button" onClick={onBack}>やめる</button>
          <button type="button" className="invasion__button invasion__button--primary" disabled={problem !== null}
            title={problem ?? undefined} onClick={() => onOrder(chosen)}>予約</button>
        </div>
      </div>
    </InfoWindow>
  )
}
