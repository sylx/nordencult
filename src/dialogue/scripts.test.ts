import { describe, expect, it } from 'vitest'
import { ScriptedPlayer, formatScript, validateScript } from 'norden-dialogue'
import { CHARACTER_LIST } from '../data/character'
import { contractPrice, debugSetGold, debugSetStanding, flagOf, hireProblem, type GameState } from '../game'
import { playing } from '../game/testing'
import { DIALOGUE_CATALOG } from './catalog'
import hireScript from './hireMercenary.json'
import { DIALOGUE_PROVIDERS, SCENES, runDialogue, type DialogueId, type DialogueInput } from './index'

/** Every script as written (src/dialogue/<id>.json) */
const TEXTS = Object.fromEntries(Object.entries(import.meta.glob<string>('./*.json', { eager: true, query: '?raw', import: 'default' }))
  .map(([path, text]) => [path.replace(/^\.\/|\.json$/g, ''), text]))

/** Every script (src/dialogue/<id>.json) */
const SCRIPTS = Object.fromEntries(Object.entries(import.meta.glob<object>('./*.json', { eager: true, import: 'default' }))
  .map(([path, script]) => [path.replace(/^\.\/|\.json$/g, ''), script]))

const run = <K extends DialogueId>(id: K, input: DialogueInput<K>, state: GameState, picks: string[] = [], random = () => 0) => {
  const player = new ScriptedPlayer(DIALOGUE_PROVIDERS, picks)
  return { player, done: runDialogue(id, input, { state, player, random }) }
}

describe('the dialogue scripts', () => {
  it('each have a flow, and each flow its script', () => {
    expect(Object.keys(SCRIPTS).sort()).toEqual(Object.keys(SCENES).sort())
    for (const [id, scene] of Object.entries(SCENES)) expect(scene.script).toBe(SCRIPTS[id])
  })

  for (const [id, script] of Object.entries(SCRIPTS)) {
    it(`${id}: names characters, songs, sound effects and 口調 there are, and variables declared`, () => {
      const problems = validateScript(script, DIALOGUE_CATALOG)
      expect(problems.filter((p) => p.level === 'error').map((p) => `${p.path}: ${p.message}`)).toEqual([])
      // Backgrounds without a picture yet are drawn as gradients
      for (const p of problems.filter((p) => p.level === 'warning')) console.warn(`${id} ${p.path}: ${p.message}`)
    })

    it(`${id}: is written as the editor writes it (a command a line, a line a 口調)`, () => {
      expect(TEXTS[id]).toBe(formatScript(script))
    })
  }

  it('hireMercenary writes the lines of every 口調 the mercenaries have', () => {
    const tones = new Set(CHARACTER_LIST.flatMap((c) => (c.mercenaryInfo && c.voiceTone ? [c.voiceTone] : [])))
    expect(tones.size).toBe(6)
    const says = Object.values(hireScript.blocks).flat().filter((c) => 'tones' in c)
    expect(says.length).toBeGreaterThan(0)
    for (const say of says) expect(Object.keys(say.tones ?? {}).sort()).toEqual([...tones].sort())
  })
})

describe('hireMercenary', () => {
  const FLUEN = 'P012'
  const BARREL = '042' // ドゥンダリン盾隊 (2000 gold), 老練
  const LANDSKNECHT = '110' // ランツクネヒト, プライド 5
  const rich = () => debugSetGold(playing('carta'), 'carta', 5000)

  it('hires the mercenary on 契約する, in the mercenary’s 口調', async () => {
    const { player, done } = run('hireMercenary', { city: FLUEN, merc: BARREL }, rich(), ['yes'])
    const state = await done
    expect(state.characters[BARREL]).toEqual({ cityId: FLUEN, factionId: 'carta' })
    expect(state.gold.carta).toBe(5000 - contractPrice(rich(), 'carta', BARREL).fee)
    expect(player.texts).toContain('ワシがドゥンダリン盾隊のブロック・ドゥンダリンじゃ。')
    expect(player.offered[0][0]).toEqual({ key: 'yes', text: '契約する（2,000金貨）' })
    expect(player.steps).toContainEqual({ kind: 'se', name: 'coins' })
  })

  it('changes nothing on やめておく', async () => {
    const start = rich()
    const { done } = run('hireMercenary', { city: FLUEN, merc: BARREL }, start, ['no'])
    expect(await done).toBe(start)
  })

  it('is turned away by those who will not sign, before any price', async () => {
    const start = rich()
    const reach = { ...start, characters: { ...start.characters, [LANDSKNECHT]: { ...start.characters[LANDSKNECHT], roaming: FLUEN } } }
    const { player, done } = run('hireMercenary', { city: FLUEN, merc: LANDSKNECHT }, reach)
    expect(await done).toBe(reach)
    expect(player.offered).toEqual([])
    // His own lines, over those of his 口調 (荒くれ)
    expect(player.texts).toContain('ハッハァ！ 俺がランツクネヒトの隊長、カスパル・フロイントだ！')
    expect(player.texts).toContain('……ああ、てめぇらの噂は聞いてるぜ。')
    expect(player.texts).not.toContain('……ああ、てめぇらか。売る腕はねぇよ。とっとと失せな！')
    expect(player.texts.join('')).not.toContain('金貨')
    // At the standing they ask, they name their price
    const liked = run('hireMercenary', { city: FLUEN, merc: LANDSKNECHT }, debugSetStanding(reach, 'carta', 60), ['no'])
    await liked.done
    expect(liked.player.offered).toHaveLength(1)
  })

  it('cannot sign short of gold, and says why', async () => {
    const poor = debugSetGold(playing('carta'), 'carta', 0)
    expect(hireProblem(poor, FLUEN, BARREL)).toBe('金が足りません')
    const { player, done } = run('hireMercenary', { city: FLUEN, merc: BARREL }, poor, ['no'])
    await done
    expect(player.offered[0][0]).toMatchObject({ key: 'yes', disabled: '金が足りません' })
  })
})

describe('travelingMerchant', () => {
  const city = (state: GameState) => SCENES.travelingMerchant.sample!(state)!.city

  it('sells supplies, remembers the visit and greets differently the next time', async () => {
    const start = playing('carta')
    const first = run('travelingMerchant', { city: city(start) }, start, ['buy'])
    const bought = await first.done
    expect(bought.gold.carta).toBe(start.gold.carta - 200)
    expect(bought.cities[city(start)].storedSupplies).toBe(start.cities[city(start)].storedSupplies + 200)
    expect(flagOf(bought, 'travelingMerchant:met')).toBe(1)

    const second = run('travelingMerchant', { city: city(start) }, bought, ['decline'])
    const declined = await second.done
    expect(second.player.texts).toContain('おや、またお会いしましたな。これで2度目ですか。')
    expect(declined.gold.carta).toBe(bought.gold.carta)
    expect(flagOf(declined, 'travelingMerchant:met')).toBe(2)
  })

  it('takes a haggle or leaves offended, by chance', async () => {
    const start = playing('carta')
    // The first roll sets the supplies (200), the second the haggle
    const rolls = (...values: number[]) => () => values.shift() ?? 0
    const haggled = await run('travelingMerchant', { city: city(start) }, start, ['haggle'], rolls(0, 0.1)).done
    expect(haggled.gold.carta).toBe(start.gold.carta - 140)
    const offended = run('travelingMerchant', { city: city(start) }, start, ['haggle'], rolls(0, 0.9))
    const left = await offended.done
    expect(left.gold.carta).toBe(start.gold.carta)
    expect(flagOf(left, 'travelingMerchant:offended')).toBe(true)
    const again = run('travelingMerchant', { city: city(start) }, left, ['decline'])
    await again.done
    expect(again.player.texts).toContain('……前のように値切るのは、ご勘弁願いますよ。')
  })
})
