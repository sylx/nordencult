import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Banner, CITY_COMMAND_GROUPS, CUTIN_TEMPLATES, CityCommandScreen, ConfirmDialog, CutInLayer, DomesticScreen, FactionMark, InvasionScreen,
  MapPickScreen, MoveScreen, ScreenHost, TransportScreen, useCutIn, useScreenStack, type CityCommandId, type CommandState, type InvasionDraft,
  type MoveDraft, type TransportDraft,
} from 'norden-ui'
import { MapView, type CityHighlight, type FocusInset, type RoadHighlight, type StrategyMap } from 'norden-strategy'
import { CHARACTER_MAP } from '../../data/character'
import { FACTION_MAP, factionColor, factionName } from '../../data/faction'
import { INDIRECT_UNIT_TYPES } from '../../data/unitTypes'
import {
  MAX_SOLDIERS, MAX_UNITS, addMoveOrder, addOrder, addTransportOrder, assign, cancelConstruction, cancelMoveOrder, cancelOrder, cancelTransportOrder,
  charactersIn, citiesOf, decideInvasion, defenseKnights, defenseProblem, demolishBuilding, formDefense, resolveBattle, domesticProblem, endFactionTurn, finishEntry, invadeFromProblem, isPlayerFaction, isPlayerTurn,
  moveFromProblem, moveMonths, moveOrderProblem, moveRoute, moveTargets, movementLegs, openInvasionTargets, orderProblem, ownerOf, pauseConstruction,
  runMovements, setAffairsBudget, setOfficers, soldiersLeft, startConstruction, startNextBattle, stationedIn, suppliesLeft, transportFromProblem,
  transportOrderProblem, useGame, viewFaction, type CityId, type DefenseDraft, type FactionId, type GameState, type InvasionOrder,
  type MoveOrder, type TransportOrder,
} from '../../game'
import { useScene } from '../sceneContext'
import { OrderList } from './OrderList'
import {
  UNIT_TYPE_VIEWS, budgetsView, buildOptions, cityName, cityView, dateLabel, domesticStats, factionSummary, factionView, knightView, knightsLabel, mapSeason,
  mapCities, officerEffects, officersView, phaseLabel, populationGrowthView, turnView, unitPower,
} from './views'
import './StrategyScene.css'

/** How long each CPU faction's turn is shown (they do nothing yet) */
const CPU_TURN_MS = 450
/** Pause before the next march sets out, and after it arrives before the battle */
const MARCH_PAUSE_MS = 900
const ARRIVAL_PAUSE_MS = 600
/** World units per second */
const MARCH_SPEED = 30

/**
 * Roads and cities of invasions (red), moves (blue) and transports (gold), whichever faction's; the markers moving
 * along them have the faction's colour
 */
const TARGET_COLOR = '#e5322d'
const MOVE_COLOR = '#8fc0e0'
const TRANSPORT_COLOR = '#e0c070'

/** The cut-in at the start of each phase: the phase, and the date below it */
const PHASE_CUTIN = CUTIN_TEMPLATES['strategy-turn']

/** The screens over the map and their params (norden-ui's screen stack) */
type StrategyScreens = {
  /** A city's information and the commands (any city; the commands work in the player's own) */
  cityCommand: { cityId: string }
  /** Choosing where to invade from `from` on the map */
  pickTarget: { from: string }
  /** Choosing the knights, unit types and soldiers */
  invasion: { from: string; to: string }
  /** Choosing where to move from `from` on the map: any other city of the player's */
  pickMoveTarget: { from: string }
  /** Choosing the knights moving, and the soldiers and supplies they take (or riding alone) */
  move: { from: string; to: string }
  /** Choosing where to transport from `from` on the map: any other city of the player's */
  pickTransportTarget: { from: string }
  /** Choosing the knight in charge, and the soldiers and supplies they take */
  transport: { from: string; to: string }
  /** The domestic screen of a city of the player's (its lord, buildings and officers), drawn over the city command screen */
  domestic: { cityId: string }
  /** Forming the army defending `cityId` (a city of a faction the player plays) in the battle `battleId`; no going back */
  defense: { cityId: string; battleId: string }
}

/** Commands not made yet */
const NOT_YET: CommandState = { disabled: true, reason: 'まだ使えません' }
const COMMAND_IDS = CITY_COMMAND_GROUPS.flatMap((g) => g.commands?.map((c) => c.id) ?? [g.id as CityCommandId])

/** The army of the invasion screen as an order (the screen does not confirm one without a commander) */
const draftOrder = (factionId: FactionId, from: CityId, to: CityId, draft: InvasionDraft): Omit<InvasionOrder, 'id'> => ({
  factionId, from, to, commander: draft.commander ?? '',
  knights: draft.units.flatMap((u) => (u.knightId === null ? [] : [u.knightId])), units: draft.units,
})

/** The move screen's draft as an order */
const draftMove = (factionId: FactionId, from: CityId, to: CityId, draft: MoveDraft): Omit<MoveOrder, 'id'> => ({
  factionId, from, to, knights: draft.knights, troops: draft.troops, supplies: draft.supplies, solo: draft.solo,
})

/** The defense screen's draft (the screen does not confirm one without a commander) */
const draftDefense = (draft: InvasionDraft): DefenseDraft => ({ commander: draft.commander ?? '', units: draft.units })

/** The transport screen's draft as an order */
const draftTransport = (factionId: FactionId, from: CityId, to: CityId, draft: TransportDraft): Omit<TransportOrder, 'id'> => ({
  factionId, from, to, knight: draft.knight, troops: draft.troops, supplies: draft.supplies,
})

/** The room (px) the city window on the left and the 行動予約 list on the right take from the map, for focusing on cities */
const FOCUS_INSET: FocusInset = { left: 360, right: 200 }

/** The roads between each pair of neighbouring cities along a route */
const routeRoads = (route: readonly string[], color: string, flow?: boolean): RoadHighlight[] =>
  route.slice(1).map((to, index) => ({ from: route[index], to, color, flow }))

/** The strategy map with the game UI (norden-ui's screens) on top */
export default function StrategyScene() {
  const { state: game, update } = useGame()
  const { goTo } = useScene()
  const [map, setMap] = useState<StrategyMap | null>(null)
  // The map takes a moment to generate; the UI, cut-ins and turns wait for it
  const ready = map !== null
  // Coming back from a battle, the camera starts over its city
  const [returnCity] = useState(() => game.lastBattle?.battle.cityId)
  // The faction the screens are about: the one playing (when the player plays more than one), or the player's
  const faction = viewFaction(game)
  const nav = useScreenStack<StrategyScreens>(
    { screen: 'cityCommand', params: { cityId: returnCity ?? citiesOf(game, faction)[0] ?? 'P012' } })
  const { top, popTo, reset } = nav
  const playerTurn = isPlayerTurn(game)
  // The cities' pictures grow with their tiers, and their emblems follow their owners
  const placedCities = useMemo(() => mapCities(game), [game])
  const targets = useMemo(() => (top.screen === 'pickTarget' ? openInvasionTargets(game, top.params.from) : []), [game, top])
  const moveDestinations = useMemo(() => (top.screen === 'pickMoveTarget' ? moveTargets(game, top.params.from) : []), [game, top])
  const transportDestinations = useMemo(() => (top.screen === 'pickTransportTarget' ? moveTargets(game, top.params.from) : []), [game, top])
  const battle = game.march?.current ?? null
  // An army marching into a city its faction took earlier in the invasion part, and an order waiting for the player
  // to choose whether to go on (its target taken by another faction)
  const entry = game.march?.entry ?? null
  const decision = game.orders.find((o) => o.id === game.march?.decision) ?? null
  // The progress phase makes every faction's moves first (shown on the map), then fights the battles
  const moved = game.march?.moved ?? true
  const legs = useMemo(() => (game.phase === 'march' && !moved ? movementLegs(game) : []), [game, moved])
  const playerCities = citiesOf(game, faction)
  const cutIn = useCutIn()
  // The order picked on the 行動予約 list: only its route is shown on the map
  const [activeOrder, setActiveOrder] = useState<string | null>(null)

  // Each phase starts with a cut-in; the march waits for it. A march resumed after a battle was announced before
  const phaseKey = `${game.turn}:${game.phase}`
  const [announced, setAnnounced] = useState(() => (game.phase === 'march' ? phaseKey : null))
  const announcing = PHASE_CUTIN !== undefined && announced !== phaseKey
  const { queue: cutInQueue } = cutIn

  useEffect(() => {
    if (!ready || !announcing || !PHASE_CUTIN) return
    let cancelled = false
    cutInQueue.play(PHASE_CUTIN, { text: phaseLabel(game.phase), subText: dateLabel(game.turn) })
      .catch((error: unknown) => console.warn('カットインを再生できません', error))
      .then(() => { if (!cancelled) setAnnounced(phaseKey) })
    return () => {
      cancelled = true
      cutInQueue.clear()
    }
  }, [ready, announcing, phaseKey, game.phase, game.turn, cutInQueue])

  // Ordering belongs to the player's turn
  useEffect(() => {
    if (!playerTurn) popTo('cityCommand')
  }, [playerTurn, popTo])

  // Playing more than one faction: each one's turn opens on a city of its own
  const lastPlayed = useRef(game.playerFactions[0])
  useEffect(() => {
    if (!playerTurn || faction === lastPlayed.current) return
    lastPlayed.current = faction
    const first = citiesOf(game, faction)[0]
    if (first) reset('cityCommand', { cityId: first })
  }, [playerTurn, faction, game, reset])

  const selectPlace = (id: string) => {
    if (!id) return
    if (top.screen === 'pickTarget') {
      if (targets.includes(id)) nav.push('invasion', { from: top.params.from, to: id })
    } else if (top.screen === 'pickMoveTarget') {
      if (moveDestinations.includes(id)) nav.push('move', { from: top.params.from, to: id })
    } else if (top.screen === 'pickTransportTarget') {
      if (transportDestinations.includes(id)) nav.push('transport', { from: top.params.from, to: id })
    } else if (top.screen === 'cityCommand') {
      nav.replace('cityCommand', { cityId: id })
    }
  }

  const showCity = (id: string) => {
    if (top.screen === 'cityCommand') nav.replace('cityCommand', { cityId: id })
  }

  const stepCity = (cityId: string, delta: number) => {
    const index = playerCities.indexOf(cityId)
    const next = index < 0 ? 0 : (index + delta + playerCities.length) % playerCities.length
    nav.replace('cityCommand', { cityId: playerCities[next] })
  }

  const selected = 'cityId' in top.params ? top.params.cityId : top.params.from

  useEffect(() => {
    if (!map) return
    const cities: CityHighlight[] = []
    const roads: RoadHighlight[] = []
    if (top.screen === 'pickTarget') {
      const { from } = top.params
      cities.push({ id: from }, ...targets.map((id) => ({ id, color: TARGET_COLOR })))
      roads.push(...targets.map((to) => ({ from, to, color: TARGET_COLOR, flow: false })))
    } else if (top.screen === 'invasion') {
      cities.push({ id: top.params.from }, { id: top.params.to, color: TARGET_COLOR })
      roads.push({ from: top.params.from, to: top.params.to, color: TARGET_COLOR })
    } else if (top.screen === 'pickMoveTarget') {
      cities.push({ id: top.params.from }, ...moveDestinations.map((id) => ({ id, color: MOVE_COLOR })))
    } else if (top.screen === 'move') {
      const { from, to } = top.params
      cities.push({ id: from }, { id: to, color: MOVE_COLOR })
      roads.push(...routeRoads(moveRoute(game, faction, from, to) ?? [], MOVE_COLOR))
    } else if (top.screen === 'pickTransportTarget') {
      cities.push({ id: top.params.from }, ...transportDestinations.map((id) => ({ id, color: TRANSPORT_COLOR })))
    } else if (top.screen === 'transport') {
      const { from, to } = top.params
      cities.push({ id: from }, { id: to, color: TRANSPORT_COLOR })
      roads.push(...routeRoads(moveRoute(game, faction, from, to) ?? [], TRANSPORT_COLOR))
    } else if (top.screen === 'domestic') {
      cities.push({ id: top.params.cityId })
    } else if (battle) {
      cities.push({ id: battle.cityId, color: TARGET_COLOR })
    } else if (entry) {
      cities.push({ id: entry.to })
    } else if (decision) {
      cities.push({ id: decision.to, color: TARGET_COLOR })
    } else {
      cities.push({ id: top.params.cityId })
    }
    // Invasions to resolve stay on the map through the progress phase
    if (game.march) {
      for (const o of game.orders) {
        if (game.march.queue.includes(o.id) || battle?.orderId === o.id || entry?.orderId === o.id) {
          roads.push({ from: o.from, to: o.to, color: TARGET_COLOR })
        }
      }
    }
    // The order picked on the 行動予約 list shows its road (an invasion) or its way ahead (a move or a transport)
    const invasion = game.orders.find((o) => o.id === activeOrder)
    const moveOrder = game.moveOrders.find((o) => o.id === activeOrder)
    const transportOrder = game.transportOrders.find((o) => o.id === activeOrder)
    const movement = game.movements.find((m) => m.id === activeOrder)
    if (invasion && !game.march) roads.push({ from: invasion.from, to: invasion.to, color: TARGET_COLOR })
    if (moveOrder) roads.push(...routeRoads(moveRoute(game, moveOrder.factionId, moveOrder.from, moveOrder.to) ?? [], MOVE_COLOR))
    if (transportOrder) {
      roads.push(...routeRoads(moveRoute(game, transportOrder.factionId, transportOrder.from, transportOrder.to) ?? [], TRANSPORT_COLOR))
    }
    if (movement) roads.push(...routeRoads(movement.route, movement.kind ? TRANSPORT_COLOR : MOVE_COLOR, !movement.solo))
    map.setCityHighlights(cities)
    const missing = map.setRoadHighlights(roads)
    if (missing.length > 0) console.warn('街道が見つかりません', missing)
  }, [map, top, targets, moveDestinations, transportDestinations, battle, entry, decision, faction, game, activeOrder])

  useEffect(() => {
    if (map && returnCity) map.focusPlace(returnCity, true)
  }, [map, returnCity])

  // An order picked on the 行動予約 list: the camera takes in where it sets out from and where it goes.
  // Keyed by the ends so that the camera stays put as the game changes while it is picked
  const activeEnds = [...game.orders, ...game.moveOrders, ...game.transportOrders, ...game.movements].find((o) => o.id === activeOrder)
  const focusKey = activeEnds ? `${activeOrder}:${activeEnds.from}:${activeEnds.to}` : null
  useEffect(() => {
    if (!map || !focusKey) return
    const [, from, to] = focusKey.split(':')
    // After MapView's focusPlace of the city shown (its effect runs first), clear of the windows over the map
    map.focusPlaces([from, to], { inset: FOCUS_INSET })
  }, [map, focusKey])

  // CPU factions pass their turn (M001 has no CPU yet)
  useEffect(() => {
    const faction = game.activeFaction
    if (!ready || game.phase !== 'strategy' || !faction || isPlayerFaction(game, faction)) return
    const timer = setTimeout(() => update((s) => (s.activeFaction === faction ? endFactionTurn(s) : s)), CPU_TURN_MS)
    return () => clearTimeout(timer)
  }, [ready, game, update])

  // Progress phase: every faction's moves and transports go a month's way along the roads (an envoy riding alone), then they are made
  useEffect(() => {
    if (!map || game.phase !== 'march' || moved || announcing) return
    let timer = 0
    const marching = new Set<string>()
    const finish = (pause = ARRIVAL_PAUSE_MS) => {
      timer = window.setTimeout(() => update((s) => (s.phase === 'march' && s.march && !s.march.moved ? runMovements(s) : s)), pause)
    }
    const unsubscribe = map.onMarchArrive((marchId) => {
      if (marching.delete(marchId) && marching.size === 0) finish()
    })
    for (const leg of legs) {
      if (leg.route.length < 2) continue
      const id = `move:${leg.id}`
      const started = map.march({
        id, route: leg.route, kind: leg.kind === 'transport' ? 'transport' : leg.solo ? 'envoy' : 'army', speed: MARCH_SPEED,
        color: factionColor(leg.factionId), label: knightsLabel(leg.knights),
      })
      if (started) marching.add(id)
      else console.warn(`${leg.route.join(' → ')} の街道が地図にありません`)
    }
    // Nothing to show: the moves are made at once
    if (marching.size === 0) finish(0)
    return () => {
      unsubscribe()
      clearTimeout(timer)
      for (const leg of legs) map.stopMarch(`move:${leg.id}`)
    }
  }, [map, game.phase, moved, announcing, legs, update])

  // Progress phase, after the moves: take the next order (or start the next turn when none is left)
  const waiting = Boolean(battle || entry || decision)
  useEffect(() => {
    if (!ready || game.phase !== 'march' || !moved || waiting || announcing) return
    const timer = setTimeout(() => update((s) => (s.phase === 'march' ? startNextBattle(s) : s)), MARCH_PAUSE_MS)
    return () => clearTimeout(timer)
  }, [ready, game.phase, moved, waiting, announcing, update])

  // The army of an order whose target its faction took earlier marches into it, as a move does
  useEffect(() => {
    if (!map || !entry) return
    const { id, factionId, from, to } = entry
    let timer = 0
    const enter = () => update((s) => (s.march?.entry?.id === id ? finishEntry(s, id) : s))
    map.focusPlace(to)
    const unsubscribe = map.onMarchArrive((marchId) => {
      if (marchId === id) timer = window.setTimeout(enter, ARRIVAL_PAUSE_MS)
    })
    const marching = map.march({
      id, route: [from, to], kind: 'army', speed: MARCH_SPEED, color: factionColor(factionId), label: `${factionName(factionId)}軍`,
    })
    if (!marching) {
      console.warn(`${from} から ${to} への街道が地図にありません`)
      timer = window.setTimeout(enter, ARRIVAL_PAUSE_MS)
    }
    return () => {
      unsubscribe()
      clearTimeout(timer)
      map.stopMarch(id)
    }
  }, [map, entry, update])

  // An order waiting for the player to choose: the camera on its target
  const decisionTarget = decision?.to
  useEffect(() => {
    if (map && decisionTarget) map.focusPlace(decisionTarget)
  }, [map, decisionTarget])

  // The army of the order marches to its target. Then: a city without its lord there or soldiers is taken at once (the
  // result shown), a faction the player plays forms the army defending it (the defense screen, then the battle), or
  // the battle is fought. Keyed by the battle's ends so that forming the defense does not march it again
  const latestBattle = useRef(battle)
  useEffect(() => { latestBattle.current = battle })
  const { push } = nav
  const battleId = battle?.id
  const battleFrom = battle?.attacker.from
  const battleCity = battle?.cityId
  const battleFaction = battle?.attacker.factionId
  useEffect(() => {
    if (!map || !battleId || !battleFrom || !battleCity || !battleFaction) return
    const id = battleId
    let timer = 0
    const arrive = () => {
      const current = latestBattle.current
      if (current?.id !== id) return
      if (current.undefended) {
        update((s) => (s.march?.current?.id === id ? resolveBattle(s, id, 'attacker') : s))
        goTo('battleResult', { battleId: id })
      } else if (current.pendingDefense) {
        push('defense', { cityId: current.cityId, battleId: id })
      } else {
        goTo('battle', { battleId: id })
      }
    }
    map.focusPlace(battleCity)
    const unsubscribe = map.onMarchArrive((marchId) => {
      if (marchId === id) timer = window.setTimeout(arrive, ARRIVAL_PAUSE_MS)
    })
    const marching = map.march({
      id, route: [battleFrom, battleCity], kind: 'army', speed: MARCH_SPEED,
      color: factionColor(battleFaction), label: `${FACTION_MAP[battleFaction]?.name ?? ''}軍`,
    })
    if (!marching) {
      console.warn(`${battleFrom} から ${battleCity} への街道が地図にありません`)
      timer = window.setTimeout(arrive, ARRIVAL_PAUSE_MS)
    }
    return () => {
      unsubscribe()
      clearTimeout(timer)
      map.stopMarch(id)
    }
  }, [map, battleId, battleFrom, battleCity, battleFaction, goTo, update, push])

  /**
   * An order made on its screen: added, back to the city command screen, and picked on the 行動予約 list (its route
   * shown, the camera on both ends). `ordersOf` is the list it joins, the new one last
   */
  const order = (add: (s: GameState) => GameState, ordersOf: (s: GameState) => readonly { id: string }[]) => {
    let added: string | null = null
    update((s) => {
      const next = add(s)
      added = ordersOf(next).at(-1)?.id ?? null
      return next
    })
    popTo('cityCommand')
    setActiveOrder(added)
  }

  const endTurn = () => {
    popTo('cityCommand')
    update((s) => (isPlayerTurn(s) ? endFactionTurn(s) : s))
  }

  const commandState = (cityId: string): Partial<Record<CityCommandId, CommandState>> => {
    const state: Partial<Record<CityCommandId, CommandState>> = Object.fromEntries(COMMAND_IDS.map((id) => [id, NOT_YET]))
    const problem = playerTurn ? invadeFromProblem(game, cityId) : '手番ではありません'
    state.invade = problem ? { disabled: true, reason: problem } : {}
    const move = playerTurn ? moveFromProblem(game, cityId) : '手番ではありません'
    state.move = move ? { disabled: true, reason: move } : {}
    const transport = playerTurn ? transportFromProblem(game, cityId) : '手番ではありません'
    state.transport = transport ? { disabled: true, reason: transport } : {}
    const domestic = playerTurn ? domesticProblem(game, cityId) : '手番ではありません'
    state.domestic = domestic ? { disabled: true, reason: domestic } : {}
    return state
  }

  const notice = battle
    ? `${FACTION_MAP[battle.attacker.factionId]?.name}軍が${cityName(battle.attacker.from)}から${cityName(battle.cityId)}へ進軍`
    : entry
    ? `${factionName(entry.factionId)}軍が${cityName(entry.from)}から${cityName(entry.to)}へ入城`
    : legs.length > 0 && !announcing
      ? legs.some((leg) => leg.kind === 'transport') ? '騎士の移動と輸送' : '騎士の移動'
      : game.phase === 'strategy' && !playerTurn && game.activeFaction
      ? `${FACTION_MAP[game.activeFaction]?.name}の手番`
      : null

  return (
    <div className={`strategy-scene${ready ? '' : ' strategy-scene--loading'}`}>
      <MapView selectedPlace={selected} onSelectPlace={selectPlace} onMapChange={setMap} showControls={false} showStats={false} copyClickPoint={false}
        cities={placedCities} season={mapSeason(game.turn)} />
      <ScreenHost nav={nav} overlays={['domestic']} escapeToPop={top.screen !== 'defense'} screens={{
        cityCommand: ({ cityId }) => {
          const index = playerCities.indexOf(cityId)
          return (
            <CityCommandScreen city={cityView(game, cityId)} turn={turnView(game)} faction={factionSummary(game)}
              playerFaction={factionView(faction)}
              knightOf={(id) => CHARACTER_MAP[id] ? knightView(game, id) : undefined}
              cityPosition={index < 0 ? undefined : { index, count: playerCities.length }}
              onPrevCity={playerCities.length > 0 ? () => stepCity(cityId, -1) : undefined}
              onNextCity={playerCities.length > 0 ? () => stepCity(cityId, 1) : undefined}
              commandState={commandState(cityId)}
              activeCommand={top.screen === 'domestic' ? 'domestic' : undefined}
              onCommand={(id) => {
                // 内政 again closes the domestic window drawn over this screen; other commands close it first
                const domesticOpen = top.screen === 'domestic'
                popTo('cityCommand')
                if (id === 'invade') nav.push('pickTarget', { from: cityId })
                else if (id === 'move') nav.push('pickMoveTarget', { from: cityId })
                else if (id === 'transport') nav.push('pickTransportTarget', { from: cityId })
                else if (id === 'domestic' && !domesticOpen) nav.push('domestic', { cityId })
              }}
              onEndTurn={endTurn} endTurnDisabled={!playerTurn}
              turnMenu={<p className="strategy-scene__player">プレイヤー <FactionMark faction={factionView(faction)} /></p>}>
              <OrderList game={game} onCancel={(id) => update((s) => cancelOrder(s, id))}
                onCancelMove={(id) => update((s) => cancelMoveOrder(s, id))}
                onCancelTransport={(id) => update((s) => cancelTransportOrder(s, id))} onSelectCity={showCity}
                activeId={activeOrder} onActiveChange={setActiveOrder} />
              {notice && <div className="norden-screen-top-center norden-screen-banner"><Banner>{notice}</Banner></div>}
            </CityCommandScreen>
          )
        },
        pickTarget: ({ from }) => (
          <MapPickScreen message={`${cityName(from)}からの侵攻先を選んでください`} onCancel={nav.pop} />
        ),
        pickMoveTarget: ({ from }) => (
          <MapPickScreen message={`${cityName(from)}からの移動先を選んでください`} onCancel={nav.pop} />
        ),
        move: ({ from, to }) => {
          const route = moveRoute(game, faction, from, to) ?? [from, to]
          return (
            <MoveScreen from={cityView(game, from)} to={cityView(game, to)} route={route.map(cityName)}
              months={moveMonths(route.length - 1, false)} soloMonths={moveMonths(route.length - 1, true)}
              knights={charactersIn(game, from).map((id) => knightView(game, id))}
              soldierPool={soldiersLeft(game, from)} supplyPool={suppliesLeft(game, from)}
              validate={(draft) => moveOrderProblem(game, draftMove(faction, from, to, draft))}
              onCancel={nav.pop}
              onConfirm={(draft) => order((s) => addMoveOrder(s, draftMove(viewFaction(s), from, to, draft)), (s) => s.moveOrders)} />
          )
        },
        pickTransportTarget: ({ from }) => (
          <MapPickScreen message={`${cityName(from)}からの輸送先を選んでください`} onCancel={nav.pop} />
        ),
        transport: ({ from, to }) => {
          const route = moveRoute(game, faction, from, to) ?? [from, to]
          return (
            <TransportScreen from={cityView(game, from)} to={cityView(game, to)} route={route.map(cityName)}
              months={moveMonths(route.length - 1, false)} returnMonths={moveMonths(route.length - 1, true)}
              knights={charactersIn(game, from).map((id) => knightView(game, id))}
              soldierPool={soldiersLeft(game, from)} supplyPool={suppliesLeft(game, from)}
              validate={(draft) => transportOrderProblem(game, draftTransport(faction, from, to, draft))}
              onCancel={nav.pop}
              onConfirm={(draft) => order((s) => addTransportOrder(s, draftTransport(viewFaction(s), from, to, draft)), (s) => s.transportOrders)} />
          )
        },
        domestic: ({ cityId }) => (
          <DomesticScreen
            city={cityView(game, cityId)}
            buildOptions={buildOptions(game, cityId)}
            gold={game.gold[faction]}
            populationGrowth={populationGrowthView(game, cityId)}
            stats={domesticStats(game, cityId)}
            onBuild={(buildingId) => update((s) => startConstruction(s, cityId, buildingId))}
            onDemolish={(buildingId) => update((s) => demolishBuilding(s, cityId, buildingId))}
            onCancelConstruction={() => update((s) => cancelConstruction(s, cityId))}
            onPauseConstruction={(paused) => update((s) => pauseConstruction(s, cityId, paused))}
            officers={officersView(game, cityId)}
            officerEffects={officerEffects(game, cityId)}
            budgets={budgetsView(game, cityId)}
            onChangeBudget={(role, amount) => update((s) => setAffairsBudget(s, cityId, role, amount))}
            onChangeLord={(knightId) => update((s) => assign(s, cityId, knightId, 'governor'))}
            onAssignOfficers={(role, knightIds) => update((s) => setOfficers(s, cityId, role, knightIds))}
            onClose={nav.pop}
          />
        ),
        defense: ({ cityId, battleId }) => {
          const defended = battle?.id === battleId ? battle : null
          if (!defended) return null
          return (
            <InvasionScreen mode="defense" from={cityView(game, defended.attacker.from)} to={cityView(game, cityId)}
              // Knights of invasions called off defend: their orders do not hold them
              knights={defenseKnights(game, defended).map((id) => ({ ...knightView(game, id), unavailableReason: undefined }))}
              unitTypes={UNIT_TYPE_VIEWS} indirectUnitTypes={INDIRECT_UNIT_TYPES} maxUnits={MAX_UNITS} maxSoldiers={MAX_SOLDIERS}
              soldierPool={game.cities[cityId].troops} morale={game.cities[cityId].troopMorale}
              unitPower={(unit, commander) => unitPower(game, cityId, unit, commander)}
              validate={(draft) => defenseProblem(game, defended, draftDefense(draft))}
              onConfirm={(draft) => {
                update((s) => formDefense(s, battleId, draftDefense(draft)))
                goTo('battle', { battleId })
              }} />
          )
        },
        invasion: ({ from, to }) => (
          <InvasionScreen from={cityView(game, from)} to={cityView(game, to)} defenders={stationedIn(game, to).length}
            knights={charactersIn(game, from).map((id) => knightView(game, id))} unitTypes={UNIT_TYPE_VIEWS}
            indirectUnitTypes={INDIRECT_UNIT_TYPES} maxUnits={MAX_UNITS} maxSoldiers={MAX_SOLDIERS} soldierPool={soldiersLeft(game, from)}
            morale={game.cities[from].troopMorale} unitPower={(unit, commander) => unitPower(game, from, unit, commander)}
            validate={(draft) => orderProblem(game, draftOrder(faction, from, to, draft))}
            onCancel={nav.pop}
            onConfirm={(draft) => order((s) => addOrder(s, draftOrder(viewFaction(s), from, to, draft)), (s) => s.orders)} />
        ),
      }} />
      {decision && ready && !announcing && (
        <ConfirmDialog title="侵攻の継続"
          message={`${cityName(decision.to)}は${factionName(ownerOf(game, decision.to))}の領地になりました。`
            + `${factionName(decision.factionId)}軍（${cityName(decision.from)}から）は侵攻を続けますか？`}
          confirmLabel="侵攻を続ける" cancelLabel="侵攻を中止"
          onConfirm={() => update((s) => (s.march?.decision === decision.id ? decideInvasion(s, decision.id, true) : s))}
          onCancel={() => update((s) => (s.march?.decision === decision.id ? decideInvasion(s, decision.id, false) : s))} />
      )}
      <CutInLayer cutIn={cutIn} />
    </div>
  )
}
