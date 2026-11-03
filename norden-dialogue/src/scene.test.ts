import { describe, expect, it, vi } from 'vitest'
import { DialogueAborted, DialoguePlayer, type DialogueProviders } from './player'
import { defineScene, playBlock, runScene, type InputSpec, type SceneRun } from './scene'
import type { ScriptShape } from './script'
import { ScriptedPlayer } from './testing'

const CHARACTERS: Record<string, { name: string; tone?: string }> = {
  '001': { name: 'ディルク', tone: 'wild' },
  '002': { name: 'グレイ' },
  '003': { name: 'ヴェスナ', tone: 'quiet' },
}

const providers = (): DialogueProviders => ({
  character: (id) => CHARACTERS[id] && { ...CHARACTERS[id], sheetUrl: '', sheet: { width: 1, height: 1 }, cell: { x: 0, y: 0, width: 1, height: 1 }, face: { x: 0, y: 0, width: 1, height: 1 } },
  city: (id) => (id === 'P001' ? { name: 'カルタ' } : undefined),
  background: () => undefined,
  playBgm: vi.fn(),
  playSe: vi.fn(),
})

class FakePlayer extends ScriptedPlayer {
  constructor(picks: string[] = []) {
    super(providers(), picks)
  }
}

const script = {
  title: '雇う',
  params: { merc: 'character', price: 'number' },
  blocks: {
    greet: [
      { show: '$merc', at: 'right' },
      { say: '$merc', text: '{merc.name}だ。', tones: { wild: ['{merc.name}様だ。', 'てめぇ、金はあるんだろうな？'], quiet: [] } },
      { say: '$merc', text: '{price}金貨だ。' },
    ],
    accept: [{ se: 'coins' }, { name: '店主', text: '毎度あり。' }],
    decline: [{ narrate: '{merc.name}は去った。' }],
  },
  choices: { hire: { options: { yes: '契約する（{price}金貨）', no: 'やめておく' } } },
} as const

interface State { gold: number; hired: string[] }

class RuleError extends Error {}

/** この状態のシーン（ゲームでも状態の型を決めて包む） */
const define = <S extends ScriptShape, I extends InputSpec>(s: S, input: I, run: SceneRun<S, State, I>) => defineScene(s, input, run)

const hire = (state: State, merc: string, price: number): State => {
  if (state.gold < price) throw new RuleError('金が足りません')
  return { gold: state.gold - price, hired: [...state.hired, merc] }
}

const scene = define(script, { merc: 'character', price: 'number' }, async (ctx, { merc, price }) => {
  ctx.bind({ merc, price })
  await ctx.play('greet')
  const pick = await ctx.choose('hire', { disabled: { yes: ctx.state.gold < price ? '金が足りません' : null } })
  if (pick === 'yes') {
    ctx.update((s) => hire(s, merc, price))
    await ctx.play('accept')
  } else {
    await ctx.play('decline')
  }
})

const start: State = { gold: 1500, hired: [] }

describe('runScene', () => {
  it('branches on the choice and returns the state the flow made', async () => {
    const player = new FakePlayer(['yes'])
    const state = await runScene(scene, { merc: '002', price: 1000 }, { state: start, player })
    expect(state).toEqual({ gold: 500, hired: ['002'] })
    expect(player.texts).toEqual(['グレイだ。', '1,000金貨だ。', '毎度あり。'])
    expect(player.offered[0]).toEqual([{ key: 'yes', text: '契約する（1,000金貨）' }, { key: 'no', text: 'やめておく' }])
    expect(player.steps).toContainEqual({ kind: 'se', name: 'coins' })
    expect(player.steps).toContainEqual({ kind: 'message', name: '店主', pages: ['毎度あり。'] })

    const declined = new FakePlayer(['no'])
    expect(await runScene(scene, { merc: '002', price: 1000 }, { state: start, player: declined })).toBe(start)
    expect(declined.steps.at(-1)).toEqual({ kind: 'message', narrate: true, pages: ['グレイは去った。'] })
  })

  it('passes the reasons an option cannot be chosen', async () => {
    const player = new FakePlayer(['no'])
    await runScene(scene, { merc: '002', price: 2000 }, { state: start, player })
    expect(player.offered[0][0]).toEqual({ key: 'yes', text: '契約する（2,000金貨）', disabled: '金が足りません' })
  })

  it('throws what the flow throws, and returns no state', async () => {
    const broken = define(script, { merc: 'character' }, async (ctx, { merc }) => {
      ctx.update((s) => hire(s, merc, 9999))
    })
    await expect(runScene(broken, { merc: '002' }, { state: start, player: new FakePlayer() })).rejects.toThrow(RuleError)
  })

  it('checks the input and the variables bound', async () => {
    await expect(runScene(scene, { merc: '999', price: 1 }, { state: start, player: new FakePlayer() })).rejects.toThrow('存在しない騎士 ID')
    const wrong = define(script, {}, async (ctx) => {
      ctx.bind({ price: 'たくさん' })
    })
    await expect(runScene(wrong, {}, { state: start, player: new FakePlayer() })).rejects.toThrow('price は数にしてください')
  })

  it('replays the picks given, skipping until they run out', async () => {
    const player = new FakePlayer()
    const picks: string[] = []
    const state = await runScene(scene, { merc: '002', price: 1000 }, {
      state: start, player, replay: ['yes'], onChoose: (_, key) => picks.push(key),
    })
    expect(state.gold).toBe(500)
    expect(player.offered).toEqual([])
    expect(picks).toEqual(['yes'])
    expect(player.skipping).toEqual([true, false, false])
  })

  it('cannot replay an option that cannot be chosen', async () => {
    await expect(runScene(scene, { merc: '002', price: 2000 }, { state: start, player: new FakePlayer(), replay: ['yes'] })).rejects.toThrow('流し直せません')
  })
})

describe('dim', () => {
  it('dims the backgrounds by the amount, over the time given (400ms when not), at once while skipping', async () => {
    const dims = { title: 'x', blocks: { a: [{ dim: 0.5 }, { dim: 0, ms: 0 }] } }
    const scripted = new FakePlayer()
    await playBlock(dims, 'a', {}, { player: scripted })
    expect(scripted.steps).toEqual([{ kind: 'dim', amount: 0.5, ms: 400 }, { kind: 'dim', amount: 0, ms: 0 }])

    const player = new DialoguePlayer(providers())
    player.begin()
    player.setSkipping(true)
    await player.perform({ kind: 'dim', amount: 0.5, ms: 400 })
    expect(player.getSnapshot().dim).toEqual({ amount: 0.5, ms: 0 })
  })
})

describe('panels', () => {
  const shown = { title: 'x', params: { merc: 'character' }, blocks: { offer: [{ panel: 'mercenary' }, { say: '$merc', text: 'よし' }, { panel: null, at: 'right' }] } }

  it('hands the panel the variables and the state of the scene when it is shown, and hides it', async () => {
    const player = new FakePlayer()
    const scene = define(shown, { merc: 'character' }, async (ctx, { merc }) => {
      ctx.update((s) => ({ ...s, gold: 7 }))
      ctx.bind({ merc })
      await ctx.play('offer')
    })
    await runScene(scene, { merc: '001' }, { state: start, player })
    expect(player.steps[0]).toEqual({ kind: 'panel', name: 'mercenary', at: 'left', vars: { merc: '001' }, state: { gold: 7, hired: [] } })
    expect(player.steps.at(-1)).toMatchObject({ kind: 'panel', name: null })
  })

  it('shows and hides it on the player', async () => {
    const player = new DialoguePlayer(providers())
    player.begin()
    await player.perform({ kind: 'panel', name: 'mercenary', at: 'left', vars: { merc: '001' } })
    expect(player.getSnapshot().panel).toMatchObject({ name: 'mercenary', at: 'left', vars: { merc: '001' } })
    await player.perform({ kind: 'panel', name: null, at: 'left', vars: {} })
    expect(player.getSnapshot().panel).toBeNull()
  })

  it('has no state in a block played alone', async () => {
    const player = new FakePlayer()
    await playBlock(shown, 'offer', { merc: '001' }, { player })
    expect(player.steps[0]).toEqual({ kind: 'panel', name: 'mercenary', at: 'left', vars: { merc: '001' }, state: undefined })
  })
})

describe('tones', () => {
  it('says the lines of the speaker’s tone, else the text', async () => {
    const said = async (merc: string, tones?: Record<string, string>) => {
      const player = new FakePlayer(['no'])
      await runScene(scene, { merc, price: 10 }, { state: start, player, tones })
      return player.texts.slice(0, -1)
    }
    expect(await said('001')).toEqual(['ディルク様だ。', 'てめぇ、金はあるんだろうな？', '10金貨だ。'])
    // No tone: the text
    expect(await said('002')).toEqual(['グレイだ。', '10金貨だ。'])
    // [] says nothing in that tone
    expect(await said('003')).toEqual(['10金貨だ。'])
    // A tone chosen in the editor, over the character's; one the line has no lines for falls back to the text
    expect(await said('002', { merc: 'wild' })).toEqual(['グレイ様だ。', 'てめぇ、金はあるんだろうな？', '10金貨だ。'])
    expect(await said('001', { merc: 'polite' })).toEqual(['ディルクだ。', '10金貨だ。'])
  })

  it('says the lines written for the speaker themselves, over those of their tone', async () => {
    const own = { title: 'x', params: { merc: 'character' }, blocks: { greet: [{ say: '$merc', text: '共通', tones: { wild: '口調' }, characters: { '001': ['本人', 'だ'] } }] } }
    const said = async (merc: string, tones?: Record<string, string>) => {
      const player = new FakePlayer()
      await playBlock(own, 'greet', { merc }, { player, tones })
      return player.texts
    }
    expect(await said('001')).toEqual(['本人', 'だ'])
    expect(await said('003', { merc: 'wild' })).toEqual(['口調'])
    expect(await said('002')).toEqual(['共通'])
    // A tone chosen in the editor does not change the lines of the character
    expect(await said('001', { merc: 'quiet' })).toEqual(['本人', 'だ'])
  })

  it('tells the flow the tone of a character variable', async () => {
    const tones: (string | undefined)[] = []
    const probe = define(script, { merc: 'character' }, async (ctx, { merc }) => {
      ctx.bind({ merc })
      tones.push(ctx.toneOf('merc'))
    })
    await runScene(probe, { merc: '001' }, { state: start, player: new FakePlayer() })
    await runScene(probe, { merc: '002' }, { state: start, player: new FakePlayer() })
    await runScene(probe, { merc: '002' }, { state: start, player: new FakePlayer(), tones: { merc: 'quiet' } })
    expect(tones).toEqual(['wild', undefined, 'quiet'])
  })
})

describe('playBlock', () => {
  it('plays one block with the variables given', async () => {
    const player = new FakePlayer()
    await playBlock(script, 'greet', { merc: '001', price: 5 }, { player })
    expect(player.steps[0]).toEqual({ kind: 'show', id: '001', at: 'right', fx: 'fade' })
    expect(player.texts).toEqual(['ディルク様だ。', 'てめぇ、金はあるんだろうな？', '5金貨だ。'])
  })
})

const flush = () => new Promise((resolve) => setTimeout(resolve))

describe('DialoguePlayer', () => {
  it('shows a page at a time: a click shows it all, the next goes on', async () => {
    const player = new DialoguePlayer(providers())
    player.begin()
    let done = false
    const said = player.perform({ kind: 'message', speaker: '001', name: 'ディルク', pages: ['一', '二'] }).then(() => { done = true })
    expect(player.getSnapshot().message).toMatchObject({ text: '一', revealed: false, more: true })
    player.click()
    expect(player.getSnapshot().message).toMatchObject({ text: '一', revealed: true })
    player.click()
    await flush()
    expect(player.getSnapshot().message).toMatchObject({ text: '二', revealed: false, more: false })
    player.reveal()
    player.click()
    await said
    expect(done).toBe(true)
    // The line stays on the screen after it
    expect(player.getSnapshot().message).toMatchObject({ text: '二', waiting: false })
  })

  it('does not pick an option that cannot be chosen', async () => {
    const player = new DialoguePlayer(providers())
    player.begin()
    const picked = player.choose([{ key: 'yes', text: '契約する', disabled: '金が足りません' }, { key: 'no', text: 'やめておく' }])
    player.pick('yes')
    expect(player.getSnapshot().choice).not.toBeNull()
    player.pick('no')
    expect(await picked).toBe('no')
    expect(player.getSnapshot().choice).toBeNull()
  })

  it('holds the sounds while skipping, and plays the last song after', async () => {
    const player = new DialoguePlayer(providers())
    player.begin()
    player.setSkipping(true)
    await player.perform({ kind: 'bgm', id: 'tavern' })
    await player.perform({ kind: 'se', name: 'coins' })
    await player.perform({ kind: 'message', pages: ['一'] })
    expect(player.providers.playBgm).not.toHaveBeenCalled()
    player.setSkipping(false)
    expect(player.providers.playBgm).toHaveBeenCalledWith('tavern')
    expect(player.providers.playSe).not.toHaveBeenCalled()
  })

  it('aborts what is waiting', async () => {
    const player = new DialoguePlayer(providers())
    player.begin()
    const said = player.perform({ kind: 'message', pages: ['一'] })
    player.abort()
    await expect(said).rejects.toThrow(DialogueAborted)
    expect(player.getSnapshot().active).toBe(false)
  })
})
