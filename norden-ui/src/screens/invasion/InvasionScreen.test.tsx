import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import InvasionScreen from './InvasionScreen'
import type { InvasionScreenProps } from './InvasionScreen'

const unitTypes = [{ id: 'infantry', name: '歩兵' }, { id: 'archer', name: '弓兵' }, { id: 'cavalry', name: '騎兵' }]

const setup = (props: Partial<InvasionScreenProps> = {}) => {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(<InvasionScreen from={{ id: 'A', name: 'フルーエン' }} to={{ id: 'B', name: 'アンバリア' }} defenders={1}
    knights={[
      { id: 'k1', name: 'エルネスト', maxSoldiers: 400, defaultUnitType: 'cavalry', indirectSoldiers: 150 },
      { id: 'k2', name: 'リディア', maxSoldiers: 300 },
      { id: 'k3', name: 'オスカー', maxSoldiers: 200, commandRank: 1 },
      { id: 'k4', name: 'マルクス', unavailableReason: '内政を担当中' },
    ]}
    unitTypes={unitTypes} indirectUnitTypes={['infantry', 'archer']} soldierPool={600} onConfirm={onConfirm} onCancel={onCancel} {...props} />)
  return { onConfirm, onCancel }
}

const confirm = () => screen.getByRole('button', { name: '予約' })
const button = (name: string) => screen.getByRole('button', { name })
const unit = (name: string) => within(screen.getByRole('region', { name }))
const units = () => screen.queryAllByRole('region', { name: /の部隊$|^間接指揮部隊\d$/ }).map(region => region.getAttribute('aria-label'))

describe('InvasionScreen', () => {
  it('starts by picking the commander; unavailable knights cannot be picked', async () => {
    setup()
    expect(confirm()).toBeDisabled()
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('軍団長を選んでください')
    expect(screen.queryByRole('button', { name: 'マルクスを軍団長にする' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /間接指揮部隊/ })).not.toBeInTheDocument()
    expect(screen.getByText('守備の騎士: 1人')).toBeInTheDocument()

    await userEvent.click(button('エルネストを軍団長にする'))
    expect(unit('エルネストの部隊').getByText('軍団長')).toBeInTheDocument()
    // the others now join under the commander
    expect(button('リディアを加える')).toBeEnabled()
    expect(confirm()).toBeEnabled()
  })

  it('adds knights with their default unit type and soldiers within the pool', async () => {
    const { onConfirm } = setup()
    await userEvent.click(button('エルネストを軍団長にする'))
    await userEvent.click(button('リディアを加える'))
    // エルネスト takes 400 (their cap); リディア gets the 200 left
    expect(unit('エルネストの部隊').getByRole('radio', { name: '騎兵' })).toHaveAttribute('aria-checked', 'true')
    expect(unit('リディアの部隊').getByRole('radio', { name: '歩兵' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('spinbutton', { name: 'エルネストの兵数（数値）' })).toHaveValue(400)
    expect(screen.getByRole('spinbutton', { name: 'リディアの兵数（数値）' })).toHaveValue(200)
    expect(screen.getByRole('slider', { name: 'リディアの兵数' })).toHaveAttribute('max', '200')

    await userEvent.click(unit('リディアの部隊').getByRole('radio', { name: '弓兵' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'エルネストの兵数（数値）' }), { target: { value: '300' } })
    expect(screen.getByRole('slider', { name: 'リディアの兵数' })).toHaveAttribute('max', '300')
    await userEvent.click(confirm())
    expect(onConfirm).toHaveBeenCalledWith({
      commander: 'k1',
      units: [{ knightId: 'k1', unitType: 'cavalry', soldiers: 300 }, { knightId: 'k2', unitType: 'archer', soldiers: 200 }],
    })
  })

  it('hands the command to another knight of the army, and to the next one when the commander leaves', async () => {
    setup({ soldierPool: 2000 })
    await userEvent.click(button('エルネストを軍団長にする'))
    await userEvent.click(button('リディアを加える'))
    await userEvent.click(button('リディアを軍団長にする'))
    expect(units()).toEqual(['リディアの部隊', 'エルネストの部隊'])
    expect(unit('リディアの部隊').getByText('軍団長')).toBeInTheDocument()

    await userEvent.click(button('リディアを外す'))
    expect(units()).toEqual(['エルネストの部隊'])
    expect(unit('エルネストの部隊').getByText('軍団長')).toBeInTheDocument()
  })

  it('makes a knight who must lead the commander, and keeps them there', async () => {
    const { onConfirm } = setup({ soldierPool: 2000 })
    await userEvent.click(button('エルネストを軍団長にする'))
    await userEvent.click(button('オスカーを加える'))
    expect(units()).toEqual(['オスカーの部隊', 'エルネストの部隊'])
    expect(button('エルネストを軍団長にする')).toBeDisabled()
    expect(button('エルネストを軍団長にする')).toHaveAttribute('title', 'オスカーが出撃するため軍団長は変えられません')
    await userEvent.click(confirm())
    expect(onConfirm.mock.calls[0]![0]).toMatchObject({ commander: 'k3' })
  })

  it('forms units the commander leads indirectly, as infantry or archers', async () => {
    const { onConfirm } = setup({ soldierPool: 2000 })
    await userEvent.click(button('エルネストを軍団長にする'))
    await userEvent.click(button('＋ 間接指揮部隊（歩兵・弓兵）'))
    expect(unit('間接指揮部隊1').getByText('軍団長 エルネスト が率いる')).toBeInTheDocument()
    expect(unit('間接指揮部隊1').getAllByRole('radio').map(radio => radio.textContent)).toEqual(['歩兵', '弓兵'])
    // the commander's indirectSoldiers caps each of them
    expect(screen.getByRole('spinbutton', { name: '間接指揮部隊1の兵数（数値）' })).toHaveValue(150)
    await userEvent.click(unit('間接指揮部隊1').getByRole('radio', { name: '弓兵' }))
    await userEvent.click(confirm())
    expect(onConfirm).toHaveBeenCalledWith({
      commander: 'k1',
      units: [{ knightId: 'k1', unitType: 'cavalry', soldiers: 400 }, { knightId: null, unitType: 'archer', soldiers: 150 }],
    })

    // without knights there is no commander to lead them
    await userEvent.click(button('エルネストを外す'))
    expect(units()).toEqual([])
  })

  it('forms up to maxUnits units', async () => {
    setup({ soldierPool: 2000, maxUnits: 2 })
    await userEvent.click(button('エルネストを軍団長にする'))
    await userEvent.click(button('＋ 間接指揮部隊（歩兵・弓兵）'))
    expect(button('リディアを加える')).toBeDisabled()
    expect(button('リディアを加える')).toHaveAttribute('title', '2部隊までです')
    expect(button('＋ 間接指揮部隊（歩兵・弓兵）')).toBeDisabled()
    expect(document.querySelector('.norden-invasion-count')).toHaveTextContent('部隊 2 / 2')
    await userEvent.click(button('間接指揮部隊1を外す'))
    expect(button('リディアを加える')).toBeEnabled()
  })

  it('pictures the units with their soldiers and morale, and the empty slots', async () => {
    setup({ soldierPool: 2000, maxUnits: 4, morale: 70,
      unitTypes: unitTypes.map(type => ({ ...type, image: `/units/${type.id}.png` })) })
    const formation = within(screen.getByRole('list', { name: '編成した部隊' }))
    expect(formation.getAllByRole('listitem').map(slot => slot.textContent)).toEqual(['空き', '空き', '空き', '空き'])

    await userEvent.click(button('エルネストを軍団長にする'))
    await userEvent.click(button('＋ 間接指揮部隊（歩兵・弓兵）'))
    const commander = within(formation.getByRole('listitem', { name: 'エルネスト' }))
    expect(commander.getByText('騎兵')).toBeInTheDocument()
    expect(commander.getByText('軍団長')).toBeInTheDocument()
    expect(commander.getByText('400')).toBeInTheDocument()
    expect(commander.getByRole('meter', { name: 'エルネストの士気' })).toHaveAttribute('aria-valuenow', '70')
    expect(formation.getByRole('listitem', { name: 'エルネスト' }).querySelector('img')).toHaveAttribute('src', '/units/cavalry.png')
    const indirect = within(formation.getByRole('listitem', { name: '間接指揮部隊1' }))
    expect(indirect.getByText('間接指揮')).toBeInTheDocument()
    expect(indirect.getByText('150')).toBeInTheDocument()
    expect(formation.getAllByText('空き')).toHaveLength(2)

    fireEvent.change(screen.getByRole('spinbutton', { name: 'エルネストの兵数（数値）' }), { target: { value: '300' } })
    expect(commander.getByText('300')).toBeInTheDocument()
  })

  it('offers only the unit types a knight can lead', async () => {
    setup({ knights: [
      { id: 'k1', name: 'エルネスト', maxSoldiers: 400, defaultUnitType: 'archer', unitTypes: ['infantry', 'cavalry'] },
      { id: 'k2', name: 'リディア', maxSoldiers: 300 },
    ] })
    await userEvent.click(button('エルネストを軍団長にする'))
    await userEvent.click(button('リディアを加える'))
    const ernest = unit('エルネストの部隊')
    expect(ernest.getAllByRole('radio').map(radio => radio.textContent)).toEqual(['歩兵', '騎兵'])
    // their default is not among them, so the first one is chosen
    expect(ernest.getByRole('radio', { name: '歩兵' })).toHaveAttribute('aria-checked', 'true')
    expect(unit('リディアの部隊').getAllByRole('radio')).toHaveLength(3)
  })

  it('blocks empty units', async () => {
    setup({ soldierPool: 400 })
    await userEvent.click(button('エルネストを軍団長にする'))
    await userEvent.click(button('リディアを加える'))
    expect(confirm()).toBeDisabled()
    expect(confirm()).toHaveAttribute('title', '兵数が0の部隊があります')
    await userEvent.click(button('リディアの部隊を外す'))
    expect(confirm()).toBeEnabled()
  })

  it('applies the host rules and cancels', async () => {
    const { onCancel } = setup({ validate: draft => (draft.units.length > 1 ? '1部隊までです' : null) })
    await userEvent.click(button('エルネストを軍団長にする'))
    expect(confirm()).toBeEnabled()
    await userEvent.click(button('リディアを加える'))
    expect(confirm()).toHaveAttribute('title', '1部隊までです')
    await userEvent.click(button('やめる'))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
