import { useEffect, useMemo, useState } from 'react'
import {
  BattleScreen, lineBarks, SIDE_TEAM, type BarkSource, type BattleCutInTexts, type RetreatDestinations, type RetreatReport,
} from '@norden/battle-runtime'
import { TEAM_DEFS, type TeamId } from '@norden/map-runtime/core/units'
import { FACTION_MAP } from 'norden-strategy'
import { FactionLabel } from '../../components/FactionLabel'
import { KnightList } from '../../components/KnightList'
import { CHARACTER_MAP } from '../../data/character'
import { CITY_MAP } from '../../data/city'
import { pickVoiceLine } from '../../data/voiceLines'
import { UNIT_TYPE_MAP } from '../../data/unitTypes'
import {
  resolveBattle, retreatCities, useGame, type Battle, type BattleRetreat, type BattleSide, type BattleWinner, type GameState,
} from '../../game'
import { useScene } from '../sceneContext'
import type { SceneProps } from '../types'
import { loadBattleMap, type BattleMap } from './battleMap'
import './BattleScene.css'

/** Name of a faction (null / undefined: neutral) */
const factionName = (id: string | null | undefined) => (id ? FACTION_MAP[id]?.name ?? id : '中立')

/** Cut-in texts of a battle: the city fought over, and the factions in place of the teams */
function battleCutInTexts(battle: Battle): BattleCutInTexts {
  const names: Partial<Record<TeamId, string>> = {
    [SIDE_TEAM.attacker]: factionName(battle.attacker.factionId),
    [SIDE_TEAM.defender]: factionName(battle.defender.factionId),
  }
  return {
    start: () => ({ text: '戦闘開始', subText: `${CITY_MAP[battle.cityId]?.name ?? battle.cityId}攻防戦` }),
    turn: (turn, team) => ({ text: `${names[team] ?? TEAM_DEFS[team].name}のターン`, subText: `TURN  ${turn}` }),
  }
}

/**
 * What units say (voiceLines.json), in the voice of the knights of their side. For now the units are
 * norden-battle's placeholders, not the knights' own troops, so a unit speaks as the
 * knight of its side picked by its commander's face; a side with no knights uses the
 * common lines
 */
function battleBarks(battle: Battle): BarkSource {
  return lineBarks((situation, { unit, status }) => {
    const knights = unit.team === SIDE_TEAM.attacker ? battle.attacker.knights : battle.defender.knights
    return pickVoiceLine(situation, knights.length ? CHARACTER_MAP[knights[status.face % knights.length]] : undefined)
  })
}

const BATTLE_SIDES: readonly BattleSide[] = ['attacker', 'defender']

/** Where each side's units can retreat to: the neighbouring cities of their own (retreatCities), by team */
function battleRetreats(game: GameState, battle: Battle): RetreatDestinations {
  return Object.fromEntries(BATTLE_SIDES.map((side) => [
    SIDE_TEAM[side],
    retreatCities(game, battle, side).map((id) => ({ id, name: CITY_MAP[id]?.name ?? id })),
  ]))
}

/**
 * A retreat reported by the battle screen, for resolveBattle. The unit's troop
 * id is its knight's id when the side's troops are made from its knights; the
 * placeholder troops of now are not, so their retreats have no knight.
 */
function toBattleRetreat(battle: Battle, report: RetreatReport): BattleRetreat {
  const side: BattleSide = report.unit.team === SIDE_TEAM.attacker ? 'attacker' : 'defender'
  const { troopId } = report
  return {
    side,
    knightId: troopId !== null && battle[side].knights.includes(troopId) ? troopId : null,
    to: report.to.id,
    captured: report.captured,
  }
}

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
  const { state: game, update } = useGame()
  const { goTo } = useScene()
  const [map, setMap] = useState<BattleMap | null>(null)
  const [error, setError] = useState('')
  const { from } = battle.attacker
  const to = battle.cityId
  const barks = useMemo(() => battleBarks(battle), [battle])
  const retreatTo = useMemo(() => battleRetreats(game, battle), [game, battle])
  /** Units that retreated (or were captured trying), handed to resolveBattle */
  const [retreats, setRetreats] = useState<readonly BattleRetreat[]>([])

  useEffect(() => {
    let cancelled = false
    loadBattleMap(from, to).then((m) => { if (!cancelled) setMap(m) },
      (e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) })
    return () => { cancelled = true }
  }, [from, to])

  const decide = (winner: BattleWinner) => {
    update((s) => resolveBattle(s, battle.id, winner, retreats))
    goTo('battleResult', { battleId: battle.id })
  }

  return (
    <div className="battle-scene">
      <div className="battle-scene__field">
        {map ? (
          <BattleScreen
            map={map.data} cutInTexts={battleCutInTexts(battle)} barks={barks} retreats={retreatTo}
            onRetreat={(report) => setRetreats((list) => [...list, toBattleRetreat(battle, report)])}
            className="battle-scene__screen"
          />
        )
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
        {retreats.length > 0 && (
          <p className="battle-debug__map">
            退却: {retreats.map((r, i) => (
              <span key={i}>
                <br />{r.side === 'attacker' ? '攻撃' : '防衛'} {r.knightId ?? '(騎士なし)'} → {CITY_MAP[r.to]?.name ?? r.to}
                {r.captured && '（失敗・捕虜）'}
              </span>
            ))}
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
