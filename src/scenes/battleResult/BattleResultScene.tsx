import { CITY_MAP } from 'norden-strategy'
import { FactionLabel } from '../../components/FactionLabel'
import { KnightList } from '../../components/KnightList'
import { useGame, type CharacterMove, type MoveKind } from '../../game'
import { useScene } from '../sceneContext'
import type { SceneProps } from '../types'
import './BattleResultScene.css'

const MOVE_LABELS: Readonly<Record<MoveKind, string>> = {
  enter: '入城',
  return: '帰還',
  retreat: '退却',
  wander: '在野',
}

const cityName = (id: string | null) => (id ? CITY_MAP[id]?.name ?? id : '')

/** Outcome of a battle: who won, whether the city changed hands, where the knights went */
export default function BattleResultScene({ params }: SceneProps<'battleResult'>) {
  const { state: game } = useGame()
  const { goTo } = useScene()
  const report = game.lastBattle
  if (!report || report.battle.id !== params.battleId) {
    return (
      <div className="battle-result battle-result--missing">
        <p>戦闘 {params.battleId} の結果はありません。</p>
        <button type="button" className="battle-result__button" onClick={() => goTo('strategy')}>戦略マップへ</button>
      </div>
    )
  }

  const { battle, winner, cityCaptured, moves } = report
  const winnerFaction = winner === 'attacker' ? battle.attacker.factionId : battle.defender.factionId
  const city = cityName(battle.cityId)
  const kinds = (Object.keys(MOVE_LABELS) as MoveKind[]).filter((k) => moves.some((m) => m.kind === k))

  return (
    <div className="battle-result">
      <div className="battle-result__panel">
        <p className="battle-result__city">{city}攻防戦</p>
        <h1 className="battle-result__title">
          {winner === 'attacker' ? '攻撃側の勝利' : '防衛側の勝利'}
        </h1>
        <p className="battle-result__winner"><FactionLabel factionId={winnerFaction} /></p>

        <section className="battle-result__section">
          <h2>{city}</h2>
          {cityCaptured ? (
            <p className="battle-result__owner">
              <FactionLabel factionId={battle.defender.factionId} />
              <span className="battle-result__arrow">→</span>
              <FactionLabel factionId={battle.attacker.factionId} />
              <span>の領地になりました</span>
            </p>
          ) : (
            <p className="battle-result__owner">
              <FactionLabel factionId={battle.defender.factionId} />
              <span>が守り抜きました</span>
            </p>
          )}
        </section>

        {kinds.map((kind) => (
          <section key={kind} className="battle-result__section">
            <h2>{MOVE_LABELS[kind]}</h2>
            <MoveList moves={moves.filter((m) => m.kind === kind)} />
          </section>
        ))}

        <button type="button" className="battle-result__button" onClick={() => goTo('strategy')}>戦略マップへ</button>
      </div>
    </div>
  )
}

function MoveList({ moves }: { moves: readonly CharacterMove[] }) {
  const byId = new Map(moves.map((m) => [m.characterId, m]))
  const describe = (id: string) => {
    const m = byId.get(id)!
    switch (m.kind) {
      case 'enter': return `${cityName(m.to)}に入城`
      case 'return': return `${cityName(m.to)}へ帰還`
      case 'retreat': return `${cityName(m.to)}へ退却`
      case 'wander': return '退却先が無く在野に'
    }
  }
  return <KnightList ids={moves.map((m) => m.characterId)} compact aside={describe} />
}
