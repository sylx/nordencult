import { describe, expect, it, vi } from 'vitest'
import { createGameStore, createInitialState, isMercenary, researchOf, wanderer, type GameStore } from '../game'
import { setDialogueStarter } from '../scenes/playDialogue'
import { DEBUG_COMMANDS, type DebugContext } from './commands'
import { LineEditor } from './lineEditor'
import { DebugError, complete, completedWord, execute, helpLines, type DebugCommand } from './shell'
import { columns, displayWidth, table, wrapPosition } from './text'

const COMMANDS: readonly DebugCommand<null>[] = [
  { name: 'ping', summary: '応答する', args: [{ name: 'count', int: true, optional: true }], run: ([count]) => `pong ${count ?? 1}` },
  {
    name: 'item', summary: 'アイテム',
    subcommands: [{
      name: 'give', summary: '渡す',
      args: [{ name: 'item', candidates: () => [{ value: 'sword', label: '剣' }, { value: 'spear', label: '槍' }, { value: 'axe', label: '斧' }] }],
      run: ([item]) => `gave ${item}`,
    }],
  },
]

describe('shell', () => {
  it('runs a command and its subcommands, with the arguments checked', () => {
    expect(execute(COMMANDS, '  ping 3 ', null)).toEqual(['pong 3'])
    expect(execute(COMMANDS, 'ping', null)).toEqual(['pong 1'])
    expect(execute(COMMANDS, 'item give sword', null)).toEqual(['gave sword'])
    expect(execute(COMMANDS, '', null)).toEqual([])
  })

  it('takes a label for its value', () => {
    expect(execute(COMMANDS, 'item give 槍', null)).toEqual(['gave spear'])
  })

  it('gives the words left to an argument taking the rest', () => {
    const COMMANDS: readonly DebugCommand<null>[] = [{
      name: 'say', summary: '言う',
      args: [{ name: 'who', candidates: () => [{ value: 'me' }] }, { name: 'word', optional: true, rest: true, candidates: () => [{ value: 'hello' }, { value: 'bye' }] }],
      run: ([who, ...said]) => `${who}: ${said.join(' ')}`,
    }]
    expect(execute(COMMANDS, 'say me hello bye', null)).toEqual(['me: hello bye'])
    expect(execute(COMMANDS, 'say me', null)).toEqual(['me: '])
    expect(() => execute(COMMANDS, 'say me hello yo', null)).toThrow('word: yo はありません')
    expect(complete(COMMANDS, 'say me hello b', null).candidates.map((c) => c.value)).toEqual(['bye'])
    expect(helpLines(COMMANDS, 'say')[0]).toContain('say <who> [word…]')
  })

  it('tells what is wrong', () => {
    expect(() => execute(COMMANDS, 'nope', null)).toThrow(DebugError)
    expect(() => execute(COMMANDS, 'ping x', null)).toThrow('整数')
    expect(() => execute(COMMANDS, 'ping 1 2', null)).toThrow('使い方: ping [count]')
    expect(() => execute(COMMANDS, 'item', null)).toThrow('使い方: item <give>')
    expect(() => execute(COMMANDS, 'item give', null)).toThrow('使い方: item give <item>')
    expect(() => execute(COMMANDS, 'item give bow', null)).toThrow('bow')
  })

  it('completes commands, subcommands and arguments', () => {
    expect(complete(COMMANDS, '', null).candidates.map((c) => c.value)).toEqual(['ping', 'item'])
    expect(complete(COMMANDS, 'it', null).candidates.map((c) => c.value)).toEqual(['item'])
    expect(complete(COMMANDS, 'item ', null).candidates.map((c) => c.value)).toEqual(['give'])
    expect(complete(COMMANDS, 'item give s', null).candidates.map((c) => c.value)).toEqual(['sword', 'spear'])
    expect(complete(COMMANDS, 'item give 槍', null).candidates.map((c) => c.value)).toEqual(['spear'])
    expect(complete(COMMANDS, 'item give sword x', null).candidates).toEqual([])
    expect(complete(COMMANDS, 'nope x', null).candidates).toEqual([])
  })

  it('fills in one candidate with a space, and what many share', () => {
    expect(completedWord(complete(COMMANDS, 'it', null))).toBe('item ')
    expect(completedWord(complete(COMMANDS, 'item give s', null))).toBeNull()
    expect(completedWord({ word: 'c', candidates: [{ value: 'cities' }, { value: 'city' }] })).toBe('cit')
    expect(completedWord({ word: 'c', candidates: [{ value: 'cities.', partial: true }] })).toBe('cities.')
  })
})

describe('text', () => {
  it('counts CJK as two cells', () => {
    expect(displayWidth('aあ')).toBe(3)
    expect(table([['id', '勢力'], ['carta', 'カルタ']])).toEqual(['id     勢力', 'carta  カルタ'])
  })

  it('lays out as many columns as fit', () => {
    expect(columns(['aa', 'bb', 'cc'], 8)).toEqual(['aa  bb', 'cc'])
    expect(columns(['aaaaaaaaaa'], 4)).toEqual(['aaaaaaaaaa'])
  })

  it('wraps as the terminal does', () => {
    expect(wrapPosition('abc', 10)).toEqual({ row: 0, col: 3 })
    expect(wrapPosition('abcd', 4)).toEqual({ row: 0, col: 4 })
    expect(wrapPosition('abcde', 4)).toEqual({ row: 1, col: 1 })
    // A wide character that does not fit in the last cell
    expect(wrapPosition('abcあ', 4)).toEqual({ row: 1, col: 2 })
  })
})

describe('LineEditor', () => {
  it('edits around the cursor', () => {
    const editor = new LineEditor()
    editor.insert('acあ')
    editor.moveLeft()
    editor.moveLeft()
    editor.insert('b')
    expect(editor.line).toBe('abcあ')
    expect(editor.beforeCursor).toBe('ab')
    editor.backspace()
    editor.deleteForward()
    expect(editor.line).toBe('aあ')
    editor.killAfter()
    expect(editor.line).toBe('a')
  })

  it('replaces the word before the cursor', () => {
    const editor = new LineEditor()
    editor.insert('relic ad x')
    for (let i = 0; i < 2; i++) editor.moveLeft()
    editor.replaceBefore(2, 'add')
    expect(editor.line).toBe('relic add x')
    expect(editor.beforeCursor).toBe('relic add')
  })

  it('goes through the history and back to the line being typed', () => {
    const editor = new LineEditor(['one'])
    editor.insert('two')
    expect(editor.commit()).toBe('two')
    editor.insert('three')
    editor.previous()
    expect(editor.line).toBe('two')
    editor.previous()
    editor.previous()
    expect(editor.line).toBe('one')
    editor.next()
    editor.next()
    expect(editor.line).toBe('three')
  })

  it('keeps neither blank lines nor the same line twice', () => {
    const editor = new LineEditor(['one'])
    editor.insert('  ')
    editor.commit()
    editor.insert('one')
    editor.commit()
    expect(editor.history).toEqual(['one'])
  })
})

describe('commands', () => {
  function setup() {
    const store: GameStore = createGameStore(createInitialState(['carta']))
    const navigator = { current: { id: 'strategy', params: undefined }, goTo: vi.fn() } as const
    const context: DebugContext = { store, navigator: () => navigator, clear: vi.fn(), close: vi.fn() }
    return { store, navigator, context, run: (line: string) => execute(DEBUG_COMMANDS, line, context) }
  }

  it('adds and sets gold, of the viewed faction unless told', () => {
    const { store, run } = setup()
    const before = store.getState().gold
    run('gold add 100')
    run('gold add 50 leonis')
    expect(store.getState().gold.carta).toBe(before.carta + 100)
    expect(store.getState().gold.leonis).toBe(before.leonis + 50)
    run('gold set 7 レオニス帝国')
    expect(store.getState().gold.leonis).toBe(7)
    run('gold add -100 leonis')
    expect(store.getState().gold.leonis).toBe(0)
  })

  it('adds a relic, broken unless told', () => {
    const { store, run } = setup()
    const count = store.getState().relics.carta.length
    expect(run('relic add rifle')).toEqual(['カルタ書院: 壊れたライフル を足した'])
    run('relic add rifle carta repaired')
    expect(store.getState().relics.carta.slice(count).map((item) => item.repaired)).toEqual([false, true])
  })

  it('adds research points, fills and completes a technology with what it requires', () => {
    const { store, run } = setup()
    const tech = 'encirclement'
    expect(() => run('research fill')).toThrow(DebugError)
    run('research add 30')
    expect(researchOf(store.getState(), 'carta').carry).toBe(30)
    run(`research complete ${tech}`)
    const research = researchOf(store.getState(), 'carta')
    expect(research.researched.at(-1)).toBe(tech)
    expect(research.researched.length).toBeGreaterThan(1)
  })

  it('sets a number of a city, morale up to its most', () => {
    const { store, run } = setup()
    run('city set P012 troops 1234')
    run('city set P012 morale 1000')
    expect(store.getState().cities.P012.troops).toBe(1234)
    expect(store.getState().cities.P012.troopMorale).toBe(100)
    expect(() => run('city set P012 nothing 1')).toThrow(DebugError)
  })

  it('shows the mercenaries and changes their soldiers and the standing', () => {
    const { store, run } = setup()
    const list = run('mercenary list').join('\n')
    expect(list).toContain('樽盾団')
    expect(list).toContain('市場')
    expect(list).toContain('フルーエン')
    expect(run('mercenary soldiers 042 120')).toEqual(['樽盾団 の兵数: 120'])
    expect(run('mercenary list').join('\n')).toContain('回復中')
    run('mercenary soldiers 042 99999')
    expect(store.getState().mercenaries['042'].soldiers).toBe(500)
    expect(run('mercenary standing')).toEqual(['カルタ書院 の友好度: 0'])
    expect(run('mercenary standing 40 leonis')).toEqual(['レオニス帝国 の友好度: 40'])
    run('mercenary standing 1000 leonis')
    expect(store.getState().mercenaryStanding.leonis).toBe(100)
    expect(() => run('mercenary soldiers 015 1')).toThrow(DebugError)
  })

  it('shows those wandering, and where a knight is', () => {
    const { store, run } = setup()
    store.update((s) => ({ ...s, characters: Object.fromEntries(Object.entries(s.characters).filter(([id, c]) => !c.roaming || isMercenary(id))) }))
    expect(run('wanderer list')).toEqual(['放浪の騎士はいません'])
    store.update((s) => ({ ...s, characters: { ...s.characters, '015': wanderer('P012', 'leonis') } }))
    const list = run('wanderer list').join('\n')
    expect(list).toContain('フルーエン')
    expect(list).toContain('レオニス帝国')
    const shown = run('knight show 015').join('\n')
    expect(shown).toContain('放浪')
    expect(shown).toContain('怨恨勢力')
  })

  it('shows what there is', () => {
    const { run } = setup()
    for (const line of ['help', 'help relic', 'status', 'faction list', 'faction show', 'research list', 'relic list', 'city list carta', 'city show P012', 'knight show 001']) {
      expect(run(line).length).toBeGreaterThan(0)
    }
    expect(JSON.parse(run('state cities.P012').join('\n')).population).toBeGreaterThan(0)
    expect(() => run('state nothing')).toThrow(DebugError)
  })

  it('ends the turn, and refuses a battle that is not there', () => {
    const { store, run } = setup()
    const first = store.getState().activeFaction
    run('turn end')
    expect(store.getState().activeFaction).not.toBe(first)
    expect(() => run('battle win attacker')).toThrow('進行中の戦闘はありません')
  })

  it('goes to a scene', () => {
    const { navigator, run } = setup()
    run('scene title')
    expect(navigator.goTo).toHaveBeenCalledWith('title')
  })

  it('completes the game data and the paths of the state', () => {
    const { context } = setup()
    expect(complete(DEBUG_COMMANDS, 'relic add ', context).candidates.length).toBeGreaterThan(0)
    expect(complete(DEBUG_COMMANDS, 'gold add 100 car', context).candidates.map((c) => c.value)).toEqual(['carta'])
    expect(complete(DEBUG_COMMANDS, 'city show アシュ', context).candidates.map((c) => c.value)).toEqual(['P000'])
    expect(completedWord(complete(DEBUG_COMMANDS, 'state citie', context))).toBe('cities.')
    expect(completedWord(complete(DEBUG_COMMANDS, 'state cities.P012.popu', context))).toBe('cities.P012.population ')
    expect(complete(DEBUG_COMMANDS, 'state cities.P01', context).candidates.every((c) => c.partial)).toBe(true)
  })

  it('lists and plays the dialogue scenes, the input left out from their samples', () => {
    const { run, context } = setup()
    const start = vi.fn(async () => true)
    setDialogueStarter(start)
    try {
      expect(run('dialogue list').join('\n')).toMatch(/hireMercenary.*傭兵を雇う/)
      run('dialogue play travelingMerchant')
      expect(start).toHaveBeenLastCalledWith('travelingMerchant', { city: expect.any(String) })
      run('dialogue play hireMercenary merc=101 city=P012')
      expect(start).toHaveBeenLastCalledWith('hireMercenary', { city: 'P012', merc: '101' })
      expect(context.close).toHaveBeenCalled()
      expect(() => run('dialogue play hireMercenary price=3')).toThrow(DebugError)
      expect(complete(DEBUG_COMMANDS, 'dialogue play hireMercenary me', context).candidates.map((c) => c.value)).toEqual(['merc='])
      expect(complete(DEBUG_COMMANDS, 'dialogue play hireMercenary merc=10', context).candidates[0].value).toMatch(/^merc=10\d$/)
    } finally {
      setDialogueStarter(null)
    }
  })

  it('sets, lists and clears the flags', () => {
    const { store, run } = setup()
    expect(run('flag list')).toEqual(['フラグはありません'])
    run('flag set travelingMerchant:met 2')
    run('flag set travelingMerchant:offended true')
    expect(store.getState().flags).toEqual({ 'travelingMerchant:met': 2, 'travelingMerchant:offended': true })
    expect(run('flag list').join('\n')).toMatch(/travelingMerchant:met\s+2/)
    run('flag clear travelingMerchant:met')
    expect(store.getState().flags).toEqual({ 'travelingMerchant:offended': true })
    expect(() => run('flag set met yes')).toThrow(DebugError)
    expect(() => run('flag set met 1')).toThrow('<シーン id>:<名前>')
  })

  it('lists every command in help', () => {
    expect(helpLines(DEBUG_COMMANDS).length).toBe(DEBUG_COMMANDS.length)
  })
})
