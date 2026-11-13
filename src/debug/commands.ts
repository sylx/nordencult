import { BUILDING_MAP } from '../data/buildings'
import { CHARACTER_LIST, CHARACTER_MAP, CHARACTER_TYPE_LABELS, isSpecialCharacterId } from '../data/character'
import { CITY_LIST, CITY_MAP } from '../data/city'
import { FACTION_LIST, factionName } from '../data/faction'
import { RELIC_LIST, relicName } from '../data/relics'
import { TECH_LIST, TECH_MAP } from '../data/techs'
import { UNIT_TYPE_MAP } from '../data/unitTypes'
import { SCENES, isDialogueId, type DialogueId } from '../dialogue'
import {
  awayReason, charactersIn, clearFlag, citiesOf, dateOf, debugAddRelic, debugEquipRelic, debugImprison, debugUnequipRelic, equipmentOf, BALANCE, debugAddResearchPoints, debugCompleteTech, debugFillConstruction, debugFillResearch, debugSetCity, debugSetGold,
  debugSetMercenarySoldiers, debugSetStanding, endFactionTurn, setFlag, factionPower, governorOf, isMercenary, isPlayerFaction, isRecovering, mercenaryAt, movementOf, ownerOf, prisonerMovementOf, prisonersIn, relicsOf, researchOf, researchOutput, resolveBattle, turnOrder, unitTypesOf, viewFaction,
  type BattleWinner, type CityConstruction, type CityId, type DebugCityField, type FactionId, type GameState, type GameStore, type RelicItem,
} from '../game'
import { playDialogue } from '../scenes/playDialogue'
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
// The special characters (991..999, templates of summoned units) are never in the game
const knightArg: Arg = {
  name: 'knight', candidates: () => CHARACTER_LIST.flatMap((c) => (isSpecialCharacterId(c.id) ? [] : [{ value: c.id, label: c.name }])),
}
const relicArg: Arg = { name: 'relic', candidates: () => RELIC_LIST.map((r) => ({ value: r.id, label: r.brokenName ?? r.name })) }
/** A relic of a faction's box (RelicItem.id), any faction's */
const relicItemArg: Arg = {
  name: 'item',
  candidates: ({ store }) => Object.entries(store.getState().relics).flatMap(([factionId, items]) =>
    items.map((item) => ({ value: item.id, label: `${relicName(item.relicId, item.repaired)}（${factionName(factionId)}）` }))),
}
const slotArg: Arg = { name: 'slot', optional: true, int: true, candidates: () => Array.from({ length: BALANCE.EQUIPMENT_SLOTS }, (_, slot) => ({ value: `${slot}` })) }
const mercenaryArg: Arg = {
  name: 'mercenary', candidates: () => CHARACTER_LIST.flatMap((c) => (c.mercenaryInfo ? [{ value: c.id, label: `${c.mercenaryInfo.name} ${c.name}` }] : [])),
}
const techArg: Arg = { name: 'tech', candidates: () => TECH_LIST.map((t) => ({ value: t.id, label: t.name })) }

const words = (...values: readonly string[]) => (): DebugCandidate[] => values.map((value) => ({ value }))

const dialogueArg: Arg = { name: 'scene', candidates: () => Object.entries(SCENES).map(([value, scene]) => ({ value, label: scene.script.title })) }

/** The input names of the dialogue scenes (any of them), and what each takes once typed: `merc=` then a knight */
function dialogueInputs(context: DebugContext, word: string): DebugCandidate[] {
  const inputs = new Map(Object.values(SCENES).flatMap((scene) => Object.entries(scene.input)))
  const eq = word.indexOf('=')
  if (eq < 0) return [...inputs].map(([name, type]) => ({ value: `${name}=`, label: type, partial: true }))
  const name = word.slice(0, eq)
  const values = inputs.get(name) === 'character' ? knightArg : inputs.get(name) === 'city' ? cityArg : undefined
  return (values?.candidates?.(context, word) ?? []).map((c) => ({ ...c, value: `${name}=${c.value}` }))
}

/** A scene's input: its sample in the state now, with the `name=value` given over it */
function dialogueInput(id: DialogueId, pairs: readonly string[], state: GameState): Record<string, string | number> {
  const scene = SCENES[id]
  const input: Record<string, string | number> = { ...scene.sample?.(state) }
  for (const pair of pairs) {
    const [name, value] = pair.split(/=(.*)/s)
    const type = (scene.input as Record<string, string>)[name]
    if (!type || value === undefined) throw new DebugError(`${id} の入力は ${Object.keys(scene.input).map((n) => `${n}=…`).join(' ')} です: ${pair}`)
    input[name] = type === 'number' ? Number(value) : value
  }
  const missing = Object.keys(scene.input).filter((name) => input[name] === undefined)
  if (missing.length > 0) throw new DebugError(`入力が足りません（この状態では決められません）: ${missing.join('・')}`)
  return input
}

const inputLabel = (input: object | null | undefined) => (input ? Object.entries(input).map(([k, v]) => `${k}=${v}`).join(' ') : 'なし')

/** A flag's value as typed: true, false or a number */
function flagValue(word: string): boolean | number {
  if (word === 'true' || word === 'false') return word === 'true'
  const value = Number(word)
  if (word === '' || !Number.isFinite(value)) throw new DebugError(`フラグの値は true・false か数にしてください: ${word}`)
  return value
}

const factionOf = (args: readonly string[], index: number, state: GameState): FactionId => args[index] ?? viewFaction(state)

const cityLabel = (id: CityId | null) => (id ? `${CITY_MAP[id]?.name ?? id} (${id})` : 'なし')
const techLabel = (id: string | null) => (id ? TECH_MAP[id]?.name ?? id : 'なし')
const knightNames = (ids: readonly string[]) => ids.map((id) => CHARACTER_MAP[id]?.name ?? id).join('・') || 'なし'
/** What a relic of the box is doing: 法王府に依頼中, worn by a knight, used building in a city */
const relicStatus = (item: RelicItem) =>
  item.papalRepair ? '依頼中'
    : item.equippedBy ? `装備: ${CHARACTER_MAP[item.equippedBy.characterId]?.name ?? item.equippedBy.characterId}`
    : item.buildingIn ? `建設中: ${CITY_MAP[item.buildingIn]?.name ?? item.buildingIn}`
    : ''
const relicsLabel = (state: GameState, factionId: FactionId) =>
  relicsOf(state, factionId).map((item) => `${relicName(item.relicId, item.repaired)}${relicStatus(item) && `（${relicStatus(item)}）`}`).join('・') || 'なし'
/** A knight's slots: the relic in each, or 空き */
const equipmentLabel = (state: GameState, id: string) =>
  equipmentOf(state, id).map((item) => (item ? `${relicName(item.relicId, true)} (${item.id})` : '空き')).join(' / ')
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
  const name = work.kind === 'building'
    ? `${BUILDING_MAP[work.buildingId]?.name ?? work.buildingId}${work.relicItemId ? `（遺物 ${work.relicItemId}）` : ''}`
    : relicName(work.relicId, work.kind === 'relicProduction')
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
        name: 'list', summary: '勢力ごとのアイテムボックス（勢力を付けると遺物ごとの ID と状態）', args: [{ ...factionArg, optional: true }],
        run: ([faction], { store }) => {
          const state = store.getState()
          if (!faction) return table(turnOrder(state).map((id) => [factionName(id), relicsLabel(state, id)]))
          const items = relicsOf(state, faction)
          if (items.length === 0) return `${factionName(faction)} の遺物はありません`
          return table([
            ['id', '遺物', '修復', '状態'],
            ...items.map((item) => [item.id, relicName(item.relicId, item.repaired), item.repaired ? '済' : '', relicStatus(item)]),
          ])
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
      {
        name: 'equip', summary: '騎士に遺物を装備させる（手番・予約の条件なし。枠の既定は空いた枠）', args: [knightArg, relicItemArg, slotArg],
        run: ([id, itemId, slot], { store }) => {
          store.update((s) => debugEquipRelic(s, id, itemId, slot === undefined ? undefined : Number(slot)))
          return `${CHARACTER_MAP[id].name} の装備: ${equipmentLabel(store.getState(), id)}`
        },
      },
      {
        name: 'unequip', summary: '騎士の遺物を外す（手番・予約の条件なし。枠の既定は 0）', args: [knightArg, slotArg],
        run: ([id, slot], { store }) => {
          store.update((s) => debugUnequipRelic(s, id, Number(slot ?? 0)))
          return `${CHARACTER_MAP[id].name} の装備: ${equipmentLabel(store.getState(), id)}`
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
      {
        name: 'fill', summary: '建設・修復・生産に必要な物資を全部入れる（中断も解く。次のターンの初めに完成）', args: [cityArg],
        run: ([id], { store }) => {
          if (!store.getState().cities[id]?.construction) throw new DebugError(`${cityLabel(id)} は何も建設していません`)
          store.update((s) => debugFillConstruction(s, id))
          return `${cityLabel(id)} の建設: ${constructionLabel(store.getState().cities[id].construction)}`
        },
      },
    ],
  },
  {
    name: 'knight', summary: '騎士を見る・捕虜にする',
    subcommands: [
      {
        name: 'list', summary: '勢力に仕える騎士の都市・率いる兵種・装備', args: [viewedFactionArg],
        run: (args, { store }) => {
          const state = store.getState()
          const factionId = factionOf(args, 0, state)
          const ids = Object.keys(state.characters).sort().filter((id) => state.characters[id].factionId === factionId && !state.characters[id].prisoner)
          if (ids.length === 0) return `${factionName(factionId)} に仕える騎士はいません`
          return table([
            ['id', '騎士', '種別', '都市', '兵種', '装備'],
            ...ids.map((id) => [
              id, CHARACTER_MAP[id]?.name ?? id, CHARACTER_TYPE_LABELS[CHARACTER_MAP[id]?.type ?? 'knight'], cityLabel(state.characters[id].cityId),
              unitTypesOf(state, id).map((type) => UNIT_TYPE_MAP[type]?.name ?? type).join('・'), isMercenary(id) ? '' : equipmentLabel(state, id),
            ]),
          ])
        },
      },
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
            ['兵種', unitTypesOf(state, id).map((type) => UNIT_TYPE_MAP[type]?.name ?? type).join('・')],
            ['装備', isMercenary(id) ? '（傭兵は装備できない）' : equipmentLabel(state, id)],
          ])
        },
      },
      {
        name: 'imprison', summary: '騎士を都市の捕虜にする（元の勢力のまま。傭兵と移動中の騎士はできない）', args: [knightArg, cityArg],
        run: ([id, cityId], { store }) => {
          const state = store.getState()
          const name = CHARACTER_MAP[id].name
          if (isMercenary(id)) throw new DebugError(`${name} は傭兵です（傭兵は捕虜になりません）`)
          if (movementOf(state, id) || prisonerMovementOf(state, id)) throw new DebugError(`${name} は移動中です`)
          const owner = ownerOf(state, cityId)
          if (!owner) throw new DebugError(`${cityLabel(cityId)} はどの勢力の都市でもありません`)
          const factionId = state.characters[id]?.factionId ?? null
          if (factionId === owner) throw new DebugError(`${cityLabel(cityId)} は ${name} の勢力の都市です`)
          store.update((s) => debugImprison(s, id, cityId))
          return `${name} を ${cityLabel(cityId)}（${factionName(owner)}）の捕虜にした`
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
    name: 'dialogue', summary: '会話シーンを見る・再生する',
    subcommands: [
      {
        name: 'list', summary: '会話シーンの一覧（入力と、この状態での既定の入力）',
        run: (_, { store }) => table([
          ['id', '題', '入力', '既定の入力'],
          ...Object.entries(SCENES).map(([id, scene]) => [
            id, scene.script.title, Object.entries(scene.input).map(([name, type]) => `${name}:${type}`).join(' '),
            inputLabel(scene.sample?.(store.getState())),
          ]),
        ]),
      },
      {
        name: 'play', summary: '会話シーンを再生する（省いた入力は既定の値。終わると状態に反映）',
        args: [dialogueArg, { name: '入力=値', optional: true, open: true, rest: true, candidates: dialogueInputs }],
        run: ([id, ...pairs], { store, close }) => {
          if (!isDialogueId(id)) throw new DebugError(`${id} という会話シーンはありません`)
          const input = dialogueInput(id, pairs, store.getState())
          close()
          playDialogue(id, input as never).catch((error: unknown) => console.error(error))
          return `${id} を再生します（${inputLabel(input)}）`
        },
      },
    ],
  },
  {
    name: 'flag', summary: '会話シーンのフラグを見る・変える',
    subcommands: [
      {
        name: 'list', summary: 'フラグの一覧',
        run: (_, { store }) => {
          const { flags } = store.getState()
          const keys = Object.keys(flags).sort()
          return keys.length === 0 ? 'フラグはありません' : table(keys.map((key) => [key, `${flags[key]}`]))
        },
      },
      {
        name: 'set', summary: 'フラグを決める（<シーン id>:<名前> true|false|数）',
        args: [
          { name: 'key', open: true, candidates: ({ store }) => Object.keys(store.getState().flags).sort().map((value) => ({ value })) },
          { name: 'value', candidates: words('true', 'false'), open: true },
        ],
        run: ([key, value], { store }) => {
          store.update((s) => setFlag(s, key, flagValue(value)))
          return `${key}: ${store.getState().flags[key]}`
        },
      },
      {
        name: 'clear', summary: 'フラグを消す（立てる前に戻す）',
        args: [{ name: 'key', candidates: ({ store }) => Object.keys(store.getState().flags).sort().map((value) => ({ value })) }],
        run: ([key], { store }) => {
          store.update((s) => clearFlag(s, key))
          return `${key} を消した`
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
