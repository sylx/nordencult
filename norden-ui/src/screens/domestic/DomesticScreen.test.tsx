import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ConstructionView } from '../types'
import DomesticScreen from './DomesticScreen'

describe('DomesticScreen', () => {
  it('opens a window with the city title and closes', async () => {
    const onClose = vi.fn()
    render(<DomesticScreen city={{ id: 'P012', name: 'フルーエン' }} onClose={onClose} />)
    const window = screen.getByRole('region', { name: 'フルーエンの内政' })
    expect(within(window).getByText('フルーエンの内政')).toBeInTheDocument()
    expect(within(window).getByTestId('domestic-frame')).toBeInTheDocument()
    await userEvent.click(within(window).getByRole('button', { name: '閉じる' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('goes back with the button at the bottom-right', async () => {
    const onClose = vi.fn()
    render(<DomesticScreen city={{ id: 'P012', name: 'フルーエン' }} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: '戻る' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows built slots on the left, a single + slot, and opens the right build list to construct', async () => {
    const onBuild = vi.fn()
    const onDemolish = vi.fn()
    render(
      <DomesticScreen
        city={{
          id: 'P012',
          name: 'フルーエン',
          supplies: 440,
          buildings: {
            slots: 4,
            built: [{ id: 'market', name: '市場', effects: ['商業 +15%'] }],
          },
        }}
        buildOptions={[
          { id: 'workshop', name: '工房', description: '物資の生産を増やす。', effects: ['生産 +15%'], supplies: 400, gold: 120 },
        ]}
        gold={500}
        onBuild={onBuild}
        onDemolish={onDemolish}
        onClose={vi.fn()}
      />,
    )

    // Only one empty slot has the + button; the other two are plain empty slots
    expect(screen.getAllByRole('button', { name: '施設を追加' })).toHaveLength(1)
    expect(screen.getAllByLabelText('空きスロット')).toHaveLength(2)

    // Clicking + opens the right-hand build panel
    await userEvent.click(screen.getByRole('button', { name: '施設を追加' }))
    const panel = screen.getByRole('complementary', { name: '追加できる施設' })
    expect(within(panel).getByText('工房')).toBeInTheDocument()
    expect(within(panel).getByText('物資の生産を増やす。')).toBeInTheDocument()
    await userEvent.click(within(panel).getByRole('button', { name: '工房を建設' }))
    expect(onBuild).toHaveBeenCalledWith('workshop')

    // Demolishing a standing building opens a confirmation dialog first
    await userEvent.click(screen.getByRole('button', { name: '市場を削除' }))
    const dialog = screen.getByRole('dialog', { name: '施設の取り壊し' })
    expect(within(dialog).getByText('「市場」を取り壊しますか？')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: '取り壊す' }))
    expect(onDemolish).toHaveBeenCalledWith('market')
  })

  it('allows pausing and cancelling a building under construction', async () => {
    const onCancelConstruction = vi.fn()
    const onPauseConstruction = vi.fn()
    render(
      <DomesticScreen
        city={{
          id: 'P012',
          name: 'フルーエン',
          buildings: {
            slots: 4,
            built: [],
            construction: {
              building: { id: 'workshop', name: '工房' },
              invested: 260,
              required: 400,
              turnsLeft: 1,
            },
          },
        }}
        onCancelConstruction={onCancelConstruction}
        onPauseConstruction={onPauseConstruction}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('建設中')).toBeInTheDocument()
    expect(screen.getByText('取消で物資 +130 が備蓄へ')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '工房の建設を中断' }))
    expect(onPauseConstruction).toHaveBeenCalledWith(true)
    await userEvent.click(screen.getByRole('button', { name: '工房の建設を取り消す' }))
    expect(onCancelConstruction).toHaveBeenCalledOnce()
  })

  it('hides locked buildings and lists upgrades from the standing building', async () => {
    const onBuild = vi.fn()
    render(
      <DomesticScreen
        city={{
          id: 'P012',
          name: 'フルーエン',
          buildings: { slots: 3, built: [{ id: 'market', name: '市場' }] },
        }}
        buildOptions={[
          { id: 'workshop', name: '工房', supplies: 400, gold: 120 },
          { id: 'cannon', name: '据付大砲', supplies: 1200, gold: 400, unavailableReason: '遺物が必要です', locked: true },
          { id: 'grand_market', name: '大市場', supplies: 1000, gold: 250, upgradeFrom: 'market' },
          { id: 'comprehensive_market', name: '総合市場', supplies: 2000, gold: 500, upgradeFrom: 'grand_market', locked: true },
        ]}
        onBuild={onBuild}
        onClose={vi.fn()}
      />,
    )

    // The empty slot offers only new buildings that are not locked
    await userEvent.click(screen.getByRole('button', { name: '施設を追加' }))
    const addPanel = screen.getByRole('complementary', { name: '追加できる施設' })
    expect(within(addPanel).getByText('工房')).toBeInTheDocument()
    expect(within(addPanel).queryByText('据付大砲')).not.toBeInTheDocument()
    expect(within(addPanel).queryByText('大市場')).not.toBeInTheDocument()

    // The standing building opens its upgrades in the same panel
    await userEvent.click(screen.getByRole('button', { name: '市場をアップグレード' }))
    const upgradePanel = screen.getByRole('complementary', { name: '市場のアップグレード' })
    expect(within(upgradePanel).getByText('大市場')).toBeInTheDocument()
    expect(within(upgradePanel).queryByText('総合市場')).not.toBeInTheDocument()
    await userEvent.click(within(upgradePanel).getByRole('button', { name: '大市場にアップグレード' }))
    expect(onBuild).toHaveBeenCalledWith('grand_market')
  })

  it('shows an upgrade under construction in the slot of the building it replaces', () => {
    render(
      <DomesticScreen
        city={{
          id: 'P012',
          name: 'フルーエン',
          buildings: {
            slots: 2,
            built: [{ id: 'market', name: '市場' }],
            construction: {
              building: { id: 'grand_market', name: '大市場', upgradeFrom: 'market' },
              invested: 100,
              required: 1000,
              turnsLeft: 5,
            },
          },
        }}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('アップグレード中')).toBeInTheDocument()
    expect(screen.getByText('市場から')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '市場を削除' })).not.toBeInTheDocument()
    // The upgrade takes no slot: one empty slot remains (not addable while building)
    expect(screen.getAllByLabelText('空きスロット')).toHaveLength(1)
  })

  it('starts a relic from its own frame, past the slots, with the slots full too: the buildings list none', async () => {
    const onRelicWork = vi.fn()
    const repair = { id: 'item-1', kind: 'relicRepair', name: '壊れたバリスタ', supplies: 500, gold: 150, turns: 5 } as const
    const city = (built: readonly string[]) => ({
      id: 'P012', name: 'フルーエン', buildings: { slots: 2, built: built.map(id => ({ id, name: id })) },
    })
    const { rerender } = render(
      <DomesticScreen city={city(['市場'])} buildOptions={[{ id: 'workshop', name: '工房', supplies: 400, gold: 120 }]} relicOptions={[repair]}
        onRelicWork={onRelicWork} onClose={() => {}} />,
    )
    await userEvent.click(screen.getByRole('button', { name: '施設を追加' }))
    const buildings = screen.getByRole('complementary', { name: '追加できる施設' })
    expect(within(buildings).getByRole('button', { name: '工房を建設' })).toBeInTheDocument()
    expect(within(buildings).queryByRole('button', { name: '壊れたバリスタを修復' })).not.toBeInTheDocument()

    rerender(
      <DomesticScreen city={city(['市場', '倉庫'])} buildOptions={[{ id: 'workshop', name: '工房', supplies: 400, gold: 120 }]} relicOptions={[repair]}
        onRelicWork={onRelicWork} onClose={() => {}} />,
    )
    expect(screen.queryByRole('button', { name: '施設を追加' })).not.toBeInTheDocument()
    await userEvent.click(within(screen.getByRole('group', { name: '遺物の修復枠' })).getByRole('button', { name: '遺物を修復・生産' }))
    const relics = screen.getByRole('complementary', { name: '修復・生産できる遺物' })
    expect(within(relics).queryByRole('button', { name: '工房を建設' })).not.toBeInTheDocument()
    await userEvent.click(within(relics).getByRole('button', { name: '壊れたバリスタを修復' }))
    expect(onRelicWork).toHaveBeenCalledWith(repair)
  })

  it('shows a relic being repaired in its frame, not in the slots, with nothing else to start', async () => {
    const onPauseConstruction = vi.fn()
    const onCancelConstruction = vi.fn()
    render(
      <DomesticScreen
        city={{
          id: 'P012', name: 'フルーエン',
          buildings: {
            slots: 2,
            built: [{ id: 'market', name: '市場' }],
            construction: { kind: 'relicRepair', building: { id: 'golem', name: 'ゴーレムの残骸' }, invested: 100, required: 1000, turnsLeft: 9 },
          },
        }}
        relicOptions={[{ id: 'item-1', kind: 'relicRepair', name: '壊れたバリスタ', supplies: 500, gold: 150, unavailableReason: 'ほかの遺物を修復中です' }]}
        onPauseConstruction={onPauseConstruction} onCancelConstruction={onCancelConstruction} onClose={() => {}}
      />,
    )
    const frame = screen.getByRole('group', { name: '遺物の修復枠' })
    expect(within(frame).getByText('修復中')).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: '施設スロット 1 / 2' })).queryByText('ゴーレムの残骸')).not.toBeInTheDocument()
    // The slot left stays empty
    expect(screen.getByLabelText('空きスロット')).toBeInTheDocument()
    await userEvent.click(within(frame).getByRole('button', { name: 'ゴーレムの残骸の修復を中断' }))
    expect(onPauseConstruction).toHaveBeenCalledWith(true)
    await userEvent.click(within(frame).getByRole('button', { name: 'ゴーレムの残骸の修復を取り消す' }))
    expect(onCancelConstruction).toHaveBeenCalled()
  })

  it('says why the relic frame cannot be used while a building goes up, or with no relic to work on', () => {
    const city = (construction?: ConstructionView) => ({ id: 'P012', name: 'フルーエン', buildings: { slots: 2, built: [], construction } })
    const repair = { id: 'item-1', kind: 'relicRepair', name: '壊れたバリスタ', supplies: 500, gold: 150 } as const
    const { rerender } = render(
      <DomesticScreen city={city({ building: { id: 'market', name: '市場' }, invested: 100, required: 300 })} relicOptions={[repair]} onClose={() => {}} />,
    )
    const frame = screen.getByRole('group', { name: '遺物の修復枠' })
    expect(within(frame).getByText('ほかの施設を建設中です')).toBeInTheDocument()
    expect(within(frame).queryByRole('button')).not.toBeInTheDocument()
    rerender(<DomesticScreen city={city()} onClose={() => {}} />)
    expect(within(frame).getByText('修復・生産できる遺物はありません')).toBeInTheDocument()
  })

  it('shows population growth and the next city scale by name', () => {
    const { rerender } = render(
      <DomesticScreen
        city={{ id: 'P012', name: 'フルーエン', population: 11000, tier: 2 }}
        populationGrowth={{ perTurn: 280, nextTier: { tier: 3, turns: 12 }, details: ['経済 +164'] }}
        onClose={vi.fn()}
      />,
    )
    const status = screen.getByRole('region', { name: '都市の現状' })
    expect(within(status).getByText('+280/ターン')).toBeInTheDocument()
    expect(within(status).getByText('大都市 まで 約12ターン')).toBeInTheDocument()
    expect(within(status).getByText('11,000').parentElement).toHaveAttribute('title', expect.stringContaining('経済 +164'))

    rerender(
      <DomesticScreen city={{ id: 'P012', name: 'フルーエン', population: 31000, tier: 3 }} populationGrowth={{ perTurn: 300 }} onClose={vi.fn()} />,
    )
    expect(within(status).getByText('大都市（最大）')).toBeInTheDocument()
    rerender(
      <DomesticScreen city={{ id: 'P012', name: 'フルーエン', population: 900, tier: 1 }} populationGrowth={{ perTurn: 0, nextTier: { tier: 2, turns: null } }} onClose={vi.fn()} />,
    )
    expect(within(status).getByText('大きな街 まで 伸びなし')).toBeInTheDocument()
  })

  it('shows the city state at the top with the boosts broken down on hover and click', async () => {
    render(
      <DomesticScreen
        city={{ id: 'P012', name: 'フルーエン', population: 11000, supplies: 440 }}
        gold={1500}
        stats={[
          {
            label: '商業', value: 506, max: 720, base: 440,
            boosts: [
              { label: '領主', value: 44 },
              { label: '施設', value: 22, source: 'building', details: ['市場: 商業 +5%'] },
            ],
          },
          { label: '練度', value: 72, max: 100, notes: ['訓練 +3/ターン'] },
          { label: '新兵の練度', value: 20, max: 100, base: 20, boosts: [{ label: '施設', value: 0, source: 'building' }] },
        ]}
        onClose={vi.fn()}
      />,
    )

    const status = screen.getByRole('region', { name: '都市の現状' })
    expect(within(status).getByText('11,000')).toBeInTheDocument()
    expect(within(status).getByText('440')).toBeInTheDocument()
    expect(within(status).getByText('1,500')).toBeInTheDocument()
    expect(within(status).getByText('施設 +22')).toBeInTheDocument()
    expect(within(status).getByText('施設 +0')).toBeInTheDocument()

    // Hovering shows the breakdown, leaving hides it
    const commerce = within(status).getByRole('button', { name: '商業の内訳' })
    await userEvent.hover(commerce)
    const tip = screen.getByRole('tooltip')
    expect(within(tip).getByText('基礎')).toBeInTheDocument()
    expect(within(tip).getByText('+44')).toBeInTheDocument()
    expect(within(tip).getByText('市場: 商業 +5%')).toBeInTheDocument()
    await userEvent.unhover(commerce)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    // Clicking keeps it open until clicked again or elsewhere
    await userEvent.click(commerce)
    await userEvent.unhover(commerce)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    await userEvent.click(screen.getByTestId('domestic-frame'))
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    // 練度 has no boosts: only its notes
    await userEvent.click(within(status).getByRole('button', { name: '練度の内訳' }))
    const moraleTip = screen.getByRole('tooltip')
    expect(within(moraleTip).getByText('訓練 +3/ターン')).toBeInTheDocument()
    expect(within(moraleTip).queryByText('基礎')).not.toBeInTheDocument()

    const morale = within(status).getByRole('button', { name: '新兵の練度の内訳' })
    await userEvent.click(morale)
    expect(within(screen.getByRole('tooltip')).getByText('ブーストはありません')).toBeInTheDocument()
  })

  const knights = [
    { id: 'k1', name: 'マルクス', abilities: { politics: 96, intelligence: 90, charm: 89, strength: 40, leadership: 50 } },
    { id: 'k2', name: 'エルネスト', abilities: { politics: 38, intelligence: 40, charm: 72, strength: 86, leadership: 70 } },
    { id: 'k3', name: 'リディア', abilities: { politics: 55, intelligence: 60, charm: 64, strength: 74, leadership: 60 } },
  ]

  it('shows the lord and replaces them with a knight of the city, listing 政治 and 魅力', async () => {
    const onChangeLord = vi.fn()
    render(
      <DomesticScreen
        city={{ id: 'P012', name: 'フルーエン', lord: { id: 'k1', name: 'マルクス' }, knights }}
        onChangeLord={onChangeLord}
        onClose={vi.fn()}
      />,
    )
    const lord = screen.getByRole('region', { name: '領主' })
    expect(within(lord).getByText('マルクス')).toBeInTheDocument()

    await userEvent.click(within(lord).getByRole('button', { name: '領主を交代' }))
    const panel = screen.getByRole('complementary', { name: '領主の交代' })
    expect(within(panel).getByText('現領主')).toBeInTheDocument()
    expect(within(panel).getAllByText('政治')).toHaveLength(3)
    expect(within(panel).getAllByText('魅力')).toHaveLength(3)
    expect(within(panel).getByText('72')).toBeInTheDocument()

    await userEvent.click(within(panel).getByRole('button', { name: 'エルネストを領主にする' }))
    expect(onChangeLord).toHaveBeenCalledWith('k2')
    expect(screen.queryByRole('complementary', { name: '領主の交代' })).not.toBeInTheDocument()
  })

  it('does not open the lord panel when the lord cannot be replaced', () => {
    render(
      <DomesticScreen
        city={{ id: 'P012', name: 'フルーエン', lord: { id: 'k1', name: 'マルクス' }, knights }}
        lordFixedReason="君主のいる都市の領主は交代できません"
        onClose={() => {}}
      />,
    )
    const change = screen.getByRole('button', { name: '領主を交代' })
    expect(change).toBeDisabled()
    expect(change).toHaveAttribute('title', '君主のいる都市の領主は交代できません')
  })

  it('does not let the lord serve as an officer', async () => {
    render(
      <DomesticScreen
        city={{ id: 'P012', name: 'フルーエン', lord: { id: 'k1', name: 'マルクス' }, knights }}
        officers={{ training: ['k2'] }}
        onClose={vi.fn()}
      />,
    )
    await userEvent.click(screen.getAllByRole('button', { name: '商業担当官を任命' })[0]!)
    const commerce = screen.getByRole('complementary', { name: '商業担当官の任命' })
    expect(within(commerce).getByRole('checkbox', { name: 'マルクス' })).toBeDisabled()
    expect(within(commerce).getByText('領主')).toBeInTheDocument()

    // An officer made lord leaves their role
    await userEvent.click(screen.getByRole('button', { name: '領主を交代' }))
    const lord = screen.getByRole('complementary', { name: '領主の交代' })
    expect(within(lord).getByText('訓練担当官から外れます')).toBeInTheDocument()
  })

  it('appoints up to two officers to a role, showing the abilities it weighs and the aptitude', async () => {
    const onAssignOfficers = vi.fn()
    const { rerender } = render(
      <DomesticScreen
        city={{ id: 'P012', name: 'フルーエン', knights }}
        officers={{ commerce: ['k1'] }}
        officerEffects={{ commerce: '商業 +10%' }}
        onAssignOfficers={onAssignOfficers}
        onClose={vi.fn()}
      />,
    )
    const officers = screen.getByRole('region', { name: '内政担当官' })
    const commerce = within(officers).getByRole('listitem', { name: '商業担当官' })
    expect(within(commerce).getByText('マルクス')).toBeInTheDocument()
    expect(within(commerce).getByText('商業 +10%')).toBeInTheDocument()
    // (政治 96 × 2 + 知力 90) / 3
    expect(within(commerce).getByText('94')).toBeInTheDocument()
    expect(within(commerce).getByText('政治2・知力1')).toBeInTheDocument()

    // 訓練 weighs 武力 2 : 統率 1: its list shows them, the ablest first, and the 商業 officer cannot be picked
    await userEvent.click(within(officers).getByRole('listitem', { name: '訓練担当官' }).querySelector('button')!)
    const training = screen.getByRole('complementary', { name: '訓練担当官の任命' })
    expect(within(training).getAllByText('武力')).toHaveLength(3)
    expect(within(training).getAllByText('統率')).toHaveLength(3)
    // (武力 86 × 2 + 統率 70) / 3
    expect(within(training).getByText('81')).toBeInTheDocument()
    const boxes = within(training).getAllByRole('checkbox')
    expect(boxes.map(box => box.getAttribute('aria-label'))).toEqual(['エルネスト', 'リディア', 'マルクス'])
    expect(within(training).getByRole('checkbox', { name: 'マルクス' })).toBeDisabled()
    expect(within(training).getByText('商業担当官')).toBeInTheDocument()
    await userEvent.click(within(training).getByRole('checkbox', { name: 'エルネスト' }))
    expect(onAssignOfficers).toHaveBeenLastCalledWith('training', ['k2'])

    // With two officers the role is full
    rerender(
      <DomesticScreen
        city={{ id: 'P012', name: 'フルーエン', knights }}
        officers={{ training: ['k2', 'k3'] }}
        onAssignOfficers={onAssignOfficers}
        onClose={vi.fn()}
      />,
    )
    const full = screen.getByRole('complementary', { name: '訓練担当官の任命' })
    expect(within(full).getByRole('checkbox', { name: 'マルクス' })).toBeDisabled()
    await userEvent.click(within(full).getByRole('checkbox', { name: 'リディア' }))
    expect(onAssignOfficers).toHaveBeenLastCalledWith('training', ['k2'])

    await userEvent.click(screen.getByRole('button', { name: 'エルネストを訓練担当官から外す' }))
    expect(onAssignOfficers).toHaveBeenLastCalledWith('training', ['k3'])
  })

  it('sets aside gold for the 商業・生産・募兵 officers with sliders, as far as the treasury allows', async () => {
    const onChangeBudget = vi.fn()
    render(
      <DomesticScreen
        city={{ id: 'P012', name: 'フルーエン', knights }}
        gold={300}
        budgets={{ commerce: 900, recruitment: 200 }}
        onChangeBudget={onChangeBudget}
        onClose={vi.fn()}
      />,
    )
    const officers = screen.getByRole('region', { name: '内政担当官' })
    const commerce = within(officers).getByRole('slider', { name: '商業の予算' })
    expect(commerce).toHaveValue('900')
    // Every slider is scaled to 1000, whatever the treasury, so that moving one leaves the others still
    expect(commerce).toHaveAttribute('max', '1000')
    expect(within(officers).getByRole('slider', { name: '生産の予算' })).toHaveAttribute('max', '1000')
    // What can be chosen is what the budget has and the treasury can add (and 1000 at most)
    expect(within(officers).getByRole('spinbutton', { name: '商業の予算（数値）' })).toHaveAttribute('max', '1000')
    expect(within(officers).getByRole('spinbutton', { name: '生産の予算（数値）' })).toHaveAttribute('max', '300')
    expect(within(officers).getByRole('spinbutton', { name: '募兵の予算（数値）' })).toHaveAttribute('max', '500')
    // 訓練 spends no gold
    expect(within(officers).queryByRole('slider', { name: '訓練の予算' })).not.toBeInTheDocument()

    await userEvent.click(within(officers).getByRole('button', { name: '募兵の予算を増やす' }))
    expect(onChangeBudget).toHaveBeenLastCalledWith('recruitment', 210)
    await userEvent.click(within(officers).getByRole('button', { name: '商業の予算を減らす' }))
    expect(onChangeBudget).toHaveBeenLastCalledWith('commerce', 890)
  })

  it('marks the roles whose officers have no budget left or too little for a turn', () => {
    render(
      <DomesticScreen
        city={{ id: 'P012', name: 'フルーエン', knights }}
        officers={{ commerce: ['k1'], production: ['k3'], recruitment: ['k2'] }}
        budgets={{ commerce: 0, production: 40, recruitment: 150 }}
        budgetPerTurn={[80, 150]}
        onClose={vi.fn()}
      />,
    )
    const role = (name: string) => screen.getByRole('listitem', { name })
    expect(role('商業担当官')).toHaveClass('has-budget-empty')
    expect(within(role('商業担当官')).getByText('予算切れ')).toHaveAttribute('title', '予算がないため、次のターンは働きません')
    expect(role('生産担当官')).toHaveClass('has-budget-short')
    expect(within(role('生産担当官')).getByText('予算不足')).toHaveAttribute('title', '1ターンに80〜150使うところ、残り40です（残りの分だけ働きます）')
    // Enough for the most a turn takes; no officers, nothing to spend it
    expect(within(role('募兵担当官')).queryByText(/^予算(切れ|不足)$/)).not.toBeInTheDocument()
    expect(within(role('訓練担当官')).queryByText('予算切れ')).not.toBeInTheDocument()
  })

  it('marks only a budget used up without the gold a turn takes', () => {
    render(
      <DomesticScreen city={{ id: 'P012', name: 'フルーエン', knights }} officers={{ commerce: ['k1'], production: ['k3'] }}
        budgets={{ production: 40 }} onClose={vi.fn()} />,
    )
    expect(screen.getByRole('listitem', { name: '商業担当官' })).toHaveClass('has-budget-empty')
    expect(screen.getByRole('listitem', { name: '生産担当官' })).not.toHaveClass('has-budget-short')
  })
})
