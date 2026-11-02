import { BUILDING_MAP } from '../data/buildings'
import { CHARACTER_LIST, CHARACTER_MAP, CHARACTER_TYPE_LABELS } from '../data/character'
import { CITY_LIST, CITY_MAP } from '../data/city'
import { FACTION_LIST, factionName } from '../data/faction'
import { RELIC_LIST, relicName } from '../data/relics'
import { TECH_LIST, TECH_MAP } from '../data/techs'
import {
  awayReason, charactersIn, citiesOf, dateOf, debugAddRelic, debugAddResearchPoints, debugCompleteTech, debugFillResearch, debugSetCity, debugSetGold,
  debugSetMercenarySoldiers, debugSetStanding, endFactionTurn, factionPower, governorOf, isMercenary, isPlayerFaction, isRecovering, mercenaryAt, ownerOf, prisonersIn, relicsOf, researchOf, researchOutput, resolveBattle, turnOrder, viewFaction,
  type BattleWinner, type CityConstruction, type CityId, type DebugCityField, type FactionId, type GameState, type GameStore,
} from '../game'
import type { SceneNavigator } from '../scenes/types'
import { DebugError, helpLines, type DebugArg, type DebugCandidate, type DebugCommand } from './shell'
import { table } from './text'

/** What the commands work on. The navigator is a getter: it changes with the scene */
export interface DebugContext {
  store: GameStore
  navigator: () => SceneNavigator
  clear: () => void
  close: () => void
}

type Arg = DebugArg<DebugContext>
type Command = DebugCommand<DebugContext>

const factionArg: Arg = { name: 'faction', candidates: () => FACTION_LIST.map((f) => ({ value: f.id, label: f.name })) }
/** Omitted: the faction the screens are about */
const viewedFactionArg: Arg = { ...factionArg, optional: true }
const cityArg: Arg = { name: 'city', candidates: () => CITY_LIST.map((c) => ({ value: c.id, label: c.name })) }
const knightArg: Arg = { name: 'knight', candidates: () => CHARACTER_LIST.map((c) => ({ value: c.id, label: c.name })) }
const relicArg: Arg = { name: 'relic', candidates: () => RELIC_LIST.map((r) => ({ value: r.id, label: r.brokenName ?? r.name })) }
const mercenaryArg: Arg = {
  name: 'mercenary', candidates: () => CHARACTER_LIST.flatMap((c) => (c.mercenaryInfo ? [{ value: c.id, label: `${c.mercenaryInfo.name} ${c.name}` }] : [])),
}
const techArg: Arg = { name: 'tech', candidates: () => TECH_LIST.map((t) => ({ value: t.id, label: t.name })) }

const words = (...values: readonly string[]) => (): DebugCandidate[] => values.map((value) => ({ value }))

const factionOf = (args: readonly string[], index: number, state: GameState): FactionId => args[index] ?? viewFaction(state)

const cityLabel = (id: CityId | null) => (id ? `${CITY_MAP[id]?.name ?? id} (${id})` : 'なし')
const techLabel = (id: string | null) => (id ? TECH_MAP[id]?.name ?? id : 'なし')
const knightNames = (ids: readonly string[]) => ids.map((id) => CHARACTER_MAP[id]?.name ?? id).join('・') || 'なし'
const relicsLabel = (state: GameState, factionId: FactionId) =>
  relicsOf(state, factionId).map((item) => `${relicName(item.relicId, item.repaired)}${item.papalRepair ? '（依頼中）' : ''}`).join('・') || 'なし'
const knightsOf = (state: GameState, factionId: FactionId) =>
  Object.values(state.characters).filter((c) => c.factionId === factionId && !c.prisoner).length

/** The city a character serving nobody is in */
const roamingLabel = (state: GameState, id: string) => cityLabel(state.characters[id]?.roaming ?? null)

/** A mercenary's state: who hired them or where they are */
function mercenaryRow(state: GameState, id: string): string[] {
  const info = CHARACTER_MAP[id].mercenaryInfo!
  const { soldiers, contract } = state.mercenaries[id]
  const status = contract ? `契約中（月額 ${contract.monthly}）` : isRecovering(state, id) ? '回復中' : '市場'
  const place = contract ? `${factionName(state.characters[id].factionId)} ${cityLabel(mercenaryAt(state, id))}` : roamingLabel(state, id)
  return [id, info.name, CHARACTER_MAP[id].name, status, place, `${soldiers}/${info.maxSoldiers}`]
}

function researchLabel(state: GameState, factionId: FactionId): string {
  const { current, progress } = researchOf(state, factionId)
  const tech = current ? TECH_MAP[current] : undefined
  return tech ? `${tech.name} ${progress[tech.id] ?? 0}/${tech.cost}` : '研究先なし'
}

function constructionLabel(construction: CityConstruction | null): string {
  if (!construction) return 'なし'
  const { work, investedSupplies, requiredSupplies, paused } = construction
  const name = work.kind === 'building' ? BUILDING_MAP[work.buildingId]?.name ?? work.buildingId : relicName(work.relicId, work.kind === 'relicProduction')
  return `${name} ${investedSupplies}/${requiredSupplies}${paused ? '（中断）' : ''}`
}

const CITY_FIELDS: Readonly<Record<string, { field: DebugCityField; label: string }>> = {
  population: { field: 'population', label: '人口' },
  market: { field: 'market', label: '商業' },
  production: { field: 'production', label: '生産' },
  supplies: { field: 'storedSupplies', label: '物資' },
  troops: { field: 'troops', label: '兵' },
  morale: { field: 'troopMorale', label: '練度' },
}

function cityRow(state: GameState, id: CityId): string[] {
  const city = state.cities[id]
  return [
    id, CITY_MAP[id]?.name ?? id, factionName(ownerOf(state, id)), `${city.population}`, `${city.market}`, `${city.production}`,
    `${city.storedSupplies}`, `${city.troops}`, `${city.troopMorale}`,
  ]
}

const valueAt = (state: GameState, keys: readonly string[]): unknown =>
  keys.filter(Boolean).reduce<unknown>((value, key) => (value as Record<string, unknown> | null | undefined)?.[key], state)

const isBranch = (value: unknown) => typeof value === 'object' && value !== null

/** The keys under the path typed so far, e.g. cities.P0 gives cities.P000. and on */
function statePaths({ store }: DebugContext, word: string): DebugCandidate[] {
  const keys = word.split('.').slice(0, -1)
  const parent = valueAt(store.getState(), keys)
  if (!isBranch(parent)) return []
  const prefix = keys.map((key) => `${key}.`).join('')
  return Object.entries(parent as object).map(([key, value]) => (
    isBranch(value) ? { value: `${prefix}${key}.`, partial: true } : { value: prefix + key }
  ))
}

export const DEBUG_COMMANDS: readonly Command[] = [
  {
    name: 'help', summary: 'コマンドの一覧、またはコマンドの使い方',
    args: [{ name: 'command', optional: true, open: true, candidates: () => DEBUG_COMMANDS.map((c) => ({ value: c.name, label: c.summary })) }],
    run: ([name]) => helpLines(DEBUG_COMMANDS, name),
  },
  { name: 'clear', summary: '画面を消す', run: (_, { clear }) => clear() },
  { name: 'exit', summary: 'コンソールを閉じる', run: (_, { close }) => close() },
  {
    name: 'status', summary: 'ターン・フェーズ・手番・シーン',
    run: (_, { store, navigator }) => {
      const state = store.getState()
      const { year, month } = dateOf(state.turn)
      const battle = state.march?.current
      return table([
        ['ターン', `${state.turn}（灰歴${year}年${month}月）`],
        ['フェーズ', state.phase],
        ['手番', state.activeFaction ? factionName(state.activeFaction) : 'なし'],
        ['プレイヤー', state.playerFactions.map((id) => factionName(id)).join('・')],
        ['シーン', navigator().current.id],
        ['戦闘', battle ? `${battle.id} ${cityLabel(battle.cityId)}` : 'なし'],
      ])
    },
  },
  {
    name: 'faction', summary: '勢力を見る',
    subcommands: [
      {
        name: 'list', summary: '勢力の一覧（* はプレイヤー）',
        run: (_, { store }) => {
          const state = store.getState()
          return table([
            ['', 'id', '勢力', '金', '都市', '騎士', '国力'],
            ...FACTION_LIST.map((f) => [
              isPlayerFaction(state, f.id) ? '*' : '', f.id, f.name, `${state.gold[f.id] ?? 0}`, `${citiesOf(state, f.id).length}`,
              `${knightsOf(state, f.id)}`, `${factionPower(state, f.id)}`,
            ]),
          ])
        },
      },
      {
        name: 'show', summary: '勢力の詳細', args: [viewedFactionArg],
        run: (args, { store }) => {
          const state = store.getState()
          const id = factionOf(args, 0, state)
          return table([
            ['勢力', `${factionName(id)} (${id})`],
            ['金', `${state.gold[id] ?? 0}`],
            ['都市', citiesOf(state, id).map((city) => CITY_MAP[city]?.name ?? city).join('・') || 'なし'],
            ['騎士', `${knightsOf(state, id)}`],
            ['研究', researchLabel(state, id)],
            ['研究済み', researchOf(state, id).researched.map(techLabel).join('・') || 'なし'],
            ['遺物', relicsLabel(state, id)],
          ])
        },
      },
    ],
  },
  {
    name: 'gold', summary: '勢力の金を変える',
    subcommands: [
      {
        name: 'add', summary: '金を足す', args: [{ name: 'amount', int: true }, viewedFactionArg],
        run: ([amount, ...rest], { store }) => {
          const id = factionOf(rest, 0, store.getState())
          store.update((s) => debugSetGold(s, id, (s.gold[id] ?? 0) + Number(amount)))
          return `${factionName(id)} の金: ${store.getState().gold[id]}`
        },
      },
      {
        name: 'set', summary: '金を決める', args: [{ name: 'amount', int: true }, viewedFactionArg],
        run: ([amount, ...rest], { store }) => {
          const id = factionOf(rest, 0, store.getState())
          store.update((s) => debugSetGold(s, id, Number(amount)))
          return `${factionName(id)} の金: ${store.getState().gold[id]}`
        },
      },
    ],
  },
  {
    name: 'research', summary: '研究を見る・進める',
    subcommands: [
      {
        name: 'list', summary: '勢力ごとの研究（* はプレイヤー）',
        run: (_, { store }) => {
          const state = store.getState()
          return table([
            ['', '勢力', '研究中', '毎ターン', '済', '宙に浮いた'],
            ...turnOrder(state).map((id) => {
              const [low, high] = researchOutput(state, id).total
              const research = researchOf(state, id)
              return [
                isPlayerFaction(state, id) ? '*' : '', factionName(id), researchLabel(state, id), `+${low === high ? low : `${low}〜${high}`}`,
                `${research.researched.length}`, `${research.carry}`,
              ]
            }),
          ])
        },
      },
      {
        name: 'add', summary: '研究ポイントを足す（研究先が無ければ宙に浮く）', args: [{ name: 'points', int: true }, viewedFactionArg],
        run: ([points, ...rest], { store }) => {
          const id = factionOf(rest, 0, store.getState())
          store.update((s) => debugAddResearchPoints(s, id, Number(points)))
          return `${factionName(id)}: ${researchLabel(store.getState(), id)}`
        },
      },
      {
        name: 'fill', summary: '研究中の技術に必要なポイントを全部入れる（次のターンの初めに完成）', args: [viewedFactionArg],
        run: (args, { store }) => {
          const id = factionOf(args, 0, store.getState())
          if (!researchOf(store.getState(), id).current) throw new DebugError(`${factionName(id)} は何も研究していません`)
          store.update((s) => debugFillResearch(s, id))
          return `${factionName(id)}: ${researchLabel(store.getState(), id)}`
        },
      },
      {
        name: 'complete', summary: '技術をその場で研究済みにする（前提の技術も）', args: [techArg, viewedFactionArg],
        run: ([techId, ...rest], { store }) => {
          const id = factionOf(rest, 0, store.getState())
          store.update((s) => debugCompleteTech(s, id, techId))
          return `${factionName(id)}: ${techLabel(techId)} を研究済みにした`
        },
      },
    ],
  },
  {
    name: 'relic', summary: '遺物を見る・足す',
    subcommands: [
      {
        name: 'list', summary: '勢力ごとのアイテムボックス',
        run: (_, { store }) => {
          const state = store.getState()
          return table(turnOrder(state).map((id) => [factionName(id), relicsLabel(state, id)]))
        },
      },
      {
        name: 'add', summary: '遺物を足す（既定は壊れた状態）',
        args: [relicArg, viewedFactionArg, { name: 'state', optional: true, candidates: words('broken', 'repaired') }],
        run: ([relicId, faction, condition], { store }) => {
          const id = faction ?? viewFaction(store.getState())
          const repaired = condition === 'repaired'
          store.update((s) => debugAddRelic(s, id, relicId, repaired))
          return `${factionName(id)}: ${relicName(relicId, repaired)} を足した`
        },
      },
    ],
  },
  {
    name: 'city', summary: '都市を見る・変える',
    subcommands: [
      {
        name: 'list', summary: '都市の一覧', args: [{ ...factionArg, optional: true }],
        run: ([faction], { store }) => {
          const state = store.getState()
          const ids = faction ? citiesOf(state, faction) : CITY_LIST.map((c) => c.id)
          return table([
            ['id', '都市', '勢力', '人口', '商業', '生産', '物資', '兵', '練度'],
            ...ids.map((id) => cityRow(state, id)),
          ])
        },
      },
      {
        name: 'show', summary: '都市の詳細', args: [cityArg],
        run: ([id], { store }) => {
          const state = store.getState()
          const city = state.cities[id]
          const governor = governorOf(state, id)
          return table([
            ['都市', `${cityLabel(id)} ${factionName(ownerOf(state, id))}`],
            ...Object.values(CITY_FIELDS).map(({ field, label }) => [label, `${city[field]}`]),
            ['施設', city.buildings.map((b) => BUILDING_MAP[b]?.name ?? b).join('・') || 'なし'],
            ['建設', constructionLabel(city.construction)],
            ['領主', governor ? knightNames([governor]) : 'なし'],
            ['騎士', knightNames(charactersIn(state, id))],
            ['捕虜', knightNames(prisonersIn(state, id))],
          ])
        },
      },
      {
        name: 'set', summary: '都市の数値を決める',
        args: [
          cityArg,
          { name: 'field', candidates: () => Object.entries(CITY_FIELDS).map(([value, { label }]) => ({ value, label })) },
          { name: 'value', int: true },
        ],
        run: ([id, name, value], { store }) => {
          const { field, label } = CITY_FIELDS[name]
          store.update((s) => debugSetCity(s, id, field, Number(value)))
          return `${cityLabel(id)} の${label}: ${store.getState().cities[id][field]}`
        },
      },
    ],
  },
  {
    name: 'knight', summary: '騎士を見る',
    subcommands: [
      {
        name: 'show', summary: '騎士の詳細', args: [knightArg],
        run: ([id], { store }) => {
          const state = store.getState()
          const knight = CHARACTER_MAP[id]
          const { cityId, factionId, prisoner, roaming, grudge } = state.characters[id] ?? { cityId: null, factionId: null }
          return table([
            ['騎士', `${knight.name} (${id}) ${CHARACTER_TYPE_LABELS[knight.type]}`],
            ['勢力', factionId ? factionName(factionId) : prisoner ? '勢力なし' : isMercenary(id) ? '雇われていない' : '放浪'],
            ['都市', cityLabel(cityId)],
            ['居所', cityLabel(roaming ?? null)],
            ['怨恨勢力', grudge ? factionName(grudge) : 'なし'],
            ['状態', prisoner ? '捕虜' : awayReason(state, id) ?? '待機'],
            ['能力', `政治${knight.politics} 知力${knight.intelligence} 統率${knight.leadership} 武力${knight.strength} 魅力${knight.charm}`],
          ])
        },
      },
    ],
  },
  {
    name: 'mercenary', summary: '傭兵を見る・変える',
    subcommands: [
      {
        name: 'list', summary: '全傭兵の状態・居所または雇い主・兵数',
        run: (_, { store }) => {
          const state = store.getState()
          return table([
            ['id', '傭兵団', '騎士', '状態', '居所', '兵数'],
            ...Object.keys(state.mercenaries).sort().map((id) => mercenaryRow(state, id)),
          ])
        },
      },
      {
        name: 'soldiers', summary: '傭兵の兵数を決める', args: [mercenaryArg, { name: 'soldiers', int: true }],
        run: ([id, soldiers], { store }) => {
          store.update((s) => debugSetMercenarySoldiers(s, id, Number(soldiers)))
          return `${CHARACTER_MAP[id].mercenaryInfo!.name} の兵数: ${store.getState().mercenaries[id].soldiers}`
        },
      },
      {
        name: 'standing', summary: '傭兵業界の友好度を見る・決める', args: [{ name: 'value', int: true, optional: true }, viewedFactionArg],
        run: ([value, ...rest], { store }) => {
          const id = factionOf(rest, 0, store.getState())
          if (value !== undefined) store.update((s) => debugSetStanding(s, id, Number(value)))
          return `${factionName(id)} の友好度: ${store.getState().mercenaryStanding[id] ?? 0}`
        },
      },
    ],
  },
  {
    name: 'wanderer', summary: '放浪の騎士を見る',
    subcommands: [
      {
        name: 'list', summary: '放浪の騎士の居所と怨恨勢力',
        run: (_, { store }) => {
          const state = store.getState()
          const ids = Object.keys(state.characters).sort().filter((id) => state.characters[id].roaming && !isMercenary(id))
          if (ids.length === 0) return '放浪の騎士はいません'
          return table([
            ['id', '騎士', '居所', '怨恨勢力'],
            ...ids.map((id) => [id, CHARACTER_MAP[id]?.name ?? id, roamingLabel(state, id), state.characters[id].grudge ? factionName(state.characters[id].grudge) : 'なし']),
          ])
        },
      },
    ],
  },
  {
    name: 'turn', summary: '手番を進める',
    subcommands: [
      {
        name: 'end', summary: '手番の勢力の戦略フェーズを終える',
        run: (_, { store }) => {
          store.update((s) => endFactionTurn(s))
          const { activeFaction, phase } = store.getState()
          return activeFaction ? `手番: ${factionName(activeFaction)}` : `フェーズ: ${phase}`
        },
      },
    ],
  },
  {
    name: 'battle', summary: '戦闘を決着させる',
    subcommands: [
      {
        name: 'win', summary: '勝った側を決めて結果へ（退却・殲滅は無かったものとする）',
        args: [{ name: 'side', candidates: words('attacker', 'defender') }],
        run: ([side], { store, navigator }) => {
          const battleId = store.getState().march?.current?.id
          if (!battleId) throw new DebugError('進行中の戦闘はありません')
          store.update((s) => resolveBattle(s, battleId, side as BattleWinner))
          navigator().goTo('battleResult', { battleId })
        },
      },
    ],
  },
  {
    name: 'scene', summary: 'シーンを移る', args: [{ name: 'scene', candidates: words('title', 'strategy') }],
    run: ([scene], { navigator }) => navigator().goTo(scene as 'title' | 'strategy'),
  },
  {
    name: 'state', summary: 'ゲームの状態を JSON で見る（例: state cities.P012.assignments）',
    args: [{ name: 'path', optional: true, open: true, candidates: statePaths }],
    run: ([path = ''], { store }) => {
      const value = valueAt(store.getState(), path.split('.'))
      if (value === undefined) throw new DebugError(`${path} はありません`)
      return JSON.stringify(value, null, 2).split('\n')
    },
  },
]
