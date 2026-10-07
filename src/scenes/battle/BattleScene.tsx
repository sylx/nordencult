import { CITY_MAP } from 'norden-strategy'
import { FactionLabel } from '../../components/FactionLabel'
import { KnightList } from '../../components/KnightList'
import { resolveBattle, useGame, type Battle, type BattleWinner } from '../../game'
import { useScene } from '../sceneContext'
import type { SceneProps } from '../types'
import './BattleScene.css'

/** A battle: the attacking and defending sides, and (for now) debug buttons deciding who wins */
export default function BattleScene({ params }: SceneProps<'battle'>) {
  const { state: game, update } = useGame()
  const { goTo } = useScene()
  const battle = game.march?.current
  if (!battle || battle.id !== params.battleId) {
    return (
      <div className="battle-scene battle-scene--missing">
        <p>戦闘 {params.battleId} は進行中ではありません。</p>
        <button type="button" className="battle-button" onClick={() => goTo('strategy')}>戦略マップへ</button>
      </div>
    )
  }

  const decide = (winner: BattleWinner) => {
    update((s) => resolveBattle(s, battle.id, winner))
    goTo('battleResult', { battleId: battle.id })
  }

  return (
    <div className="battle-scene">
      <BattleHeader battle={battle} />
      <div className="battle-scene__field">
        <p className="battle-scene__placeholder">戦闘マップ（未実装）</p>
      </div>
      <aside className="battle-debug" aria-label="デバッグ">
        <h2>デバッグ: 勝敗を決める</h2>
        <button type="button" className="battle-button" onClick={() => decide('attacker')}>攻撃側の勝利</button>
        <button type="button" className="battle-button" onClick={() => decide('defender')}>防衛側の勝利</button>
      </aside>
    </div>
  )
}

function BattleHeader({ battle }: { battle: Battle }) {
  const { attacker, defender } = battle
  return (
    <header className="battle-header">
      <section className="battle-side battle-side--attacker">
        <h2><span className="battle-side__role">攻撃</span><FactionLabel factionId={attacker.factionId} /></h2>
        <p className="battle-side__from">{CITY_MAP[attacker.from]?.name}から出撃</p>
        <KnightList ids={attacker.knights} compact />
      </section>
      <div className="battle-header__city">
        <span>{CITY_MAP[battle.cityId]?.name}</span>
        <small>攻防戦</small>
      </div>
      <section className="battle-side battle-side--defender">
        <h2><span className="battle-side__role">防衛</span><FactionLabel factionId={defender.factionId} /></h2>
        <p className="battle-side__from">{CITY_MAP[battle.cityId]?.name}の守備</p>
        <KnightList ids={defender.knights} compact empty="守備の騎士はいません。" />
      </section>
    </header>
  )
}
