import { useEffect, useState } from 'react'
import { BattleScreen } from '@norden/battle-runtime'
import { CITY_MAP } from 'norden-strategy'
import { FactionLabel } from '../../components/FactionLabel'
import { KnightList } from '../../components/KnightList'
import { UNIT_TYPE_MAP } from '../../data/unitTypes'
import { resolveBattle, useGame, type Battle, type BattleWinner } from '../../game'
import { useScene } from '../sceneContext'
import type { SceneProps } from '../types'
import { loadBattleMap, type BattleMap } from './battleMap'
import './BattleScene.css'

/**
 * A battle: the battlefield (norden-battle's battle screen: map, units, action menu,
 * terrain and battle log windows), the attacking and defending sides, and (for now)
 * debug buttons deciding who wins
 */
export default function BattleScene({ params }: SceneProps<'battle'>) {
  const { state: game } = useGame()
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

  return <Battlefield battle={battle} />
}

function Battlefield({ battle }: { battle: Battle }) {
  const { update } = useGame()
  const { goTo } = useScene()
  const [map, setMap] = useState<BattleMap | null>(null)
  const [error, setError] = useState('')
  const { from } = battle.attacker
  const to = battle.cityId

  useEffect(() => {
    let cancelled = false
    loadBattleMap(from, to).then((m) => { if (!cancelled) setMap(m) },
      (e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) })
    return () => { cancelled = true }
  }, [from, to])

  const decide = (winner: BattleWinner) => {
    update((s) => resolveBattle(s, battle.id, winner))
    goTo('battleResult', { battleId: battle.id })
  }

  return (
    <div className="battle-scene">
      <div className="battle-scene__field">
        {map ? <BattleScreen map={map.data} className="battle-scene__screen" />
          : <p className="battle-scene__placeholder">{error ? `戦闘マップを読めません: ${error}` : '戦闘マップを読み込み中…'}</p>}
      </div>
      <BattleHeader battle={battle} />
      <aside className="battle-debug" aria-label="デバッグ">
        <h2>デバッグ: 勝敗を決める</h2>
        <button type="button" className="battle-button" onClick={() => decide('attacker')}>攻撃側の勝利</button>
        <button type="button" className="battle-button" onClick={() => decide('defender')}>防衛側の勝利</button>
        {map && (
          <p className="battle-debug__map">
            マップ: {map.file}
            {map.area ? `（${to} の範囲 (${map.area.col}, ${map.area.row})）` : '（全体・フォールバック）'}
            {map.fallback && <><br />{map.fallback}</>}
          </p>
        )}
      </aside>
    </div>
  )
}

function BattleHeader({ battle }: { battle: Battle }) {
  const { attacker, defender } = battle
  const unitOf = (id: string) => {
    const unit = attacker.units?.find((u) => u.knightId === id)
    return unit && `${UNIT_TYPE_MAP[unit.unitType]?.name ?? unit.unitType} ${unit.soldiers.toLocaleString()}`
  }
  return (
    <header className="battle-header">
      <section className="battle-side battle-side--attacker">
        <h2><span className="battle-side__role">攻撃</span><FactionLabel factionId={attacker.factionId} /></h2>
        <p className="battle-side__from">{CITY_MAP[attacker.from]?.name}から出撃</p>
        <KnightList ids={attacker.knights} compact aside={unitOf} />
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
