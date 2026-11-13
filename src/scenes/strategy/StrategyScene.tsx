import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Banner, BuildingImage, CITY_COMMAND_GROUPS, CUT_IMAGES, CUTIN_TEMPLATES, CityCommandScreen, ConfirmDialog, CutInLayer, DomesticScreen, EventScreen,
  InvasionScreen, KnightChip, MapPickScreen, MercenaryScreen, MoveScreen, RelicScreen, ScreenHost, TechScreen, TransportScreen, useCutIn, useScreenStack, type CityCommandId, type CommandState, type InvasionDraft,
  type MoveDraft, type TransportDraft,
} from 'norden-ui'
import { MapView, type CityHighlight, type FocusInset, type RoadHighlight, type StrategyMap } from 'norden-strategy'
import { playSe } from '../../audio/se'
import { GameSettingsWindow } from '../../components/GameSettingsWindow'
import { FACTION_MAP, factionColor, factionName } from '../../data/faction'
import { INDIRECT_UNIT_TYPES } from '../../data/unitTypes'
import {
  BALANCE, MAX_SOLDIERS, MAX_UNITS, addMoveOrder, addOrder, addTransportOrder, assign, cancelConstruction, cancelMoveOrder, cancelOrder, cancelTransportOrder,
  characterOf, charactersIn, citiesOf, decideInvasion, decideRenewal, defenseKnights, defenseProblem, demolishBuilding, formDefense, resolveBattle, domesticProblem, endFactionTurn,
  dismantleRelic, dismissMercenary, endFactionTurnProblem, equipRelic, relicsOf, unequipRelic, finishEntry, invadeFromProblem, isPlayerFaction, isPlayerTurn, lordChangeProblem, mercenaryCityProblem, mustChooseResearch, requestPapalRepair, researchOf, setResearch,
  moveFromProblem, moveMonths, moveOrderProblem, moveRoute, moveTargets, movementLegs, openInvasionTargets, orderProblem, ownerOf, pauseConstruction, prisonersIn,
  renewalProblem, runMovements, setAffairsBudget, setOfficers, soldiersLeft, startConstruction, startNextBattle, startRelicProduction, startRelicRepair, stationedIn, suppliesLeft, transportFromProblem,
  transportOrderProblem, dismissEvent, useGame, viewFaction, type CityId, type DefenseDraft, type FactionId, type GameState, type InvasionOrder,
  type MoveOrder, type TransportOrder,
} from '../../game'
import type { EquipmentActions } from 'norden-ui'
import { playDialogue } from '../playDialogue'
import { useScene } from '../sceneContext'
import { OrderList } from './OrderList'
import { useStrategyLayout } from './uiLayout'
import {
  UNIT_TYPE_VIEWS, budgetsView, buildOptions, cityName, cityView, dateLabel, domesticStats, factionSummary, factionView, knightView, knightsLabel, mapSeason,
  equipCandidatesView, equipOptionsView, eventView, mapCities, mercenaryContracts, mercenaryOffers, officerEffects, officersView, phaseLabel, populationGrowthView, relicOptions, relicProductionsView, relicsView, researchPerTurn, researchPointDetails, techsView,
  transportKnightView, turnView, unitPower,
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
  /** The technology screen (研究＞技術), opened over the city command screen of `cityId` */
  tech: { cityId: string }
  /** The relic screen (研究＞遺物): the faction's box; a relic is repaired or produced in `cityId` */
  relic: { cityId: string }
  /** The mercenary screen (軍事＞傭兵): those `cityId` can hire, and those the faction hired */
  mercenary: { cityId: string }
}

/** Commands not made yet */
const NOT_YET: CommandState = { disabled: true, reason: 'まだ使えません' }
const OTHER_FACTION_CITY: CommandState = { disabled: true, reason: '自勢力の都市ではありません' }
const commandIds = (groups: typeof CITY_COMMAND_GROUPS) => groups.flatMap((g) => g.commands?.map((c) => c.id) ?? [g.id as CityCommandId])
const COMMAND_IDS = commandIds(CITY_COMMAND_GROUPS)
/** All but 情報, which is all a city of another faction allows */
const OWN_CITY_COMMAND_IDS = commandIds(CITY_COMMAND_GROUPS.filter((g) => g.id !== 'intelligence'))

/** The army of the invasion screen as an order (the screen does not confirm one without a commander) */
const draftOrder = (factionId: FactionId, from: CityId, to: CityId, draft: InvasionDraft): Omit<InvasionOrder, 'id'> => ({
  factionId, from, to, commander: draft.commander ?? '',
  knights: draft.units.flatMap((u) => (u.knightId === null ? [] : [u.knightId])), units: draft.units,
})

/** The move screen's draft as an order */
const draftMove = (factionId: FactionId, from: CityId, to: CityId, draft: MoveDraft): Omit<MoveOrder, 'id'> => ({
  factionId, from, to, knights: draft.knights, troops: draft.troops, supplies: draft.supplies, solo: draft.solo, prisoners: draft.prisoners,
})

/** The defense screen's draft (the screen does not confirm one without a commander) */
const draftDefense = (draft: InvasionDraft): DefenseDraft => ({ commander: draft.commander ?? '', units: draft.units })

/** The transport screen's draft as an order */
const draftTransport = (factionId: FactionId, from: CityId, to: CityId, draft: TransportDraft): Omit<TransportOrder, 'id'> => ({
  factionId, from, to, knight: draft.knight, troops: draft.troops, supplies: draft.supplies, prisoners: draft.prisoners,
})

/** The room (px) the 行動予約 list takes from the right of the map, for focusing on cities; the city window's is measured */
const ORDER_LIST_WIDTH = 200
/** The room the guide banner of the map pick screens covers at the top of the map */
const PICK_INSET: FocusInset = { top: 150 }

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
  // With the names on the map (those of summoned units are in the state)
  const legs = useMemo(() => (game.phase === 'march' && !moved ? movementLegs(game) : []).map((leg) => ({ ...leg, label: knightsLabel(game, leg.knights) })), [game, moved])
  const playerCities = citiesOf(game, faction)
  const cutIn = useCutIn()
  // The order picked on the 行動予約 list: only its route is shown on the map
  const [activeOrder, setActiveOrder] = useState<string | null>(null)
  // Where the player put the windows (and the 行動予約 list folded down to its title): they stay across the screens and plays
  const { layout, updateLayout, resetLayout } = useStrategyLayout()
  const [settingsOpen, setSettingsOpen] = useState(false)
  // The right edge (px) of the city window on the left of the map: it can be dragged or resized
  const [cityWindowRight, setCityWindowRight] = useState(0)

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

  // An event (a faction destroyed) is told by its cut-in, then its notice until the player closes it; the march waits
  const event = game.events[0] ?? null
  const renewal = event?.kind === 'mercenaryRenewal' ? event : null
  const told = useMemo(() => (event ? eventView(event) : null), [event])
  const [eventCut, setEventCut] = useState<string | null>(null)
  const eventId = event?.id
  const eventCutIn = told?.cutIn
  useEffect(() => {
    if (!ready || announcing || !eventId || !eventCutIn || eventCut === eventId) return
    let cancelled = false
    const template = CUTIN_TEMPLATES[eventCutIn.template]
    const played = template ? cutInQueue.play(template, { text: eventCutIn.text, subText: eventCutIn.subText }) : Promise.resolve()
    played
      .catch((error: unknown) => console.warn('カットインを再生できません', error))
      .then(() => { if (!cancelled) setEventCut(eventId) })
    return () => {
      cancelled = true
      cutInQueue.clear()
    }
  }, [ready, announcing, eventId, eventCutIn, eventCut, cutInQueue])

  // An event's sound, with its notice (after the phase's cut-in) and once for each event
  const eventSound = told?.sound
  const sounded = useRef<string | null>(null)
  useEffect(() => {
    if (!ready || announcing || !eventId || !eventSound || sounded.current === eventId) return
    sounded.current = eventId
    playSe(eventSound)
  }, [ready, announcing, eventId, eventSound])

  // Ordering belongs to the player's turn
  useEffect(() => {
    if (!playerTurn) popTo('cityCommand')
  }, [playerTurn, popTo])

  // Research points 宙に浮いた (none researched, or one just completed): once the notices are told, the technology
  // screen opens and stays until something is chosen, over the relic screen when a relic dismantled made them
  const mustChoose = playerTurn && mustChooseResearch(game, faction)
  const { push: pushScreen } = nav
  useEffect(() => {
    if (!ready || announcing || event || !mustChoose || top.screen === 'tech') return
    if (top.screen !== 'relic') popTo('cityCommand')
    pushScreen('tech', { cityId: 'cityId' in top.params ? top.params.cityId : top.params.from })
  }, [ready, announcing, event, mustChoose, top, popTo, pushScreen])

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
      switchCity(id)
    }
  }

  /** Shows another city on the city command screen, with a whoosh */
  const switchCity = (id: string) => {
    if (top.screen !== 'cityCommand' || id === top.params.cityId) return
    playSe('whoosh')
    nav.replace('cityCommand', { cityId: id })
  }

  const stepCity = (cityId: string, delta: number) => {
    const index = playerCities.indexOf(cityId)
    const next = index < 0 ? 0 : (index + delta + playerCities.length) % playerCities.length
    switchCity(playerCities[next])
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
    if (movement) roads.push(...routeRoads(movement.route, movement.kind && movement.kind !== 'escape' ? TRANSPORT_COLOR : MOVE_COLOR, !movement.solo))
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
    map.focusPlaces([from, to], { inset: { left: cityWindowRight, right: ORDER_LIST_WIDTH } })
  }, [map, focusKey, cityWindowRight])

  // Choosing where to move or transport: the camera takes in the city and all the cities it can go to.
  // Keyed by the cities so that the camera stays put as the game changes while choosing
  const pickKey = top.screen === 'pickMoveTarget' || top.screen === 'pickTransportTarget'
    ? [top.params.from, ...(top.screen === 'pickMoveTarget' ? moveDestinations : transportDestinations)].join(':')
    : null
  useEffect(() => {
    if (!map || !pickKey) return
    map.focusPlaces(pickKey.split(':'), { inset: PICK_INSET })
  }, [map, pickKey])

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
        color: factionColor(leg.factionId), label: leg.label,
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
  const waiting = Boolean(battle || entry || decision || event)
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
    update((s) => (isPlayerTurn(s) && !endFactionTurnProblem(s) ? endFactionTurn(s) : s))
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
    const mercenary = playerTurn ? mercenaryCityProblem(game, cityId) : '手番ではありません'
    state.mercenary = mercenary ? { disabled: true, reason: mercenary } : {}
    state.tech = playerTurn ? {} : { disabled: true, reason: '手番ではありません' }
    state.relic = state.tech
    if (playerTurn && ownerOf(game, cityId) !== faction) for (const id of OWN_CITY_COMMAND_IDS) state[id] = OTHER_FACTION_CITY
    return state
  }

  const notice = battle
    ? `${FACTION_MAP[battle.attacker.factionId]?.name}軍が${cityName(battle.attacker.from)}から${cityName(battle.cityId)}へ進軍`
    : entry
    ? `${factionName(entry.factionId)}軍が${cityName(entry.from)}から${cityName(entry.to)}へ入城`
    : legs.length > 0 && !announcing
      ? legs.some((leg) => leg.kind === 'transport') ? '騎士の移動と輸送' : '騎士の移動'
      : game.phase === 'strategy' && !playerTurn && game.activeFaction
      ? "他勢力の思考中..."
      : null

  /** Changing a knight's equipment from their profile (the city window) */
  const equipment: EquipmentActions = {
    options: (knightId, slot) => equipOptionsView(game, knightId, slot),
    onEquip: (knightId, slot, itemId) => update((s) => equipRelic(s, knightId, slot, itemId)),
    onUnequip: (knightId, slot) => update((s) => unequipRelic(s, knightId, slot)),
  }

  return (
    <div className={`strategy-scene${ready ? '' : ' strategy-scene--loading'}`}>
      <MapView selectedPlace={selected} onSelectPlace={selectPlace} onMapChange={setMap} showControls={false} showStats={false} copyClickPoint={false}
        cities={placedCities} season={mapSeason(game.turn)} />
      <ScreenHost nav={nav} escapeToPop={top.screen !== 'defense' && !(top.screen === 'tech' && mustChoose)} screens={{
        cityCommand: ({ cityId }) => {
          const index = playerCities.indexOf(cityId)
          return (
            <CityCommandScreen city={cityView(game, cityId)} turn={turnView(game)} faction={factionSummary(game)}
              isPlayerCity={ownerOf(game, cityId) === faction}
              playerFaction={factionView(faction)}
              layout={layout} onLayoutChange={(part, position) => updateLayout({ [part]: position })}
              onWindowBoundsChange={({ x, width }) => setCityWindowRight(x + width)}
              knightOf={(id) => characterOf(game, id) ? knightView(game, id) : undefined}
              equipment={equipment}
              cityPosition={index < 0 ? undefined : { index, count: playerCities.length }}
              onPrevCity={playerCities.length > 0 ? () => stepCity(cityId, -1) : undefined}
              onNextCity={playerCities.length > 0 ? () => stepCity(cityId, 1) : undefined}
              commandState={commandState(cityId)}
              onCommand={(id) => {
                if (id === 'invade') nav.push('pickTarget', { from: cityId })
                else if (id === 'move') nav.push('pickMoveTarget', { from: cityId })
                else if (id === 'transport') nav.push('pickTransportTarget', { from: cityId })
                else if (id === 'domestic') nav.push('domestic', { cityId })
                else if (id === 'tech') nav.push('tech', { cityId })
                else if (id === 'relic') nav.push('relic', { cityId })
                else if (id === 'mercenary') nav.push('mercenary', { cityId })
              }}
              onOpenResearch={playerTurn ? () => nav.push('tech', { cityId }) : undefined}
              onEndTurn={endTurn} endTurnDisabled={!playerTurn || Boolean(endFactionTurnProblem(game))}
              endTurnReason={playerTurn ? endFactionTurnProblem(game) ?? undefined : undefined}
              onOpenSettings={() => setSettingsOpen(true)}>
              <OrderList game={game} onCancel={(id) => update((s) => cancelOrder(s, id))}
                onCancelMove={(id) => update((s) => cancelMoveOrder(s, id))}
                onCancelTransport={(id) => update((s) => cancelTransportOrder(s, id))} onSelectCity={switchCity}
                activeId={activeOrder} onActiveChange={setActiveOrder}
                minimized={layout.ordersMinimized ?? false} onMinimizedChange={(ordersMinimized) => updateLayout({ ordersMinimized })} />
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
              prisoners={prisonersIn(game, from).map((id) => knightView(game, id))}
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
              knights={charactersIn(game, from).map((id) => transportKnightView(game, id))}
              soldierPool={soldiersLeft(game, from)} supplyPool={suppliesLeft(game, from)}
              prisoners={prisonersIn(game, from).map((id) => knightView(game, id))}
              validate={(draft) => transportOrderProblem(game, draftTransport(faction, from, to, draft))}
              onCancel={nav.pop}
              onConfirm={(draft) => order((s) => addTransportOrder(s, draftTransport(viewFaction(s), from, to, draft)), (s) => s.transportOrders)} />
          )
        },
        mercenary: ({ cityId }) => (
          <MercenaryScreen cityName={cityName(cityId)} gold={game.gold[faction]} offers={mercenaryOffers(game, cityId)} contracts={mercenaryContracts(game, faction)}
            onHire={(id) => void playDialogue('hireMercenary', { city: cityId, merc: id })}
            onDismiss={(id) => update((s) => dismissMercenary(s, id))}
            onClose={nav.pop} />
        ),
        domestic: ({ cityId }) => (
          <DomesticScreen
            // Mercenaries are neither lords nor officers: the screen does not offer them
            city={{ ...cityView(game, cityId), knights: cityView(game, cityId).knights?.filter((knight) => !knight.mercenary) }}
            buildOptions={buildOptions(game, cityId)}
            relicOptions={relicOptions(game, cityId)}
            gold={game.gold[faction]}
            populationGrowth={populationGrowthView(game, cityId)}
            stats={domesticStats(game, cityId)}
            onBuild={(buildingId) => update((s) => startConstruction(s, cityId, buildingId))}
            onRelicWork={({ kind, id }) => update((s) => (kind === 'relicRepair' ? startRelicRepair(s, cityId, id) : startRelicProduction(s, cityId, id)))}
            onDemolish={(buildingId) => update((s) => demolishBuilding(s, cityId, buildingId))}
            onCancelConstruction={() => update((s) => cancelConstruction(s, cityId))}
            onPauseConstruction={(paused) => update((s) => pauseConstruction(s, cityId, paused))}
            officers={officersView(game, cityId)}
            officerEffects={officerEffects(game, cityId)}
            budgets={budgetsView(game, cityId)}
            budgetPerTurn={[BALANCE.AFFAIRS_BUDGET_MIN, BALANCE.AFFAIRS_BUDGET_MAX]}
            onChangeBudget={(role, amount) => update((s) => setAffairsBudget(s, cityId, role, amount))}
            onChangeLord={(knightId) => update((s) => assign(s, cityId, knightId, 'governor'))}
            lordFixedReason={lordChangeProblem(game, cityId) ?? undefined}
            onAssignOfficers={(role, knightIds) => update((s) => setOfficers(s, cityId, role, knightIds))}
            onClose={nav.pop}
          />
        ),
        tech: () => (
          <TechScreen techs={techsView(game, faction)} perTurn={researchPerTurn(game, faction)}
            pointDetails={researchPointDetails(game, faction)} carry={researchOf(game, faction).carry} mustChoose={mustChoose}
            onResearch={playerTurn ? (techId) => update((s) => setResearch(s, viewFaction(s), techId)) : undefined}
            onClose={nav.pop} />
        ),
        relic: ({ cityId }) => (
          <RelicScreen cityName={cityName(cityId)} gold={game.gold[faction]}
            construction={ownerOf(game, cityId) === faction ? cityView(game, cityId).buildings?.construction : null}
            relics={relicsView(game, faction, cityId)} productions={relicProductionsView(game, faction, cityId)}
            onDismantle={(id) => update((s) => dismantleRelic(s, viewFaction(s), id))}
            onRepair={(id) => update((s) => startRelicRepair(s, cityId, id))}
            onPapalRepair={(id) => update((s) => requestPapalRepair(s, viewFaction(s), id))}
            onProduce={(relicId) => update((s) => startRelicProduction(s, cityId, relicId))}
            equipCandidates={(id) => equipCandidatesView(game, faction, id)}
            onEquip={(id, knightId, slot) => update((s) => equipRelic(s, knightId, slot, id))}
            onUnequip={(id) => update((s) => {
              const worn = relicsOf(s, viewFaction(s)).find((item) => item.id === id)?.equippedBy
              return worn ? unequipRelic(s, worn.characterId, worn.slot) : s
            })}
            onClose={nav.pop} />
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
      {event && told && ready && !announcing && (eventCut === event.id || !told.cutIn) && (
        <EventScreen image={told.cut ? CUT_IMAGES[told.cut] : undefined} picture={told.picture && <BuildingImage building={told.picture} />}
          title={told.title} message={told.message} details={told.details}
          closeLabel={renewal ? '更新する' : undefined}
          closeReason={renewal ? renewalProblem(game, renewal.id) ?? undefined : undefined}
          secondary={renewal ? { label: '契約を打ち切る', onClick: () => update((s) => decideRenewal(s, renewal.id, false)) } : undefined}
          onClose={() => update((s) => (renewal ? decideRenewal(s, renewal.id, true) : dismissEvent(s, event.id)))}>
          {told.knights.length > 0 && (
            <p className="norden-event-chips">{told.knights.map((id) => <KnightChip key={id} knight={knightView(game, id)} />)}</p>
          )}
        </EventScreen>
      )}
      {settingsOpen && (
        <GameSettingsWindow player={factionView(faction)} onResetLayout={resetLayout} onClose={() => setSettingsOpen(false)} />
      )}
      <CutInLayer cutIn={cutIn} />
    </div>
  )
}
