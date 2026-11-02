import { useState } from 'react'
import { MercenaryScreen, type MercenaryContractView, type MercenaryOfferView } from '../../src'
import { KNIGHTS } from '../mock/data'
import MockMap from '../mock/MockMap'
import { Log, useLog, Workbench } from '../Workbench'

const COMPANIES = ['樽盾団', 'ランツクネヒト', '鉄弦団']
const [first, second, third] = KNIGHTS.map((knight, index) => ({
  ...knight, mercenary: { company: COMPANIES[index] ?? '黙鈴団', soldiers: 500, maxSoldiers: 500 },
}))

const OFFERS: readonly MercenaryOfferView[] = [
  { knight: first!, company: COMPANIES[0]!, unitType: '騎兵', soldiers: 500, maxSoldiers: 500, fee: 1000, monthly: 167, cityName: 'フルーエン' },
  {
    knight: second!, company: COMPANIES[1]!, unitType: 'ランツクネヒト', soldiers: 1000, maxSoldiers: 1000, fee: 10000, monthly: 1667, cityName: 'アンバリア',
    unavailableReason: 'ランツクネヒトはこの勢力との契約に応じません',
  },
]
const CONTRACTS: readonly MercenaryContractView[] = [
  { knight: third!, company: COMPANIES[2]!, cityName: 'シルヴァ', soldiers: 350, maxSoldiers: 500, monthly: 167, months: 3 },
]

export default function MercenaryEntry() {
  const [log, add] = useLog()
  const [empty, setEmpty] = useState(false)
  const [instance, setInstance] = useState(0)

  return <Workbench variant="screen"
    stage={<>
      <MockMap />
      <MercenaryScreen key={instance} cityName="フルーエン" gold={3000} offers={empty ? [] : OFFERS} contracts={empty ? [] : CONTRACTS}
        onHire={id => add(`契約: ${id}`)} onDismiss={id => add(`打ち切り: ${id}`)} onClose={() => add('戻る')} />
    </>}
    controls={<>
      <h2>傭兵画面</h2>
      <p>軍事＞傭兵。「契約できる傭兵」で契約し、「契約中」で打ち切ります。契約できない傭兵は理由を出してボタンを押せなくします。兵が減った傭兵を打ち切ると、確認に評判と回復のことを出します。</p>
      <label className="checkbox"><input type="checkbox" checked={empty} onChange={event => setEmpty(event.target.checked)} />傭兵がいない</label>
      <button className="reset-button" onClick={() => setInstance(value => value + 1)}>画面を開き直す</button>
      <Log entries={log} />
    </>}
  />
}
