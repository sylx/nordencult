import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CityInfoWindow from './CityInfoWindow'
import { biographyParts } from './KnightProfileWindow'
import type { CityView, EquipmentActions, KnightView } from '../types'

const seraphina: KnightView = {
  id: '001', name: 'セラフィナ・ルクス', subtitle: '魔術師', faction: { name: 'エスハラ法王府' },
  abilities: { leadership: 73, strength: 9, intelligence: 95, politics: 97, charm: 90 },
  location: '聖都',
  biography: '灰座に仕える巫女魔法師。弟子のイルーナ（002）とは反りが合わない。',
}
const iluna: KnightView = {
  id: '002', name: 'イルーナ・ヴァルハルト', faction: null,
  abilities: { leadership: 74, strength: 25, intelligence: 85, politics: 71, charm: 61 },
  biography: '師のセラフィナ（001）を超えようとしている。行方知れずのカイ（099）を探している。',
}
const city: CityView = { id: 'P000', name: '聖都', knights: [seraphina] }
const knightOf = (id: string) => [seraphina, iluna].find(knight => knight.id === id)

const openKnights = async () => {
  render(<CityInfoWindow city={city} knightOf={knightOf} />)
  await userEvent.click(screen.getByRole('tab', { name: '騎士' }))
}

describe('biographyParts', () => {
  it('keeps the names and drops the ids', () => {
    expect(biographyParts('姉マグダ（062）の背中。ゲルハルト（017）とヴォルフ（024）')).toEqual([
      '姉', { name: 'マグダ', id: '062' }, 'の背中。', { name: 'ゲルハルト', id: '017' }, 'と', { name: 'ヴォルフ', id: '024' },
    ])
    expect(biographyParts('記録なし')).toEqual(['記録なし'])
  })
})

describe('knight profile', () => {
  it('shows what a hired mercenary costs each month, and the month of their contract', async () => {
    const hired: KnightView = { id: '042', name: 'ブロック', mercenary: { company: '樽盾団', soldiers: 500, maxSoldiers: 500, monthly: 1667, months: 2 } }
    render(<CityInfoWindow city={{ ...city, knights: [hired, { ...hired, id: '043', name: 'タマラ', mercenary: { company: '星砂団', soldiers: 500, maxSoldiers: 500 } }] }} />)
    await userEvent.click(screen.getByRole('tab', { name: '騎士' }))
    await userEvent.click(screen.getByRole('button', { name: 'ブロックの詳細' }))
    expect(within(screen.getByRole('region', { name: 'ブロック' })).getByText('契約').nextElementSibling).toHaveTextContent('1,667/月 3ヶ月目')
    await userEvent.click(screen.getByRole('button', { name: 'タマラの詳細' }))
    expect(within(screen.getByRole('region', { name: 'タマラ' })).queryByText('契約')).not.toBeInTheDocument()
  })

  it('shows a summoned unit\'s HP, attack and defense and its relic, without the chart or a biography', async () => {
    const dragon: KnightView = { id: 's1', name: 'イグナーヴ', subtitle: '召喚', faction: { name: 'カルタ書院' }, summon: { hp: 450, maxHp: 600, attack: 172, defense: 185, morale: 70, relicName: 'ドラゴン', relicDescription: '竜の卵から孵った。' } }
    render(<CityInfoWindow city={{ ...city, knights: [dragon] }} />)
    await userEvent.click(screen.getByRole('tab', { name: '騎士' }))
    await userEvent.click(screen.getByRole('button', { name: 'イグナーヴの詳細' }))
    const profile = screen.getByRole('region', { name: 'イグナーヴ' })
    expect(within(profile).getByText('HP', { selector: 'dt' }).nextElementSibling).toHaveTextContent('450 / 600')
    expect([...profile.querySelectorAll('.norden-knight-stat')].map(stat => stat.textContent)).toEqual(['HP450', '攻撃力172', '防御力185'])
    expect(within(profile).queryByRole('img', { name: /能力チャート/ })).not.toBeInTheDocument()
    expect(within(profile).getByRole('heading', { name: '召喚の遺物' })).toBeInTheDocument()
    expect(profile).toHaveTextContent('竜の卵から孵った。')
    expect(within(profile).queryByRole('heading', { name: '略歴' })).not.toBeInTheDocument()
  })

  it('opens from 詳細 with 所属・所在, abilities, chart and biography', async () => {
    await openKnights()
    await userEvent.click(screen.getByRole('button', { name: 'セラフィナ・ルクスの詳細' }))
    const profile = screen.getByRole('region', { name: 'セラフィナ・ルクス' })
    expect(within(profile).getByText('97', { selector: '.norden-knight-stat b' })).toBeInTheDocument()
    expect(within(profile).getByText('所属').nextElementSibling).toHaveTextContent('エスハラ法王府')
    expect(within(profile).getByRole('img', { name: '能力チャート：統率73、武力9、知力95、政治97、魅力90' })).toBeInTheDocument()
    expect(within(profile).getByText('所在').nextElementSibling).toHaveTextContent('聖都')
    expect(profile).toHaveTextContent('弟子のイルーナとは反りが合わない。')
    expect(profile).not.toHaveTextContent('002')
    expect(within(profile).getByRole('button', { name: '戻る' })).toBeDisabled()
    expect(within(profile).getByRole('button', { name: '進む' })).toBeDisabled()
  })

  it('follows names in the biography, back and forward, and starts afresh after closing', async () => {
    await openKnights()
    await userEvent.click(screen.getByRole('button', { name: 'セラフィナ・ルクスの詳細' }))
    await userEvent.click(screen.getByRole('button', { name: 'イルーナ' }))
    const profile = screen.getByRole('region', { name: 'イルーナ・ヴァルハルト' })
    expect(within(profile).getByText('所属').nextElementSibling).toHaveTextContent('勢力なし')
    // A knight who cannot be found is named without a link
    expect(profile).toHaveTextContent('行方知れずのカイを探している。')
    expect(within(profile).queryByRole('button', { name: 'カイ' })).not.toBeInTheDocument()
    await userEvent.click(within(profile).getByRole('button', { name: '戻る' }))
    expect(screen.getByRole('region', { name: 'セラフィナ・ルクス' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '進む' }))
    expect(screen.getByRole('region', { name: 'イルーナ・ヴァルハルト' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '進む' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: '閉じる' }))
    expect(screen.queryByRole('region', { name: 'イルーナ・ヴァルハルト' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'セラフィナ・ルクスの詳細' }))
    expect(screen.getByRole('button', { name: '戻る' })).toBeDisabled()
  })

  it('closes on Escape', async () => {
    await openKnights()
    await userEvent.click(screen.getByRole('button', { name: 'セラフィナ・ルクスの詳細' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: 'セラフィナ・ルクス' })).not.toBeInTheDocument()
  })

  describe('equipment', () => {
    const rifle = { id: 'carta-2', name: 'ライフル', rarity: 'C' as const, effects: ['ライフル兵を率いる'] }
    const elwin: KnightView = { id: '016', name: 'エルヴィン', equipment: { slots: [rifle, null] } }
    const actions = (): EquipmentActions => ({
      options: vi.fn(() => [
        { id: 'gun-1', name: '大砲', rarity: 'B' as const, label: 'ルカが装備中' },
        { id: 'tome-1', name: '火の魔導書', rarity: 'B' as const, disabledReason: '魔術師だけが装備できます' },
      ]),
      onEquip: vi.fn(),
      onUnequip: vi.fn(),
    })
    const openElwin = async (knight: KnightView, equipment?: EquipmentActions) => {
      render(<CityInfoWindow city={{ ...city, knights: [knight] }} equipment={equipment} />)
      await userEvent.click(screen.getByRole('tab', { name: '騎士' }))
      await userEvent.click(screen.getByRole('button', { name: 'エルヴィンの詳細' }))
      return screen.getByRole('region', { name: 'エルヴィン' })
    }

    it('shows the slots, choosing a relic for one and taking one off', async () => {
      const equipment = actions()
      const profile = await openElwin(elwin, equipment)
      expect(within(profile).getByRole('button', { name: '装備の枠1：ライフル' })).toHaveTextContent('ライフル兵を率いる')
      await userEvent.click(within(profile).getByRole('button', { name: '装備の枠2：空き' }))
      expect(equipment.options).toHaveBeenCalledWith('016', 1)
      const dialog = screen.getByRole('dialog', { name: 'エルヴィンの装備の枠2' })
      expect(within(dialog).getByRole('button', { name: '火の魔導書（魔術師だけが装備できます）' })).toBeDisabled()
      await userEvent.click(within(dialog).getByRole('button', { name: '大砲（ルカが装備中）' }))
      await userEvent.click(within(dialog).getByRole('button', { name: '決定' }))
      expect(equipment.onEquip).toHaveBeenCalledWith('016', 1, 'gun-1')
      await userEvent.click(within(profile).getByRole('button', { name: 'ライフルを外す' }))
      expect(equipment.onUnequip).toHaveBeenCalledWith('016', 0)
    })

    it('Escape closes the dialog choosing a relic, not the profile', async () => {
      await openElwin(elwin, actions())
      await userEvent.click(screen.getByRole('button', { name: '装備の枠1：ライフル' }))
      expect(screen.getByRole('dialog', { name: 'エルヴィンの装備の枠1' })).toHaveTextContent('いまのライフルは箱に戻ります。')
      await userEvent.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.getByRole('region', { name: 'エルヴィン' })).toBeInTheDocument()
    })

    it('cannot be changed with a reason, saying it', async () => {
      const profile = await openElwin({ ...elwin, equipment: { slots: [rifle, null], unavailableReason: '手番ではありません' } }, actions())
      expect(within(profile).getByRole('button', { name: '装備の枠2：空き' })).toBeDisabled()
      expect(within(profile).getByText('手番ではありません')).toBeInTheDocument()
    })

    it('has no section for a knight without slots', async () => {
      const profile = await openElwin({ id: '016', name: 'エルヴィン' }, actions())
      expect(within(profile).queryByRole('list', { name: '装備' })).not.toBeInTheDocument()
    })
  })
})
