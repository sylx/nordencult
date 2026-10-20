import { useEffect, useMemo, useState } from 'react'
import {
  Banner, CITY_COMMAND_GROUPS, CUTIN_TEMPLATES, CityCommandScreen, CutInLayer, DomesticScreen, FactionMark, InvasionScreen,
  MapPickScreen, MoveScreen, ScreenHost, useCutIn, useScreenStack, type CityCommandId, type CommandState, type InvasionDraft, type MoveDraft,
} from 'norden-ui'
import { MapView, type CityHighlight, type RoadHighlight, type StrategyMap } from 'norden-strategy'
import { CHARACTER_MAP } from '../../data/character'
import { FACTION_MAP, factionColor } from '../../data/faction'
import { INDIRECT_UNIT_TYPES } from '../../data/unitTypes'
import {
  MAX_SOLDIERS, MAX_UNITS, addMoveOrder, addOrder, assign, cancelConstruction, cancelMoveOrder, cancelOrder, charactersIn, citiesOf, demolishBuilding,
  domesticProblem, endFactionTurn, invadeFromProblem, isPlayerTurn, moveFromProblem, moveMonths, moveOrderProblem, moveRoute, moveTargets, movementLegs,
  openInvasionTargets, orderProblem, pauseConstruction, runMovements, setAffairsBudget, setOfficers, soldiersLeft, startConstruction, startNextBattle,
  suppliesLeft, useGame, type CityId, type FactionId, type InvasionOrder, type MoveOrder,
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

/** Roads and cities of invasions (red) and moves (blue), whichever faction's; the markers moving along them have the faction's colour */
const TARGET_COLOR = '#e5322d'
const MOVE_COLOR = '#8fc0e0'

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
  /** The domestic screen of a city of the player's (its lord, buildings and officers), drawn over the city command screen */
  domestic: { cityId: string }
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
  const nav = useScreenStack<StrategyScreens>(
    { screen: 'cityCommand', params: { cityId: returnCity ?? citiesOf(game, game.playerFaction)[0] ?? 'P012' } })
  const { top, popTo } = nav
  const playerTurn = isPlayerTurn(game)
  // The cities' pictures grow with their tiers, and their emblems follow their owners
  const placedCities = useMemo(() => mapCities(game), [game])
  const targets = useMemo(() => (top.screen === 'pickTarget' ? openInvasionTargets(game, top.params.from) : []), [game, top])
  const moveDestinations = useMemo(() => (top.screen === 'pickMoveTarget' ? moveTargets(game, top.params.from) : []), [game, top])
  const battle = game.march?.current ?? null
  // The progress phase makes every faction's moves first (shown on the map), then fights the battles
  const moved = game.march?.moved ?? true
  const legs = useMemo(() => (game.phase === 'march' && !moved ? movementLegs(game) : []), [game, moved])
  const playerCities = citiesOf(game, game.playerFaction)
  const cutIn = useCutIn()

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

  const selectPlace = (id: string) => {
    if (!id) return
    if (top.screen === 'pickTarget') {
      if (targets.includes(id)) nav.push('invasion', { from: top.params.from, to: id })
    } else if (top.screen === 'pickMoveTarget') {
      if (moveDestinations.includes(id)) nav.push('move', { from: top.params.from, to: id })
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
      roads.push(...routeRoads(moveRoute(game, game.playerFaction, from, to) ?? [], MOVE_COLOR))
    } else if (top.screen === 'domestic') {
      cities.push({ id: top.params.cityId })
    } else if (battle) {
      cities.push({ id: battle.cityId, color: TARGET_COLOR })
    } else {
      cities.push({ id: top.params.cityId })
    }
    // Ordered invasions stay on the map until they are resolved
    const pending = game.march
      ? game.orders.filter((o) => game.march?.queue.includes(o.id) || battle?.orderId === o.id)
      : game.orders.filter((o) => o.factionId === game.playerFaction)
    for (const o of pending) {
      if (top.screen === 'invasion' && o.from === top.params.from && o.to === top.params.to) continue
      roads.push({ from: o.from, to: o.to, color: TARGET_COLOR })
    }
    // In the strategy phase the player's moves ordered and every faction's on the way show their roads ahead
    if (!game.march) {
      for (const o of game.moveOrders) {
        if (o.factionId !== game.playerFaction) continue
        if (top.screen === 'move' && o.from === top.params.from && o.to === top.params.to) continue
        roads.push(...routeRoads(moveRoute(game, o.factionId, o.from, o.to) ?? [], MOVE_COLOR))
      }
      for (const m of game.movements) roads.push(...routeRoads(m.route, MOVE_COLOR, !m.solo))
    }
    map.setCityHighlights(cities)
    const missing = map.setRoadHighlights(roads)
    if (missing.length > 0) console.warn('街道が見つかりません', missing)
  }, [map, top, targets, moveDestinations, battle, game])

  useEffect(() => {
    if (map && returnCity) map.focusPlace(returnCity, true)
  }, [map, returnCity])

  // CPU factions pass their turn (M001 has no CPU yet)
  useEffect(() => {
    const faction = game.activeFaction
    if (!ready || game.phase !== 'strategy' || !faction || faction === game.playerFaction) return
    const timer = setTimeout(() => update((s) => (s.activeFaction === faction ? endFactionTurn(s) : s)), CPU_TURN_MS)
    return () => clearTimeout(timer)
  }, [ready, game.phase, game.activeFaction, game.playerFaction, update])

  // Progress phase: every faction's moves go a month's way along the roads (an envoy riding alone), then they are made
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
        id, route: leg.route, kind: leg.solo ? 'envoy' : 'army', speed: MARCH_SPEED,
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
  useEffect(() => {
    if (!ready || game.phase !== 'march' || !moved || battle || announcing) return
    const timer = setTimeout(() => update((s) => (s.phase === 'march' && !s.march?.current ? startNextBattle(s) : s)),
      MARCH_PAUSE_MS)
    return () => clearTimeout(timer)
  }, [ready, game.phase, moved, battle, announcing, update])

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
    popTo('cityCommand')
    update((s) => (isPlayerTurn(s) ? endFactionTurn(s) : s))
  }

  const commandState = (cityId: string): Partial<Record<CityCommandId, CommandState>> => {
    const state: Partial<Record<CityCommandId, CommandState>> = Object.fromEntries(COMMAND_IDS.map((id) => [id, NOT_YET]))
    const problem = playerTurn ? invadeFromProblem(game, cityId) : '手番ではありません'
    state.invade = problem ? { disabled: true, reason: problem } : {}
    const move = playerTurn ? moveFromProblem(game, cityId) : '手番ではありません'
    state.move = move ? { disabled: true, reason: move } : {}
    const domestic = playerTurn ? domesticProblem(game, cityId) : '手番ではありません'
    state.domestic = domestic ? { disabled: true, reason: domestic } : {}
    return state
  }

  const notice = battle
    ? `${FACTION_MAP[battle.attacker.factionId]?.name}軍が${cityName(battle.attacker.from)}から${cityName(battle.cityId)}へ進軍`
    : legs.length > 0 && !announcing
      ? '騎士の移動'
      : game.phase === 'strategy' && !playerTurn && game.activeFaction
      ? `${FACTION_MAP[game.activeFaction]?.name}の手番`
      : null

  return (
    <div className={`strategy-scene${ready ? '' : ' strategy-scene--loading'}`}>
      <MapView selectedPlace={selected} onSelectPlace={selectPlace} onMapChange={setMap} showControls={false} showStats={false} copyClickPoint={false}
        cities={placedCities} season={mapSeason(game.turn)} />
      <ScreenHost nav={nav} overlays={['domestic']} screens={{
        cityCommand: ({ cityId }) => {
          const index = playerCities.indexOf(cityId)
          return (
            <CityCommandScreen city={cityView(game, cityId)} turn={turnView(game)} faction={factionSummary(game)}
              playerFaction={factionView(game.playerFaction)}
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
                else if (id === 'domestic' && !domesticOpen) nav.push('domestic', { cityId })
              }}
              onEndTurn={endTurn} endTurnDisabled={!playerTurn}
              turnMenu={<p className="strategy-scene__player">プレイヤー <FactionMark faction={factionView(game.playerFaction)} /></p>}>
              <OrderList game={game} onCancel={(id) => update((s) => cancelOrder(s, id))}
                onCancelMove={(id) => update((s) => cancelMoveOrder(s, id))} onSelectCity={showCity} />
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
          const route = moveRoute(game, game.playerFaction, from, to) ?? [from, to]
          return (
            <MoveScreen from={cityView(game, from)} to={cityView(game, to)} route={route.map(cityName)}
              months={moveMonths(route.length - 1, false)} soloMonths={moveMonths(route.length - 1, true)}
              knights={charactersIn(game, from).map((id) => knightView(game, id))}
              soldierPool={soldiersLeft(game, from)} supplyPool={suppliesLeft(game, from)}
              validate={(draft) => moveOrderProblem(game, draftMove(game.playerFaction, from, to, draft))}
              onCancel={nav.pop}
              onConfirm={(draft) => {
                update((s) => addMoveOrder(s, draftMove(s.playerFaction, from, to, draft)))
                popTo('cityCommand')
              }} />
          )
        },
        domestic: ({ cityId }) => (
          <DomesticScreen
            city={cityView(game, cityId)}
            buildOptions={buildOptions(game, cityId)}
            gold={game.gold[game.playerFaction]}
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
        invasion: ({ from, to }) => (
          <InvasionScreen from={cityView(game, from)} to={cityView(game, to)} defenders={charactersIn(game, to).length}
            knights={charactersIn(game, from).map((id) => knightView(game, id))} unitTypes={UNIT_TYPE_VIEWS}
            indirectUnitTypes={INDIRECT_UNIT_TYPES} maxUnits={MAX_UNITS} maxSoldiers={MAX_SOLDIERS} soldierPool={soldiersLeft(game, from)}
            morale={game.cities[from].troopMorale} unitPower={(unit, commander) => unitPower(game, from, unit, commander)}
            validate={(draft) => orderProblem(game, draftOrder(game.playerFaction, from, to, draft))}
            onCancel={nav.pop}
            onConfirm={(draft) => {
              update((s) => addOrder(s, draftOrder(s.playerFaction, from, to, draft)))
              popTo('cityCommand')
            }} />
        ),
      }} />
      <CutInLayer cutIn={cutIn} />
    </div>
  )
}
