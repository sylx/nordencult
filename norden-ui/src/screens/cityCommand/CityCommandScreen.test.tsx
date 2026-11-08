import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CityCommandScreen from './CityCommandScreen'
import type { CityView } from '../types'

const city: CityView = {
  id: 'P012', name: 'フルーエン', faction: { name: 'カルタ書院' }, population: 11000,
  knights: [{ id: 'k1', name: 'エルネスト' }],
}

const setup = (props: Partial<Parameters<typeof CityCommandScreen>[0]> = {}) => {
  const handlers = { onCommand: vi.fn(), onEndTurn: vi.fn(), onPrevCity: vi.fn(), onNextCity: vi.fn() }
  render(<CityCommandScreen city={city} turn={{ turn: 3, phaseLabel: '戦略フェーズ', activeFaction: { name: 'カルタ書院' } }}
    {...handlers} {...props} />)
  return handlers
}

describe('CityCommandScreen', () => {
  it('shows the city window, turn and city switcher', async () => {
    const { onPrevCity, onNextCity } = setup({ cityPosition: { index: 0, count: 2 } })
    expect(screen.getByRole('region', { name: 'カルタ書院 フルーエン' })).toBeInTheDocument()
    const turn = screen.getByRole('group', { name: 'ターン情報' })
    expect(within(turn).getByText('戦略フェーズ')).toBeInTheDocument()
    expect(within(turn).getByText('カルタ書院')).toBeInTheDocument()
    expect(within(turn).getByText('のターン')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '前の都市' }))
    await userEvent.click(screen.getByRole('button', { name: '次の都市' }))
    expect(onPrevCity).toHaveBeenCalledOnce()
    expect(onNextCity).toHaveBeenCalledOnce()
  })

  it('runs sub-commands and direct commands through onCommand', async () => {
    const { onCommand, onEndTurn } = setup()
    const toolbar = screen.getByRole('navigation', { name: '都市コマンド' })
    await userEvent.click(within(toolbar).getByRole('button', { name: /軍事/ }))
    await userEvent.click(screen.getByRole('button', { name: '侵攻' }))
    expect(onCommand).toHaveBeenLastCalledWith('invade')
    await userEvent.click(within(toolbar).getByRole('button', { name: /内政/ }))
    expect(onCommand).toHaveBeenLastCalledWith('domestic')
    await userEvent.click(within(toolbar).getByRole('button', { name: /ターン終了/ }))
    expect(onEndTurn).toHaveBeenCalledOnce()
  })

  it('shows the command whose screen is open as pressed and enabled', () => {
    // It stays usable to close its screen, even if it could not be opened now
    setup({ activeCommand: 'domestic', commandState: { domestic: { disabled: true, reason: '手番ではありません' } } })
    expect(screen.getByRole('button', { name: /内政/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /内政/ })).toBeEnabled()
  })

  it('disables commands with the reason as tooltip', async () => {
    setup({ commandState: { invade: { disabled: true, reason: '出撃できる騎士がいません' } }, endTurnDisabled: true })
    await userEvent.click(screen.getByRole('button', { name: /軍事/ }))
    expect(screen.getByRole('button', { name: '侵攻' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '侵攻' })).toHaveAttribute('aria-description', '出撃できる騎士がいません')
    expect(screen.getByRole('button', { name: /ターン終了/ })).toBeDisabled()
  })

  it('shows the city\'s economy: scale, soldiers, supplies, effective stats and building slots', () => {
    setup({
      city: {
        ...city, tier: 2, scaleLabel: '大きな街', troops: 1100, troopMorale: 72, supplies: 440,
        stats: [{ label: '商業', value: 506, max: 1000, base: 440 }],
        buildings: {
          slots: 4, built: [{ id: 'market', name: '市場' }],
          construction: { building: { id: 'workshop', name: '工房' }, invested: 260, required: 400, turnsLeft: 1 },
        },
      },
      faction: { gold: 620, goldForecast: 110, production: 820, troops: 4500 },
    })
    expect(screen.queryByText(/Tier/)).not.toBeInTheDocument()
    expect(screen.getByText('大きな街')).toBeInTheDocument()
    expect(screen.getByText('兵数').closest('dt')?.nextElementSibling).toHaveTextContent('1,100')
    expect(screen.getByText('練度').closest('dt')?.nextElementSibling).toHaveTextContent('72')
    expect(screen.getByText('物資').closest('dt')?.nextElementSibling).toHaveTextContent('440')
    expect(screen.queryByText(/基礎/)).not.toBeInTheDocument()
    const slots = screen.getByRole('list', { name: '施設 1 / 4' })
    expect(within(slots).getByText('市場')).toBeInTheDocument()
    expect(within(slots).getByText('建設中').parentElement).toHaveTextContent('建設中（あと1ヶ月）')
    expect(screen.queryByRole('progressbar', { name: '建設の進捗' })).not.toBeInTheDocument()
    expect(within(slots).queryByText('260 / 400')).not.toBeInTheDocument()
    expect(within(slots).getAllByText('空き')).toHaveLength(2)
    const faction = screen.getByRole('group', { name: '勢力' })
    expect(within(faction).getByRole('group', { name: '金' })).toHaveTextContent('620（+110）')
    expect(within(screen.getByRole('group', { name: 'ターン情報' })).queryByText('620')).not.toBeInTheDocument()
  })

  it('shows an upgrade under construction in the slot of the building it upgrades', () => {
    setup({
      city: {
        ...city,
        buildings: {
          slots: 4,
          built: [{ id: 'market', name: '市場' }, { id: 'farm', name: '農場' }, { id: 'well', name: '井戸' }, { id: 'mill', name: '水車' }],
          construction: { building: { id: 'bazaar', name: '大市場', upgradeFrom: 'market' }, invested: 100, required: 600, turnsLeft: 3 },
        },
      },
    })
    const slots = screen.getByRole('list', { name: '施設 4 / 4' })
    expect(within(slots).getAllByRole('listitem')).toHaveLength(4)
    expect(within(slots).queryByText('市場')).not.toBeInTheDocument()
    expect(within(slots).getByText('大市場')).toBeInTheDocument()
    expect(within(slots).getByText('建設中').parentElement).toHaveTextContent('建設中（あと3ヶ月）')
    expect(within(slots).queryByText('空き')).not.toBeInTheDocument()
  })

  it('shows a relic being repaired apart from the buildings, leaving their slots empty', () => {
    setup({
      city: {
        ...city,
        buildings: {
          slots: 2,
          built: [{ id: 'market', name: '市場' }],
          construction: { kind: 'relicRepair', building: { id: 'golem', name: 'ゴーレムの残骸' }, invested: 100, required: 1000, turnsLeft: 9 },
        },
      },
    })
    const slots = screen.getByRole('list', { name: '施設 1 / 2' })
    expect(within(slots).queryByText('ゴーレムの残骸')).not.toBeInTheDocument()
    expect(within(slots).getByText('空き')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: '遺物の修復' })).getByText('修復中').parentElement).toHaveTextContent('修復中（あと9ヶ月）')
    expect(screen.queryByRole('progressbar', { name: '建設の進捗' })).not.toBeInTheDocument()
  })

  it.each([
    { isPlayerCity: true, disabled: false, clickable: true },
    { isPlayerCity: false, disabled: false, clickable: false },
    { isPlayerCity: undefined, disabled: false, clickable: false },
    { isPlayerCity: true, disabled: true, clickable: false },
  ])('opens domestic affairs from buildings only in a manageable player city ($isPlayerCity, disabled: $disabled)', async ({ isPlayerCity, disabled, clickable }) => {
    const { onCommand } = setup({
      isPlayerCity,
      commandState: { domestic: { disabled } },
      city: {
        ...city,
        buildings: {
          slots: 3, built: [{ id: 'market', name: '市場' }],
          construction: { building: { id: 'workshop', name: '工房' }, invested: 260, required: 400, turnsLeft: 1 },
        },
      },
    })
    const slots = screen.getByRole('list', { name: '施設 1 / 3' })
    if (clickable) {
      await userEvent.click(within(slots).getByRole('button', { name: '市場' }))
      await userEvent.click(within(slots).getByRole('button', { name: /工房/ }))
      await userEvent.click(within(slots).getByRole('button', { name: '空き' }))
      expect(onCommand.mock.calls).toEqual([['domestic'], ['domestic'], ['domestic']])
    } else {
      expect(within(slots).queryByRole('button')).not.toBeInTheDocument()
      await userEvent.click(within(slots).getByText('市場'))
      await userEvent.click(within(slots).getByText('空き'))
      expect(onCommand).not.toHaveBeenCalled()
    }
  })

  it.each([
    { turnsLeft: null, paused: false, label: '建設中（完成の見込みなし）' },
    { turnsLeft: null, paused: true, label: '建設中（一時停止）' },
    { turnsLeft: undefined, paused: false, label: '建設中' },
  ])('describes construction without an estimated month count: $label', ({ turnsLeft, paused, label }) => {
    setup({ city: {
      ...city,
      buildings: {
        slots: 1, built: [],
        construction: { building: { id: 'workshop', name: '工房' }, invested: 260, required: 400, turnsLeft, paused },
      },
    } })
    expect(screen.getByText('建設中').parentElement).toHaveTextContent(label)
  })

  it('lists the knights with all their abilities, the lord first', async () => {
    setup({
      city: {
        ...city,
        lord: { id: 'k2', name: 'ギルベルト' },
        knights: [
          { id: 'k1', name: 'エルネスト' },
          { id: 'k2', name: 'ギルベルト', abilities: { leadership: 80, strength: 70, intelligence: 60, politics: 50, charm: 40 } },
        ],
      },
    })
    await userEvent.click(screen.getByRole('tab', { name: '騎士' }))
    const details = screen.getAllByRole('button', { name: /の詳細$/ })
    expect(details.map(button => button.getAttribute('aria-label'))).toEqual(['ギルベルトの詳細', 'エルネストの詳細'])
    const lordCard = details[0]!.closest('.norden-knight-card') as HTMLElement
    for (const [label, value] of [['統率', '80'], ['武力', '70'], ['知力', '60'], ['政治', '50'], ['魅力', '40']] as const) {
      expect(within(lordCard).getByText(label).nextElementSibling).toHaveTextContent(value)
    }
  })

  it('lists the prisoners held in the city after its knights', async () => {
    setup({
      city: {
        ...city,
        knights: [{ id: 'k1', name: 'エルネスト' }],
        prisoners: [{ id: 'p1', name: 'ミレイ', faction: { name: 'レオニス帝国' } }, { id: 'p2', name: 'グレタ', faction: null }],
      },
    })
    await userEvent.click(screen.getByRole('tab', { name: '騎士' }))
    expect(screen.getByRole('separator')).toHaveTextContent('捕虜')
    const prisoners = within(screen.getByRole('list', { name: '捕虜' })).getAllByRole('listitem')
    expect(prisoners[0]).toHaveTextContent('ミレイ')
    expect(prisoners[0]).toHaveTextContent('レオニス帝国')
    expect(prisoners[1]).toHaveTextContent('勢力なし')
    expect(screen.getAllByRole('button', { name: /の詳細$/ })).toHaveLength(3)
  })

  it('lists the mercenaries serving in the city between its knights and prisoners, counting them apart', async () => {
    setup({
      city: {
        ...city,
        knights: [
          { id: 'm1', name: 'ブロック', mercenary: { company: '樽盾団', soldiers: 500, maxSoldiers: 500 } },
          { id: 'k1', name: 'エルネスト' },
        ],
        prisoners: [{ id: 'p1', name: 'ミレイ', faction: null }],
      },
    })
    expect(screen.getByText('騎士', { selector: 'dt' }).nextElementSibling).toHaveTextContent('1人')
    expect(screen.getByText('傭兵', { selector: 'dt' }).nextElementSibling).toHaveTextContent('1人')
    await userEvent.click(screen.getByRole('tab', { name: '騎士' }))
    expect(screen.getAllByRole('separator').map(rule => rule.textContent)).toEqual(['傭兵', '捕虜'])
    const mercenaries = within(screen.getByRole('list', { name: '傭兵' })).getAllByRole('listitem')
    expect(mercenaries).toHaveLength(1)
    expect(mercenaries[0]).toHaveTextContent('ブロック')
    expect(screen.getAllByRole('button', { name: /の詳細$/ }).map(button => button.getAttribute('aria-label')))
      .toEqual(['エルネストの詳細', 'ブロックの詳細', 'ミレイの詳細'])
  })

  it('has no splitter for the mercenaries when none serve there', async () => {
    setup({ city: { ...city, knights: [{ id: 'k1', name: 'エルネスト' }] } })
    await userEvent.click(screen.getByRole('tab', { name: '騎士' }))
    expect(screen.queryByRole('separator')).not.toBeInTheDocument()
    expect(screen.queryByText('傭兵', { selector: 'dt' })).not.toBeInTheDocument()
  })

  it('shows the domestic log of each turn, newest first, on the 推移 tab', async () => {
    setup({
      city: {
        ...city,
        history: [
          { turn: 1, population: 11000, market: 480, production: 240 },
          {
            turn: 2, population: 11320, market: 483, production: 240,
            log: [{ label: '人口', before: 11000, after: 11320, formula: 'floor((経済 300 + 施設 0) × 領主 1.0667 × (1 + 施設 0%)) = 320' }],
          },
        ],
      },
    })
    expect(screen.queryByRole('tab', { name: '街道' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: '推移' }))
    const turns = within(screen.getByRole('list', { name: '内政ログ' })).getAllByRole('listitem')
    expect(turns.map(turn => turn.querySelector('h3')?.textContent)).toEqual(['第2ターン', '第1ターン'])
    expect(turns[0]).toHaveTextContent('11,000 → 11,320')
    expect(turns[0]).toHaveTextContent('+320')
    expect(within(turns[0]!).getByText(/^floor\(\(経済 300/)).toBeInTheDocument()
    expect(turns[1]).toHaveTextContent('初期値')
  })

  it('puts the movable parts where the layout says, and reports them moved', async () => {
    const onLayoutChange = vi.fn()
    setup({ layout: { window: { x: 200, y: 150 }, factionBar: { x: 30, y: 40 }, toolbar: { x: -20, y: -10 } }, onLayoutChange })
    expect(screen.getByRole('region', { name: 'カルタ書院 フルーエン' })).toHaveStyle({ left: '200px', top: '150px' })
    expect(screen.getByRole('group', { name: '勢力' })).toHaveStyle({ translate: '30px 40px' })
    expect(screen.getByRole('navigation', { name: '都市コマンド' })).toHaveStyle({ translate: '-20px -10px' })

    screen.getByRole('button', { name: '都市コマンドを移動（左端）' }).focus()
    await userEvent.keyboard('{ArrowUp}')
    expect(onLayoutChange).toHaveBeenLastCalledWith('toolbar', { x: -20, y: -20 })
    screen.getByRole('button', { name: '勢力のバーを移動' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onLayoutChange).toHaveBeenLastCalledWith('factionBar', { x: 40, y: 40 })
  })

  it('moves the parts back when the layout is cleared', () => {
    const props = {
      city, turn: { turn: 3, phaseLabel: '戦略フェーズ' }, onCommand: vi.fn(), onEndTurn: vi.fn(),
    }
    const { rerender } = render(<CityCommandScreen {...props} layout={{ window: { x: 200, y: 150 }, toolbar: { x: -20, y: -10 } }} />)
    rerender(<CityCommandScreen {...props} layout={{}} />)
    expect(screen.getByRole('region', { name: /フルーエン/ })).toHaveStyle({ left: '56px', top: '96px' })
    expect(screen.getByRole('navigation', { name: '都市コマンド' })).toHaveStyle({ translate: '0px 0px' })
  })

  it('opens the knight profile at its offset, beside where the city window starts', async () => {
    const onLayoutChange = vi.fn()
    setup({ layout: { window: { x: 400, y: 300 }, knightProfile: { x: 50, y: 60 } }, onLayoutChange })
    await userEvent.click(screen.getByRole('tab', { name: '騎士' }))
    await userEvent.click(screen.getByRole('button', { name: /詳細/ }))
    const profile = screen.getByRole('region', { name: 'エルネスト' })
    expect(profile).toHaveStyle({ translate: '50px 60px' })
    expect(profile.style.getPropertyValue('--norden-knight-profile-y')).toBe('96px')

    screen.getByRole('button', { name: 'ウィンドウを移動' }).focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(onLayoutChange).toHaveBeenLastCalledWith('knightProfile', { x: 50, y: 70 })
  })
})
