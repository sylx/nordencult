import { useEffect, useMemo, useState } from 'react'
import {
  BattleScreen, lineBarks, SIDE_TEAM, type BarkSource, type BattleCutInTexts,
  type RetreatDestinations, type RetreatReport, type WipeoutReport,
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
  resolveBattle, retreatCities, useGame, type Battle, type BattleEndReason, type BattleRetreat, type BattleSide, type BattleWinner,
  type BattleWipeout, type GameState,
} from '../../game'
import { useScene } from '../sceneContext'
import type { SceneProps } from '../types'
import { loadBattleMap, type BattleMap } from './battleMap'
import './BattleScene.css'

/** Name of a faction (null / undefined: neutral) */
const factionName = (id: string | null | undefined) => (id ? FACTION_MAP[id]?.name ?? id : '中立')

/** The side the player's faction fights on; null when the battle is between others */
function playerSideOf(game: GameState, battle: Battle): BattleSide | null {
  if (battle.attacker.factionId === game.playerFaction) return 'attacker'
  return battle.defender.factionId === game.playerFaction ? 'defender' : null
}

/** Cut-in texts of a battle: the city fought over, and the factions in place of the teams */
function battleCutInTexts(battle: Battle): BattleCutInTexts {
  const names: Partial<Record<TeamId, string>> = {
    [SIDE_TEAM.attacker]: factionName(battle.attacker.factionId),
    [SIDE_TEAM.defender]: factionName(battle.defender.factionId),
  }
  const city = CITY_MAP[battle.cityId]?.name ?? battle.cityId
  return {
    start: () => ({ text: '戦闘開始', subText: `${city}攻防戦` }),
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
 * The side and knight of a unit the battle screen reports. The unit's troop id
 * is its knight's id when the side's troops are made from its knights; the
 * placeholder troops of now are not, so they have no knight.
 */
function sideAndKnight(battle: Battle, { unit, troopId }: RetreatReport | WipeoutReport) {
  const side: BattleSide = unit.team === SIDE_TEAM.attacker ? 'attacker' : 'defender'
  return { side, knightId: troopId !== null && battle[side].knights.includes(troopId) ? troopId : null }
}

/** A retreat reported by the battle screen, for resolveBattle */
function toBattleRetreat(battle: Battle, report: RetreatReport): BattleRetreat {
  return { ...sideAndKnight(battle, report), to: report.to.id, captured: report.captured }
}

/** A unit wiped out reported by the battle screen, for resolveBattle */
function toBattleWipeout(battle: Battle, report: WipeoutReport): BattleWipeout {
  return { ...sideAndKnight(battle, report), captured: report.captured }
}

/**
 * A battle: the battlefield (norden-battle's battle screen: map, units, action menu,
 * terrain and battle log windows), the attacking and defending sides, and (for now)
 * debug buttons deciding who wins without fighting it out. When the battlefield is
 * decided (a side wiped out or retreated, or the attackers entered the stronghold),
 * the button of the battle screen's outcome window hands it to resolveBattle and
 * goes to the result
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
  /** Units wiped out (with whether their knight was captured), handed to resolveBattle */
  const [wipeouts, setWipeouts] = useState<readonly BattleWipeout[]>([])

  useEffect(() => {
    let cancelled = false
    loadBattleMap(from, to).then((m) => { if (!cancelled) setMap(m) },
      (e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) })
    return () => { cancelled = true }
  }, [from, to])

  const decide = (winner: BattleWinner, reason: BattleEndReason | null = null) => {
    update((s) => resolveBattle(s, battle.id, winner, retreats, reason, wipeouts))
    goTo('battleResult', { battleId: battle.id })
  }

  return (
    <div className="battle-scene">
      <div className="battle-scene__field">
        {map ? (
          <BattleScreen
            map={map.data} cutInTexts={battleCutInTexts(battle)} barks={barks} retreats={retreatTo}
            onRetreat={(report) => setRetreats((list) => [...list, toBattleRetreat(battle, report)])}
            onWipeout={(report) => setWipeouts((list) => [...list, toBattleWipeout(battle, report)])}
            onEnd={(outcome) => decide(outcome.winner, outcome.reason)} endLabel="戦闘の結果へ"
            playerSide={playerSideOf(game, battle)}
            className="battle-scene__screen"
          />
        )
          : <p className="battle-scene__placeholder">{error ? `戦闘マップを読めません: ${error}` : '戦闘マップを読み込み中…'}</p>}
      </div>
      <BattleHeader battle={battle} />
      <aside className="battle-debug" aria-label="デバッグ">
        <h2>デバッグ: 決着を待たずに勝敗を決める</h2>
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
        {wipeouts.length > 0 && (
          <p className="battle-debug__map">
            殲滅: {wipeouts.map((w, i) => (
              <span key={i}>
                <br />{w.side === 'attacker' ? '攻撃' : '防衛'} {w.knightId ?? '(騎士なし)'}
                {w.captured ? '（捕縛・捕虜）' : '（落ち延びた）'}
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
        <KnightList ids={attacker.knights} compact notes={(id) => (id === attacker.commander ? ['軍団長'] : [])} aside={unitOf} />
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
