import { useEffect, useMemo, useState } from 'react'
import {
  CITY_MAP, FACTION_MAP, MapView, type CityHighlight, type RoadHighlight, type StrategyMap,
} from 'norden-strategy'
import { factionColor } from '../../data/factionColors'
import {
  addOrder, availableKnights, canInvadeFrom, cancelOrder, endFactionTurn, invasionTargets, isPlayerTurn, ownerOf,
  startNextBattle, useGame, type GameState,
} from '../../game'
import { useScene } from '../sceneContext'
import { CityWindow } from './CityWindow'
import { Banner, OrderList, TurnBar } from './Hud'
import { InvasionWindow } from './InvasionWindow'
import './StrategyScene.css'

/** How long each CPU faction's turn is shown (they do nothing yet) */
const CPU_TURN_MS = 450
/** Pause before the next march sets out, and after it arrives before the battle */
const MARCH_PAUSE_MS = 900
const ARRIVAL_PAUSE_MS = 600
/** World units per second */
const MARCH_SPEED = 30

const TARGET_COLOR = '#ff6a3d'

/** browse: looking around; target: choosing where to invade from `from`; knights: choosing who goes */
type Mode =
  | { kind: 'browse' }
  | { kind: 'target'; from: string }
  | { kind: 'knights'; from: string; to: string }

const BROWSE: Mode = { kind: 'browse' }

const cityName = (id: string) => CITY_MAP[id]?.name ?? id

/** Targets still open from a city: other factions' neighbours not already ordered */
function openTargets(game: GameState, from: string): string[] {
  return invasionTargets(game, from)
    .filter((to) => !game.orders.some((o) => o.factionId === game.playerFaction && o.to === to))
}

/** The strategy map with the game UI (norden-ui) on top */
export default function StrategyScene() {
  const { state: game, update } = useGame()
  const { goTo } = useScene()
  const [map, setMap] = useState<StrategyMap | null>(null)
  const [selected, setSelected] = useState('')
  const [modeState, setMode] = useState<Mode>(BROWSE)
  // Coming back from a battle, the camera starts over its city
  const [returnCity] = useState(() => game.lastBattle?.battle.cityId)
  const playerTurn = isPlayerTurn(game)
  // Ordering belongs to the player's turn
  const mode = playerTurn ? modeState : BROWSE
  const targets = useMemo(() => (mode.kind === 'target' ? openTargets(game, mode.from) : []), [game, mode])
  const battle = game.march?.current ?? null
  const city = selected ? CITY_MAP[selected] : undefined

  const selectPlace = (id: string) => {
    if (mode.kind === 'target') {
      if (targets.includes(id)) setMode({ kind: 'knights', from: mode.from, to: id })
      return
    }
    if (mode.kind === 'browse') setSelected(id)
  }

  // Esc steps back out of choosing a target or the knights
  useEffect(() => {
    if (mode.kind === 'browse') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setMode(mode.kind === 'knights' ? { kind: 'target', from: mode.from } : BROWSE)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode])

  useEffect(() => {
    if (!map) return
    const cities: CityHighlight[] = []
    const roads: RoadHighlight[] = []
    if (mode.kind === 'target') {
      cities.push({ id: mode.from }, ...targets.map((id) => ({ id, color: TARGET_COLOR })))
      roads.push(...targets.map((to) => ({ from: mode.from, to, color: TARGET_COLOR, flow: false })))
    } else if (mode.kind === 'knights') {
      cities.push({ id: mode.from }, { id: mode.to, color: TARGET_COLOR })
      roads.push({ from: mode.from, to: mode.to, color: TARGET_COLOR })
    } else if (battle) {
      cities.push({ id: battle.cityId, color: TARGET_COLOR })
    } else if (selected) {
      cities.push({ id: selected })
    }
    // Ordered invasions stay on the map until they are resolved
    const pending = game.march
      ? game.orders.filter((o) => game.march?.queue.includes(o.id) || battle?.orderId === o.id)
      : game.orders.filter((o) => o.factionId === game.playerFaction)
    for (const o of pending) {
      if (mode.kind === 'knights' && o.from === mode.from && o.to === mode.to) continue
      roads.push({ from: o.from, to: o.to, color: factionColor(o.factionId) })
    }
    map.setCityHighlights(cities)
    const missing = map.setRoadHighlights(roads)
    if (missing.length > 0) console.warn('街道が見つかりません', missing)
  }, [map, mode, targets, battle, selected, game.orders, game.march, game.playerFaction])

  useEffect(() => {
    if (map && returnCity) map.focusPlace(returnCity, true)
  }, [map, returnCity])

  // CPU factions pass their turn (M001 has no CPU yet)
  useEffect(() => {
    const faction = game.activeFaction
    if (game.phase !== 'strategy' || !faction || faction === game.playerFaction) return
    const timer = setTimeout(() => update((s) => (s.activeFaction === faction ? endFactionTurn(s) : s)), CPU_TURN_MS)
    return () => clearTimeout(timer)
  }, [game.phase, game.activeFaction, game.playerFaction, update])

  // March phase: take the next order (or start the next turn when none is left)
  useEffect(() => {
    if (game.phase !== 'march' || battle) return
    const timer = setTimeout(() => update((s) => (s.phase === 'march' && !s.march?.current ? startNextBattle(s) : s)),
      MARCH_PAUSE_MS)
    return () => clearTimeout(timer)
  }, [game.phase, battle, update])

  // The army of the order marches to its target, then the battle is fought
  useEffect(() => {
    if (!map || !battle) return
    const { id, attacker, cityId } = battle
    let timer = 0
    const fight = () => goTo('battle', { battleId: id })
    map.focusPlace(cityId)
    const unsubscribe = map.onMarchArrive((marchId) => {
      if (marchId === id) timer = window.setTimeout(fight, ARRIVAL_PAUSE_MS)
    })
    const marching = map.march({
      id, route: [attacker.from, cityId], kind: 'army', speed: MARCH_SPEED,
      color: factionColor(attacker.factionId), label: `${FACTION_MAP[attacker.factionId]?.name ?? ''}軍`,
    })
    if (!marching) {
      console.warn(`${attacker.from} から ${cityId} への街道が地図にありません`)
      timer = window.setTimeout(fight, ARRIVAL_PAUSE_MS)
    }
    return () => {
      unsubscribe()
      clearTimeout(timer)
      map.stopMarch(id)
    }
  }, [map, battle, goTo])

  const endTurn = () => {
    setMode(BROWSE)
    update((s) => (isPlayerTurn(s) ? endFactionTurn(s) : s))
  }

  const order = (from: string, to: string, knights: string[]) => {
    update((s) => addOrder(s, { factionId: s.playerFaction, from, to, knights }))
    setMode(BROWSE)
    setSelected(from)
  }

  const ownCity = city && ownerOf(game, city.id) === game.playerFaction

  return (
    <div className="strategy-scene">
      <MapView selectedPlace={selected} onSelectPlace={selectPlace} onMapChange={setMap} showControls={false}
        cityOwners={game.cityOwners} />
      <div className="strategy-scene__ui">
        {city && <CityWindow city={city} game={game} neighbours={map?.network.neighbours(city.id) ?? []}
          onSelectCity={(id) => mode.kind === 'browse' && setSelected(id)} x={48} y={72} />}
        <TurnBar game={game} onEndTurn={endTurn} />
        <OrderList game={game} onCancel={(id) => update((s) => cancelOrder(s, id))}
          onSelectCity={(id) => mode.kind === 'browse' && setSelected(id)} />
        {mode.kind === 'target' && (
          <Banner>
            {cityName(mode.from)}からの侵攻先を選んでください
            <button type="button" className="hud-button hud-button--small" onClick={() => setMode(BROWSE)}>やめる</button>
          </Banner>
        )}
        {mode.kind === 'browse' && game.phase === 'strategy' && !playerTurn && game.activeFaction && (
          <Banner>{FACTION_MAP[game.activeFaction]?.name}の手番</Banner>
        )}
        {mode.kind === 'browse' && battle && (
          <Banner>
            {FACTION_MAP[battle.attacker.factionId]?.name}軍が{cityName(battle.attacker.from)}から{cityName(battle.cityId)}へ進軍
          </Banner>
        )}
        {mode.kind === 'knights' && (
          <InvasionWindow key={`${mode.from}-${mode.to}`} game={game} from={mode.from} to={mode.to} x={460} y={120}
            onOrder={(knights) => order(mode.from, mode.to, knights)} onBack={() => setMode({ kind: 'target', from: mode.from })} />
        )}
        {mode.kind === 'browse' && city && ownCity && playerTurn && (
          <div className="hud-command">
            <span className="hud-command__city">{city.name}</span>
            <button type="button" className="hud-button" disabled={!canInvadeFrom(game, city.id)}
              onClick={() => setMode({ kind: 'target', from: city.id })}>侵攻</button>
            {!canInvadeFrom(game, city.id) && (
              <span className="hud-command__note">
                {availableKnights(game, city.id).length === 0 ? '出撃できる騎士がいません' : '侵攻できる隣接都市がありません'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
