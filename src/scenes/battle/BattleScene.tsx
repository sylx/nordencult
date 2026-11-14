import { useEffect, useMemo, useRef, useState } from 'react'
import { SettingsIcon, Tooltip } from 'norden-ui'
import { battleEndSong, playBgm } from '../../audio/bgm'
import {
  BattleScreen, lineBarks, mathRng, SIDE_TEAM, type BarkSource, type BattleCutInTexts, type BattleFactions, type BattleOutcome,
  type Player, type RemainingUnit, type RetreatDestinations, type RetreatReport, type UnitStatus, type WipeoutReport,
} from '@norden/battle-runtime'
import { cpuPlayer } from '@norden/battle-runtime/cpu'
import type { TeamId } from '@norden/map-runtime/core/units'
import { GameSettingsWindow } from '../../components/GameSettingsWindow'
import { CITY_MAP } from '../../data/city'
import { factionName } from '../../data/faction'
import { pickVoiceLine } from '../../data/voiceLines'
import {
  battleSpells, characterOf, isMercenary, isPlayerFaction, isSummon, resolveBattle, retreatCities, useGame, type Battle, type BattleRetreat, type BattleSide, type BattleSurvivor,
  type BattleWinner, type BattleWipeout, type GameState,
} from '../../game'
import { CPU_BATTLE_DIFFICULTY, getBattleSettings, useBattleSettings } from '../../settings/battleSettings'
import { useScene } from '../sceneContext'
import type { SceneProps } from '../types'
import { runAutoBattle, setupAutoBattle, type AutoBattleResult } from './autoBattle'
import { loadBattleMap, type BattleMap } from './battleMap'
import { battleTroops } from './battleTroops'
import './BattleScene.css'

/** The side a faction the player plays fights on (the attacker when both are); null when the battle is between others */
function playerSideOf(game: GameState, battle: Battle): BattleSide | null {
  if (isPlayerFaction(game, battle.attacker.factionId)) return 'attacker'
  return isPlayerFaction(game, battle.defender.factionId) ? 'defender' : null
}

/** The factions of a battle's sides; the battle screen calls each side's army by its faction's name */
function battleFactions(battle: Battle): BattleFactions {
  return {
    attacker: { name: factionName(battle.attacker.factionId) },
    defender: { name: factionName(battle.defender.factionId) },
  }
}

/** Cut-in texts of a battle: the city fought over (turns are announced by faction name) */
function battleCutInTexts(battle: Battle): BattleCutInTexts {
  const city = CITY_MAP[battle.cityId]?.name ?? battle.cityId
  return { start: () => ({ text: '戦闘開始', subText: `${city}攻防戦` }) }
}

/**
 * What units say (voiceLines.json), in the voice of the knight leading them: a knight's unit
 * speaks as the knight, a unit led indirectly as its side's commander; units nobody leads use
 * the common lines. Summoned units (and units speaking for a summoned commander) say nothing
 */
function battleBarks(summons: GameState['summons'], battle: Battle, knightOf: (status: UnitStatus) => string | null): BarkSource {
  return lineBarks((situation, { unit, status }) => {
    const army = unit.team === SIDE_TEAM.attacker ? battle.attacker : battle.defender
    const speaker = knightOf(status) ?? army.commander ?? ''
    if (isSummon(speaker)) return null
    return pickVoiceLine(situation, characterOf({ summons }, speaker))
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
 * The side and knight of a unit the battle screen reports. The troop id of a
 * knight's unit is the knight's id (battleTroops); units led indirectly or by
 * nobody have no knight.
 */
function sideAndKnight(battle: Battle, { unit, troopId }: RetreatReport | WipeoutReport | RemainingUnit) {
  const side: BattleSide = unit.team === SIDE_TEAM.attacker ? 'attacker' : 'defender'
  return { side, knightId: troopId !== null && battle[side].knights.includes(troopId) ? troopId : null }
}

/** A retreat reported by the battle screen, for resolveBattle: with the soldiers the unit had */
function toBattleRetreat(battle: Battle, report: RetreatReport): BattleRetreat {
  return { ...sideAndKnight(battle, report), to: report.to.id, captured: report.captured, soldiers: report.status.soldiers }
}

/** The units still on the battlefield when it was decided, for resolveBattle */
const toBattleSurvivors = (battle: Battle, remaining: readonly RemainingUnit[]): BattleSurvivor[] =>
  remaining.map((unit) => ({ ...sideAndKnight(battle, unit), soldiers: unit.status.soldiers }))

/** A unit wiped out reported by the battle screen, for resolveBattle: with where its knight got away to */
function toBattleWipeout(battle: Battle, report: WipeoutReport): BattleWipeout {
  return { ...sideAndKnight(battle, report), captured: report.captured, to: report.to?.id ?? null }
}

/**
 * A battle: the battlefield (norden-battle's battle screen: map, units, action menu,
 * terrain, knight and battle log windows) and (for now) debug buttons deciding who wins without fighting it out. When the battlefield is
 * decided (a side wiped out or retreated, or the attackers entered the stronghold),
 * the button of the battle screen's outcome window hands it to resolveBattle and
 * goes to the result.
 *
 * The sides of factions the player does not play are fought by the CPU, as well as the difficulty of the settings
 * (battles between CPU factions at CPU_BATTLE_DIFFICULTY). A battle between CPU factions is decided without drawing it
 * (runAutoBattle) unless the settings say to watch them. The animations run at the settings' speed, and the
 * settings window opens from the battle too
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

/** The battle screen's players of a battle: the CPU for each side the player does not play */
function useCpuPlayers(game: GameState, battle: Battle): { cpu: Partial<Record<TeamId, Player | null>>; cpuBattle: boolean } {
  const { difficulty: playerDifficulty } = useBattleSettings()
  const humanAttacker = isPlayerFaction(game, battle.attacker.factionId)
  const humanDefender = isPlayerFaction(game, battle.defender.factionId)
  const cpuBattle = !humanAttacker && !humanDefender
  const difficulty = cpuBattle ? CPU_BATTLE_DIFFICULTY : playerDifficulty
  const cpu = useMemo(() => ({
    [SIDE_TEAM.attacker]: humanAttacker ? null : cpuPlayer({ difficulty }),
    [SIDE_TEAM.defender]: humanDefender ? null : cpuPlayer({ difficulty }),
  }), [humanAttacker, humanDefender, difficulty])
  return { cpu, cpuBattle }
}

function Battlefield({ battle }: { battle: Battle }) {
  const { state: game, update } = useGame()
  const { goTo } = useScene()
  const { speed } = useBattleSettings()
  const [map, setMap] = useState<BattleMap | null>(null)
  const [error, setError] = useState('')
  const { from } = battle.attacker
  const to = battle.cityId
  // What the knights wear cannot change in the progress phase: the spells stay as the battle starts
  const spells = useMemo(() => battleSpells(game, battle), [game, battle])
  // Nor the summoned units: as the battle starts
  const troops = useMemo(() => battleTroops(battle, spells, game.summons), [battle, spells, game.summons])
  const factions = useMemo(() => battleFactions(battle), [battle])
  const barks = useMemo(() => battleBarks(game.summons, battle, troops.knightOf), [game.summons, battle, troops])
  const retreatTo = useMemo(() => battleRetreats(game, battle), [game, battle])
  const { cpu, cpuBattle } = useCpuPlayers(game, battle)
  /** Decided without drawing it (a battle between CPU factions, not watched). Kept as the battle starts; changing the setting takes effect from the next one */
  const [auto, setAuto] = useState(() => cpuBattle && !getBattleSettings().watchCpuBattles)
  const [settingsOpen, setSettingsOpen] = useState(false)
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

  /** Hands the battle to resolveBattle and goes to the result */
  const settle = (
    winner: BattleWinner, reason: BattleOutcome['reason'] | null, remaining: readonly RemainingUnit[] | undefined,
    retreated: readonly BattleRetreat[], wipedOut: readonly BattleWipeout[],
  ) => {
    const survivors = remaining && toBattleSurvivors(battle, remaining)
    update((s) => resolveBattle(s, battle.id, winner, retreated, reason, wipedOut, Math.random, survivors))
    goTo('battleResult', { battleId: battle.id })
  }

  /** The battle decided on the battlefield (`outcome`, with the units left there) or by the debug buttons (every unit left as it started) */
  const decide = (winner: BattleWinner, outcome?: BattleOutcome) =>
    settle(winner, outcome?.reason ?? null, outcome?.remaining, retreats, wipeouts)

  /** A battle decided without drawing it. Not decided within the turns it is fought for, the defenders held the city */
  const decideAuto = ({ outcome, retreated, wipedOut, remaining }: AutoBattleResult) =>
    settle(outcome?.winner ?? 'defender', outcome?.reason ?? null, remaining,
      retreated.map((r) => toBattleRetreat(battle, r)), wipedOut.map((w) => toBattleWipeout(battle, w)))

  // The battle between CPU factions fought out without drawing it, once the map is loaded
  const latestDecideAuto = useRef(decideAuto)
  useEffect(() => { latestDecideAuto.current = decideAuto })
  const autoMap = auto ? map : null
  useEffect(() => {
    if (!autoMap) return
    const players: Partial<Record<TeamId, Player>> = {}
    for (const [team, player] of Object.entries(cpu)) if (player) players[team as TeamId] = player
    const abort = new AbortController()
    const fight = async () => {
      const state = setupAutoBattle(autoMap.data, troops.troops, retreatTo, players)
      if (!state) throw new Error('配備できません（初期配置地点が無い・部隊を置けない）')
      return runAutoBattle(state, players, mathRng, abort.signal)
    }
    fight().then((result) => latestDecideAuto.current(result), (e: unknown) => {
      if (abort.signal.aborted) return
      console.warn('[battle] 描画なしでは決着させられませんでした。戦闘画面で戦います', e)
      setAuto(false)
    })
    return () => abort.abort()
    // Fought once per battle: the players, troops and retreats are fixed for it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMap])

  const cityName = CITY_MAP[to]?.name ?? to
  return (
    <div className="battle-scene">
      <div className="battle-scene__field">
        {map && !auto ? (
          <BattleScreen
            map={map.data} troops={troops.troops} factions={factions} cutInTexts={battleCutInTexts(battle)} barks={barks} retreats={retreatTo}
            onRetreat={(report) => setRetreats((list) => [...list, toBattleRetreat(battle, report)])}
            onWipeout={(report) => setWipeouts((list) => [...list, toBattleWipeout(battle, report)])}
            onDecided={(outcome) => playBgm(battleEndSong(isPlayerFaction(game, battle[outcome.winner].factionId)))}
            onEnd={(outcome) => decide(outcome.winner, outcome)} endLabel="戦闘の結果へ"
            playerSide={playerSideOf(game, battle)} cpu={cpu} speed={speed}
            className="battle-scene__screen"
          >
            <div className="battle-scene__menu">
              <Tooltip content="設定">
                <button type="button" className="battle-scene__settings" aria-label="設定" aria-haspopup="dialog"
                  onClick={() => setSettingsOpen(true)}>
                  <SettingsIcon />
                </button>
              </Tooltip>
            </div>
          </BattleScreen>
        )
          : (
            <p className="battle-scene__placeholder">
              {error ? `戦闘マップを読めません: ${error}`
                : map ? `${cityName}攻防戦 — ${factionName(battle.attacker.factionId)}と${factionName(battle.defender.factionId)}が戦っています…`
                  : '戦闘マップを読み込み中…'}
            </p>
          )}
      </div>
      {/* Keys stay in the window (SettingsWindow), away from the battle screen's shortcuts on the page */}
      {settingsOpen && <GameSettingsWindow inBattle onClose={() => setSettingsOpen(false)} />}
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
                {w.knightId && isSummon(w.knightId) ? '（消滅）' : w.knightId && isMercenary(w.knightId) ? '（契約解除）'
                  : w.captured ? '（捕縛・捕虜）' : w.to ? `（${CITY_MAP[w.to]?.name ?? w.to}へ落ち延びた）` : '（退却先が無く、君主のもとへ）'}
              </span>
            ))}
          </p>
        )}
      </aside>
    </div>
  )
}
